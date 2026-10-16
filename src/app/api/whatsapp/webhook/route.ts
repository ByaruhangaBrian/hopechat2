import { NextRequest, NextResponse, after } from 'next/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { decrypt } from '@/lib/whatsapp/encryption';
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-signature';
import { logHttpEvent } from '@/lib/logs/http-logs';
import { enqueueWhatsAppAiJobs, processPendingWhatsAppAiJobs, DEBOUNCE_DELAY_MS } from '@/lib/whatsapp/ai-worker';

// The post-response worker (after) waits out the debounce window and then
// runs Gemini, so this route needs more headroom than the default.
export const maxDuration = 30;

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
      const { data: settings } = await supabaseAdmin()
        .from('system_settings')
        .select('value')
        .eq('id', 'whatsapp_global')
        .maybeSingle();

      const globalVerifyToken = settings?.value?.verify_token;

      if (globalVerifyToken && globalVerifyToken === verifyToken) {
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
    // Persist messages + enqueue AI jobs synchronously. The enqueue path
    // is idempotent on Meta's wamid, so a redelivered payload is a no-op.
    const scheduled = await enqueueWhatsAppAiJobs(body);

    // 3. Background Orchestration
    // Acknowledge to Meta immediately — a slow (or timed-out) response
    // makes Meta redeliver the payload, and each redelivery used to
    // generate an extra AI reply for the same message. The worker runs
    // post-response via after() (waitUntil-backed on Vercel).
    if (scheduled > 0) {
      after(async () => {
        // Wait out the debounce window so rapid-fire messages coalesce
        // into one AI reply instead of one reply per message.
        await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_DELAY_MS + 500));
        await processPendingWhatsAppAiJobs(10).catch((err) => {
          console.error('[webhook] Background processing failed:', err);
        });
      });
    }

    return NextResponse.json({ status: 'queued' }, { status: 200 });
  } catch (err: any) {
    console.error('[webhook] Flow error:', err);
    
    // Log fatal flow errors
    void logHttpEvent({
      userId: null,
      direction: 'incoming',
      service: 'whatsapp',
      endpoint: 'webhook_fatal',
      payload: { error: err.message, stack: err.stack },
      statusCode: 500,
      note: 'webhook_flow_crashed',
    });

    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
