'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Send, Loader2, Users, Coins, MessageSquareText } from 'lucide-react';
import type { AudienceConfig } from '@/hooks/use-broadcast-sending';

interface SmsReviewProps {
  name: string;
  message: string;
  audience: AudienceConfig;
  onSend: () => void;
  onBack: () => void;
  isProcessing: boolean;
  progress: number;
}

function audienceLabel(audience: AudienceConfig): string {
  if (audience.type === 'all') return 'All Contacts';
  if (audience.type === 'tags') return `Tags (${audience.tagIds?.length ?? 0} selected)`;
  if (audience.type === 'csv') return 'CSV Upload';
  return 'Custom Field';
}

export function SmsReview({
  name,
  message,
  audience,
  onSend,
  onBack,
  isProcessing,
  progress,
}: SmsReviewProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [estimatedReach, setEstimatedReach] = useState<number>(0);
  const [loadingReach, setLoadingReach] = useState(true);
  const [costPerMessage, setCostPerMessage] = useState<number>(1);

  useEffect(() => {
    async function calculateReach() {
      setLoadingReach(true);
      try {
        const supabase = createClient();

        let reach = 0;
        if (audience.type === 'all') {
          const { count } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true });
          reach = count ?? 0;
        } else if (audience.type === 'tags' && audience.tagIds && audience.tagIds.length > 0) {
          const { data: contactTags } = await supabase
            .from('contact_tags')
            .select('contact_id')
            .in('tag_id', audience.tagIds);
          reach = new Set((contactTags ?? []).map((ct) => ct.contact_id)).size;
        } else if (audience.type === 'custom_field' && audience.customField) {
          const { fieldId, operator, value } = audience.customField;
          let q = supabase
            .from('contact_custom_values')
            .select('contact_id')
            .eq('custom_field_id', fieldId);
          if (operator === 'is') q = q.eq('value', value);
          else if (operator === 'is_not') q = q.neq('value', value);
          else q = q.ilike('value', `%${value}%`);
          const { data } = await q;
          reach = new Set((data ?? []).map((d) => d.contact_id)).size;
        } else if (audience.type === 'csv' && audience.csvContacts) {
          reach = audience.csvContacts.length;
        }
        setEstimatedReach(reach);
      } finally {
        setLoadingReach(false);
      }
    }

    calculateReach();

    // Show the real per-message credit cost from the admin config.
    fetch('/api/credits/deduct')
      .then((r) => r.json())
      .then((data) => {
        if (data?.sms_per_message?.credits) {
          setCostPerMessage(data.sms_per_message.credits);
        }
      })
      .catch(() => {
        // Keep the default cost if the lookup fails.
      });
  }, [audience]);

  const estimatedCost = estimatedReach * costPerMessage;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Review & Send</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Double-check your SMS details before sending.
        </p>
      </div>

      {/* Summary Card */}
      <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
        <p className="text-sm font-medium text-foreground">Summary</p>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Broadcast Name</p>
            <p className="text-foreground">{name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Audience</p>
            <p className="text-foreground">{audienceLabel(audience)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estimated Reach</p>
            <div className="flex items-center gap-1.5">
              {loadingReach ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : (
                <>
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <p className="font-medium text-foreground">
                    {estimatedReach.toLocaleString()}
                  </p>
                </>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estimated Cost</p>
            <div className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              <p className="font-medium text-foreground">
                {estimatedCost.toLocaleString()} credits
              </p>
              <span className="text-[10px] text-muted-foreground/60">
                ({costPerMessage} credit × recipient)
              </span>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">Message Preview</p>
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <div className="flex items-start gap-2">
              <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm whitespace-pre-wrap text-foreground">{message}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">Sending SMS broadcast...</p>
            </div>
            <span className="text-xs font-medium text-primary">{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          className="border-border text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogTrigger
            render={
              <Button
                disabled={isProcessing}
                className="bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              />
            }
          >
            <Send className="h-4 w-4" />
            Send SMS Broadcast
          </DialogTrigger>
          <DialogContent className="border-border bg-card sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">Confirm SMS Broadcast</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                You are about to send this SMS to approximately{' '}
                <span className="font-medium text-foreground">
                  {estimatedReach.toLocaleString()}
                </span>{' '}
                recipients. This will cost about{' '}
                <span className="font-medium text-foreground">
                  {estimatedCost.toLocaleString()}
                </span>{' '}
                credits and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                className="border-border text-muted-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowConfirm(false);
                  onSend();
                }}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
                Confirm & Send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
