import { supabaseAdmin } from '@/lib/automations/admin-client';
import { normalizePhone } from '@/lib/whatsapp/phone-utils';
import { sendTextMessage } from '@/lib/whatsapp/meta-api';
import { logHttpEvent } from '@/lib/logs/http-logs';
import { generateGeminiResponse } from '@/lib/automations/gemini-client';
import { getBusinessAiConfig } from './ai-config-cache';
import { getOrSetCache, deleteCache } from './gemini-cache';
import { runAutomationsForTrigger, resumeAutomationWithInteraction } from '@/lib/automations/engine';
import { engineSendInteractive } from '@/lib/automations/meta-send';
import { handleTestReply, handleFlowReply } from '@/lib/tests/runtime';
import { getBusinessSettings } from '@/lib/tests/settings';
import { isWithinAiSchedule } from '@/lib/ai/schedule';
import { detectEscalation, normalizeEscalationPolicy, recordEscalation, stripEscalationMarker } from '@/lib/ai/escalation';
import { decrypt } from './encryption';
import { consumeCredits, checkCredits } from '@/lib/credits';
// @google/genai used via gemini-client.ts

export const DEBOUNCE_DELAY_MS = 5000; // 5 seconds
const MAX_HISTORY_MESSAGES = 15;

interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  video?: { id: string; mime_type: string; caption?: string };
  document?: { id: string; mime_type: string; filename?: string; caption?: string };
  audio?: { id: string; mime_type: string };
  sticker?: { id: string; mime_type: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  reaction?: { message_id: string; emoji: string };
  context?: { id: string };
}

interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{ profile: { name: string }; wa_id: string }>;
      messages?: WhatsAppMessage[];
      statuses?: Array<{ id: string; status: string; timestamp: string; recipient_id: string }>;
    };
    field: string;
  }>;
}

/**
 * High-speed message enqueuing and saving.
 *
 * Returns the number of AI jobs scheduled (0 when the payload contained no
 * new messages — e.g. a statuses-only delivery receipt).
 */
