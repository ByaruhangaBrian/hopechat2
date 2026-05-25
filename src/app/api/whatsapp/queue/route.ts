import { NextResponse } from 'next/server';
import { processPendingWhatsAppAiJobs } from '@/lib/whatsapp/ai-worker';

export async function GET(request: Request) {
  const expected = process.env.WHATSAPP_AI_QUEUE_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'queue secret not configured' }, { status: 503 });
  }

  const supplied = request.headers.get('x-queue-secret');
  if (supplied !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const processed = await processPendingWhatsAppAiJobs(20);
  return NextResponse.json({ processed });
}
