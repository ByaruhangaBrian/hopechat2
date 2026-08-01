import { supabaseAdmin } from '@/lib/automations/admin-client';
import { normalizePhone } from '@/lib/whatsapp/phone-utils';
import { sendTextMessage } from '@/lib/whatsapp/meta-api';
import { logHttpEvent } from '@/lib/logs/http-logs';
import { generateGeminiResponse } from '@/lib/automations/gemini-client';
import { getBusinessAiConfig } from './ai-config-cache';
import { getOrSetCache, deleteCache } from './gemini-cache';
import { runAutomationsForTrigger, resumeAutomationWithInteraction } from '@/lib/automations/engine';
import { decrypt } from './encryption';
import { consumeCredits, checkCredits } from '@/lib/credits';
// @google/genai used via gemini-client.ts

const DEBOUNCE_DELAY_MS = 5000; // 5 seconds
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
 */
export async function enqueueWhatsAppAiJobs(body: { entry?: WhatsAppWebhookEntry[] }): Promise<void> {
  const db = supabaseAdmin();
  if (!body.entry) return;

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
        const contactInfo = value.contacts?.find((c) => c.wa_id === message.from);
        const contactName = contactInfo?.profile?.name || message.from;
        
        // Save message and resolve conversation
        const conversationId = await handleIncomingMessageSaving(message, contactName, config.user_id, config.business_id);
        if (!conversationId) {
          console.error('[ai-worker] Failed to save message or resolve conversation');
          continue;
        }

        // 3. Schedule AI Job with Debounce
        // We use a manual check-then-upsert-like flow because partial indexes 
        // don't work with standard Supabase upsert onConflict.
        const nextRunAt = new Date(Date.now() + DEBOUNCE_DELAY_MS).toISOString();

        // Check for existing pending job
        const { data: existingJob } = await db
          .from('whatsapp_ai_jobs')
          .select('id')
          .eq('conversation_id', conversationId)
          .eq('status', 'pending')
          .maybeSingle();

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
}

/**
 * Background worker to process due AI jobs.
 */
export async function processPendingWhatsAppAiJobs(limit = 10): Promise<number> {
  const db = supabaseAdmin();
  const now = new Date();
  // Buffer to pick up jobs scheduled slightly in the future (debounce workaround)
  const dueTime = new Date(now.getTime() + 7000).toISOString(); 

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
      const isRateLimit = err?.message?.includes('429');
      const status = (isRateLimit && job.retry_count < 1) ? 'pending' : 'failed';
      
      await db.from('whatsapp_ai_jobs').update({ 
        status, 
        last_error: err.message, 
        retry_count: job.retry_count + 1,
        next_run_at: new Date(Date.now() + 5000).toISOString()
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
    cacheName
  );

  // 4c. Credit gate (consume) — the AI produced a response, so now deduct.
  // Charged per AI session, only when a reply was actually generated.
  const creditResult = await consumeCredits(job.business_id, 'ai_chat', {
    userId: job.user_id,
    referenceId: job.conversation_id,
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
  if (aiText.includes('[ESCALATE]') || /angry|refund|human|manager/i.test(lastUserMessage)) {
    await db.from('conversations').update({ escalated: true }).eq('id', job.conversation_id);
    void logHttpEvent({ 
      userId: job.user_id, 
      businessId: job.business_id,
      direction: 'incoming', 
      service: 'ai', 
      endpoint: 'escalate', 
      payload: { stage: 'escalation_triggered', conv_id: job.conversation_id }, 
      note: 'escalation_triggered' 
    });
  }

  const cleanAiText = aiText.replace('[ESCALATE]', '').trim();

  // 6. Save & Send
  const { data: msg } = await db.from('messages').insert({
    conversation_id: job.conversation_id,
    sender_type: 'bot',
    content_text: cleanAiText,
    is_ai_response: true,
    status: 'sending'
  }).select().single();

  const { data: whatsappConfig } = await db.from('whatsapp_config').select('access_token').eq('user_id', job.user_id).single();
  const { data: contact } = await db.from('contacts').select('phone').eq('id', conv.contact_id).single();

  if (whatsappConfig && contact) {
    try {
      const accessToken = decrypt(whatsappConfig.access_token);
      const { messageId } = await sendTextMessage({
        phoneNumberId: job.phone_number_id,
        accessToken,
        to: contact.phone,
        text: cleanAiText
      });
      
      await db.from('messages').update({ status: 'sent', message_id: messageId }).eq('id', msg.id);

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
      await db.from('messages').update({ status: 'failed' }).eq('id', msg.id);
      throw sendErr; // Rethrow to mark job as failed
    }
  } else {
    console.warn('[ai-worker] Missing whatsappConfig or contact for sending. Config found:', !!whatsappConfig, 'Contact found:', !!contact);
    throw new Error('Missing configuration or contact for sending AI response');
  }
}

async function handleIncomingMessageSaving(message: WhatsAppMessage, contactName: string, userId: string, businessId: string): Promise<string | null> {
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

  // Handle Interactive Replies (Buttons/Lists/Flows)
  const isInteractive = message.type === 'interactive';
  const interactiveData = (message as any).interactive;
  const replyContextId = message.context?.id;

  if (isInteractive && interactiveData && replyContextId) {
    let interactionValue: any = null;
    if (interactiveData.type === 'button_reply') {
      interactionValue = interactiveData.button_reply.id;
    } else if (interactiveData.type === 'list_reply') {
      interactionValue = interactiveData.list_reply.id;
    } else if (interactiveData.type === 'nfm_reply' && interactiveData.nfm_reply.name === 'flow') {
      // Flow response
      try {
        const flowResponse = JSON.parse(interactiveData.nfm_reply.response_json);
        interactionValue = flowResponse;
      } catch (e) {
        console.error('[ai-worker] Failed to parse flow response:', e);
      }
    }

    if (interactionValue) {
      await resumeAutomationWithInteraction(replyContextId, interactionValue);
    }
  }

  // Save Message
  await db.from('messages').insert({
    conversation_id: conv.id,
    sender_type: 'customer',
    content_text: message.text?.body || (isInteractive ? '[Interaction Reply]' : ''),
    message_id: message.id,
    status: 'delivered',
    created_at: new Date(Number(message.timestamp) * 1000).toISOString()
  });

  // Update Conversation
  await db.from('conversations').update({
    last_message_text: message.text?.body || '',
    last_message_at: new Date().toISOString(),
    unread_count: 1 // In a real app, this would be an increment
  }).eq('id', conv.id);

  // 3. Fire Automations
  // We await this now to ensure it completes within the webhook request (instant response)
  try {
    await runAutomationsForTrigger({
      userId,
      businessId,
      triggerType: 'new_message_received',
      contactId: contact.id,
      context: {
        message_text: message.text?.body || '',
        conversation_id: conv.id,
      },
    });
  } catch (err) {
    console.error('[ai-worker] Automation trigger failed:', err);
  }

  return conv.id;
}
