import { supabaseAdmin } from '@/lib/automations/admin-client';
import { normalizePhone } from '@/lib/whatsapp/phone-utils';
import { sendTextMessage } from '@/lib/whatsapp/meta-api';
import { logHttpEvent } from '@/lib/logs/http-logs';
import { generateGeminiResponse } from '@/lib/automations/gemini-client';
import { getBusinessAiConfig } from './ai-config-cache';
import { runAutomationsForTrigger } from '@/lib/automations/engine';
import { decrypt } from './encryption';

const DEBOUNCE_DELAY_MS = 10000; // 10 seconds
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
        .select('user_id, access_token')
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
        const conversationId = await handleIncomingMessageSaving(message, contactName, config.user_id);
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
              phone_number_id: phoneNumberId,
              status: 'pending',
              next_run_at: nextRunAt,
              payload: message,
              retry_count: 0,
            });
        }

        void logHttpEvent({
          userId: config.user_id,
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
  const now = new Date().toISOString();

  // Pick jobs that are due
  const { data: jobs, error } = await db
    .from('whatsapp_ai_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('next_run_at', now)
    .order('next_run_at', { ascending: true })
    .limit(limit);

  if (error || !jobs || jobs.length === 0) return 0;

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
    void logHttpEvent({
      userId: job.user_id,
      direction: 'incoming',
      service: 'ai',
      endpoint: 'guardrail',
      payload: { 
        stage: 'ai_aborted', 
        conv_id: job.conversation_id,
        reason: !conv ? 'conv_not_found' : !conv.ai_enabled ? 'ai_disabled' : conv.human_takeover ? 'human_takeover' : conv.escalated ? 'escalated' : 'paused'
      },
      note: 'ai_job_aborted_guardrail',
    });
    return;
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
  
  // Compact Prompt Assembly
  let systemInstruction = `${aiConfig.system_prompt}\n\n`;
  if (aiConfig.training_documents.length > 0) {
    systemInstruction += `Context Information:\n${aiConfig.training_documents.join('\n')}\n\n`;
  }
  systemInstruction += `RULES:\n1. Be concise.\n2. If user is angry or asks for a refund, say "I am escalating this to a human manager" and end your message with [ESCALATE].\n3. Never repeat yourself.`;

  // 4. AI Generation
  void logHttpEvent({ userId: job.user_id, direction: 'incoming', service: 'ai', endpoint: 'generate', payload: { stage: 'ai_started', conv_id: job.conversation_id }, note: 'ai_started' });
  
  const aiText = await generateGeminiResponse(lastUserMessage, systemInstruction, history.slice(0, -1), aiConfig.api_key);

  // 5. Escalation Check
  if (aiText.includes('[ESCALATE]') || /angry|refund|human|manager/i.test(lastUserMessage)) {
    await db.from('conversations').update({ escalated: true }).eq('id', job.conversation_id);
    void logHttpEvent({ userId: job.user_id, direction: 'incoming', service: 'ai', endpoint: 'escalate', payload: { stage: 'escalation_triggered', conv_id: job.conversation_id }, note: 'escalation_triggered' });
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

async function handleIncomingMessageSaving(message: WhatsAppMessage, contactName: string, userId: string): Promise<string | null> {
  const db = supabaseAdmin();
  const senderPhone = normalizePhone(message.from);

  // Contact lookup/create
  let { data: contact } = await db.from('contacts').select('id').eq('user_id', userId).eq('phone', senderPhone).maybeSingle();
  if (!contact) {
    const { data: newContact } = await db.from('contacts').insert({ user_id: userId, phone: senderPhone, name: contactName }).select().single();
    contact = newContact;
  }
  if (!contact) return null;

  // Conversation lookup/create
  let { data: conv } = await db.from('conversations').select('id').eq('user_id', userId).eq('contact_id', contact.id).maybeSingle();
  if (!conv) {
    const { data: newConv } = await db.from('conversations').insert({ user_id: userId, contact_id: contact.id, ai_enabled: true }).select().single();
    conv = newConv;
  }
  if (!conv) return null;

  // Save Message
  await db.from('messages').insert({
    conversation_id: conv.id,
    sender_type: 'customer',
    content_text: message.text?.body || '',
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
  void runAutomationsForTrigger({
    userId,
    triggerType: 'new_message_received',
    contactId: contact.id,
    context: {
      message_text: message.text?.body || '',
      conversation_id: conv.id,
    },
  });

  return conv.id;
}
