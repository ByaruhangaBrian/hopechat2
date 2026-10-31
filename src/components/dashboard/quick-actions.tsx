'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { UserPlus, Briefcase, Radio, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComponentType } from 'react';

// Quick-action shortcuts. Each navigates to the page that owns the
// relevant "create" flow.
interface Action {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  chip: string;
}

const ACTIONS: Action[] = [
  {
    label: 'New Contact',
    href: '/contacts',
    icon: UserPlus,
    chip: 'border border-sky-500/25 bg-gradient-to-tr from-sky-500/20 to-sky-500/5 text-sky-500 dark:text-sky-400',
  },
  {
    label: 'New Deal',
    href: '/pipelines',
    icon: Briefcase,
    chip: 'border border-amber-500/25 bg-gradient-to-tr from-amber-500/20 to-amber-500/5 text-amber-500 dark:text-amber-400',
  },
  {
    label: 'New Broadcast',
    href: '/broadcasts/new',
    icon: Radio,
    chip: 'border border-rose-500/25 bg-gradient-to-tr from-rose-500/20 to-rose-500/5 text-rose-500 dark:text-rose-400',
  },
  {
    label: 'New Automation',
    href: '/automations/new',
    icon: Zap,
    chip: 'border border-purple-500/25 bg-gradient-to-tr from-purple-500/20 to-purple-500/5 text-purple-500 dark:text-purple-400',
  },
];

const gridContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const cardItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

export function QuickActions({ className }: { className?: string }) {
  return (
    <motion.div
      variants={gridContainer}
      initial="hidden"
      animate="show"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <motion.div
            key={a.href}
            variants={cardItem}
            whileHover={{ y: -1.5, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          >
            <Link
              href={a.href}
              className="group border-border bg-card/80 hover:border-primary/40 hover:bg-muted/60 inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 sm:px-3 text-xs font-semibold text-foreground transition-all duration-200 shadow-sm"
            >
              <div
                className={cn(
                  "flex size-5 items-center justify-center rounded transition-transform duration-200 group-hover:scale-110",
                  a.chip
                )}
              >
                <Icon className="size-3" />
              </div>
              <span className="whitespace-nowrap">
                {a.label}
              </span>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
