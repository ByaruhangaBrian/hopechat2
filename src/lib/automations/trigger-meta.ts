import type { AutomationTriggerType } from '@/types'

export interface TriggerMeta {
  label: string
  /** Tailwind classes for the Badge pill on the list row. */
  pillClass: string
}

export const TRIGGER_META: Record<AutomationTriggerType, TriggerMeta> = {
  new_message_received: {
    label: "New Message",
    pillClass: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  first_inbound_message: {
    label: "First Message from Contact",
    pillClass: "border-teal-500/20 bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
  keyword_match: {
    label: "Keyword Match",
    pillClass: "border-primary/20 bg-primary/10 text-primary",
  },
  new_contact_created: {
    label: "New Contact",
    pillClass: "border-primary/20 bg-primary/10 text-primary",
  },
  conversation_assigned: {
    label: "Conversation Assigned",
    pillClass: "border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
  tag_added: {
    label: "Tag Added",
    pillClass: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  time_based: {
    label: "Time-Based",
    pillClass: "border-muted-foreground/20 bg-muted/50 text-muted-foreground",
  },
}

export function triggerMeta(t: AutomationTriggerType | string): TriggerMeta {
  return (
    TRIGGER_META[t as AutomationTriggerType] ?? {
      label: t,
      pillClass: "border-muted-foreground/20 bg-muted/50 text-muted-foreground",
    }
  )
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return 'never'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'never'
  const diffSec = Math.round((Date.now() - then) / 1000)
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 2_592_000) return `${Math.floor(diffSec / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

