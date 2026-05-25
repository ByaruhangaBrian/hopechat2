import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { decrypt } from '@/lib/whatsapp/encryption';
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-signature';
import { logHttpEvent } from '@/lib/logs/http-logs';
import { enqueueWhatsAppAiJobs, processPendingWhatsAppAiJobs } from '@/lib/whatsapp/ai-worker';

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
export async function POST(request: NextRequest) {
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

  // 4. Enqueue a background job and return immediately so WhatsApp gets a fast 200.
  try {
    await enqueueWhatsAppAiJobs(body);

    // 5. Use waitUntil (Vercel/Next.js 15+) to trigger processing immediately 
    // without blocking the response to Meta. This is much more reliable in 
    // serverless environments than a non-awaited fetch.
    (request as any).waitUntil?.(
      processPendingWhatsAppAiJobs(5).catch((err) => {
        console.error('[webhook] Background processing failed:', err);
      })
    );

    return NextResponse.json({ status: 'queued' }, { status: 200 });
  } catch (err) {
    console.error('[webhook] Queueing error:', err);
    void logHttpEvent({
      userId: null,
      direction: 'incoming',
      service: 'whatsapp',
      endpoint: '/api/whatsapp/webhook',
      payload: {
        note: 'webhook_queue_failed',
        error: err instanceof Error ? err.message : String(err),
        entry_count: Array.isArray(body.entry) ? body.entry.length : 0,
      },
      note: 'webhook_queue_failed',
    });
    return NextResponse.json({ error: 'Webhook queueing failed' }, { status: 500 });
  }
}