export async function enqueueWhatsAppAiJobs(body: { entry?: WhatsAppWebhookEntry[] }): Promise<number> {
  const db = supabaseAdmin();
  if (!body.entry) return 0;
  let scheduled = 0;

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const value = change.value;
      if (!value) continue;

      const phoneNumberId = String(value.metadata?.phone_number_id || '');
      if (!phoneNumberId) {
        console.warn('[ai-worker] Missing phone_number_id in metadata');
        continue;
      }

      // 1. Resolve Config (Business)
      const { data: config, error: configError } = await db
        .from('whatsapp_config')
        .select('user_id, business_id, access_token')
        .eq('phone_number_id', phoneNumberId)
        .maybeSingle();

      if (configError) {
        console.error('[ai-worker] Config lookup error:', configError);
        continue;
      }

      if (!config) {
        // Log this failure as it's a common configuration issue
        void logHttpEvent({
          userId: null,
          businessId: null,
          direction: 'incoming',
          service: 'whatsapp',
          endpoint: 'enqueue',
          payload: { stage: 'config_missing', phone_number_id: phoneNumberId },
          note: 'whatsapp_config_not_found',
        });
        continue;
      }

      // 2. Process Messages
      const messages = value.messages || [];
      for (const message of messages) {
        // Meta redelivers webhooks whenever our response is slow or
        // non-200. Each redelivery re-runs this whole pipeline, so
        // without a wamid guard one "hi" produced one AI reply per
        // delivery. If we've already stored this message ID the
        // save/automations/job work is done — skip the duplicate.
        if (message.id) {
          const { data: seen, error: seenError } = await db
            .from('messages')
            .select('id')
            .eq('message_id', message.id)
            .maybeSingle();
          if (seenError) {
            // If the wamid cannot be verified we must not risk a duplicate
            // reply (double charge) — skip and let the next delivery retry.
            console.error('[ai-worker] wamid dedupe check failed:', seenError);
            continue;
          }
          if (seen) continue;
        }

        const contactInfo = value.contacts?.find((c) => c.wa_id === message.from);
        const contactName = contactInfo?.profile?.name || message.from;
        
        // Save message and resolve conversation
        const saveResult = await handleIncomingMessageSaving(message, contactName, config.user_id, config.business_id);
        if (!saveResult) {
          console.error('[ai-worker] Failed to save message or resolve conversation');
          continue;
        }

        const { conversationId, handledByTest, aiReplied } = saveResult;

        // If the interaction was already handled by the workflow node manager,
        // do not schedule an AI chat response to talk over it.
        if (handledByTest) {
          continue;
        }

        // An `assign_to_ai` automation step already generated and sent the AI
        // reply for this message. Scheduling the worker too would send a second
        // (duplicate) reply and double-charge credits.
        if (aiReplied) {
          continue;
        }

        // 3. Schedule AI Job with Debounce
        // We use a manual check-then-upsert-like flow because partial indexes 
        // don't work with standard Supabase upsert onConflict.
        const nextRunAt = new Date(Date.now() + DEBOUNCE_DELAY_MS).toISOString();

        // Check for existing pending job
        const { data: existingJob, error: existingJobError } = await db
          .from('whatsapp_ai_jobs')
          .select('id')
          .eq('conversation_id', conversationId)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingJobError) {
          // A failed lookup must not create a second job for the same
          // conversation — that produces a duplicate reply and double charge.
          console.error('[ai-worker] pending-job check failed:', existingJobError);
          continue;
        }

        if (existingJob) {
          // Update existing job's timer (reset debounce)
          await db
            .from('whatsapp_ai_jobs')
            .update({
              next_run_at: nextRunAt,
              payload: message,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingJob.id);
        } else {
          // Create new pending job
          await db
            .from('whatsapp_ai_jobs')
            .insert({
              conversation_id: conversationId,
              user_id: config.user_id,
              business_id: config.business_id,
              phone_number_id: phoneNumberId,
              status: 'pending',
              next_run_at: nextRunAt,
              payload: message,
              retry_count: 0,
            });
        }
        scheduled++;

        void logHttpEvent({
          userId: config.user_id,
          businessId: config.business_id,
          direction: 'incoming',
          service: 'whatsapp',
          endpoint: 'enqueue',
          payload: { stage: 'ai_job_scheduled', conversation_id: conversationId, next_run_at: nextRunAt },
          note: 'ai_job_scheduled',
        });
      }

      // 4. Process Statuses (Receipts)
      const statuses = value.statuses || [];
      for (const status of statuses) {
        await db.from('messages').update({ status: status.status }).eq('message_id', status.id);
      }
    }
  }
  return scheduled;
}

/**
 * Background worker to process due AI jobs.
 */
