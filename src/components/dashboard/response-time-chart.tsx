'use client';

import { Clock } from 'lucide-react';
import { DOW_SHORT_MON_FIRST } from '@/lib/dashboard/date-utils';
import type { ResponseTimeSummary } from '@/lib/dashboard/types';
import { EmptyState } from './empty-state';
import { Skeleton } from './skeleton';

interface ResponseTimeChartProps {
  data: ResponseTimeSummary | null;
  loading: boolean;
  /** Minutes. Horizontal dashed line rendered at this height. */
  thresholdMinutes?: number;
}

const VB_W = 760;
const VB_H = 220;
const PADDING = { top: 24, right: 16, bottom: 32, left: 44 };

export function ResponseTimeChart({
  data,
  loading,
  thresholdMinutes = 5,
}: ResponseTimeChartProps) {
  const hasData = data?.buckets.some((b) => b.avgMinutes != null) ?? false;

  return (
    <section className="border-border bg-card hover:border-primary/40 hover:shadow-primary/5 hairline-top relative overflow-hidden rounded-xl border transition-colors duration-300 hover:shadow-lg">
      <header className="border-border/70 bg-muted/20 flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="text-foreground text-sm font-semibold">
            Average First Response Time
          </h2>
          <p className="text-muted-foreground/60 mt-0.5 text-xs">
            Minutes to reply to a customer&apos;s first unreplied message, by
            weekday
          </p>
        </div>
        {data && (data.thisWeekAvg != null || data.lastWeekAvg != null) && (
          <div className="text-right text-xs">
            <div className="text-muted-foreground">
              This week:{' '}
              <span className="text-foreground font-medium tabular-nums">
                {fmt(data.thisWeekAvg)}
              </span>
            </div>
            <div className="text-muted-foreground/60">
              Last week:{' '}
              <span className="tabular-nums">{fmt(data.lastWeekAvg)}</span>
            </div>
          </div>
        )}
      </header>

      <div className="p-5">
        {loading || !data ? (
          <Skeleton className="h-[220px] w-full" />
        ) : !hasData ? (
          <EmptyState
            icon={Clock}
            title="No replies recorded yet"
            hint="This chart fills in as you reply to customer messages."
          />
        ) : (
          <Bars data={data} thresholdMinutes={thresholdMinutes} />
        )}
      </div>
    </section>
  );
}

function Bars({
  data,
  thresholdMinutes,
}: {
  data: ResponseTimeSummary;
  thresholdMinutes: number;
}) {
  const chartW = VB_W - PADDING.left - PADDING.right;
  const chartH = VB_H - PADDING.top - PADDING.bottom;

  const values = data.buckets.map((b) => b.avgMinutes ?? 0);
  const rawMax = Math.max(thresholdMinutes * 1.2, ...values);
  const maxY = niceCeil(rawMax);
  const yFor = (v: number) =>
    maxY === 0
      ? PADDING.top + chartH
      : PADDING.top + chartH - (v / maxY) * chartH;

  const barSlot = chartW / 7;
  const barW = Math.min(44, barSlot * 0.55);

  const ticks = [0, maxY / 2, maxY].map((t) => Math.round(t));

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="h-[220px] w-full"
      role="img"
    >
      <defs>
        <linearGradient id="respBarGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#10b8a2" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b8a2" />
        </linearGradient>
        <linearGradient id="respBarGradWarn" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="rgb(244 63 94)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(244 63 94)" />
        </linearGradient>
      </defs>

      {/* Y grid */}
      {ticks.map((t) => {
        const y = yFor(t);
        return (
          <g key={t}>
            <line
              x1={PADDING.left}
              x2={VB_W - PADDING.right}
              y1={y}
              y2={y}
              className="stroke-border/70"
              strokeDasharray="3 3"
            />
            <text
              x={PADDING.left - 8}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground/60 text-[10px]"
            >
              {t}m
            </text>
          </g>
        );
      })}

      {/* Threshold line — rendered after grid so it sits on top, but
          we keep it muted so bars remain the visual focus. */}
      {thresholdMinutes > 0 && thresholdMinutes <= maxY && (
        <g>
          <line
            x1={PADDING.left}
            x2={VB_W - PADDING.right}
            y1={yFor(thresholdMinutes)}
            y2={yFor(thresholdMinutes)}
            className="stroke-rose-500"
            strokeDasharray="4 4"
            strokeWidth={1.25}
            opacity={0.8}
          />
          <text
            x={VB_W - PADDING.right - 4}
            y={yFor(thresholdMinutes) - 4}
            textAnchor="end"
            className="fill-rose-400 text-[10px] font-medium"
          >
            target {thresholdMinutes}m
          </text>
        </g>
      )}

      {/* Bars */}
      {data.buckets.map((b, i) => {
        const v = b.avgMinutes ?? 0;
        const x = PADDING.left + barSlot * i + (barSlot - barW) / 2;
        const y = yFor(v);
        const h = PADDING.top + chartH - y;
        const muted = b.avgMinutes == null;
        const overThreshold = !muted && v > thresholdMinutes;
        return (
          <g key={i}>
            <rect
              x={x}
              y={muted ? PADDING.top + chartH - 2 : y}
              width={barW}
              height={muted ? 2 : Math.max(1, h)}
              rx={6}
              fill={
                muted
                  ? 'currentColor'
                  : overThreshold
                    ? 'url(#respBarGradWarn)'
                    : 'url(#respBarGrad)'
              }
              opacity={muted ? 0.25 : overThreshold ? 1 : 0.95}
              className={muted ? 'text-muted-foreground' : undefined}
            >
              <title>
                {DOW_SHORT_MON_FIRST[i]}:{' '}
                {b.avgMinutes == null
                  ? 'no samples'
                  : `${b.avgMinutes.toFixed(1)} min avg`}
                {b.samples > 0
                  ? ` (${b.samples} sample${b.samples === 1 ? '' : 's'})`
                  : ''}
              </title>
            </rect>
            <text
              x={x + barW / 2}
              y={VB_H - 10}
              textAnchor="middle"
              className="fill-muted-foreground/70 text-[11px]"
            >
              {DOW_SHORT_MON_FIRST[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function fmt(mins: number | null): string {
  if (mins == null) return '—';
  if (mins < 1) return `${Math.max(1, Math.round(mins * 60))}s`;
  if (mins < 60) return `${mins.toFixed(1)}m`;
  return `${(mins / 60).toFixed(1)}h`;
}

function niceCeil(max: number): number {
  if (max <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / pow;
  let nice: number;
  if (n <= 1) nice = 1;
  else if (n <= 2) nice = 2;
  else if (n <= 5) nice = 5;
  else nice = 10;
  return nice * pow;
}
