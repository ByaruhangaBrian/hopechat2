'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, ArrowLeft, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MAX_SMS_LENGTH = 160;

interface SmsComposeProps {
  name: string;
  onNameChange: (name: string) => void;
  message: string;
  onMessageChange: (message: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function SmsCompose({
  name,
  onNameChange,
  message,
  onMessageChange,
  onNext,
  onBack,
}: SmsComposeProps) {
  const remaining = MAX_SMS_LENGTH - message.length;
  const nearLimit = remaining <= 20;
  const isValid = name.trim().length > 0 && message.trim().length > 0 && remaining >= 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Compose SMS</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Write a plain text message. No templates or personalization needed.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Broadcast Name
        </label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Promo Monday Flash Sale"
          className="border-border bg-muted text-foreground placeholder:text-muted-foreground/50"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground">
            Message
          </label>
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              remaining < 0
                ? 'text-red-400'
                : nearLimit
                  ? 'text-amber-400'
                  : 'text-muted-foreground',
            )}
          >
            {message.length.toLocaleString()} / {MAX_SMS_LENGTH}
          </span>
        </div>
        <Textarea
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Hi {first name}! This weekend only: 20% off everything at Hope Mart. Visit us today."
          rows={5}
          className="min-h-[140px] border-border bg-muted text-foreground placeholder:text-muted-foreground/50"
        />
        {remaining < 0 ? (
          <p className="mt-1.5 text-xs text-red-400">
            Message is {Math.abs(remaining).toLocaleString()} characters over the
            limit. Split it into multiple messages or shorten it.
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground/60">
            A single SMS is capped at {MAX_SMS_LENGTH} characters.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-4 text-xs text-muted-foreground leading-relaxed">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Every recipient is billed{' '}
            <span className="font-medium text-foreground">1 credit per message</span>,
            deducted once from your business balance when the broadcast is sent.
            Recipients are capped at 1,000 numbers per broadcast.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-border text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
