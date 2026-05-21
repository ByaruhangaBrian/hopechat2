import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/whatsapp/encryption';
import { getMediaUrl } from '@/lib/whatsapp/meta-api';
import { normalizePhone, phonesMatch } from '@/lib/whatsapp/phone-utils';
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-signature';
import { runAutomationsForTrigger } from '@/lib/automations/engine';
import { logHttpEvent } from '@/lib/logs/http-logs';

// Admin client for bypass RLS on inbound webhooks
let _adminClient: any = null;
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _adminClient;
}

interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  video?: { id: string; mime_type: string; caption?: string };
  document?: {
    id: string;
    mime_type: string;
    filename?: string;
    caption?: string;
  };
  audio?: { id: string; mime_type: string };
  sticker?: { id: string; mime_type: string };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
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

// GET - Webhook verification
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const challenge = searchParams.get('hub.challenge');
    const verifyToken = searchParams.get('hub.verify_token');

    if (mode === 'subscribe' && verifyToken && challenge) {
      // Check all configs for matching verify token
      const { data: configs } = await supabaseAdmin()
        .from('whatsapp_config')
        .select('verify_token');

      const isMatch = configs?.some((c: any) => {
        try {
          return decrypt(c.verify_token) === verifyToken;
        } catch {
          return false;
        }
      });

      if (isMatch) {
        return new Response(challenge, { status: 200 });
      }
    }
    return new Response('Forbidden', { status: 403 });
  } catch (error) {
    console.error('[webhook] Verification error:', error);
    return new Response('Error', { status: 500 });
  }
}

