'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  resolveAudience,
  type AudienceConfig,
} from '@/hooks/use-broadcast-sending';

interface SmsBroadcastPayload {
  name: string;
  message: string;
  audience: AudienceConfig;
}

interface UseSmsSendingReturn {
  sendSmsBroadcast: (payload: SmsBroadcastPayload) => Promise<string>;
  isProcessing: boolean;
  progress: number;
}

/**
 * Client-side driver for bulk SMS broadcasts. Resolves the audience
 * (same logic as WhatsApp broadcasts, so CSV uploads and tag filters
 * behave identically) then hands the resolved recipient list to the
 * server route, which persists the broadcast, gates on credits, and
 * dispatches to the SMS gateway in one call.
 */
export function useSmsSending(): UseSmsSendingReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  async function sendSmsBroadcast(
    payload: SmsBroadcastPayload,
  ): Promise<string> {
    setIsProcessing(true);
    setProgress(5);

    try {
      const supabase = createClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        throw new Error('You are not signed in.');
      }

      setProgress(20);
      const contacts = await resolveAudience(payload.audience);

      if (contacts.length === 0) {
        throw new Error('No contacts found for this audience.');
      }

      const recipients = contacts
        .filter((c) => c.phone)
        .map((c) => ({ contactId: c.id, phone: c.phone }));

      if (recipients.length === 0) {
        throw new Error(
          'None of the selected contacts have a phone number to send an SMS to.',
        );
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.business_id) {
        throw new Error('Unable to determine your business.');
      }

      setProgress(45);
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: profile.business_id,
          name: payload.name,
          message: payload.message,
          audience: payload.audience,
          recipients,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send SMS broadcast');
      }

      setProgress(100);
      return data.broadcastId as string;
    } finally {
      setIsProcessing(false);
    }
  }

  return { sendSmsBroadcast, isProcessing, progress };
}
