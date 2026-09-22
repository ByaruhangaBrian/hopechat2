'use client';

import { motion } from 'framer-motion';
import { GitBranch } from 'lucide-react';
import type { PipelineDonutData } from '@/lib/dashboard/types';
import { EmptyState } from './empty-state';
import { Skeleton } from './skeleton';

interface PipelineDonutProps {
  data: PipelineDonutData | null;
  loading: boolean;
}

export function PipelineDonut({ data, loading }: PipelineDonutProps) {
  return (
    <section className="border-border bg-card hover:border-primary/40 hover:shadow-primary/5 hairline-top relative flex h-full flex-col overflow-hidden rounded-xl border transition-colors duration-300 hover:shadow-lg">
      <header className="border-border/70 bg-muted/20 border-b px-5 py-4">
        <h2 className="text-foreground text-sm font-semibold">
          Pipeline Value
        </h2>
        <p className="text-muted-foreground/60 mt-0.5 text-xs">
          Open deals by stage
        </p>
      </header>

      <div className="flex flex-1 flex-col p-5">
        {loading || !data ? (
          <Skeleton className="h-56 w-full" />
        ) : data.stages.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="No open deals yet"
            hint="Create deals in Pipelines to see stage breakdowns here."
          />
        ) : (
          <>
            <Donut data={data} />
            <ul className="mt-5 space-y-1">
              {data.stages.map((s) => (
                <li
                  key={s.id}
                  className="hover:bg-muted/50 -mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 text-xs transition-colors"
                >
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                    style={{ background: s.color }}
                    aria-hidden
                  />
                  <span className="text-muted-foreground flex-1 truncate">
                    {s.name}
                  </span>
                  <span className="text-muted-foreground/40 tabular-nums">
                    {s.dealCount} deal{s.dealCount === 1 ? '' : 's'}
                  </span>
                  <span className="text-foreground w-20 text-right font-semibold tabular-nums">
                    {formatCurrencyShort(s.totalValue)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// SVG ring. 200×200 viewBox, 12px ring width. We draw one <path>
// per stage using an SVG arc from startAngle → endAngle. Gaps
// between segments are implied by a thin slate-900 stroke between
// them for a cleaner look.
// ------------------------------------------------------------
function Donut({ data }: { data: PipelineDonutData }) {
  const size = 200;
  const r = 80;
  const ringWidth = 18;
  const cx = size / 2;
  const cy = size / 2;

  // Small slices would render as slivers that disappear into stroke
  // rounding. We give each stage a floor share purely for rendering,
  // but keep the labels/legend honest with the actual totals.
  const totalRaw = data.totalValue || 1;
  const minFrac = 0.02;
  const rawShares = data.stages.map((s) => s.totalValue / totalRaw);
  const floored = rawShares.map((x) => Math.max(x, minFrac));
  const floorSum = floored.reduce((a, b) => a + b, 0);
  const shares = floored.map((x) => x / floorSum);

  // Build a cumulative-offset array, then map stages → arc paths. Using
  // a pre-computed offsets array avoids the Next 16 React Compiler's
  // "Cannot reassign variable after render completes" rule.
  const offsets: number[] = [0];
  for (let i = 0; i < shares.length; i++) offsets.push(offsets[i] + shares[i]);
  const segments = data.stages.map((s, i) => {
    const start = offsets[i] * Math.PI * 2 - Math.PI / 2;
    const end = offsets[i + 1] * Math.PI * 2 - Math.PI / 2;
    return { path: arcPath(cx, cy, r, start, end), color: s.color, id: s.id };
  });

  return (
    <div className="flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="h-48 w-48"
          role="img"
          aria-label="Pipeline value by stage"
        >
          {/* background ring */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            className="text-border/40"
            strokeWidth={ringWidth}
          />
          {segments.map((seg) => (
            <path
              key={seg.id}
              d={seg.path}
              fill="none"
              stroke={seg.color}
              strokeWidth={ringWidth}
              strokeLinecap="butt"
              style={
                /^#[0-9a-fA-F]{6}$/.test(seg.color)
                  ? { filter: `drop-shadow(0 0 6px ${seg.color}66)` }
                  : undefined
              }
            />
          ))}
          {/* center label */}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            className="fill-muted-foreground/60 text-[11px] font-medium"
          >
            Total
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            className="fill-foreground text-[18px] font-semibold tabular-nums"
          >
            {formatCurrencyShort(data.totalValue)}
          </text>
        </svg>
      </motion.div>
    </div>
  );
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startRad: number,
  endRad: number
): string {
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endRad - startRad > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function formatCurrencyShort(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}