export async function processPendingWhatsAppAiJobs(limit = 10): Promise<number> {
  const db = supabaseAdmin();
  const now = new Date();
  // Tiny grace for clock skew between instances. This used to be +7s,
  // which exceeded the 5s debounce window and made every job "due"
  // instantly — the debounce never coalesced anything.
  const dueTime = new Date(now.getTime() + 1000).toISOString();

  // Reclaim jobs stranded on 'running' by a crashed/timed-out worker.
  // Without this they'd never execute again (webhook retries are now
  // deduped by wamid, so they no longer incidentally re-create jobs).
  await db
    .from('whatsapp_ai_jobs')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('status', 'running')
    .lt('updated_at', new Date(now.getTime() - 5 * 60_000).toISOString());

  // Pick jobs that are due
  const { data: jobs, error } = await db
    .from('whatsapp_ai_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('next_run_at', dueTime)
    .order('next_run_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[ai-worker] Fetch jobs error:', error);
    return 0;
  }

  if (!jobs || jobs.length === 0) {
    // Optional: Log heartbeat for debugging
    void logHttpEvent({
      userId: null,
      direction: 'incoming',
      service: 'ai-worker',
      endpoint: 'heartbeat',
      payload: { stage: 'no_jobs_found', now },
      note: 'worker_heartbeat_idle',
    });
    return 0;
  }

  let processed = 0;
  for (const job of jobs) {
    // 1. Claim Job (Atomic update to 'running')
    const { data: claimed } = await db
      .from('whatsapp_ai_jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select()
      .single();

    if (!claimed) continue;

    try {
      await executeAiJob(claimed);
      await db.from('whatsapp_ai_jobs').update({ status: 'done' }).eq('id', job.id);
      processed++;
    } catch (err: any) {
      console.error('[ai-worker] Job execution failed:', err);
      // Retry transient upstream failures (Gemini 429/5xx, overload, timeouts).
      // Retrying only 429 dropped replies whenever the model was briefly
      // overloaded with a 503.
      const errMsg = String(err?.message ?? '');
      const isTransient = /\b(429|500|502|503|504)\b|rate limit|overloaded|high demand|unavailable|deadline exceeded|timed? ?out|temporarily|try again/i.test(errMsg);
      const canRetry = isTransient && job.retry_count < 2;
      const status = canRetry ? 'pending' : 'failed';

      await db.from('whatsapp_ai_jobs').update({ 
        status, 
        last_error: err.message, 
        retry_count: job.retry_count + 1,
        next_run_at: new Date(Date.now() + 5000 * (job.retry_count + 1)).toISOString()
      }).eq('id', job.id);
    }
  }
  return processed;
}

/**
 * The core AI orchestration logic.
 */
async function executeAiJob(job: any): Promise<void> {
  const db = supabaseAdmin();
  
  // 1. Check Guardrails
  const { data: conv } = await db
    .from('conversations')
    .select('ai_enabled, human_takeover, escalated, paused, contact_id')
    .eq('id', job.conversation_id)
    .single();

  if (!conv || !conv.ai_enabled || conv.human_takeover || conv.escalated || conv.paused) {
    console.log(`[ai-worker] Guardrail triggered for conv ${job.conversation_id}. Aborting.`);
    return;
  }

  // AI Interaction Guardrail: If there's an active automation waiting for a button click,
  // we skip the AI response to avoid confusing the user.
  const { data: activeInteraction } = await db
    .from('automation_pending_executions')
    .select('id')
    .eq('contact_id', conv.contact_id)
    .eq('status', 'pending')
    .not('waiting_on_message_id', 'is', null)
    .maybeSingle();

  if (activeInteraction) {
    console.log(`[ai-worker] Interaction guardrail triggered for conv ${job.conversation_id}. Skipping AI.`);
    return;
  }

  // Schedule guardrail: only reply within the business's configured hours.
  // Outside the window we stay silent and leave the conversation to a human.
  const { ai_schedule } = await getBusinessSettings(job.business_id);
  if (!isWithinAiSchedule(new Date(), ai_schedule)) {
    console.log(`[ai-worker] Outside AI availability window for business ${job.business_id}. Skipping AI.`);
    return;
  }

  // 1.5 Fetch subscription tier details via inner join
  const { data: bizWithTier } = await db
    .from('businesses')
    .select(`
      id,
      tier_id,
      subscription_tiers!inner (
        allow_broadcasts,
        allow_flows,
        allow_multimodal
      )
    `)
    .eq('id', job.business_id)
    .single();

  // Enforce Bulk Template Broadcast constraint
  const isBroadcast = job.payload?.type === 'broadcast' || job.payload?.is_broadcast === true || job.payload?.context?.type === 'broadcast';
  if (isBroadcast && bizWithTier && !(bizWithTier.subscription_tiers as any).allow_broadcasts) {
    console.error(`[ai-worker] Access restriction: Business ${job.business_id} does not allow broadcasts.`);
    void logHttpEvent({
      userId: job.user_id,
      businessId: job.business_id,
      direction: 'system',
      service: 'ai-worker',
      endpoint: 'execute',
      payload: { error: 'Broadcasts disallowed on current subscription tier', tier: bizWithTier.tier_id },
      statusCode: 403,
      note: 'access_restriction_disallowed_broadcasts'
    });
    throw new Error('Access restriction: Broadcasts are not allowed on this subscription tier.');
  }

  // 1.6 Credit gate — verify credits before spending Gemini compute, but only
  // deduct once the AI has actually produced a response (see below).
  const creditCheck = await checkCredits(job.business_id, 'ai_chat');
  if (!creditCheck.ok) {
    console.error(`[ai-worker] Insufficient credits for business ${job.business_id}: have ${creditCheck.remaining}, need ${creditCheck.required}`);
    void logHttpEvent({
      userId: job.user_id,
      businessId: job.business_id,
      direction: 'system',
      service: 'ai-worker',
      endpoint: 'execute',
      payload: { error: 'Insufficient credits', detail: `have ${creditCheck.remaining}, need ${creditCheck.required}` },
      statusCode: 402,
      note: 'insufficient_credits'
    });
    return; // Silently skip — don't call Gemini without credits
  }

  // 2. Load Context (Cached)
  const aiConfig = await getBusinessAiConfig(job.user_id);
  if (!aiConfig || !aiConfig.is_enabled) return;

  // 3. Assemble Prompt & History
  const { data: messages } = await db
    .from('messages')
    .select('sender_type, content_text, created_at')
    .eq('conversation_id', job.conversation_id)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY_MESSAGES);

  const history = (messages || [])
    .reverse()
    .map((m) => ({
      role: m.sender_type === 'customer' ? 'user' : 'model' as 'user' | 'model',
      parts: [{ text: String(m.content_text || '') }],
    }));

  const lastUserMessage = history.filter(h => h.role === 'user').pop()?.parts[0].text || '';
  
  // Enforce Multimodal constraints:voice note or image confirmation
  const isRichMedia = job.payload?.type === 'image' || job.payload?.type === 'audio' || !!job.payload?.image || !!job.payload?.audio;
  let promptText = lastUserMessage;
  if (isRichMedia && bizWithTier && !(bizWithTier.subscription_tiers as any).allow_multimodal) {
    promptText = "The user sent an image or voice note. Inform them politely in plain text that voice notes and image processing are not supported on our current business plan, and they must upgrade their subscription to use this feature.";
  }

  // Compact Prompt Assembly
  let systemInstruction = `${aiConfig.system_prompt}\n\n`;
  
  if (aiConfig.training_documents.length > 0) {
    systemInstruction += `Context Information:\n${aiConfig.training_documents.join('\n')}\n\n`;
  }

  if (aiConfig.knowledge_items && aiConfig.knowledge_items.length > 0) {
    systemInstruction += `Dynamic Business Knowledge:\n${aiConfig.knowledge_items.map(item => `[${item.title}]: ${item.content}`).join('\n')}\n\n`;
  }

  // Load Google Sheets integration config if enabled to instruct AI on spreadsheets
  const { data: sheetsIntegration } = await db
    .from('business_integrations')
    .select('config, is_enabled')
    .eq('business_id', job.business_id)
    .eq('type', 'google_sheets')
    .maybeSingle();

  if (sheetsIntegration && sheetsIntegration.is_enabled) {
    const { data: spreadsheets } = await db
      .from('business_spreadsheets')
      .select('name, description, reference_column, return_columns')
      .eq('business_id', job.business_id)
      .eq('is_enabled', true)
      .order('name');

    if (spreadsheets && spreadsheets.length > 0) {
      systemInstruction += `AVAILABLE SPREADSHEETS (searchable via search_business_data tool):\n`;
      spreadsheets.forEach((s, i) => {
        systemInstruction += `${i + 1}. "${s.name}"`;
        if (s.description) systemInstruction += ` — ${s.description}`;
        systemInstruction += `\n`;
      });
      systemInstruction += `\nWhen a customer asks for business data, determine which spreadsheet is most relevant and ask them for the reference value (e.g., Order ID, Student ID, Defect ID). Once they provide it, call search_business_data with:\n- "query": ONLY the value the customer gave (e.g., "1002", "DEF-1155") — no extra words or labels\n- "spreadsheet": the name of the spreadsheet to search (e.g., "Products")\n\n`;
    } else {
      const sheetsConfig = sheetsIntegration.config as any;
      const refCol = sheetsConfig?.reference_column?.trim();
      if (refCol) {
        systemInstruction += `SPREADSHEET LOOKUP ROLE:\n`;
        systemInstruction += `- Customers can query information. You MUST ask the customer for the specific reference: '${refCol}'. Do not guess it. Once they provide it, use the 'search_business_data' tool to search for it.\n`;
        const retCols = sheetsConfig?.return_columns?.trim();
        if (retCols) {
          systemInstruction += `- The spreadsheet will only return columns: '${retCols}'. Only explain or show these fields to the customer.\n`;
        }
        systemInstruction += `\n`;
      }
    }
  }

  systemInstruction += `RULES:\n1. Be concise.\n2. If user is angry or asks for a refund, say "I am escalating this to a human manager" and end your message with [ESCALATE].\n3. Never repeat yourself.`;

  // 3b. AI↔tests integration (per-business switch). When enabled the model sees
  // the business's active tests and can offer them via the `start_test` tool.
  // The offer is confirm-first — the model must never claim a test started.
  const businessSettings = await getBusinessSettings(job.business_id);
  let hasAiTestOffers = false;
  if (businessSettings.enable_ai_test_offers) {
    const { data } = await db
      .from('tests')
      .select('id, title, description, mode, duration_minutes, is_entry')
      .eq('business_id', job.business_id)
      .eq('is_active', true)
      .order('title');
    const tests = (data ?? []) as Array<{
      id: string
      title: string
      description?: string | null
      mode?: string | null
      duration_minutes?: number | null
      is_entry?: boolean
    }>;
    if (tests.length > 0) {
      hasAiTestOffers = true;
      systemInstruction += `AVAILABLE TESTS (offer via the start_test tool):\n`;
      tests.forEach((t, i) => {
        let info = `"${t.title}" (id: ${t.id})`;
        if (t.description) info += ` — ${t.description}`;
        info +=
          t.is_entry
            ? ' [ENTRY screening — introductory questions route them to the right test]'
            : t.mode === 'test' && t.duration_minutes
              ? ` [timed ${t.duration_minutes} min, once per phone number]`
              : ` [${t.mode === 'practice' ? 'practice' : 'test'}]`;
        systemInstruction += `${i + 1}. ${info}\n`;
      });
      systemInstruction += `\nWhen a customer wants to take a test/quiz/exam/assessment, call start_test as follows:\n`;
      systemInstruction += `- They named a specific test (e.g. "the Science test")? Offer that test.\n`;
      systemInstruction += `- Otherwise, offer the ENTRY screening test above — but to the customer, refer to it simply as "the test" or "a quick test". NEVER call it "Entry Screening" or say "screening test" to the customer. Do NOT list the tests or ask which test the customer wants.\n`;
      systemInstruction += `- No entry test exists? Offer the single best-matching active test, or ask only if no clear single fit.\n`;
      systemInstruction += `NEVER start a test directly — always offer it via start_test, then confirm with the customer before it runs. Keep confirmation simple: e.g. "I can offer you a quick test to help you get started. Would you like to start now?"\n\n`;
    }
  }

  // 4a. Gemini Context Caching (free-tier safe — skips when toggle OFF)
  let cacheName: string | undefined
  try {
    cacheName = (await getOrSetCache(job.business_id, {
      systemInstruction,
      apiKey: aiConfig.api_key,
    })) ?? undefined
  } catch (err) {
    console.error('[ai-worker] Cache lookup failed, falling back to uncached:', err)
  }

  // 4b. AI Generation
  void logHttpEvent({ 
    userId: job.user_id, 
    businessId: job.business_id,
    direction: 'incoming', 
    service: 'ai', 
    endpoint: 'generate', 
    payload: { stage: 'ai_started', conv_id: job.conversation_id }, 
    note: 'ai_started' 
  });
  
  const aiText = await generateGeminiResponse(
    promptText, 
    cacheName ? '' : systemInstruction, 
    history.slice(0, -1), 
    aiConfig.api_key,
    job.business_id,
    cacheName,
    {
      action: 'chat_response',
      metadata: {
        conversation_id: job.conversation_id,
        contact_id: conv.contact_id,
      },
      ...(hasAiTestOffers ? { tools: ['search_business_data', 'start_test'] as const } : {}),
    }
  );

  // 4c. Credit gate (consume) — the AI produced a response, so now deduct.
  // Charged per AI session, only when a reply was actually generated.
  const creditResult = await consumeCredits(job.business_id, 'ai_chat', {
    userId: job.user_id,
    referenceId: job.conversation_id,
    contactId: conv.contact_id,
    description: 'Inbound AI chat response',
    metadata: {
      conversation_id: job.conversation_id,
      contact_id: conv.contact_id,
      phone_number_id: job.phone_number_id,
    },
  });
  if (!creditResult.ok) {
    console.error(`[ai-worker] Insufficient credits for business ${job.business_id}: ${creditResult.reason}`);
    void logHttpEvent({
      userId: job.user_id,
      businessId: job.business_id,
      direction: 'system',
      service: 'ai-worker',
      endpoint: 'execute',
      payload: { error: 'Insufficient credits', detail: creditResult.reason },
      statusCode: 402,
      note: 'insufficient_credits'
    });
    return; // Don't send the reply without credits
  }

  // 5. Escalation Check
  const escalationPolicy = normalizeEscalationPolicy(businessSettings.escalation);
  if (escalationPolicy.enabled) {
    const detection = detectEscalation({
      aiText,
      lastUserMessage,
      keywords: escalationPolicy.keywords,
    });
    if (detection.escalated) {
      const newlyEscalated = await recordEscalation(db, {
        conversationId: job.conversation_id,
        businessId: job.business_id,
        contactId: conv.contact_id,
        userId: job.user_id,
        policy: escalationPolicy,
      });
      if (newlyEscalated) {
        void logHttpEvent({ 
          userId: job.user_id, 
          businessId: job.business_id,
          direction: 'incoming', 
          service: 'ai', 
          endpoint: 'escalate', 
          payload: { stage: 'escalation_triggered', conv_id: job.conversation_id, reason: detection.reason }, 
          note: 'escalation_triggered' 
        });
      }
    }
  }

  const cleanAiText = stripEscalationMarker(aiText);

  // Did the model just stage a test offer (start_test tool call)? If so, the
  // confirmation question is delivered as WhatsApp buttons so the customer can
  // Start or decline without typing.
  const { data: pendingSession } = await db
    .from('user_sessions')
    .select('session_data')
    .eq('contact_id', conv.contact_id)
    .maybeSingle();
  const pendingOffer =
    ((pendingSession?.session_data as { stage?: string } | null | undefined)?.stage === 'confirm');

  let msg: { id: string } | null = null;
  if (!pendingOffer) {
    // 6a. Save the bot message (the buttons path persists its own copy).
    msg = (await db.from('messages').insert({
      conversation_id: job.conversation_id,
      sender_type: 'bot',
      content_text: cleanAiText,
      is_ai_response: true,
      status: 'sending'
    }).select().single())?.data ?? null;
  }

  const { data: whatsappConfig } = await db.from('whatsapp_config').select('access_token').eq('user_id', job.user_id).single();
  const { data: contact } = await db.from('contacts').select('phone').eq('id', conv.contact_id).single();

  if (whatsappConfig && contact) {
    if (pendingOffer) {
      try {
        // Deliver via the automation sender: phone-variant retry + message
        // persistence are inherited. The pending offer is consumed by
        // handleTestReply on the customer's next message.
        await engineSendInteractive({
          userId: job.user_id,
          conversationId: job.conversation_id,
          contactId: conv.contact_id,
          body: cleanAiText,
          items: [
            { id: 'test:confirm', label: 'Start' },
            { id: 'test:cancel', label: 'Not Now' },
          ],
        });

        void logHttpEvent({
          userId: job.user_id,
          businessId: job.business_id,
          direction: 'outgoing',
          service: 'ai',
          endpoint: 'send_interactive_confirm',
          payload: { stage: 'ai_test_offer_sent', conv_id: job.conversation_id, contact_id: conv.contact_id },
          note: 'ai_test_offer_sent',
        });
      } catch (sendErr: any) {
        console.error('[ai-worker] Failed to send AI test offer:', sendErr);
        throw sendErr; // Rethrow to mark job as failed; offer stays pending.
      }
      return;
    }

    try {
      const accessToken = decrypt(whatsappConfig.access_token);
      const { messageId } = await sendTextMessage({
        phoneNumberId: job.phone_number_id,
        accessToken,
        to: contact.phone,
        text: cleanAiText
      });
      
      await db.from('messages').update({ status: 'sent', message_id: messageId }).eq('id', msg!.id);

      // Update conversation with AI response
      await db.from('conversations').update({
        last_message_text: cleanAiText,
        last_message_at: new Date().toISOString(),
      }).eq('id', job.conversation_id);

      void logHttpEvent({
        userId: job.user_id,
        businessId: job.business_id,
        direction: 'outgoing',
        service: 'ai',
        endpoint: 'send',
        payload: { stage: 'ai_response_sent', conv_id: job.conversation_id, message_id: messageId },
        note: 'ai_response_sent',
      });
    } catch (sendErr: any) {
      console.error('[ai-worker] Failed to send AI response:', sendErr);
      await db.from('messages').update({ status: 'failed' }).eq('id', msg!.id);
      throw sendErr; // Rethrow to mark job as failed
    }
  } else {
    console.warn('[ai-worker] Missing whatsappConfig or contact for sending. Config found:', !!whatsappConfig, 'Contact found:', !!contact);
    throw new Error('Missing configuration or contact for sending AI response');
  }
}

