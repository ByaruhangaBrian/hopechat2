import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  /** Pre-formatted value for display (e.g. "42" or "$1,250"). */
  value: string
  icon: ComponentType<{ className?: string }>
  /**
   * Delta-mode secondary row: arrow + delta text. Omit when the metric
   * doesn't have a sensible comparison (e.g. total pipeline value).
   */
  delta?: {
    /** Positive / negative / zero drives arrow + color. */
    sign: number
    /** Pre-formatted delta, e.g. "+3 vs yesterday". */
    label: string
  }
  /** Used instead of `delta` when the metric has a static subtitle. */
  subtitle?: string
}

export function MetricCard({ title, value, icon: Icon, delta, subtitle }: MetricCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        </div>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground shadow-inner">
          <Icon className="size-6" />
        </div>
      </div>
      
      <div className="mt-4">
        {delta ? <DeltaRow sign={delta.sign} label={delta.label} /> : subtitle ? (
          <p className="text-sm font-medium text-muted-foreground/50">{subtitle}</p>
        ) : null}
      </div>

      {/* Decorative corner glow */}
      <div className="absolute -right-4 -top-4 size-24 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-colors" />
    </div>
  )
}

function DeltaRow({ sign, label }: { sign: number; label: string }) {
  const isPositive = sign > 0;
  const isNegative = sign < 0;
  
  const tone = isPositive 
    ? 'text-emerald-500 bg-emerald-500/10' 
    : isNegative 
    ? 'text-rose-500 bg-rose-500/10' 
    : 'text-muted-foreground bg-muted/50';

  const Arrow = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus
  
  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold', tone)}>
      <Arrow className="size-3.5" aria-hidden />
      <span className="tabular-nums">{label}</span>
    </div>
  )
}
