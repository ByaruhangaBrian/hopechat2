'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { UserPlus, Briefcase, Radio, Zap } from 'lucide-react';
import type { ComponentType } from 'react';

// Quick-action shortcuts. Each navigates to the page that owns the
// relevant "create" flow. We deliberately don't try to auto-open any
// modal on the target page — that'd require touching those pages,
// which is out of scope here.
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
    chip: 'border border-primary/20 bg-gradient-to-tr from-primary/20 to-primary/5 text-primary',
  },
  {
    label: 'New Deal',
    href: '/pipelines',
    icon: Briefcase,
    chip: 'border border-blue-500/20 bg-gradient-to-tr from-blue-500/20 to-blue-500/5 text-blue-400',
  },
  {
    label: 'New Broadcast',
    href: '/broadcasts/new',
    icon: Radio,
    chip: 'border border-amber-500/20 bg-gradient-to-tr from-amber-500/20 to-amber-500/5 text-amber-400',
  },
  {
    label: 'New Automation',
    href: '/automations/new',
    icon: Zap,
    chip: 'border border-primary/20 bg-gradient-to-tr from-primary/20 to-primary/5 text-primary',
  },
];

const gridContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const cardItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export function QuickActions() {
  return (
    <motion.div
      variants={gridContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <motion.div
            key={a.href}
            variants={cardItem}
            whileHover={{ y: -3, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          >
            <Link
              href={a.href}
              className="group border-border bg-card hover:border-primary/40 hover:bg-muted/60 flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-300"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg shadow-inner transition-transform duration-300 group-hover:scale-110 ${a.chip}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-foreground text-sm font-medium">
                {a.label}
              </span>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
