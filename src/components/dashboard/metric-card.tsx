'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useInView, useMotionValue } from 'framer-motion';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

export type MetricTone = 'emerald' | 'sky' | 'amber' | 'violet' | 'rose' | 'primary';

const TONE_STYLES: Record<MetricTone, {
  iconContainer: string;
  hoverBorder: string;
  cornerGlow: string;
  wash: string;
}> = {
  primary: {
    iconContainer: 'border-primary/20 from-primary/20 to-primary/5 text-primary group-hover:border-primary/40 group-hover:shadow-[0_0_18px_color-mix(in_oklch,var(--primary)_35%,transparent)]',
    hoverBorder: 'hover:border-primary/40 hover:shadow-primary/10',
    cornerGlow: 'bg-primary/5 group-hover:bg-primary/15',
    wash: 'to-primary/5',
  },
  emerald: {
    iconContainer: 'border-emerald-500/25 from-emerald-500/20 to-teal-500/5 text-emerald-500 dark:text-emerald-400 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.35)]',
    hoverBorder: 'hover:border-emerald-500/40 hover:shadow-emerald-500/10',
    cornerGlow: 'bg-emerald-500/5 group-hover:bg-emerald-500/15',
    wash: 'to-emerald-500/5',
  },
  sky: {
    iconContainer: 'border-sky-500/25 from-sky-500/20 to-blue-500/5 text-sky-500 dark:text-sky-400 group-hover:border-sky-500/50 group-hover:shadow-[0_0_20px_rgba(14,165,233,0.35)]',
    hoverBorder: 'hover:border-sky-500/40 hover:shadow-sky-500/10',
    cornerGlow: 'bg-sky-500/5 group-hover:bg-sky-500/15',
    wash: 'to-sky-500/5',
  },
  amber: {
    iconContainer: 'border-amber-500/25 from-amber-500/20 to-orange-500/5 text-amber-500 dark:text-amber-400 group-hover:border-amber-500/50 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]',
    hoverBorder: 'hover:border-amber-500/40 hover:shadow-amber-500/10',
    cornerGlow: 'bg-amber-500/5 group-hover:bg-amber-500/15',
    wash: 'to-amber-500/5',
  },
  violet: {
    iconContainer: 'border-violet-500/25 from-violet-500/20 to-purple-500/5 text-violet-500 dark:text-violet-400 group-hover:border-violet-500/50 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.35)]',
    hoverBorder: 'hover:border-violet-500/40 hover:shadow-violet-500/10',
    cornerGlow: 'bg-violet-500/5 group-hover:bg-violet-500/15',
    wash: 'to-violet-500/5',
  },
  rose: {
    iconContainer: 'border-rose-500/25 from-rose-500/20 to-pink-500/5 text-rose-500 dark:text-rose-400 group-hover:border-rose-500/50 group-hover:shadow-[0_0_20px_rgba(244,63,94,0.35)]',
    hoverBorder: 'hover:border-rose-500/40 hover:shadow-rose-500/10',
    cornerGlow: 'bg-rose-500/5 group-hover:bg-rose-500/15',
    wash: 'to-rose-500/5',
  },
};

interface MetricCardProps {
  title: string;
  /** Pre-formatted value for display (e.g. "42" or "$1,250"). */
  value: string;
  icon: ComponentType<{ className?: string }>;
  /**
   * Delta-mode secondary row: arrow + delta text. Omit when the metric
   * doesn't have a sensible comparison (e.g. total pipeline value).
   */
  delta?: {
    /** Positive / negative / zero drives arrow + color. */
    sign: number;
    /** Pre-formatted delta, e.g. "+3 vs yesterday". */
    label: string;
  };
  /** Used instead of `delta` when the metric has a static subtitle. */
  subtitle?: string;
  /** Visual accent tone. Defaults to 'primary'. */
  tone?: MetricTone;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  delta,
  subtitle,
  tone = 'primary',
}: MetricCardProps) {
  const styles = TONE_STYLES[tone] ?? TONE_STYLES.primary;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className={cn(
        "group border-border bg-card hairline-top relative overflow-hidden rounded-2xl border p-6 transition-colors duration-300 hover:shadow-2xl",
        styles.hoverBorder
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
            {title}
          </p>
          <AnimatedNumber value={value} />
        </div>
        <div className={cn(
          "relative flex size-12 items-center justify-center rounded-xl border bg-gradient-to-tr transition-all duration-300",
          styles.iconContainer
        )}>
          <Icon className="size-6 transition-transform duration-300 group-hover:scale-110" />
        </div>
      </div>

      <div className="mt-4">
        {delta ? (
          <DeltaRow sign={delta.sign} label={delta.label} />
        ) : subtitle ? (
          <p className="text-muted-foreground/50 text-sm font-medium">
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* Hover wash + decorative corner glow */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-transparent via-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          styles.wash
        )}
      />
      <div
        aria-hidden
        className={cn(
          "absolute -top-4 -right-4 size-24 rounded-full blur-3xl transition-colors duration-300",
          styles.cornerGlow
        )}
      />
    </motion.div>
  );
}

/**
 * Count-up value that strips a leading currency symbol (and thousands
 * separators), counts the integer up once in view, then re-formats with
 * the original grouping/fraction style. Non-numeric values (e.g. "4.2k")
 * render statically so nothing is ever displayed wrong.
 */
function AnimatedNumber({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(() => {
    const parsed = parseDisplayNumber(value);
    return parsed ? formatDisplayNumber(0, parsed) : value;
  });

  const parsed = useMemo(() => parseDisplayNumber(value), [value]);
  const target = parsed?.numeric;

  useEffect(() => {
    if (!inView || target == null) return;
    const controls = animate(mv, target, {
      duration: 1,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (parsed) setDisplay(formatDisplayNumber(Math.round(v), parsed));
      },
    });
    return () => controls.stop();
  }, [inView, target, mv, parsed]);

  return (
    <span
      ref={ref}
      className="text-foreground mt-2 block text-3xl font-black tracking-tight tabular-nums"
    >
      {display}
    </span>
  );
}

interface ParsedDisplay {
  prefix: string;
  suffix: string;
  numeric: number;
  fractionDigits: number;
  grouping: boolean;
}

function parseDisplayNumber(value: string): ParsedDisplay | null {
  const m = value.match(/^([^\d,]*)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const numeric = parseFloat(m[2].replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return null;
  return {
    prefix: m[1],
    suffix: m[3],
    numeric,
    fractionDigits: m[2].match(/\.(\d+)/)?.[1].length ?? 0,
    grouping: m[2].includes(','),
  };
}

function formatDisplayNumber(v: number, parsed: ParsedDisplay): string {
  const body = parsed.grouping
    ? v.toLocaleString(undefined, {
        maximumFractionDigits: parsed.fractionDigits,
      })
    : v.toFixed(parsed.fractionDigits);
  return `${parsed.prefix}${body}${parsed.suffix}`;
}

function DeltaRow({ sign, label }: { sign: number; label: string }) {
  const isPositive = sign > 0;
  const isNegative = sign < 0;

  const tone = isPositive
    ? 'text-emerald-500 bg-emerald-500/10'
    : isNegative
      ? 'text-rose-500 bg-rose-500/10'
      : 'text-muted-foreground bg-muted/50';

  const Arrow = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold',
        tone
      )}
    >
      <Arrow className="size-3.5" aria-hidden />
      <span className="tabular-nums">{label}</span>
    </div>
  );
}
