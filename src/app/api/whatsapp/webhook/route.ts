import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { decrypt } from '@/lib/whatsapp/encryption';
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-signature';
import { logHttpEvent } from '@/lib/logs/http-logs';
import { enqueueWhatsAppAiJobs, processPendingWhatsAppAiJobs } from '@/lib/whatsapp/ai-worker';

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
      messages?: any[];
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
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  // 1. Fast Return for Speed
  // (We'll verify and process, but keep the flow tight)
  if (!verifyMetaWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: { entry?: WhatsAppWebhookEntry[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Log raw reception for traceability
  void logHttpEvent({
    userId: null,
    direction: 'incoming',
    service: 'whatsapp',
    endpoint: '/api/whatsapp/webhook',
    payload: { stage: 'webhook_received', body },
    note: 'webhook_received',
  });

  // 2. High-Speed Processing
  try {
    // Process all enqueuing and saving tasks
    await enqueueWhatsAppAiJobs(body);

    // 3. Background Orchestration
    // We trigger the worker to check for overdue jobs (including old pending ones)
    // The worker now handles the 10s debounce logic.
    (request as any).waitUntil?.(
      processPendingWhatsAppAiJobs(10).catch((err) => {
        console.error('[webhook] Background processing failed:', err);
      })
    );

    return NextResponse.json({ status: 'queued' }, { status: 200 });
  } catch (err: any) {
    console.error('[webhook] Flow error:', err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
