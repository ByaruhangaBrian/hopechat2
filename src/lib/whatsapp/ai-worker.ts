import { supabaseAdmin } from '@/lib/automations/admin-client';
import { normalizePhone } from '@/lib/whatsapp/phone-utils';
import { sendTextMessage } from '@/lib/whatsapp/meta-api';
import { logHttpEvent } from '@/lib/logs/http-logs';
import { generateGeminiResponse } from '@/lib/automations/gemini-client';

const MAX_HISTORY_MESSAGES = 15;
const MAX_GEMINI_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

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
      contacts?: Array<{
        profile: { name: string };
        wa_id: string;
      }>;
      messages?: WhatsAppMessage[];
      statuses?: Array<{
        id: string;
        status: string;
        timestamp: string;
        recipient_id: string;
      }>;
    };
    field: string;
  }>;
}

interface WhatsAppAiJobRow {
  id: string;
  user_id: string;
  phone_number_id: string;
  payload: WhatsAppWebhookEntry;
  retry_count: number;
}

export async function enqueueWhatsAppAiJobs(body: { entry?: WhatsAppWebhookEntry[] }): Promise<void> {
  if (!body.entry || body.entry.length === 0) return;

  for (const entry of body.entry) {
    const phoneNumberId = String(entry.changes?.[0]?.value?.metadata?.phone_number_id || '');
    if (!phoneNumberId) {
      void logHttpEvent({
        userId: null,
        direction: 'incoming',
        service: 'whatsapp',
        endpoint: '/api/whatsapp/webhook',
        payload: { note: 'enqueue_missing_phone_number_id', entry },
        note: 'webhook_error',
      });
      continue;
    }

    const { data: config, error: configError } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('user_id')
      .eq('phone_number_id', phoneNumberId)
      .single();

    if (configError || !config) {
      console.error('[ai-worker] No whatsapp_config found for phone_number_id:', phoneNumberId, configError);
      void logHttpEvent({
        userId: null,
        direction: 'incoming',
        service: 'whatsapp',
        endpoint: '/api/whatsapp/webhook',
        payload: { note: 'enqueue_no_matching_config', phone_number_id: phoneNumberId, error: configError?.message },
        note: 'enqueue_no_matching_config',
      });
      continue;
    }

    const { error: insertError } = await supabaseAdmin()
      .from('whatsapp_ai_jobs')
      .insert({
        user_id: config.user_id,
        phone_number_id: phoneNumberId,
        payload: entry,
      });

    if (insertError) {
      console.error('[ai-worker] Failed to enqueue job:', insertError);
      void logHttpEvent({
        userId: config.user_id,
        direction: 'incoming',
        service: 'whatsapp',
        endpoint: '/api/whatsapp/webhook',
        payload: { note: 'enqueue_insert_failed', phone_number_id: phoneNumberId, error: insertError.message },
        note: 'enqueue_insert_failed',
      });
    }
  }
}

