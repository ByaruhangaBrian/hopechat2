import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendTextMessage } from '@/lib/whatsapp/meta-api';
import { decrypt } from '@/lib/whatsapp/encryption';
import { logHttpEvent } from '@/lib/logs/http-logs';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversation_id, content_text, reply_to_message_id } = body;

    if (!conversation_id || !content_text) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // 1. Fetch Conversation & Contact
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*)')
      .eq('id', conversation_id)
      .single();

    if (convError || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // 2. Fetch WhatsApp Config
    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 });
    }

    const accessToken = decrypt(config.access_token);
    const to = conv.contact.phone;

    // 3. Resolve contextMessageId if replying
    let contextMessageId: string | undefined;
    if (reply_to_message_id) {
      const { data: parent } = await supabase
        .from('messages')
        .select('message_id')
        .eq('id', reply_to_message_id)
        .single();
      contextMessageId = parent?.message_id;
    }

    // 4. Save Outbound Message immediately so the UI can render this reply
    // without waiting for Meta's delivery confirmation.
    const { data: msgRecord, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender_type: 'agent',
        sender_id: user.id,
        content_type: 'text',
        content_text,
        message_id: null,
        status: 'sending',
        reply_to_message_id: reply_to_message_id || null,
      })
      .select()
      .single();

    if (msgError || !msgRecord) {
      console.error('[send] DB error:', msgError);
      return NextResponse.json({ error: 'Failed to create outbound message' }, { status: 500 });
    }

    // 5. Update Conversation asynchronously, after the message is persisted.
    void (async () => {
      try {
        await supabase
          .from('conversations')
          .update({
            last_message_text: content_text,
            last_message_at: new Date().toISOString(),
            unread_count: 0,
          })
          .eq('id', conversation_id);
      } catch (error) {
        console.error('[send] Conversation update failed:', error);
      }
    })();

    // 6. Log the outgoing send request quickly
    void logHttpEvent({
      userId: user.id,
      direction: 'outgoing',
      service: 'whatsapp',
      endpoint: '/api/whatsapp/send',
      payload: { to, text: content_text, conversation_id },
      note: 'agent_reply_queued',
    });

    // 7. Send to Meta in the background. The route already returned.
    void (async () => {
      try {
        const result = await sendTextMessage({
          phoneNumberId: config.phone_number_id,
          accessToken,
          to,
          text: content_text,
          contextMessageId,
        });

        await supabase
          .from('messages')
          .update({
            message_id: result.messageId,
            status: 'sent',
          })
          .eq('id', msgRecord.id);

        void logHttpEvent({
          userId: user.id,
          direction: 'outgoing',
          service: 'whatsapp',
          endpoint: '/api/whatsapp/send',
          payload: { to, text: content_text, wa_message_id: result.messageId },
          note: 'agent_reply_sent',
        });
      } catch (err: any) {
        console.error('[send] Meta API background error:', err);
        await supabase
          .from('messages')
          .update({
            status: 'failed',
          })
          .eq('id', msgRecord.id);

        void logHttpEvent({
          userId: user.id,
          direction: 'outgoing',
          service: 'whatsapp',
          endpoint: '/api/whatsapp/send',
          payload: { to, text: content_text, error: err?.message ?? String(err) },
          note: 'agent_reply_failed',
        });
      }
    })();

    return NextResponse.json({ success: true, message: msgRecord });
  } catch (error: any) {
    console.error('[send] Internal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
