"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { getAvatarGradient } from "@/lib/avatar-colors";
import { RoiCalculator } from "@/components/landing/roi-calculator";
import { InteractivePlayground } from "@/components/landing/interactive-playground";
import {
  MessageSquare,
  ArrowRight,
  Zap,
  ChevronRight,
  Menu,
  X,
  Bot,
  BarChart3,
  Globe,
  Users,
  Workflow,
  Radio,
  Mail,
  Webhook,
  Target,
  Brain,
  Cpu,
  Layers,
  Smartphone,
  Timer,
  MessageSquareText,
  Check,
  Sparkles,
  Phone,
  FolderTree,
  Route,
  CalendarCheck,
  Database,
  ShoppingCart,
  Download,
  Star,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Flame,
  GraduationCap,
  Calculator,
  ChevronDown,
  HelpCircle,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";

const DOCS_URL = "https://docs.hopechat.net";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const, delay },
  }),
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

interface FeatureCategory {
  id: string;
  label: string;
  shortLabel: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  desc: string;
}

const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    id: "all",
    label: "All Capabilities",
    shortLabel: "All",
    count: 13,
    icon: Sparkles,
    tag: "Complete Suite",
    desc: "Complete end-to-end platform for WhatsApp sales, outbound broadcasts, no-code workflows, and quizzes.",
  },
  {
    id: "sales_ai",
    label: "AI & Conversations",
    shortLabel: "AI Chat",
    count: 4,
    icon: Bot,
    tag: "4 Features",
    desc: "Official WhatsApp coexistence, multimodal voice & image AI, custom knowledge training, and shared team inbox.",
  },
  {
    id: "broadcasts",
    label: "Broadcasts & Outreach",
    shortLabel: "Campaigns",
    count: 3,
    icon: Radio,
    tag: "3 Features",
    desc: "Scale WhatsApp blasts, multi-channel SMS gateway, and automated lead nurturing drips.",
  },
  {
    id: "automation",
    label: "Flows, CRM & Ops",
    shortLabel: "Flows & CRM",
    count: 4,
    icon: Workflow,
    tag: "4 Features",
    desc: "Visual drag-and-drop bot builder, sales pipeline Kanban, privacy audit trail, and standalone desktop/mobile PWA.",
  },
  {
    id: "education",
    label: "Quizzes & Screening",
    shortLabel: "Quizzes",
    count: 2,
    icon: GraduationCap,
    tag: "2 Features",
    desc: "Interactive WhatsApp practice drills, timed tests, and smart candidate screening with routing.",
  },
];

