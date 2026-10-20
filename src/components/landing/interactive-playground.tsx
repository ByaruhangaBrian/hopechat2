"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck,
  FolderTree,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ScenarioKey = "retail" | "booking" | "quiz";

interface Scenario {
  id: ScenarioKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  color: string;
  bg: string;
  activeBorder: string;
}

const scenarios: Scenario[] = [
  {
    id: "retail",
    label: "Product Inquiry & Sales",
    icon: ShoppingBag,
    tag: "E-Commerce",
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    activeBorder: "border-emerald-500/50 bg-emerald-500/5",
  },
  {
    id: "booking",
    label: "Appointment Booking",
    icon: CalendarCheck,
    tag: "Services & Clinics",
    color: "text-sky-600",
    bg: "bg-sky-500/10",
    activeBorder: "border-sky-500/50 bg-sky-500/5",
  },
  {
    id: "quiz",
    label: "WhatsApp Practice Quiz",
    icon: FolderTree,
    tag: "Education & Exams",
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    activeBorder: "border-amber-500/50 bg-amber-500/5",
  },
];

export function InteractivePlayground() {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>("retail");

  // Retail scenario state
  const [retailOrdered, setRetailOrdered] = useState(false);

  // Booking scenario state
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Quiz scenario state
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const resetState = () => {
    setRetailOrdered(false);
    setSelectedSlot(null);
    setSelectedAnswer(null);
  };

  return (
    <section id="demo-playground" className="py-20 lg:py-28 bg-slate-50/60 border-t border-border overflow-hidden relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full">
            <Sparkles className="size-3.5" /> Live Sandbox
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Try HopeChat live in your browser
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed font-medium">
            Tap any scenario below to experience how HopeChat engages customers, answers product inquiries, schedules calls, and scores tests in real time.
          </p>
        </div>

        {/* Scenario Switcher Tabs - Grouped Segmented Dock */}
        <div className="flex justify-center">
          <div className="inline-flex flex-wrap sm:flex-nowrap items-center p-1.5 rounded-2xl bg-slate-200/70 border border-border/80 shadow-inner backdrop-blur-md gap-1 max-w-full overflow-x-auto">
            {scenarios.map((sc) => {
              const isActive = activeScenario === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => {
                    setActiveScenario(sc.id);
                    resetState();
                  }}
                  className={cn(
                    "relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none",
                    isActive
                      ? "text-foreground shadow-xs font-extrabold"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activePlaygroundScenarioTab"
                      className="absolute inset-0 bg-white rounded-xl shadow-xs border border-border/70 -z-10"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <div className={cn("size-6 rounded-lg flex items-center justify-center shrink-0", sc.bg, sc.color)}>
                    <sc.icon className="size-3.5" />
                  </div>
                  <span>{sc.label}</span>
                  <span
                    className={cn(
                      "hidden sm:inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border",
                      isActive
                        ? "bg-slate-100 text-foreground border-border"
                        : "bg-slate-200/60 text-muted-foreground border-transparent"
                    )}
                  >
                    {sc.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Interactive WhatsApp Window */}
        <div className="max-w-2xl mx-auto rounded-3xl border border-border/80 bg-white shadow-2xl shadow-emerald-950/5 overflow-hidden">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="size-9 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white/30">
                  HC
                </div>
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-300 ring-2 ring-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">HopeChat Interactive Demo</span>
                  <CheckCircle2 className="size-3.5 text-emerald-200" />
                </div>
                <p className="text-[10px] text-emerald-100 font-medium">Official Business Solution · Meta Verified</p>
              </div>
            </div>

            <button
              onClick={resetState}
              className="flex items-center gap-1 text-[11px] font-bold text-emerald-100 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Reset scenario"
            >
              <RotateCcw className="size-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Interactive Chat Canvas */}
          <div className="p-4 sm:p-6 space-y-4 min-h-[340px] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
            <AnimatePresence mode="wait">
              {/* Scenario 1: Retail Product Inquiry */}
              {activeScenario === "retail" && (
                <motion.div
                  key="retail"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3.5"
                >
                  <div className="flex gap-2.5 max-w-[85%]">
                    <div className="size-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                      U
                    </div>
                    <div className="bg-white text-foreground px-4 py-2.5 rounded-2xl rounded-bl-none border border-border shadow-xs text-xs sm:text-sm font-medium">
                      Hi! Do you have the Solar Power Inverter 3kVA in stock in Kampala?
                    </div>
                  </div>

                  <div className="flex gap-2.5 max-w-[88%] ml-auto flex-row-reverse">
                    <div className="size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                      AI
                    </div>
                    <div className="bg-gradient-to-tr from-emerald-600 to-teal-600 text-white p-4 rounded-2xl rounded-br-none text-xs sm:text-sm shadow-md space-y-2.5">
                      <p className="leading-snug">
                        Yes! We have <strong>8 units</strong> of the 3kVA Pure Sine Wave Inverter in stock at our Kampala store.
                      </p>
                      <div className="bg-white/15 border border-white/25 rounded-xl p-2.5 text-xs text-emerald-50 space-y-1">
                        <div className="flex justify-between font-bold text-white">
                          <span>Price:</span>
                          <span>UGX 1,450,000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Warranty:</span>
                          <span>2 Years Official</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delivery:</span>
                          <span>Free in Kampala today</span>
                        </div>
                      </div>

                      {!retailOrdered ? (
                        <div className="pt-1 flex gap-2 flex-wrap">
                          <button
                            onClick={() => setRetailOrdered(true)}
                            className="bg-white text-emerald-900 font-extrabold text-xs px-3.5 py-1.5 rounded-xl hover:bg-emerald-50 transition-colors shadow-xs cursor-pointer"
                          >
                            ⚡ Reserve 1 Unit via WhatsApp
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-emerald-500/40 p-2 text-[11px] font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5" />
                          <span>Reserved! Order #UG-8041 generated & sales rep notified.</span>
                        </div>
                      )}

                      <div className="flex justify-end text-[9px] text-emerald-100">
                        <span>Just now · ✓✓ Read</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Scenario 2: Appointment Booking */}
              {activeScenario === "booking" && (
                <motion.div
                  key="booking"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3.5"
                >
                  <div className="flex gap-2.5 max-w-[85%]">
                    <div className="size-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                      U
                    </div>
                    <div className="bg-white text-foreground px-4 py-2.5 rounded-2xl rounded-bl-none border border-border shadow-xs text-xs sm:text-sm font-medium">
                      I want to book an eye consultation session with the specialist tomorrow.
                    </div>
                  </div>

                  <div className="flex gap-2.5 max-w-[88%] ml-auto flex-row-reverse">
                    <div className="size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                      AI
                    </div>
                    <div className="bg-gradient-to-tr from-emerald-600 to-teal-600 text-white p-4 rounded-2xl rounded-br-none text-xs sm:text-sm shadow-md space-y-2.5">
                      <p className="leading-snug">
                        Dr. Nsubuga has 3 available consultation slots for tomorrow. Tap a time that works best:
                      </p>

                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        {["10:00 AM", "02:30 PM", "04:00 PM"].map((slot) => (
                          <button
                            key={slot}
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl text-xs font-extrabold text-center transition-all cursor-pointer",
                              selectedSlot === slot
                                ? "bg-white text-emerald-900 shadow-md ring-2 ring-white"
                                : "bg-white/20 hover:bg-white/30 text-white border border-white/20"
                            )}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>

                      {selectedSlot && (
                        <div className="rounded-lg bg-emerald-500/40 p-2.5 text-xs font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-200" />
                          <span>Booked for tomorrow at {selectedSlot}! Cal.com sync completed.</span>
                        </div>
                      )}

                      <div className="flex justify-end text-[9px] text-emerald-100">
                        <span>Just now · ✓✓ Read</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Scenario 3: Interactive Practice Quiz */}
              {activeScenario === "quiz" && (
                <motion.div
                  key="quiz"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3.5"
                >
                  <div className="flex gap-2.5 max-w-[85%]">
                    <div className="size-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                      U
                    </div>
                    <div className="bg-white text-foreground px-4 py-2.5 rounded-2xl rounded-bl-none border border-border shadow-xs text-xs sm:text-sm font-medium">
                      Start Chemistry Drill
                    </div>
                  </div>

                  <div className="flex gap-2.5 max-w-[88%] ml-auto flex-row-reverse">
                    <div className="size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                      AI
                    </div>
                    <div className="bg-gradient-to-tr from-emerald-600 to-teal-600 text-white p-4 rounded-2xl rounded-br-none text-xs sm:text-sm shadow-md space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/20 pb-1 text-[11px] font-bold text-emerald-100">
                        <span>CHEMISTRY PAPER 1</span>
                        <span>Q1 of 5</span>
                      </div>
                      <p className="font-semibold text-white">
                        What is the atomic number of Carbon (C)?
                      </p>

                      <div className="space-y-1.5 pt-1">
                        {[
                          { id: "A", text: "A. 4", correct: false },
                          { id: "B", text: "B. 6", correct: true },
                          { id: "C", text: "C. 12", correct: false },
                        ].map((opt) => {
                          const isPicked = selectedAnswer === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => setSelectedAnswer(opt.id)}
                              className={cn(
                                "w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between",
                                isPicked
                                  ? opt.correct
                                    ? "bg-emerald-400 text-emerald-950 ring-2 ring-white"
                                    : "bg-rose-400 text-rose-950 ring-2 ring-white"
                                  : "bg-white/20 hover:bg-white/30 text-white border border-white/20"
                              )}
                            >
                              <span>{opt.text}</span>
                              {isPicked && (
                                <span>{opt.correct ? "+10 pts ✓" : "Incorrect ✗"}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {selectedAnswer === "B" && (
                        <div className="rounded-lg bg-emerald-500/40 p-2 text-[11px] font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-emerald-200" />
                          <span>Correct! Carbon has 6 protons and an atomic number of 6. Score: 10/10.</span>
                        </div>
                      )}

                      <div className="flex justify-end text-[9px] text-emerald-100">
                        <span>Just now · ✓✓ Read</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Interactive footer bar */}
          <div className="p-3 border-t border-border bg-slate-50 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Live interactive simulator
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">
              Interactive buttons enabled
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