async function handleIncomingMessageSaving(
  message: WhatsAppMessage,
  contactName: string,
  userId: string,
  businessId: string
): Promise<{ conversationId: string; handledByTest: boolean; aiReplied: boolean } | null> {
  const db = supabaseAdmin();
  const senderPhone = normalizePhone(message.from);

  // Contact lookup/create
  let { data: contact } = await db.from('contacts').select('id').eq('business_id', businessId).eq('phone', senderPhone).maybeSingle();
  if (!contact) {
    const { data: newContact } = await db.from('contacts').insert({ user_id: userId, business_id: businessId, phone: senderPhone, name: contactName }).select().single();
    contact = newContact;
  }
  if (!contact) return null;

  // Conversation lookup/create
  let { data: conv } = await db.from('conversations').select('id').eq('business_id', businessId).eq('contact_id', contact.id).maybeSingle();
  if (!conv) {
    const { data: newConv } = await db.from('conversations').insert({ user_id: userId, business_id: businessId, contact_id: contact.id, ai_enabled: true }).select().single();
    conv = newConv;
  }
  if (!conv) return null;

  // Extract message content and interactive values upfront
  const isInteractive = message.type === 'interactive';
  const interactiveData = (message as any).interactive;
  const replyContextId = message.context?.id;

  let handledByTest = false;
  let selectedOptionTitle: string | null = null;
  let selectedOptionId: string | null = null;
  let interactionValue: any = null;

  if (isInteractive && interactiveData) {
    if (interactiveData.type === 'button_reply') {
      interactionValue = interactiveData.button_reply.id;
      selectedOptionId = interactiveData.button_reply.id;
      selectedOptionTitle = interactiveData.button_reply.title || null;
    } else if (interactiveData.type === 'list_reply') {
      interactionValue = interactiveData.list_reply.id;
      selectedOptionId = interactiveData.list_reply.id;
      selectedOptionTitle = interactiveData.list_reply.title || null;
    } else if (interactiveData.type === 'nfm_reply' && interactiveData.nfm_reply.name === 'flow') {
      try {
        const flowResponse = JSON.parse(interactiveData.nfm_reply.response_json);
        interactionValue = flowResponse;
      } catch (e) {
        console.error('[ai-worker] Failed to parse flow response:', e);
      }
    }
  }

  const messageText = message.text?.body || selectedOptionTitle || (isInteractive ? '[Interaction Reply]' : '');

  // 1. Save Message immediately to guarantee idempotency and drop duplicate retries from Meta
  if (message.id) {
    const { error: insertErr } = await db.from('messages').insert({
      conversation_id: conv.id,
      sender_type: 'customer',
      content_text: messageText,
      message_id: message.id,
      status: 'delivered',
      created_at: new Date(Number(message.timestamp) * 1000).toISOString()
    });
    if (insertErr) {
      // 23505 is PostgreSQL unique constraint violation on message_id
      if ((insertErr as any).code === '23505') {
        console.log('[ai-worker] Duplicate message received concurrently, skipping:', message.id);
        return { conversationId: conv.id, handledByTest: true, aiReplied: false };
      }
      console.error('[ai-worker] Message insert error:', insertErr);
    }
  } else {
    await db.from('messages').insert({
      conversation_id: conv.id,
      sender_type: 'customer',
      content_text: messageText,
      status: 'delivered',
      created_at: new Date(Number(message.timestamp) * 1000).toISOString()
    });
  }

  // Update Conversation
  await db.from('conversations').update({
    last_message_text: messageText,
    last_message_at: new Date().toISOString(),
    unread_count: 1
  }).eq('id', conv.id);

  // 2. Test/Practice session resolution. Any interactive reply (or plain
  //    text while an intro prompt is pending) is consumed by the active
  //    test (or routing-flow) session when one exists.
  if (selectedOptionId) {
    try {
      const flowRes = await handleFlowReply(contact.id, selectedOptionId, '', message.id);
      if (flowRes.handled) {
        handledByTest = true;
      } else {
        const testRes = await handleTestReply(contact.id, selectedOptionId, '', message.id);
        if (testRes.handled) {
          handledByTest = true;
        }
      }
    } catch (testErr) {
      console.error('[ai-worker] Session interaction error:', testErr);
    }

    // Resume Automation (if waiting on interactive message)
    if (interactionValue && replyContextId) {
      await resumeAutomationWithInteraction(replyContextId, interactionValue);
    }
  } else if (message.text?.body) {
    // Plain text: route to test/flow sessions when one is waiting.
    try {
      const flowRes = await handleFlowReply(contact.id, null, message.text.body, message.id);
      if (flowRes.handled) {
        handledByTest = true;
      } else {
        const testRes = await handleTestReply(contact.id, null, message.text.body, message.id);
        if (testRes.handled) {
          handledByTest = true;
        }
      }
    } catch (testErr) {
      console.error('[ai-worker] Session text error:', testErr);
    }
  }

  // 3. Fire Automations
  // We await this now to ensure it completes within the webhook request (instant response).
  // While a test/practice session is actively handling the message we skip
  // `new_message_received` automations entirely — otherwise a dispatch_test
  // automation re-fires on every reply and resets the student's session.
  let aiReplied = false;
  if (!handledByTest) {
    try {
      const effects = await runAutomationsForTrigger({
        userId,
        businessId,
        triggerType: 'new_message_received',
        contactId: contact.id,
        context: {
          message_text: messageText,
          conversation_id: conv.id,
        },
      });
      aiReplied = effects.aiReplied === true;
    } catch (err) {
      console.error('[ai-worker] Automation trigger failed:', err);
    }
  }

  return { conversationId: conv.id, handledByTest, aiReplied };
}

