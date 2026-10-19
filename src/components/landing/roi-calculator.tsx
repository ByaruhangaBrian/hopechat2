"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Calculator, ArrowRight, Clock, DollarSign, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function RoiCalculator() {
  const [dailyChats, setDailyChats] = useState(60);

  // Calculations based on 3 min manual chat time, 75% automation rate, and 8% lead conversion boost
  const monthlyChats = dailyChats * 30;
  const hoursSavedMonthly = Math.round((monthlyChats * (3.5 / 60)) * 0.75);
  const hoursSavedWeekly = Math.round(hoursSavedMonthly / 4.3);
  // Average retail ticket estimated at 50,000 UGX with conservative 6% recovered sales from instant replies
  const recoveredRevenueUgx = Math.round(monthlyChats * 0.06 * 50000);

  return (
    <section id="roi-calculator" className="py-20 lg:py-28 bg-white border-t border-border overflow-hidden relative">
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/[0.04] rounded-full blur-[140px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 space-y-14">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full">
            <Calculator className="size-3.5" /> ROI & Time Calculator
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Calculate your time and revenue recovered
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed font-medium">
            See how many manual hours your team saves every month and how much lost revenue instant automated replies recover.
          </p>
        </div>

        {/* Interactive Calculator Container */}
        <div className="max-w-4xl mx-auto rounded-3xl border border-border/80 bg-slate-50/70 p-6 sm:p-10 lg:p-12 shadow-xl shadow-emerald-950/5">
          <div className="space-y-8">
            {/* Slider Control */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <label htmlFor="daily-chats-slider" className="text-base sm:text-lg font-bold text-foreground block">
                    Daily Customer Inquiries
                  </label>
                  <p className="text-xs text-muted-foreground font-medium">
                    Incoming WhatsApp messages and lead queries received per day
                  </p>
                </div>
                <div className="inline-flex items-baseline gap-1.5 bg-white border border-emerald-500/30 px-4 py-2 rounded-2xl shadow-xs self-start sm:self-auto">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600">
                    {dailyChats}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground uppercase">chats / day</span>
                </div>
              </div>

              {/* Range Slider */}
              <div className="space-y-2 pt-2">
                <input
                  id="daily-chats-slider"
                  type="range"
                  min="10"
                  max="400"
                  step="10"
                  value={dailyChats}
                  onChange={(e) => setDailyChats(Number(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                />
                <div className="flex justify-between text-[11px] font-bold text-muted-foreground/70">
                  <span>10 chats/day</span>
                  <span>100 chats/day</span>
                  <span>250 chats/day</span>
                  <span>400+ chats/day</span>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-border">
              {/* Card 1: Hours Saved */}
              <motion.div
                key={`hours-${dailyChats}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-emerald-500/30 bg-white p-5 shadow-sm text-center sm:text-left group"
              >
                <div className="flex items-center justify-center sm:justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hours Saved</span>
                  <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Clock className="size-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-foreground tracking-tight">
                  ~{hoursSavedMonthly} <span className="text-base font-semibold text-muted-foreground">hrs/mo</span>
                </div>
                <p className="text-xs text-emerald-600 font-semibold mt-1">
                  ~{hoursSavedWeekly} hrs saved every week
                </p>
              </motion.div>

              {/* Card 2: Recovered Revenue */}
              <motion.div
                key={`revenue-${dailyChats}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-sky-500/30 bg-white p-5 shadow-sm text-center sm:text-left group"
              >
                <div className="flex items-center justify-center sm:justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Extra Sales</span>
                  <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                    <DollarSign className="size-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-foreground tracking-tight">
                  UGX {(recoveredRevenueUgx / 1000000).toFixed(1)}M
                </div>
                <p className="text-xs text-sky-600 font-semibold mt-1">
                  From instant &lt;10s lead replies
                </p>
              </motion.div>

              {/* Card 3: Automated Volume */}
              <motion.div
                key={`volume-${dailyChats}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-violet-500/30 bg-white p-5 shadow-sm text-center sm:text-left group"
              >
                <div className="flex items-center justify-center sm:justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Volume Handled</span>
                  <div className="size-8 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center">
                    <Users className="size-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-foreground tracking-tight">
                  {monthlyChats.toLocaleString()} <span className="text-base font-semibold text-muted-foreground">chats</span>
                </div>
                <p className="text-xs text-violet-600 font-semibold mt-1">
                  75% answered without human delay
                </p>
              </motion.div>
            </div>

            {/* Bottom Callout & CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground text-center sm:text-left">
                <Sparkles className="size-4 text-emerald-600 shrink-0" />
                <span>
                  Based on {monthlyChats.toLocaleString()} monthly chats, HopeChat pays for itself in less than 3 days.
                </span>
              </div>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all border-0 group whitespace-nowrap"
                )}
              >
                Start Free Trial
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