// POST - Receive messages
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  // 1. Verify Signature
  if (!verifyMetaWebhookSignature(rawBody, signature)) {
    console.warn('[webhook] Invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. Parse Body
  let body: { entry?: WhatsAppWebhookEntry[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 3. Log Raw Event
  void logHttpEvent({
    userId: null,
    direction: 'incoming',
    service: 'whatsapp',
    endpoint: '/api/whatsapp/webhook',
    payload: body,
    note: 'raw_webhook_received',
  });

  // 4. Process (Async to avoid timeout)
  processWebhook(body).catch((err) => {
    console.error('[webhook] Fatal process error:', err);
  });

  return NextResponse.json({ status: 'received' }, { status: 200 });
}

async function processWebhook(body: { entry?: WhatsAppWebhookEntry[] }) {
  if (!body.entry) return;

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const value = change.value;
      if (!value) continue;

      const phoneNumberId = String(value.metadata?.phone_number_id || '');
      const isMessageEvent = Array.isArray(value.messages) && value.messages.length > 0;
      const isStatusEvent = Array.isArray(value.statuses) && value.statuses.length > 0;

      if (!phoneNumberId) {
        void logHttpEvent({
          userId: null,
          direction: 'incoming',
          service: 'whatsapp',
          endpoint: '/api/whatsapp/webhook',
          payload: { note: 'missing_phone_number_id', value },
          note: 'webhook_error',
        });
        continue;
      }

      // Lookup config by the destination WhatsApp Business phone number ID.
      const { data: config, error: configError } = await supabaseAdmin()
        .from('whatsapp_config')
        .select('id, user_id, phone_number_id, waba_id, status, access_token')
        .eq('phone_number_id', phoneNumberId)
        .single();

      if (configError || !config) {
        console.error('[webhook] No config found for phone_number_id:', phoneNumberId, configError);
        try {
          const { data: configsList } = await supabaseAdmin()
            .from('whatsapp_config')
            .select('id, user_id, phone_number_id, waba_id, status');

          void logHttpEvent({
            userId: null,
            direction: 'incoming',
            service: 'whatsapp',
            endpoint: '/api/whatsapp/webhook',
            payload: { note: 'no_matching_config', phone_number_id: phoneNumberId, configs: configsList },
            note: 'no_matching_config',
          });
        } catch (err) {
          console.warn('[webhook] failed to fetch whatsapp_config list for diagnostics:', err);
        }
        continue;
      }

      const userId = config.user_id;
      const accessToken = decrypt(config.access_token);

      void logHttpEvent({
        userId,
        direction: 'incoming',
        service: 'whatsapp',
        endpoint: '/api/whatsapp/webhook',
        payload: { note: 'config_matched', phone_number_id: phoneNumberId, config_id: config.id },
        note: 'config_matched',
      });

      if (isStatusEvent) {
        for (const status of value.statuses) {
          await handleStatusUpdate(status);
        }
      }

      if (isMessageEvent) {
        for (const message of value.messages) {
          const contactInfo = value.contacts?.find((c) => c.wa_id === message.from);
          const contactName = contactInfo?.profile?.name || message.from;

          try {
            await processMessage(message, contactName, userId, accessToken);
            void logHttpEvent({
              userId,
              direction: 'incoming',
              service: 'whatsapp',
              endpoint: '/api/whatsapp/webhook',
              payload: { note: 'message_persisted', message_id: message.id, from: message.from },
              note: 'message_persisted',
            });
          } catch (err) {
            console.error('[webhook] Error processing message:', message.id, err);
            void logHttpEvent({
              userId,
              direction: 'incoming',
              service: 'whatsapp',
              endpoint: '/api/whatsapp/webhook',
              payload: { message_id: message.id, error: err instanceof Error ? err.message : String(err) },
              note: 'message_process_failed',
            });
          }
        }
      }
    }
  }
}

async function handleStatusUpdate(status: { id: string; status: string }) {
  const { error } = await supabaseAdmin()
    .from('messages')
    .update({ status: status.status })
    .eq('message_id', status.id);

  if (error) console.error('[webhook] Status update error:', error);
}

async function processMessage(
  message: WhatsAppMessage,
  contactName: string,
  userId: string,
  accessToken: string
) {
  const senderPhone = normalizePhone(message.from);

  // 1. Find or Create Contact
  const { data: contacts } = await supabaseAdmin()
    .from('contacts')
    .select('*')
    .eq('user_id', userId);

  let contact = contacts?.find((c: any) => phonesMatch(c.phone, senderPhone));

  if (!contact) {
    const { data: newContact, error: createError } = await supabaseAdmin()
      .from('contacts')
      .insert({ user_id: userId, phone: senderPhone, name: contactName })
      .select()
      .single();
    
    if (createError) {
      void logHttpEvent({
        userId,
        direction: 'incoming',
        service: 'whatsapp',
        endpoint: '/api/whatsapp/webhook',
        payload: { note: 'contact_create_failed', phone: senderPhone, contactName, error: createError.message },
        note: 'contact_create_failed',
      });
      throw new Error(`Contact creation failed: ${createError.message}`);
    }
    contact = newContact;
    void logHttpEvent({
      userId,
      direction: 'incoming',
      service: 'whatsapp',
      endpoint: '/api/whatsapp/webhook',
      payload: { note: 'contact_created', contact_id: contact.id, phone: senderPhone },
      note: 'contact_created',
    });
  }

  // 2. Find or Create Conversation
  let { data: conversation } = await supabaseAdmin()
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('contact_id', contact.id)
    .single();

  if (!conversation) {
    const { data: newConv, error: convError } = await supabaseAdmin()
      .from('conversations')
      .insert({ user_id: userId, contact_id: contact.id })
      .select()
      .single();
    
    if (convError) {
      void logHttpEvent({
        userId,
        direction: 'incoming',
        service: 'whatsapp',
        endpoint: '/api/whatsapp/webhook',
        payload: { note: 'conversation_create_failed', contact_id: contact.id, error: convError.message },
        note: 'conversation_create_failed',
      });
      throw new Error(`Conversation creation failed: ${convError.message}`);
    }
    conversation = newConv;
    void logHttpEvent({
      userId,
      direction: 'incoming',
      service: 'whatsapp',
      endpoint: '/api/whatsapp/webhook',
      payload: { note: 'conversation_created', conversation_id: conversation.id, contact_id: contact.id },
      note: 'conversation_created',
    });
  }

  // 3. Parse Content & Media
  let contentText = message.text?.body || '';
  let mediaUrl = null;
  const contentType = ['image', 'video', 'document', 'audio', 'location'].includes(message.type) 
    ? message.type 
    : 'text';

  if (['image', 'video', 'document', 'audio'].includes(message.type)) {
    const mediaId = (message as any)[message.type]?.id;
    if (mediaId) {
      try {
        await getMediaUrl({ mediaId, accessToken });
        mediaUrl = `/api/whatsapp/media/${mediaId}`;
        contentText = (message as any)[message.type]?.caption || contentText;
      } catch (err) {
        console.error('[webhook] Media URL fetch failed:', err);
      }
    }
  }

  if (message.type === 'location' && message.location) {
    contentText = `Location: ${message.location.latitude}, ${message.location.longitude}`;
  }

  // 4. Save Message
  const { error: msgError } = await supabaseAdmin()
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      sender_type: 'customer',
      content_type: contentType,
      content_text: contentText,
      media_url: mediaUrl,
      message_id: message.id,
      status: 'delivered',
      created_at: new Date(Number(message.timestamp) * 1000).toISOString(),
    });

  if (msgError) {
    console.error('[webhook] DB Insert Error:', msgError);
    throw new Error(`Message insert failed: ${msgError.message}`);
  }

  // 5. Update Conversation Summary
  await supabaseAdmin()
    .from('conversations')
    .update({
      last_message_text: contentText || `[${contentType}]`,
      last_message_at: new Date().toISOString(),
      unread_count: (conversation.unread_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversation.id);

  // 6. Run Automations
  runAutomationsForTrigger({
    userId,
    triggerType: 'new_message_received',
    contactId: contact.id,
    context: { message_text: contentText, conversation_id: conversation.id }
  }).catch(err => console.error('[webhook] Automation error:', err));
}