export async function processPendingWhatsAppAiJobs(limit = 20): Promise<number> {
  const db = supabaseAdmin();
  const now = new Date().toISOString();
  console.log(`[ai-worker] Checking for pending jobs at ${now}...`);

  const { data: pendingJobs, error: selectError } = await db
    .from('whatsapp_ai_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('next_run_at', now)
    .order('next_run_at', { ascending: true })
    .limit(limit);

  if (selectError) {
    console.error('[ai-worker] Failed to fetch pending jobs:', selectError);
    return 0;
  }
  
  const count = pendingJobs?.length ?? 0;
  console.log(`[ai-worker] Found ${count} pending jobs`);
  if (count === 0) return 0;

  let processed = 0;
  for (const job of pendingJobs as WhatsAppAiJobRow[]) {
    console.log(`[ai-worker] Attempting to claim job ${job.id}...`);
    const { data: claimedJob } = await db
      .from('whatsapp_ai_jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select('*')
      .single();

    if (!claimedJob) {
      console.log(`[ai-worker] Job ${job.id} already claimed by another worker`);
      continue;
    }

    console.log(`[ai-worker] Processing claimed job ${claimedJob.id} for user ${claimedJob.user_id}`);
    try {
      await handleWhatsAppAiJob(claimedJob as WhatsAppAiJobRow);
      await db.from('whatsapp_ai_jobs').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', claimedJob.id);
      console.log(`[ai-worker] Successfully completed job ${claimedJob.id}`);
      processed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isRateLimit = message.includes('429') || message.toLowerCase().includes('rate limit');
      const retryCount = (claimedJob.retry_count ?? 0) + 1;
      const nextRun = new Date(Date.now() + BASE_BACKOFF_MS * 2 ** Math.min(retryCount - 1, 5));

      if (isRateLimit && retryCount <= MAX_GEMINI_RETRIES) {
        await db.from('whatsapp_ai_jobs').update({
          status: 'pending',
          retry_count: retryCount,
          next_run_at: nextRun.toISOString(),
          last_error: message,
          updated_at: new Date().toISOString(),
        }).eq('id', claimedJob.id);
      } else {
        await db.from('whatsapp_ai_jobs').update({
          status: 'failed',
          retry_count: retryCount,
          last_error: message,
          updated_at: new Date().toISOString(),
        }).eq('id', claimedJob.id);
      }

      console.error('[ai-worker] Job failed:', claimedJob.id, message);
      void logHttpEvent({
        userId: claimedJob.user_id,
        direction: 'incoming',
        service: 'whatsapp',
        endpoint: '/api/whatsapp/queue',
        payload: { note: 'job_failed', job_id: claimedJob.id, error: message },
        note: 'job_failed',
      });
    }
  }

  return processed;
}

async function handleWhatsAppAiJob(job: WhatsAppAiJobRow): Promise<void> {
  const entry = job.payload;
  for (const change of entry.changes) {
    const value = change.value;
    if (!value) continue;

    const phoneNumberId = String(value.metadata?.phone_number_id || '');
    if (!phoneNumberId) {
      throw new Error('Missing phone_number_id in queued job');
    }

    const { data: config, error: configError } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('access_token')
      .eq('phone_number_id', phoneNumberId)
      .single();

    if (configError || !config) {
      throw new Error(`Unable to resolve whatsapp_config for phone_number_id ${phoneNumberId}`);
    }

    const accessToken = config.access_token;
    const statuses = Array.isArray(value.statuses) ? value.statuses : [];
    const messages = Array.isArray(value.messages) ? value.messages : [];

    for (const status of statuses) {
      await updateMessageStatus(status);
    }

    for (const message of messages) {
      const contactInfo = value.contacts?.find((c) => c.wa_id === message.from);
      const contactName = contactInfo?.profile?.name || message.from;
      await handleIncomingWhatsAppMessage(message, contactName, job.user_id, phoneNumberId, accessToken);
    }
  }
}

async function updateMessageStatus(status: { id: string; status: string }) {
  const { error } = await supabaseAdmin()
    .from('messages')
    .update({ status: status.status })
    .eq('message_id', status.id);

  if (error) {
    console.error('[ai-worker] Status update failed:', error);
  }
}

async function handleIncomingWhatsAppMessage(
  message: WhatsAppMessage,
  contactName: string,
  userId: string,
  phoneNumberId: string,
  accessToken: string
): Promise<void> {
  const senderPhone = normalizePhone(message.from);
  const db = supabaseAdmin();
  console.log(`[ai-worker] Handling message ${message.id} from ${senderPhone} for user ${userId}`);

  const { data: contact, error: contactError } = await db
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .eq('phone', senderPhone)
    .maybeSingle();

  if (contactError) {
    throw new Error(`Contact lookup failed: ${contactError.message}`);
  }

  let contactId = contact?.id;
  if (!contactId) {
    console.log(`[ai-worker] Creating new contact for ${senderPhone}`);
    const { data: newContact, error: createContactError } = await db
      .from('contacts')
      .insert({ user_id: userId, phone: senderPhone, name: contactName })
      .select()
      .single();
    if (createContactError || !newContact) {
      throw new Error(`Contact creation failed: ${createContactError?.message ?? 'unknown'}`);
    }
    contactId = newContact.id;
  }

  const { data: conversation, error: conversationError } = await db
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('contact_id', contactId)
    .maybeSingle();

  let conversationId = conversation?.id;
  if (conversationError) {
    throw new Error(`Conversation lookup failed: ${conversationError.message}`);
  }

  if (!conversationId) {
    console.log(`[ai-worker] Creating new conversation for contact ${contactId}`);
    const { data: newConv, error: convError } = await db
      .from('conversations')
      .insert({ user_id: userId, contact_id: contactId })
      .select()
      .single();
    if (convError || !newConv) {
      throw new Error(`Conversation creation failed: ${convError?.message ?? 'unknown'}`);
    }
    conversationId = newConv.id;
  }

  const { data: existingMsg, error: dedupeError } = await db
    .from('messages')
    .select('id')
    .eq('message_id', message.id)
    .maybeSingle();

  if (dedupeError) {
    throw new Error(`Existing message lookup failed: ${dedupeError.message}`);
  }
  if (existingMsg) {
    console.log(`[ai-worker] Message ${message.id} already processed, skipping`);
    return;
  }

  let contentText = message.text?.body || '';
  let mediaUrl: string | null = null;
  const contentType = ['image', 'video', 'document', 'audio', 'location'].includes(message.type)
    ? message.type
    : 'text';

  if (['image', 'video', 'document', 'audio'].includes(message.type)) {
    contentText = (message as any)[message.type]?.caption || contentText;
    mediaUrl = `/api/whatsapp/media/${(message as any)[message.type]?.id || ''}`;
  }
  if (message.type === 'location' && message.location) {
    contentText = `Location: ${message.location.latitude}, ${message.location.longitude}`;
  }

  const createdAt = new Date(Number(message.timestamp) * 1000).toISOString();
  console.log(`[ai-worker] Inserting customer message into messages table...`);
  const { error: insertError } = await db.from('messages').insert({
    conversation_id: conversationId,
    sender_type: 'customer',
    content_type: contentType,
    content_text: contentText,
    media_url: mediaUrl,
    message_id: message.id,
    status: 'delivered',
    created_at: createdAt,
  });

  if (insertError) {
    throw new Error(`Message insert failed: ${insertError.message}`);
  }

  console.log(`[ai-worker] Fetching AI settings for user ${userId}`);
  const { data: aiSettings } = await db
    .from('ai_settings')
    .select('system_prompt')
    .eq('user_id', userId)
    .single();

  const systemInstruction = aiSettings?.system_prompt ??
    'You are a helpful customer service AI assistant. Respond to customer inquiries promptly and professionally.';

  console.log(`[ai-worker] Loading history for conversation ${conversationId}`);
  const { data: recentMessages, error: historyError } = await db
    .from('messages')
    .select('sender_type, content_text')
    .eq('conversation_id', conversationId)
    .neq('message_id', message.id)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY_MESSAGES);

  if (historyError) {
    throw new Error(`Failed to load conversation history: ${historyError.message}`);
  }

  const slidingWindowHistory = (recentMessages ?? [])
    .reverse()
    .map((msg: any) => ({
      role: (msg.sender_type === 'customer' ? 'user' : 'model') as 'user' | 'model',
      parts: [{ text: String(msg.content_text || '') }],
    }))
    .filter((item) => item.parts[0].text.trim().length > 0);

  const incomingText = contentText || '[WhatsApp message]';
  console.log(`[ai-worker] Generating Gemini response for: "${incomingText}"`);
  const aiText = await generateGeminiResponse(incomingText, systemInstruction, slidingWindowHistory);

  console.log(`[ai-worker] Inserting bot message into messages table...`);
  const { data: aiMessage, error: aiMessageError } = await db.from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'bot',
      content_type: 'text',
      content_text: aiText,
      status: 'sending',
      is_ai_response: true,
      ai_handled: true,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (aiMessageError || !aiMessage) {
    throw new Error(`AI message insert failed: ${aiMessageError?.message ?? 'unknown'}`);
  }

  console.log(`[ai-worker] Sending Meta API request to ${senderPhone}`);
  const { messageId } = await sendTextMessage({
    phoneNumberId,
    accessToken,
    to: senderPhone,
    text: aiText,
    contextMessageId: message.id,
  });

  console.log(`[ai-worker] Meta API success, messageId: ${messageId}. Updating bot message status...`);
  const { error: updateStatusError } = await db.from('messages')
    .update({ status: 'sent', message_id: messageId })
    .eq('id', aiMessage.id);

  if (updateStatusError) {
    console.error('[ai-worker] Failed to update bot message status:', updateStatusError);
  }

  await db.from('conversations').update({
    last_message_text: aiText,
    last_message_at: new Date().toISOString(),
  }).eq('id', conversationId);
}