const FEATURE_PILLARS = [
  {
    id: "sales_ai",
    title: "AI Assistant & Inbound Conversations",
    desc: "Turn incoming chats into paying customers with 24/7 AI, voice/image intelligence, and unified team routing.",
    icon: Bot,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/25",
    count: "4 Features",
  },
  {
    id: "broadcasts",
    title: "Outbound Broadcasts, SMS & Drip Campaigns",
    desc: "Reach thousands of customers simultaneously with zero ban risk, SMS fallback, and timed follow-up sequences.",
    icon: Radio,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/25",
    count: "3 Features",
  },
  {
    id: "automation",
    title: "Visual Flows, Sales CRM & Workspace Operations",
    desc: "Automate complex business logic visually, track deals in a Kanban pipeline, and maintain full activity audit logs.",
    icon: Workflow,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/25",
    count: "4 Features",
  },
  {
    id: "education",
    title: "Interactive Practice Quizzes & Smart Screening",
    desc: "Deliver assessments directly in WhatsApp with instant button responses, automatic scoring, and conditional branch routing.",
    icon: GraduationCap,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/25",
    count: "2 Features",
  },
];

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [selectedFeatureCategory, setSelectedFeatureCategory] = useState<string>("all");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const features = [
    {
      category: "sales_ai",
      icon: Smartphone,
      title: "WhatsApp Coexistence",
      desc: "Use your existing phone number with zero downtime. Keep phone app chats intact while HopeChat handles background automation.",
      points: ["Same number, no migration downtime", "Existing chats & contacts stay intact", "Use phone app and platform together", "Official Meta-approved coexistence"],
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/25",
      reverse: false,
      mock: (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-border text-xs font-bold text-foreground">
              <Smartphone className="size-3.5 text-emerald-600" /> Phone App
            </div>
            <span className="text-muted-foreground text-xs font-bold">+</span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-bold text-emerald-700">
              <Zap className="size-3.5" /> HopeChat Web
            </div>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50">
              <div className="size-6 rounded-lg bg-emerald-500/15 text-emerald-700 flex items-center justify-center text-[10px] font-bold">WA</div>
              <span className="text-foreground font-semibold">Nalukenge Kate</span> — replied via phone app
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="size-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">HC</div>
              <span className="text-foreground font-semibold">Ochieng Kevin</span> — auto-replied by HopeChat AI
            </div>
          </div>
        </div>
      ),
    },
    {
      category: "broadcasts",
      icon: Radio,
      title: "WhatsApp Broadcasts at Scale",
      desc: "Send broadcast campaigns to thousands of contacts with zero ban risk via the Official WhatsApp API.",
      points: ["Official API — zero ban risk", "Audience segmentation & targeting", "Rich media: images, videos, buttons", "Real-time delivery & read analytics"],
      color: "text-rose-500 dark:text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/25",
      reverse: true,
      mock: (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-3.5 shadow-xs">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-bold text-foreground">Spring Promo Blast</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Delivered</span>
          </div>
          {[
            { label: "Target Audience", value: "12,450" },
            { label: "Delivered", value: "12,201 (98%)", cls: "text-emerald-600 font-semibold" },
            { label: "Read", value: "9,756 (80%)", cls: "text-emerald-600 font-semibold" },
            { label: "Replies", value: "1,892 (19%)", cls: "text-rose-600 font-bold" },
          ].map((r, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{r.label}</span>
              <span className={cn("font-bold", r.cls || "text-foreground")}>{r.value}</span>
            </div>
          ))}
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full w-[80%] bg-gradient-to-r from-rose-500 to-pink-500 rounded-full" />
          </div>
        </div>
      ),
    },
    {
      category: "broadcasts",
      icon: MessageSquareText,
      title: "Bulk SMS Broadcasts",
      desc: "Reach customers who aren't on WhatsApp with affordable bulk SMS campaigns from the same dashboard — no separate tools needed.",
      points: ["Bulk SMS to thousands of recipients", "Audience segmentation & targeting", "Pay per message with credit pricing", "Delivery tracking with one-tap retry"],
      color: "text-sky-500 dark:text-sky-400",
      bg: "bg-sky-500/10 border-sky-500/25",
      reverse: false,
      mock: (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-3.5 shadow-xs">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-sky-500 animate-pulse" />
              <span className="text-xs font-bold text-foreground">SMS Campaign #104</span>
            </div>
            <span className="text-[10px] text-sky-600 font-bold bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">Completed</span>
          </div>
          {[
            { label: "Recipients", value: "8,320" },
            { label: "Delivered", value: "8,014 (96.3%)", cls: "text-emerald-600 font-semibold" },
            { label: "Failed (Invalid)", value: "306", cls: "text-rose-500 font-semibold" },
            { label: "Auto-Retried", value: "306 (Done)", cls: "text-sky-600 font-bold" },
          ].map((r, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{r.label}</span>
              <span className={cn("font-bold", r.cls || "text-foreground")}>{r.value}</span>
            </div>
          ))}
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full w-[96%] bg-gradient-to-r from-sky-500 to-blue-500 rounded-full" />
          </div>
        </div>
      ),
    },
    {
      category: "automation",
      icon: Workflow,
      title: "Visual No-Code Flow Builder",
      desc: "Drag-and-drop builder to qualify leads, auto-reply, and route inquiries without writing code.",
      points: ["Visual drag-and-drop flow builder", "Qualify leads and book calls 24/7", "AI answers trained on your business", "Seamless handoff to a human agent"],
      color: "text-violet-500 dark:text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/25",
      reverse: true,
      mock: (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="text-xs font-bold text-foreground flex items-center gap-2 border-b border-border pb-2.5">
            <Workflow className="size-4 text-violet-500" />
            <span>Flow: Lead Qualification & Booking</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-xs p-2 rounded-xl bg-violet-500/5 border border-violet-500/20">
              <span className="size-5 rounded-md bg-violet-500 text-white flex items-center justify-center text-[10px] font-bold">1</span>
              <span className="text-foreground font-semibold">Incoming WhatsApp Keyword Match</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs p-2 rounded-xl bg-slate-50 border border-border">
              <span className="size-5 rounded-md bg-slate-300 text-slate-800 flex items-center justify-center text-[10px] font-bold">2</span>
              <span className="text-muted-foreground">AI classifies intent and presents options</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs p-2 rounded-xl bg-slate-50 border border-border">
              <span className="size-5 rounded-md bg-slate-300 text-slate-800 flex items-center justify-center text-[10px] font-bold">3</span>
              <span className="text-muted-foreground">Auto-updates deal in Pipeline + notifies rep</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      category: "education",
      icon: FolderTree,
      title: "Tests & Practice Drills",
      desc: "Create practice drills or timed tests for your customers via WhatsApp interactive buttons — one question at a time, with automatic scoring and pass/fail results.",
      points: [
        "Practice mode reveals correct/incorrect after each answer",
        "Timed test mode enforces a deadline and reports time used",
        "Configurable intro questions (class, subject, etc.) before the test starts",
        "Auto-dispatch any test from automations — keyword triggers launch tests on demand",
        "AI assistant offers tests on demand with Start / Not Now confirmation",
        "Bulk import questions from CSV"
      ],
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/25",
      reverse: false,
      mock: (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex justify-between items-center border-b border-border pb-2.5">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FolderTree className="size-4 text-amber-500" /> Bio Assessment #4
            </span>
            <span className="text-[10px] text-amber-700 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Interactive</span>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-foreground space-y-1">
            <p className="font-extrabold text-[10px] uppercase text-amber-600">Question 1 of 5</p>
            <p className="text-foreground font-semibold">Which organelle produces cellular energy?</p>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="p-2 rounded-xl border border-border flex items-center justify-between text-muted-foreground">
              <span>A. Nucleus</span>
              <span className="text-[10px]">0 pts</span>
            </div>
            <div className="p-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-between text-emerald-800 font-bold">
              <span>B. Mitochondria</span>
              <span className="text-[10px] font-extrabold bg-emerald-500 text-white px-1.5 py-0.5 rounded">+10 pts ✓</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      category: "education",
      icon: Route,
      title: "Smart Screening & Insights",
      desc: "Put an entry screening in front of your tests — two intro questions (e.g. class → subject) answered once, then every student is routed straight to the right test. Results show which subjects and questions need attention.",
      points: [
        "Entry test asks the intro questions (class, subject)",
        "Routing rules send each student to the matching test automatically",
        "Idle sessions close automatically so they never block the next student",
        "Timed exams can be attempted only once per phone number",
        "Every completed test attempt costs one credit — billable only when a student finishes"
      ],
      color: "text-teal-500 dark:text-teal-400",
      bg: "bg-teal-500/10 border-teal-500/25",
      reverse: true,
      mock: (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex justify-between items-center border-b border-border pb-2.5">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Route className="size-4 text-teal-600" /> Candidate Screening
            </span>
            <span className="text-[10px] text-teal-700 font-bold bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full">Automated</span>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { q: "Target Class?", a: "Class 8" },
              { q: "Subject Track?", a: "Science & Tech" },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-border">
                <span className="font-semibold text-foreground">{row.q}</span>
                <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-800 font-extrabold text-[11px]">{row.a}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-teal-500/10 border border-teal-500/20 px-3 py-2 text-[11px] text-foreground">
            <span className="font-bold text-teal-700">Auto Route:</span> Class 8 + Science → Science Paper 2
          </div>
        </div>
      ),
    },
    {
      category: "sales_ai",
      icon: Users,
      title: "Shared Team Inbox",
      desc: "One WhatsApp number for your entire team with multi-agent routing, collision detection, custom tags, internal notes, and per-member access controls.",
      points: ["Smart routing to the right agent", "Tags, notes, and full chat history", "Assign and collaborate on chats", "Granular permissions per test, per member"],
      color: "text-blue-500 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/25",
      reverse: false,
      mock: (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="text-xs font-bold text-foreground border-b border-border pb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2"><Users className="size-4 text-blue-500" /> Team Reps Online</span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">3 Agents</span>
          </div>
          {[
            { name: "Sarah Akello", role: "Key Accounts", chats: "8", color: "bg-emerald-500" },
            { name: "David Ochieng", role: "Technical Support", chats: "12", color: "bg-sky-500" },
            { name: "HopeChat AI", role: "AI Virtual Rep", chats: "45", color: "bg-violet-600" },
          ].map((a, i) => (
            <div key={i} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className={cn("size-7 rounded-lg text-white flex items-center justify-center text-[10px] font-bold", a.color)}>{a.name[0]}</div>
                <div>
                  <div className="text-xs font-bold text-foreground">{a.name}</div>
                  <div className="text-[10px] text-muted-foreground">{a.role}</div>
                </div>
              </div>
              <span className="text-xs font-bold text-foreground bg-slate-100 px-2 py-0.5 rounded-md">{a.chats} chats</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      category: "sales_ai",
      icon: Bot,
      title: "Smart Human Handoff",
      desc: "Your AI knows when it's out of its depth. Off by default, it's there when you need it: it escalates hard conversations — or any message that contains words you choose — flags them for your team, and can pause itself until a person steps in.",
      points: [
        "Custom trigger words like \"refund\" or \"speak to a person\"",
        "Escalated chats tagged \"Needs human\" and surfaced first",
        "Auto-pause the AI so it never talks over your agent",
        "Take over, resolve, or hand back to the AI in one click"
      ],
      color: "text-rose-500 dark:text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/25",
      reverse: true,
      mock: (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex justify-between items-center border-b border-border pb-2.5">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Bot className="size-4 text-rose-500" /> Escalation Event
            </span>
            <span className="text-[10px] text-rose-700 font-extrabold bg-rose-500/15 border border-rose-500/25 px-2 py-0.5 rounded-full">Needs human</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs text-foreground font-medium">
            &ldquo;I need to speak to an account manager regarding an invoice refund.&rdquo;
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] text-muted-foreground">AI paused · agent notified</span>
            <button className="px-3 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold shadow-xs">Take Over</button>
          </div>
        </div>
      ),
    },
    {
      category: "sales_ai",
      icon: Globe,
      title: "Click-to-WhatsApp Ads",
      desc: "Auto-capture leads from Facebook, Instagram, or website ads straight into an instant automated WhatsApp sequence.",
      points: ["Facebook & Instagram ads → WhatsApp", "Capture IndiaMart & JustDial leads", "Instant automated first reply", "No lead goes cold or unanswered"],
      color: "text-fuchsia-500 dark:text-fuchsia-400",
      bg: "bg-fuchsia-500/10 border-fuchsia-500/25",
      reverse: false,
      mock: (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-2.5 text-xs font-bold text-foreground">
            <span className="flex items-center gap-2"><Globe className="size-4 text-fuchsia-500" /> Meta Ad → Chat Flow</span>
            <span className="text-[10px] text-fuchsia-600 font-bold bg-fuchsia-500/10 px-2 py-0.5 rounded-full">Live Campaign</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-border text-foreground font-semibold flex items-center gap-2">
              <MessageSquare className="size-3.5 text-fuchsia-500" />
              <span>Instagram Ad: &ldquo;50% Off First Month&rdquo;</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 font-semibold flex items-center gap-2">
              <Zap className="size-3.5 text-emerald-600" />
              <span>Instant reply sent in &lt;1s with coupon token</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      category: "automation",
      icon: CalendarCheck,
      title: "Appointment Bookings",
      desc: "Connect Cal.com and turn your availability into bookable links you can share over WhatsApp. Book, sync, set your weekly hours, and track every appointment right from your dashboard.",
      points: [
        "Toggle which event types are bookable at any time",
        "Book an appointment on a customer's behalf with a picker of live slots",
        "Set weekly availability and time zone — slots update on your booking links instantly",
        "Sync pulls your bookings from Cal.com so nothing is ever missed",
        "Appointments land on the Bookings page with attendee, event, and time",
        "Reschedules and cancellations update in place via webhook"
      ],
      color: "text-cyan-500 dark:text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/25",
      reverse: true,
      mock: (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex justify-between items-center border-b border-border pb-2.5">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <CalendarCheck className="size-4 text-cyan-600" /> Upcoming Bookings
            </span>
            <span className="text-[10px] text-cyan-700 font-bold bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">Cal.com Sync</span>
          </div>
          {[
            { name: "Amina Nakato", event: "Consultation — 30 min", time: "Today 3:00 PM" },
            { name: "Brian Okello", event: "Product Demo — 30 min", time: "Tomorrow 10:30 AM" },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs p-2 rounded-xl bg-slate-50 border border-border">
              <div className="size-7 rounded-lg bg-cyan-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">{b.name[0]}</div>
              <div className="min-w-0">
                <div className="font-bold text-foreground truncate">{b.name} · {b.event}</div>
                <div className="text-muted-foreground text-[11px]">{b.time}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      category: "broadcasts",
      icon: Timer,
      title: "Automated Drip Sequences",
      desc: "Multi-step follow-ups scheduled on Day 1, Day 3, Day 7 to revive cold leads and boost conversions.",
      points: ["Multi-step timed message sequences", "Triggered by lead actions or tags", "Auto-stops when lead replies or buys", "Track opens, clicks, and conversions"],
      color: "text-indigo-500 dark:text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/25",
      reverse: false,
      mock: (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="text-xs font-bold text-foreground border-b border-border pb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2"><Timer className="size-4 text-indigo-500" /> Drip Campaign: New Lead</span>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full">Active</span>
          </div>
          {[
            { day: "Day 1", msg: "Welcome! Here is your catalog...", status: "Delivered" },
            { day: "Day 3", msg: "Following up — any questions on pricing?", status: "Pending" },
            { day: "Day 7", msg: "Special 10% coupon just for you 🎉", status: "Scheduled" },
          ].map((d, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-border text-xs">
              <span className="font-bold text-indigo-600 w-12">{d.day}</span>
              <span className="text-muted-foreground truncate flex-1 mx-2">{d.msg}</span>
              <span className="text-[10px] font-semibold text-foreground bg-white px-2 py-0.5 rounded border border-border">{d.status}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      category: "automation",
      icon: BarChart3,
      title: "Activity Trail & Privacy",
      desc: "See every login, settings change, and automation run across your workspace — so nothing happens invisibly. Visitor IP addresses never appear in your team view.",
      points: [
        "Full audit of logins, contacts, pipelines, broadcasts, and automations",
        "Tenant teams see activity events — never visitor IP addresses or location",
        "IPs are kept for security only and automatically truncated to their network prefix after 90 days",
        "Consent first: every new tenant accepts the Terms & Privacy Policy before using the app"
      ],
      color: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/25",
      reverse: true,
      mock: (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex justify-between items-center border-b border-border pb-2.5">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <BarChart3 className="size-4 text-emerald-600" /> Activity Audit Trail
            </span>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">Privacy First</span>
          </div>
          {[
            { ev: "User Login", who: "Admin · Kampala Office", when: "2m ago" },
            { ev: "Broadcast Dispatched", who: "Sales · 1,240 recipients", when: "1h ago" },
            { ev: "Automation Rule Updated", who: "Ops · Lead Qualifier", when: "3h ago" },
          ].map((a, i) => (
            <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded-xl hover:bg-slate-50">
              <span className="font-bold text-foreground">{a.ev}</span>
              <span className="text-muted-foreground text-[11px] truncate max-w-[140px]">{a.who}</span>
              <span className="text-[11px] font-bold text-emerald-600">{a.when}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      category: "automation",
      icon: Smartphone,
      title: "Installable Mobile & Desktop App",
      desc: "Install HopeChat on any phone or desktop and it opens in its own window — no browser tabs, no address bar, straight to your inbox.",
      points: [
        "One-tap install from Chrome, Edge, or the iOS share sheet",
        "Launches full-screen from your home screen or desktop",
        "Long-press shortcuts to Inbox, Broadcasts, and Contacts",
        "Updates ship instantly — no app store review, no waiting"
      ],
      color: "text-purple-500 dark:text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/25",
      reverse: false,
      mock: (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="text-xs font-bold text-foreground">Progressive Web App (PWA)</span>
            <span className="text-[10px] text-purple-700 font-bold bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">Installed</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-3">
            <div className="size-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <MessageSquare className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground truncate">HopeChat Workspace</div>
              <div className="text-[10px] text-muted-foreground">Native Window · Fast Cache</div>
            </div>
            <Download className="size-4 text-purple-600 shrink-0 ml-auto" />
          </div>
        </div>
      ),
    },
  ];

  const displayedFeatures = selectedFeatureCategory === "all"
    ? features
    : features.filter(f => f.category === selectedFeatureCategory);

  const plans = [
    {
      name: "Bronze",
      tagline: "For solo sellers getting started",
      priceMonthly: "100,000",
      priceAnnual: "90,000", // 10% annual discount
      annualTotal: "1,080,000",
      annualSavings: "120,000",
      credits: "1,500 credits / month",
      features: ["AI assistant & shared inbox", "WhatsApp coexistence", "1 team seat", "Sales pipeline & tags"],
      popular: false,
    },
    {
      name: "Silver",
      tagline: "For growing teams running campaigns",
      priceMonthly: "180,000",
      priceAnnual: "162,000", // 10% annual discount
      annualTotal: "1,944,000",
      annualSavings: "216,000",
      credits: "5,000 credits / month",
      features: ["Everything in Bronze", "WhatsApp + SMS broadcasts", "Visual flow builder", "3 team seats"],
      popular: true,
    },
    {
      name: "Gold",
      tagline: "For high-volume operators",
      priceMonthly: "450,000",
      priceAnnual: "405,000", // 10% annual discount
      annualTotal: "4,860,000",
      annualSavings: "540,000",
      credits: "High-volume credits / month",
      features: ["Everything in Silver", "Multimodal AI", "Larger contact limits", "10 team seats"],
      popular: false,
    },
  ];

  const faqs = [
    {
      q: "What is HopeChat?",
      a: "HopeChat is a WhatsApp CRM and automation platform that helps businesses automate customer conversations, follow up on leads instantly, run broadcast campaigns, and build no-code workflows — all powered by the official WhatsApp Business API. It includes a shared inbox, AI assistant, knowledge base, chatbot builder, and native integrations for Google Sheets and Cal.com.",
    },
    {
      q: "Do I need coding skills to use HopeChat?",
      a: "No. HopeChat is built for non-technical users. You can set up automations, train the AI on your business documents, and manage your team inbox without writing a single line of code. If you do have a developer, we also provide a full REST API.",
    },
    {
      q: "Can I use my existing WhatsApp phone number?",
      a: "Yes. Connect the same WhatsApp number you already use — no new SIM, no lost history. Keep using the WhatsApp Business app on your phone while HopeChat runs automations alongside it. Official Meta-approved coexistence.",
    },
    {
      q: "Can I automatically send a practice drill or timed test when a customer texts me?",
      a: "Yes. Create practice drills and timed tests, then attach any test to your automation triggers. When a customer sends a keyword or matches a rule, HopeChat dispatches the test instantly — questions are delivered one at a time via WhatsApp buttons, with answers and scoring handled automatically. Each completed attempt uses one credit, which you can top up any time from the Billing section.",
    },
    {
      q: "Can HopeChat route a customer to the right test based on their answers?",
      a: "Yes. Create an entry screening test that asks two intro questions (for example: which class? → which subject?). Each regular test then declares routing rules, so the moment a student answers the last question they are routed straight into the matching test automatically. Idle sessions close automatically after your configured timeout so they never block the next student, and every completed test attempt uses one credit from your plan.",
    },
    {
      q: "Can my AI assistant offer a test mid-conversation?",
      a: "Yes. When a customer mentions they want to take a test or quiz, the AI assistant recognizes the intent and offers the right test with a confirmation question — Start / Not Now buttons. Nothing starts until the customer confirms, so a passing mention of 'test' never triggers an exam by accident. You control it with a single switch in Test Settings, and the confirmation reply costs one AI credit while the finished attempt costs one test credit.",
    },
    {
      q: "How does the AI train on my business data?",
      a: "Upload your PDFs, documents, product catalogs, and website links directly into your knowledge base. HopeChat indexes your content and feeds relevant snippets to the AI engine so answers reflect your real prices, inventory, and policies without hallucinations.",
    },
    {
      q: "Can I install HopeChat on my phone like a normal app?",
      a: "Yes. HopeChat is a Progressive Web App. On Android and desktop Chrome or Edge you'll see an install banner the first time you sign in — tap Install App and it lands on your home screen. On iPhone or iPad, tap the Share button and choose 'Add to Home Screen'. Either way it launches full-screen with no browser address bar, supports home-screen shortcuts to your inbox, broadcasts, and contacts, and updates the moment we deploy — no app store in the loop.",
    },
    {
      q: "Can HopeChat send SMS as well as WhatsApp messages?",
      a: "Yes. In addition to WhatsApp broadcasts, HopeChat sends bulk SMS campaigns through the same dashboard, so you can reach contacts who aren't on WhatsApp. Both channels use credit-based pricing and report delivery status.",
    },
    {
      q: "What happens if I don't finish my signup or setup right away?",
      a: "No pressure — you can pause and pick up where you left off anytime. If you start creating an account or setting up your workspace and stop before finishing, our team will follow up with a friendly reminder (by email, easily opt-outable) and offer a free guided setup session so you can get live without the guesswork.",
    },
    {
      q: "What activity does HopeChat track, and how long is data kept?",
      a: "We keep a privacy-first activity trail of events inside your workspace — logins, contact and pipeline changes, broadcasts, automation runs, and settings updates — so you can audit what happened and who did it. Your team never sees visitor IP addresses or location; IPs are captured only for security and automatically truncated to their network prefix after 90 days. New tenants are asked to accept the Terms of Service and Privacy Policy before using the platform, and your consent records are kept intact for audit purposes. Full details are in the Privacy Policy.",
    },
  ];

  return (
    <div className="landing-light flex min-h-screen flex-col bg-white text-foreground antialiased font-sans selection:bg-emerald-500/20">

      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-white/80 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/25 transition-transform duration-200 group-hover:scale-105">
                <MessageSquare className="size-4.5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-foreground">HopeChat</span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  v2.0 AI Hub
                </span>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-muted-foreground">
              <Link href="#features" className="hover:text-primary transition-colors duration-200">
                Features
              </Link>
              <Link href="#demo-playground" className="hover:text-primary transition-colors duration-200">
                Demo
              </Link>
              <Link href="#pricing" className="hover:text-primary transition-colors duration-200">
                Pricing
              </Link>

              {/* Grouped Resources Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary transition-colors duration-200 cursor-pointer outline-none">
                  <span>Resources</span>
                  <ChevronDown className="size-3.5 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={8} className="w-64 p-2 bg-white/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-xl z-50">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Interactive Tools
                  </div>
                  <DropdownMenuItem
                    render={<Link href="#roi-calculator" className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer" />}
                  >
                    <Calculator className="size-4 text-emerald-600" />
                    <div>
                      <div className="text-foreground">ROI Calculator</div>
                      <div className="text-[10px] text-muted-foreground font-normal">Live hours & revenue model</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={<Link href="#integrations" className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer" />}
                  >
                    <Layers className="size-4 text-sky-600" />
                    <div>
                      <div className="text-foreground">Integrations</div>
                      <div className="text-[10px] text-muted-foreground font-normal">Sheets, Cal.com & APIs</div>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1.5 bg-border/60" />

                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Solutions & Help
                  </div>
                  <DropdownMenuItem
                    render={<Link href="#how-it-works" className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer" />}
                  >
                    <Workflow className="size-4 text-violet-600" />
                    <div>
                      <div className="text-foreground">How It Works</div>
                      <div className="text-[10px] text-muted-foreground font-normal">3-step setup walkthrough</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={<Link href="#setup-service" className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer" />}
                  >
                    <Sparkles className="size-4 text-amber-600" />
                    <div>
                      <div className="text-foreground">Setup Service</div>
                      <div className="text-[10px] text-muted-foreground font-normal">White-glove team migration</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={<Link href="#faq" className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer" />}
                  >
                    <HelpCircle className="size-4 text-emerald-600" />
                    <div>
                      <div className="text-foreground">FAQ</div>
                      <div className="text-[10px] text-muted-foreground font-normal">Common questions & answers</div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors duration-200">
                Docs
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold text-muted-foreground hover:text-foreground h-9 px-4 hidden sm:inline-flex")}>
              Log In
            </Link>
            <Link href="/signup" className={cn(buttonVariants(), "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-5 h-9 text-xs sm:text-sm shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all duration-300 rounded-xl border-0")}>
              Start Free Trial
            </Link>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground" aria-label="Toggle Menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="md:hidden border-b border-border bg-white/95 backdrop-blur-md px-4 py-4 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Product</div>
              <Link href="#features" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-foreground rounded-lg hover:bg-slate-100">
                Features
              </Link>
              <Link href="#demo-playground" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-foreground rounded-lg hover:bg-slate-100">
                Demo
              </Link>
              <Link href="#pricing" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-foreground rounded-lg hover:bg-slate-100">
                Pricing
              </Link>
            </div>

            <div className="pt-2 border-t border-border/60 space-y-1">
              <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Tools & Solutions</div>
              <Link href="#roi-calculator" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100">
                ROI Calculator
              </Link>
              <Link href="#integrations" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100">
                Integrations
              </Link>
              <Link href="#how-it-works" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100">
                How It Works
              </Link>
              <Link href="#setup-service" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100">
                Setup Service
              </Link>
              <Link href="#faq" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100">
                FAQ
              </Link>
              <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100">
                Documentation
              </a>
            </div>

            <div className="pt-3 border-t border-border flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)} className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}>
                Log In
              </Link>
              <Link href="/signup" onClick={() => setMobileOpen(false)} className={cn(buttonVariants(), "w-full justify-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold")}>
                Start Free Trial
              </Link>
            </div>
          </motion.div>
        )}
      </header>

      <main className="flex-1">

        {/* ─── HERO ─── */}
        <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 lg:pt-24 lg:pb-36 overflow-hidden bg-white">
          {/* Ambient Multi-Mesh Glow */}
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),rgba(14,165,233,0.06),transparent_70%)]" />
            <div className="absolute top-1/4 -left-20 w-[450px] h-[450px] bg-emerald-500/[0.05] rounded-full blur-[120px]" />
            <div className="absolute top-1/3 -right-20 w-[450px] h-[450px] bg-teal-500/[0.06] rounded-full blur-[140px]" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

              {/* Left Column */}
              <motion.div className="flex-1 text-center lg:text-left space-y-6 max-w-xl" initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
                <motion.div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-emerald-800 shadow-sm" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.4 }}>
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Official Meta WhatsApp Business Solution</span>
                </motion.div>

                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.08] text-foreground">
                  More Leads. Faster Follow-Up.{" "}
                  <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                    More Revenue.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                  HopeChat replies instantly, follows up automatically, and closes sales right inside WhatsApp — so no lead ever goes cold.
                </p>

                <div className="flex flex-col sm:flex-row items-center lg:justify-start gap-3 pt-1">
                  <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto h-12 px-8 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-xl shadow-emerald-600/25 hover:shadow-emerald-600/35 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl border-0 group")}>
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link href="/request-demo" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto h-12 px-8 text-base border-border/80 bg-white/80 hover:bg-muted/50 text-foreground font-bold hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl shadow-sm")}>
                    Book a Demo
                  </Link>
                </div>

                <p className="text-xs text-muted-foreground font-medium flex items-center justify-center lg:justify-start gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  No credit card required · 14-day trial · Setup in minutes
                </p>

                {/* 3 Metric Glass Micro-Cards */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-3">
                  {[
                    { value: "98%", label: "Open Rate", sub: "vs 20% on email", color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/20", icon: Flame },
                    { value: "5x", label: "Faster Replies", sub: "Instant AI speed", color: "text-sky-600", bg: "bg-sky-500/10 border-sky-500/20", icon: Zap },
                    { value: "24/7", label: "Always On", sub: "Never miss a deal", color: "text-violet-600", bg: "bg-violet-500/10 border-violet-500/20", icon: TrendingUp },
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all text-center lg:text-left group"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      <div className="flex items-center justify-center lg:justify-between mb-1.5">
                        <span className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight", s.color)}>{s.value}</span>
                        <div className={cn("hidden sm:flex size-7 items-center justify-center rounded-lg border", s.bg)}>
                          <s.icon className={cn("size-3.5", s.color)} />
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-foreground leading-tight">{s.label}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5">{s.sub}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Right Column - Elevated WhatsApp Mockup */}
              <motion.div className="flex-1 w-full relative" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
                {/* Floating Badge Top-Left */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="hidden sm:flex absolute -top-4 -left-4 z-20 items-center gap-2 rounded-2xl border border-emerald-500/30 bg-white/95 px-3.5 py-2 shadow-xl shadow-emerald-500/10 backdrop-blur-md"
                >
                  <span className="flex size-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold text-foreground">
                    ⚡ 0.8s avg reply speed
                  </span>
                </motion.div>

                {/* Floating Badge Bottom-Right */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="hidden sm:flex absolute -bottom-4 -right-4 z-20 items-center gap-2 rounded-2xl border border-sky-500/30 bg-white/95 px-3.5 py-2 shadow-xl shadow-sky-500/10 backdrop-blur-md"
                >
                  <TrendingUp className="size-4 text-sky-500" />
                  <span className="text-xs font-bold text-foreground">
                    📈 5x lead conversion
                  </span>
                </motion.div>

                {/* Main WhatsApp Window Container */}
                <div className="rounded-3xl border border-border/80 bg-white shadow-2xl shadow-emerald-950/5 overflow-hidden">
                  <div className="flex">
                    {/* Conversation Sidebar */}
                    <div className="hidden sm:flex w-48 border-r border-border bg-slate-50/70 flex-col">
                      <div className="p-3 border-b border-border flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground">Live Chats</span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          3 Active
                        </div>
                      </div>
                      <div className="flex-1 p-2 space-y-1">
                        {[
                          ["NK", "Nalukenge Kate", "Active", "bg-emerald-500"],
                          ["OK", "Ochieng Kevin", "Bot", "bg-sky-500"],
                          ["JM", "Jean Mugisha", "", "bg-violet-500"],
                        ].map(([initials, name, tag, colorClass], i) => (
                          <div key={i} className={cn("p-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors", i === 0 ? "bg-white border border-emerald-500/30 shadow-xs" : "hover:bg-white/80")}>
                            <div className={cn("size-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs", colorClass)}>{initials}</div>
                            <div className="overflow-hidden flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold truncate text-foreground">{name}</span>
                                {tag === "Active" && <span className="text-[8px] text-emerald-700 font-extrabold bg-emerald-500/15 border border-emerald-500/20 px-1 rounded-sm shrink-0">LIVE</span>}
                                {tag === "Bot" && <span className="text-[8px] text-sky-700 font-extrabold bg-sky-500/15 border border-sky-500/20 px-1 rounded-sm shrink-0">AI</span>}
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate font-medium">WhatsApp Business</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col min-h-[340px] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                      {/* Chat Header */}
                      <div className="p-3 border-b border-border bg-white/90 backdrop-blur-sm flex items-center gap-2.5">
                        <div className="relative">
                          <div className="size-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xs font-bold">NK</div>
                          <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-foreground">Nalukenge Kate</span>
                            <CheckCircle2 className="size-3 text-emerald-600" />
                          </div>
                          <p className="text-[10px] text-emerald-600 font-semibold">Online · WhatsApp Verified</p>
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground ml-auto bg-muted/60 px-2 py-0.5 rounded-full">AI Agent Engaged</span>
                      </div>

                      {/* Chat Messages */}
                      <div className="flex-1 p-4 space-y-3">
                        <div className="flex gap-2 max-w-[85%]">
                          <div className="size-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">U</div>
                          <div className="bg-white text-foreground px-3.5 py-2 rounded-2xl rounded-bl-none border border-border/80 text-xs shadow-xs font-medium">
                            Hi! Do you offer bulk delivery in Kampala?
                          </div>
                        </div>

                        <div className="flex gap-2 max-w-[88%] ml-auto flex-row-reverse">
                          <div className="size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs">AI</div>
                          <div className="bg-gradient-to-tr from-emerald-600 to-teal-600 text-white px-3.5 py-2.5 rounded-2xl rounded-br-none text-xs shadow-md shadow-emerald-700/15">
                            <p className="leading-snug">Yes! Orders over 500,000 UGX qualify for free delivery today. What items are you interested in?</p>
                            <div className="mt-2 flex gap-1.5 flex-wrap">
                              <span className="rounded-md bg-white/20 border border-white/30 px-2 py-0.5 text-[10px] font-bold cursor-pointer hover:bg-white/30">Bulk Catalog</span>
                              <span className="rounded-md bg-white/20 border border-white/30 px-2 py-0.5 text-[10px] font-bold cursor-pointer hover:bg-white/30">Talk to Human</span>
                            </div>
                            <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-emerald-100">
                              <span>Just now</span>
                              <span className="text-emerald-200 font-bold">✓✓</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 max-w-[85%]">
                          <div className="size-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">U</div>
                          <div className="bg-white text-foreground px-3.5 py-2 rounded-2xl rounded-bl-none border border-border/80 text-xs shadow-xs font-medium">
                            Yes please. Connect me with Sarah in sales!
                          </div>
                        </div>

                        <div className="flex gap-2 max-w-[88%] ml-auto flex-row-reverse">
                          <div className="size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs">AI</div>
                          <div className="bg-gradient-to-tr from-emerald-600 to-teal-600 text-white px-3.5 py-2.5 rounded-2xl rounded-br-none text-xs shadow-md shadow-emerald-700/15">
                            Transferred to Sarah! She has your pricing ready.
                            <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-emerald-100">
                              <span>Just now</span>
                              <span className="text-emerald-200 font-bold">✓✓</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Input Footer */}
                      <div className="p-3 border-t border-border bg-white">
                        <div className="bg-slate-50 border border-border/80 rounded-xl px-4 py-2 text-muted-foreground text-[11px] flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            HopeChat AI is actively listening...
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600">Encrypted</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ─── AI ASSISTANT ─── */}
        <section className="py-20 lg:py-28 bg-slate-50/60 border-t border-border overflow-hidden relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              <motion.div className="flex-1 space-y-8" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                <motion.div variants={fadeUp} custom={0}>
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full">
                    <Bot className="h-3.5 w-3.5" /> AI-Powered WhatsApp Agents
                  </span>
                </motion.div>
                <motion.h2 variants={fadeUp} custom={0.1} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
                  Doesn&apos;t just chat. <br className="hidden sm:block" />
                  <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
                    It qualifies and closes.
                  </span>
                </motion.h2>
                <motion.p variants={fadeUp} custom={0.2} className="text-base text-muted-foreground leading-relaxed font-medium">
                  Train HopeChat on your own business documents, catalogs, and URLs. It recognizes buying intent, answers accurately 24/7 without hallucinations, and triggers real actions inside your CRM.
                </motion.p>
                
                {/* 4 Multi-Color Feature Cards */}
                <motion.div variants={fadeUp} custom={0.3} className="grid sm:grid-cols-2 gap-4">
                  {[
                    {
                      icon: Target,
                      title: "Intent Detection",
                      desc: "Spot high-value leads instantly and prioritize conversations that drive revenue.",
                      color: "text-rose-500 dark:text-rose-400",
                      bg: "bg-rose-500/10 border-rose-500/20",
                    },
                    {
                      icon: Brain,
                      title: "Data-Driven Memory",
                      desc: "Train AI in minutes using PDFs, web links, and Google Sheets for accurate replies.",
                      color: "text-indigo-500 dark:text-indigo-400",
                      bg: "bg-indigo-500/10 border-indigo-500/20",
                    },
                    {
                      icon: Cpu,
                      title: "Real Actions, Not Replies",
                      desc: "Auto-trigger workflows, update pipeline stages, and assign to reps seamlessly.",
                      color: "text-amber-500 dark:text-amber-400",
                      bg: "bg-amber-500/10 border-amber-500/20",
                    },
                    {
                      icon: Layers,
                      title: "WhatsApp Flow Buttons",
                      desc: "Interactive buttons, list menus, and forms to guide buyers straight to payment.",
                      color: "text-emerald-500 dark:text-emerald-400",
                      bg: "bg-emerald-500/10 border-emerald-500/20",
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      className="p-5 rounded-2xl bg-white border border-border shadow-xs hover:shadow-lg hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300 group"
                      whileHover={{ y: -4 }}
                    >
                      <div className={cn("size-10 rounded-xl border flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110", item.bg, item.color)}>
                        <item.icon className="size-5" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground mb-1.5">{item.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.div variants={fadeUp} custom={0.4}>
                  <Link href="/signup" className={cn(buttonVariants(), "bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 h-11 rounded-xl border-0 shadow-md shadow-emerald-600/20 group")}>
                    Start Free Trial <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              </motion.div>

              {/* Chat Widget */}
              <motion.div className="flex-1 w-full max-w-md mx-auto" initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <div className="rounded-3xl border border-border bg-white shadow-xl overflow-hidden">
                  <div className="p-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-300 animate-pulse" />
                      <span className="text-xs font-bold text-white">HopeChat Assistant</span>
                    </div>
                    <span className="text-[10px] text-emerald-100 ml-auto font-bold bg-white/20 px-2 py-0.5 rounded-full">Gemini 2.0 Live</span>
                  </div>
                  <div className="p-4 space-y-3 min-h-[240px] bg-slate-50/50">
                    <div className="flex gap-2 items-start">
                      <div className="size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">H</div>
                      <div className="bg-white px-3.5 py-2.5 rounded-2xl rounded-bl-none border border-border text-xs max-w-[85%] shadow-xs">
                        👋 Hi! I&apos;m your HopeChat virtual agent. Looking for our wholesale price list or retail catalog?
                      </div>
                    </div>
                    <div className="flex gap-2 items-start ml-auto flex-row-reverse max-w-[85%]">
                      <div className="size-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0">U</div>
                      <div className="bg-emerald-600 text-white px-3.5 py-2.5 rounded-2xl rounded-br-none text-xs shadow-xs font-medium">
                        Do you ship to Mombasa and Nairobi?
                      </div>
                    </div>
                    <div className="flex gap-2 items-start">
                      <div className="size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">H</div>
                      <div className="bg-white px-3.5 py-2.5 rounded-2xl rounded-bl-none border border-border text-xs max-w-[85%] shadow-xs">
                        Yes! We deliver across Kenya in 2–3 days. Orders over KSh 15,000 qualify for free express shipping. Ready to place an order?
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-t border-border bg-white">
                    <div className="bg-slate-100 border border-border/80 rounded-xl px-4 py-2 text-muted-foreground text-[11px]">
                      Type your message or tap an option...
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ─── LIVE SANDBOX PLAYGROUND ─── */}
        <InteractivePlayground />

        {/* ─── FEATURES ─── */}
        <section id="features" className="py-20 lg:py-28 bg-white border-t border-border overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
            <motion.div className="text-center space-y-4 max-w-3xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1 text-xs font-extrabold text-emerald-800">
                <Sparkles className="size-3.5 text-emerald-600" />
                Comprehensive Feature Suite
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
                Everything you need to grow on WhatsApp
              </motion.h2>
              <motion.p variants={fadeUp} custom={0.1} className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                Speed up your entire sales funnel with automation that captures leads, replies instantly, and closes more — all on WhatsApp.
              </motion.p>

              {/* Feature Category Filter Tabs - Grouped Segmented Dock */}
              <div className="flex justify-center pt-4">
                <div className="inline-flex flex-wrap sm:flex-nowrap items-center p-1.5 rounded-2xl bg-slate-100/90 border border-border/80 shadow-inner backdrop-blur-md gap-1 max-w-full overflow-x-auto">
                  {FEATURE_CATEGORIES.map((cat) => {
                    const isSelected = selectedFeatureCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedFeatureCategory(cat.id)}
                        className={cn(
                          "relative flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer select-none",
                          isSelected
                            ? "text-foreground font-extrabold"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/60"
                        )}
                      >
                        {isSelected && (
                          <motion.div
                            layoutId="activeFeatureCategoryTab"
                            className="absolute inset-0 bg-white rounded-xl shadow-xs border border-border -z-10"
                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                          />
                        )}
                        <cat.icon className={cn("size-4 shrink-0", isSelected ? "text-emerald-600" : "text-muted-foreground")} />
                        <span>{cat.label}</span>
                        <span
                          className={cn(
                            "text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border",
                            isSelected
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                              : "bg-slate-200/80 text-muted-foreground border-transparent"
                          )}
                        >
                          {cat.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group Context Banner & Quick Jump Pills */}
              {selectedFeatureCategory !== "all" ? (
                (() => {
                  const activeCat = FEATURE_CATEGORIES.find((c) => c.id === selectedFeatureCategory);
                  if (!activeCat) return null;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-border/80 bg-slate-50/80 p-4 max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs"
                    >
                      <div className="flex items-center gap-3 text-left w-full md:w-auto">
                        <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 shrink-0">
                          <activeCat.icon className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{activeCat.label}</span>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                              {activeCat.tag}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{activeCat.desc}</p>
                        </div>
                      </div>

                      {/* Sub-feature quick jump */}
                      <div className="flex flex-wrap items-center gap-1.5 justify-start md:justify-end w-full md:w-auto shrink-0">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mr-1 hidden lg:inline">Quick Jump:</span>
                        {displayedFeatures.map((f) => (
                          <a
                            key={f.title}
                            href={`#feature-${f.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                            className="text-[11px] font-semibold text-muted-foreground hover:text-emerald-700 bg-white border border-border px-2.5 py-1 rounded-lg hover:border-emerald-500/40 transition-colors shadow-2xs"
                          >
                            {f.title}
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  );
                })()
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
                  <span className="text-muted-foreground font-semibold">Jump to pillar:</span>
                  {FEATURE_PILLARS.map((p) => (
                    <a
                      key={p.id}
                      href={`#pillar-${p.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-foreground hover:text-emerald-700 border border-border/80 font-bold transition-colors"
                    >
                      <p.icon className="size-3.5 text-muted-foreground" />
                      <span>{p.title.split("&")[0].trim()}</span>
                      <span className="text-[10px] text-muted-foreground bg-white px-1.5 py-0.2 rounded border border-border/50">{p.count.split(" ")[0]}</span>
                    </a>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Feature Content */}
            <div className="space-y-20">
              {selectedFeatureCategory === "all" ? (
                <div className="space-y-24">
                  {FEATURE_PILLARS.map((pillar) => {
                    const pillarFeatures = features.filter((f) => f.category === pillar.id);
                    return (
                      <div key={pillar.id} id={`pillar-${pillar.id}`} className="space-y-12 scroll-mt-28">
                        {/* Pillar Group Header */}
                        <div className="rounded-2xl border border-border/80 bg-slate-50/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <div className={cn("size-12 rounded-xl border flex items-center justify-center shadow-xs shrink-0", pillar.bg, pillar.color)}>
                              <pillar.icon className="size-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h3 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">{pillar.title}</h3>
                                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-200/80 text-foreground border border-border">
                                  {pillar.count}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">{pillar.desc}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedFeatureCategory(pillar.id);
                              const el = document.getElementById("features");
                              if (el) el.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            Filter to this group <ArrowRight className="size-3.5" />
                          </button>
                        </div>

                        {/* Features in this pillar */}
                        <div className="space-y-16">
                          {pillarFeatures.map((feature) => (
                            <div
                              key={feature.title}
                              id={`feature-${feature.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                              className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16 scroll-mt-32"
                            >
                              <div className={cn("flex-1 space-y-5", feature.reverse && "lg:order-2")}>
                                <div className={cn("size-12 rounded-2xl border flex items-center justify-center shadow-xs", feature.bg, feature.color)}>
                                  <feature.icon className="size-6" />
                                </div>
                                <h4 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{feature.title}</h4>
                                <p className="text-base text-muted-foreground leading-relaxed font-medium">{feature.desc}</p>
                                <ul className="space-y-2.5 pt-1">
                                  {feature.points.map((li, i) => (
                                    <li key={i} className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                                      <div className="size-5 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 shrink-0">
                                        <Check className="size-3" />
                                      </div>
                                      {li}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className={cn("flex-1 w-full", feature.reverse && "lg:order-1")}>
                                <div className="rounded-3xl border border-border/80 bg-slate-50/70 p-6 shadow-sm hover:shadow-xl transition-all duration-300">
                                  {feature.mock}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <div key={selectedFeatureCategory} className="space-y-16">
                    {displayedFeatures.map((feature, idx) => (
                      <motion.div
                        key={feature.title}
                        id={`feature-${feature.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                        className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16 scroll-mt-32"
                        initial={{ opacity: 0, y: 25 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.35, delay: idx * 0.06 }}
                      >
                        <div className={cn("flex-1 space-y-5", feature.reverse && "lg:order-2")}>
                          <div className={cn("size-12 rounded-2xl border flex items-center justify-center shadow-xs", feature.bg, feature.color)}>
                            <feature.icon className="size-6" />
                          </div>
                          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{feature.title}</h3>
                          <p className="text-base text-muted-foreground leading-relaxed font-medium">{feature.desc}</p>
                          <ul className="space-y-2.5 pt-1">
                            {feature.points.map((li, i) => (
                              <li key={i} className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                                <div className="size-5 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 shrink-0">
                                  <Check className="size-3" />
                                </div>
                                {li}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className={cn("flex-1 w-full", feature.reverse && "lg:order-1")}>
                          <div className="rounded-3xl border border-border/80 bg-slate-50/70 p-6 shadow-sm hover:shadow-xl transition-all duration-300">
                            {feature.mock}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </section>

        {/* ─── ROI & TIME SAVINGS CALCULATOR ─── */}
        <RoiCalculator />

        {/* ─── INTEGRATIONS ─── */}
        <section id="integrations" className="py-20 lg:py-28 bg-slate-50/60 border-t border-border overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <motion.div className="text-center space-y-4 max-w-3xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full">
                Ecosystem
              </span>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
                Connects to the tools you already run
              </motion.h2>
              <motion.p variants={fadeUp} custom={0.1} className="text-base text-muted-foreground leading-relaxed font-medium">
                HopeChat plugs straight into WhatsApp, spreadsheets, calendars, and your external databases — no complex code required.
              </motion.p>
            </motion.div>

            <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 max-w-4xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              {[
                { name: "WhatsApp Cloud", icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/25", status: "Official API" },
                { name: "Google Sheets", icon: Database, color: "text-green-600", bg: "bg-green-500/10 border-green-500/25", status: "Real-time Sync" },
                { name: "Cal.com", icon: CalendarCheck, color: "text-sky-600", bg: "bg-sky-500/10 border-sky-500/25", status: "Live Booking" },
                { name: "REST APIs", icon: Webhook, color: "text-violet-600", bg: "bg-violet-500/10 border-violet-500/25", status: "Webhooks" },
                { name: "Shopify", icon: ShoppingCart, color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/25", status: "Coming Soon" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  custom={i * 0.05}
                  className="flex flex-col items-center text-center p-4 rounded-2xl bg-white border border-border shadow-xs hover:shadow-lg hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className={cn("size-12 rounded-xl border flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110", item.bg, item.color)}>
                    <item.icon className="size-6" />
                  </div>
                  <span className="text-sm font-bold text-foreground mb-1">{item.name}</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-muted-foreground border border-border/60">
                    {item.status}
                  </span>
                </motion.div>
              ))}
            </motion.div>

            <motion.div className="text-center" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-900 shadow-xs">
                <Zap className="size-4 text-emerald-600 shrink-0" />
                Need custom webhooks or enterprise ERP connectors? We provide full REST API documentation out of the box.
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section id="how-it-works" className="py-20 lg:py-28 bg-white border-t border-border overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
            <motion.div className="text-center space-y-4 max-w-3xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full">
                Quick Setup
              </span>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
                Live in minutes, not months
              </motion.h2>
              <motion.p variants={fadeUp} custom={0.1} className="text-base text-muted-foreground leading-relaxed font-medium">
                No developers or complex migration needed. Connect and automate in three simple steps.
              </motion.p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { step: "01", title: "Connect Your Number", desc: "Link HopeChat in minutes via the official Meta API. No developer required — your existing WhatsApp Business app stays connected.", highlight: "Instant Coexistence" },
                { step: "02", title: "Upload Data & Flows", desc: "Upload your PDFs, price lists, and catalogs. Configure simple trigger rules or let the AI assist your incoming chats.", highlight: "Zero Code Needed" },
                { step: "03", title: "Automate & Scale", desc: "Your inquiries, lead follow-ups, and appointment bookings run 24/7 on autopilot while you close more deals.", highlight: "Runs 24/7" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className="rounded-3xl border border-border bg-white p-6 sm:p-8 text-center space-y-4 shadow-xs hover:shadow-xl hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                >
                  <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xl shadow-md shadow-emerald-600/20">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25">
                    <Zap className="size-3" />
                    {item.highlight}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SETUP SERVICE ─── */}
        <section id="setup-service" className="py-20 lg:py-28 bg-slate-50/60 border-t border-border overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <motion.div className="text-center space-y-4 max-w-3xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full">
                White-Glove Onboarding
              </span>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
                Don&apos;t have time? We&apos;ll set it up for you.
              </motion.h2>
              <motion.p variants={fadeUp} custom={0.1} className="text-base text-muted-foreground leading-relaxed font-medium">
                Our concierge engineering team handles your Meta verification, WhatsApp API credentials, custom flows, and AI assistant training — so you can focus 100% on sales.
              </motion.p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                {
                  size: "1–5 staff",
                  tag: "Small Business",
                  price: "800,000",
                  features: ["Meta / WhatsApp API configuration", "AI assistant training on your business", "Welcome message & basic automations", "1-hour team onboarding session"],
                },
                {
                  size: "6–20 staff",
                  tag: "Growing Business",
                  price: "1,200,000",
                  popular: true,
                  features: ["Everything in Small", "Broadcast & SMS campaign setup", "Flow-builder automations & drip sequences", "Team training (up to 3 hours)"],
                },
                {
                  size: "21+ staff",
                  tag: "Large Business",
                  price: "1,500,000",
                  features: ["Everything in Growing", "Full Meta Business configuration", "Custom integrations (CRM, Sheets, webhooks)", "Dedicated onboarding engineer"],
                },
              ].map((tier, i) => (
                <motion.div
                  key={i}
                  className={cn(
                    "relative flex flex-col rounded-3xl border p-6 lg:p-8 transition-all duration-300",
                    tier.popular
                      ? "border-emerald-500/50 bg-white shadow-2xl shadow-emerald-900/10 lg:scale-[1.03] ring-1 ring-emerald-500/30"
                      : "border-border bg-white shadow-sm hover:shadow-lg hover:border-emerald-500/30",
                  )}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  {tier.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md shadow-emerald-600/30">
                      Most Popular
                    </span>
                  )}
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25 w-fit">
                    {tier.tag}
                  </div>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">UGX {tier.price}</span>
                    <span className="text-xs font-bold text-muted-foreground">/ one-time</span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">{tier.size}</p>
                  <ul className="mt-6 space-y-3 flex-1">
                    {tier.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-xs sm:text-sm font-medium text-foreground">
                        <div className="size-4.5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mt-0.5 shrink-0">
                          <Check className="size-3" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/request-demo"
                    className={cn(
                      buttonVariants(),
                      "w-full mt-8 font-bold rounded-xl h-11 transition-all",
                      tier.popular
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 border-0"
                        : "bg-white border border-border text-foreground hover:bg-slate-50",
                    )}
                  >
                    Request Setup & Demo
                  </Link>
                </motion.div>
              ))}
            </div>

            <motion.div className="text-center" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-900 shadow-xs">
                <Sparkles className="size-4 text-emerald-600 shrink-0" />
                Not sure which package fits? Book a free demo call and we will evaluate your tech stack.
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── PRICING ─── */}
        <section id="pricing" className="py-20 lg:py-28 bg-white border-t border-border overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <motion.div className="text-center space-y-4 max-w-3xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full">
                Transparent Pricing
              </span>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
                Simple plans that grow with you
              </motion.h2>
              <motion.p variants={fadeUp} custom={0.1} className="text-base text-muted-foreground leading-relaxed font-medium">
                Every plan includes a 14-day free trial. Connect your WhatsApp Business number, test credits, and pay securely via Mobile Money (MTN, Airtel) or Card.
              </motion.p>

              {/* Monthly vs. Annual Billing Switcher Toggle */}
              <div className="flex items-center justify-center gap-3 pt-4">
                <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 border border-border/80 shadow-inner">
                  <button
                    onClick={() => setBillingCycle("monthly")}
                    className={cn(
                      "px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer",
                      billingCycle === "monthly"
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Monthly Billing
                  </button>
                  <button
                    onClick={() => setBillingCycle("annual")}
                    className={cn(
                      "px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2",
                      billingCycle === "annual"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>Annual Billing</span>
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-0.5 rounded-full transition-colors",
                      billingCycle === "annual" ? "bg-white text-emerald-800" : "bg-emerald-500/15 text-emerald-700"
                    )}>
                      Save 10%
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Pricing Cards Grid */}
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plans.map((plan, i) => {
                const currentPrice = billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly;
                return (
                  <motion.div
                    key={plan.name}
                    className={cn(
                      "relative flex flex-col rounded-3xl border p-6 lg:p-8 transition-all duration-300",
                      plan.popular
                        ? "border-emerald-500/50 bg-white shadow-2xl shadow-emerald-900/10 lg:scale-[1.03] ring-1 ring-emerald-500/30"
                        : "border-border bg-white shadow-sm hover:shadow-lg hover:border-emerald-500/30",
                    )}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md shadow-emerald-600/30">
                        Most Popular
                      </span>
                    )}
                    <h3 className="text-xl font-extrabold text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">{plan.tagline}</p>
                    
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black tracking-tight text-foreground transition-all">
                        UGX {currentPrice}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground">/ month</span>
                    </div>

                    {billingCycle === "annual" ? (
                      <p className="text-[11px] font-semibold text-emerald-600 mt-1">
                        Billed UGX {plan.annualTotal} / year (Save UGX {plan.annualSavings})
                      </p>
                    ) : (
                      <p className="text-[11px] font-semibold text-muted-foreground mt-1">
                        Billed monthly · Cancel anytime
                      </p>
                    )}

                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 w-fit">
                      <Zap className="size-3" />
                      {plan.credits}
                    </div>

                    <ul className="mt-6 space-y-3 flex-1">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-2.5 text-xs sm:text-sm font-medium text-foreground">
                          <div className="size-4.5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mt-0.5 shrink-0">
                            <Check className="size-3" />
                          </div>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/signup"
                      className={cn(
                        buttonVariants(),
                        "w-full mt-8 font-bold rounded-xl h-11 transition-all",
                        plan.popular
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 border-0"
                          : "bg-white border border-border text-foreground hover:bg-slate-50",
                      )}
                    >
                      Start Free Trial
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <motion.div className="text-center" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-900 shadow-xs">
                <Zap className="size-4 text-emerald-600 shrink-0" />
                Prepay and save: 3 months at standard rate, 6 months get 5% discount, 12 months get 10% discount. Powered by Pesapal.
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── TESTIMONIALS ─── */}
        <section className="py-20 lg:py-28 bg-slate-50/60 border-t border-border overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
            <motion.div className="text-center space-y-4 max-w-3xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full">
                Customer Proof
              </span>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
                Trusted by high-growth businesses across East Africa
              </motion.h2>
              <motion.p variants={fadeUp} custom={0.1} className="text-base text-muted-foreground leading-relaxed font-medium">
                Real results from retail brands, distribution networks, and digital service companies.
              </motion.p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { quote: "HopeChat tripled our lead response speed in week one. The shared inbox eliminated chaos across our 8 sales representatives.", name: "Sarah Akello", role: "Operations Manager, Kampala Retail", company: "Retail Hub" },
                { quote: "Our broadcast campaign open rates jumped from 18% on email to 82% on WhatsApp. HopeChat is now essential to our marketing stack.", name: "David Ochieng", role: "Marketing Head, Nairobi Mart", company: "E-Commerce" },
                { quote: "We replaced three separate tools with HopeChat. The AI handles 70% of customer inquiries automatically — our team can finally focus on closing deals.", name: "Grace Mugisha", role: "COO, Kigali Exports", company: "Logistics" },
              ].map((t, i) => (
                <motion.div
                  key={i}
                  className="p-6 sm:p-8 rounded-3xl bg-white border border-border shadow-xs hover:shadow-xl hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300 h-full flex flex-col justify-between"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div>
                    {/* 5 Gold Stars */}
                    <div className="flex items-center gap-1 mb-4 text-amber-400">
                      {[...Array(5)].map((_, sIdx) => (
                        <Star key={sIdx} className="size-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed font-medium">&ldquo;{t.quote}&rdquo;</p>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-6 pt-5 border-t border-border">
                    <div className={cn("size-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-sm select-none", getAvatarGradient(t.name))}>
                      {t.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-foreground truncate">{t.name}</span>
                        <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                      </div>
                      <div className="text-xs text-muted-foreground font-medium truncate">{t.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section id="faq" className="py-20 lg:py-28 bg-white border-t border-border overflow-hidden">
          <div className="mx-auto max-w-3xl px-4 text-center space-y-12">
            <motion.div className="space-y-3" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full">
                Help & Answers
              </span>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
                Frequently asked questions
              </motion.h2>
              <motion.p variants={fadeUp} custom={0.1} className="text-base text-muted-foreground font-medium">
                Everything you need to know about setup, official Meta APIs, and billing.
              </motion.p>
            </motion.div>

            <motion.div className="text-left space-y-3" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  custom={i * 0.04}
                  className="rounded-2xl border border-border bg-white overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-500/30 transition-all duration-200"
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    className="w-full px-6 py-4.5 flex justify-between items-center text-left font-bold text-foreground text-sm sm:text-base hover:bg-slate-50/70 transition-colors"
                  >
                    <span className="pr-4">{faq.q}</span>
                    <ChevronRight className={cn("size-5 shrink-0 transition-transform duration-300 text-muted-foreground", activeFaq === i && "rotate-90 text-emerald-600")} />
                  </button>
                  {activeFaq === i && (
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/60 font-medium bg-slate-50/40">
                      {faq.a}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── CTA BANNER ─── */}
        <section className="py-16 md:py-24 bg-slate-50/60 border-t border-border overflow-hidden">
          <div className="mx-auto max-w-7xl px-4">
            <motion.div
              className="rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 border border-emerald-500/30 p-8 md:p-16 lg:p-20 text-center overflow-hidden relative shadow-2xl text-white"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />
              <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 border border-white/30 px-3.5 py-1 text-xs font-bold text-white shadow-xs backdrop-blur-md">
                  <Sparkles className="size-3.5" /> Start within 5 minutes
                </span>
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                  Turn WhatsApp into your highest-converting sales channel.
                </h2>
                <p className="text-sm sm:text-base text-emerald-100 leading-relaxed font-medium">
                  Join hundreds of growing businesses automating customer chats, broadcasts, and lead follow-ups with HopeChat.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto bg-white hover:bg-slate-100 text-emerald-900 h-12 px-8 text-base font-extrabold rounded-xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all border-0 group")}>
                    Start 14-Day Free Trial
                    <ArrowRight className="ml-2 h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link href="/request-demo" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto h-12 px-8 text-base border-white/40 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl backdrop-blur-sm transition-all")}>
                    Schedule a Demo
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

      </main>

      {/* ─── FOOTER ─── */}
      <footer className="bg-white border-t border-border pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            <div className="col-span-2 md:col-span-2 space-y-4">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
                  <MessageSquare className="size-4" />
                </div>
                <span className="font-extrabold tracking-tight text-foreground text-lg">HopeChat</span>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium max-w-xs">
                The WhatsApp CRM and automation platform built for East African businesses. Automate conversations, run broadcast campaigns, build no-code chatbots, and connect your existing tools — all on the official WhatsApp Business API.
              </p>
              <p className="text-xs font-bold text-muted-foreground">Built by HopeTech Solutions Ltd · Kampala, Uganda</p>
              <div className="space-y-2 pt-1">
                <a href="tel:+256763149276" className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-emerald-600 transition-colors">
                  <Phone className="size-3.5 text-emerald-600" /> +256 763 149 276
                </a>
                <a href="mailto:info@hopechat.net" className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-emerald-600 transition-colors">
                  <Mail className="size-3.5 text-emerald-600" /> info@hopechat.net
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Product</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#features" className="hover:text-emerald-600 transition-colors">Shared Inbox</Link></li>
                <li><Link href="#features" className="hover:text-emerald-600 transition-colors">AI Assistant</Link></li>
                <li><Link href="#features" className="hover:text-emerald-600 transition-colors">Broadcasts</Link></li>
                <li><Link href="#features" className="hover:text-emerald-600 transition-colors">SMS</Link></li>
                <li><Link href="#features" className="hover:text-emerald-600 transition-colors">Mobile App</Link></li>
                <li><Link href="#pricing" className="hover:text-emerald-600 transition-colors">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Features</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#features" className="hover:text-emerald-600 transition-colors">Coexistence</Link></li>
                <li><Link href="#features" className="hover:text-emerald-600 transition-colors">Drip Campaigns</Link></li>
                <li><Link href="#features" className="hover:text-emerald-600 transition-colors">WhatsApp Ads</Link></li>
                <li><Link href="#features" className="hover:text-emerald-600 transition-colors">Flow Builder</Link></li>
                <li><Link href="#features" className="hover:text-emerald-600 transition-colors">Tests & Practice</Link></li>
                <li><Link href="#features" className="hover:text-emerald-600 transition-colors">Smart Screening</Link></li>
                <li><Link href="#features" className="hover:text-emerald-600 transition-colors">Team Inbox</Link></li>
                <li><Link href="#features" className="hover:text-emerald-600 transition-colors">Mobile App</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Integrations</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#integrations" className="hover:text-emerald-600 transition-colors">WhatsApp</Link></li>
                <li><Link href="#integrations" className="hover:text-emerald-600 transition-colors">Google Sheets</Link></li>
                <li><Link href="#integrations" className="hover:text-emerald-600 transition-colors">Cal.com</Link></li>
                <li><Link href="#integrations" className="hover:text-emerald-600 transition-colors">REST API</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Company</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="/request-demo" className="hover:text-emerald-600 transition-colors">Request a Demo</Link></li>
                <li><a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition-colors">Docs & Guides</a></li>
                <li><Link href="#setup-service" className="hover:text-emerald-600 transition-colors">Setup Service</Link></li>
                <li><a href="tel:+256763149276" className="hover:text-emerald-600 transition-colors">+256 763 149 276</a></li>
                <li><a href="mailto:info@hopechat.net" className="hover:text-emerald-600 transition-colors">Email Us</a></li>
                <li><Link href="/privacy" className="hover:text-emerald-600 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-emerald-600 transition-colors">Terms of Service</Link></li>
                <li><Link href="/terms#refunds" className="hover:text-emerald-600 transition-colors">Refund Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            <p>© {new Date().getFullYear()} HopeChat by HopeTech Solutions Ltd. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-emerald-600 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-emerald-600 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
