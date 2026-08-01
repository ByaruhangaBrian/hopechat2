'use client';

import { MessageSquareText, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BroadcastChannel = 'whatsapp' | 'sms';

interface ChannelSelectProps {
  channel: BroadcastChannel;
  onChange: (channel: BroadcastChannel) => void;
  disabled?: boolean;
}

const channels: {
  value: BroadcastChannel;
  label: string;
  description: string;
  icon: typeof Radio;
}[] = [
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    description: 'Approved templates, personalization, delivery/read tracking',
    icon: Radio,
  },
  {
    value: 'sms',
    label: 'SMS Text',
    description: 'Plain message (max 160 chars), no template required',
    icon: MessageSquareText,
  },
];

export function ChannelSelect({ channel, onChange, disabled }: ChannelSelectProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">Channel</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {channels.map((c) => {
          const isSelected = channel === c.value;
          const Icon = c.icon;
          return (
            <button
              key={c.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(c.value)}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card/50 hover:border-border',
              )}
            >
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{c.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {c.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
