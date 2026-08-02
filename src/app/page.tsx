"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
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
  Quote,
  Mail,
  ShoppingCart,
  Webhook,
  Target,
  Brain,
  Cpu,
  Layers,
  Smartphone,
  Search,
  Database,
  Timer,
  MessageSquareText,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeFeature, setActiveFeature] = useState(0);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Integrations", href: "#integrations" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "FAQ", href: "#faq" },
  ];

  const faqs = [
    {
      q: "What is HopeChat?",
      a: "HopeChat is a WhatsApp CRM and automation platform that helps businesses automate customer conversations, follow up on leads instantly, run broadcast campaigns, and build no-code workflows — all powered by the official WhatsApp Business API. It includes a shared inbox, AI assistant, knowledge base, chatbot builder, and 20+ integrations.",
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
      q: "How does the AI train on my business data?",
      a: "Upload your product catalogues, price lists, FAQs, and website URLs. HopeChat AI learns your business automatically and answers customer questions based on what you teach it. It escalates to a human when it doesn't know the answer.",
    },
    {
      q: "Is HopeChat compliant with Meta's Official WhatsApp API policies?",
      a: "Yes. HopeChat connects directly through Meta Business using the official WhatsApp Business API. Every message — broadcasts, chatbot replies, order updates — is delivered with enterprise-grade reliability and full Meta compliance.",
    },
    {
      q: "How much does HopeChat cost?",
      a: "HopeChat runs on simple monthly plans: Bronze at 65,000 UGX, Silver at 180,000 UGX, and Gold at 450,000 UGX per month. Save up to 10% by paying for 3, 6, or 12 months upfront. Every plan starts with a free trial — no credit card required.",
    },
    {
      q: "How do I pay for my subscription?",
      a: "Pay securely through Pesapal using Mobile Money or credit card, right from your dashboard. You can also top up message credits any time, and your plan, billing period, and credit balance are all visible in the Billing section.",
    },
    {
      q: "Can HopeChat send SMS as well as WhatsApp messages?",
      a: "Yes. In addition to WhatsApp broadcasts, HopeChat sends bulk SMS campaigns through the same dashboard, so you can reach contacts who aren't on WhatsApp. Both channels use credit-based pricing and report delivery status.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white text-foreground antialiased font-sans selection:bg-primary/20">

      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20">
                <MessageSquare className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-foreground">HopeChat</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted-foreground">
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-primary transition-colors duration-200">{l.label}</Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold text-muted-foreground hover:text-foreground h-9 px-4 hidden sm:inline-flex")}>Log In</Link>
            <Link href="/signup" className={cn(buttonVariants(), "bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 h-9 text-xs sm:text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 rounded-lg border-0")}>Start Free Trial</Link>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground" aria-label="Toggle Menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="md:hidden border-b border-border bg-white px-4 py-4 space-y-3">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-background">{l.label}</Link>
            ))}
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)} className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}>Log In</Link>
            </div>
          </motion.div>
        )}
      </header>

      <main className="flex-1">

        {/* ─── HERO ─── */}
        <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 lg:pt-28 lg:pb-40 overflow-hidden bg-white">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[150px]" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/[0.04] rounded-full blur-[120px]" />
          </div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

              {/* Left */}
              <motion.div className="flex-1 text-center lg:text-left space-y-6 max-w-xl" initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
                <motion.div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs sm:text-sm font-bold text-foreground" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.4 }}>
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span>Official WhatsApp Business API</span>
                </motion.div>

                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1] text-foreground">
                  More Leads. Faster Follow-Up.{" "}
                  <span className="text-primary">More Revenue.</span>
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                  HopeChat replies instantly, follows up automatically, and closes sales right inside WhatsApp — so no lead ever goes cold.
                </p>

                <div className="flex flex-col sm:flex-row items-center lg:justify-start gap-3">
                  <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto h-12 px-8 text-base bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl border-0 group")}>
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link href="#features" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto h-12 px-8 text-base border-border bg-white text-foreground font-bold hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl")}>
                    Book a Demo
                  </Link>
                </div>

                <p className="text-xs text-muted-foreground font-medium">No credit card required · Set up in minutes · Cancel anytime</p>

                <div className="grid grid-cols-3 gap-6 pt-4">
                  {[
                    { value: "98%", label: "Open rate", sub: "vs. ~20% on email" },
                    { value: "5x", label: "Faster replies", sub: "vs. manual follow-up" },
                    { value: "24/7", label: "Always on", sub: "Never miss a lead" },
                  ].map((s, i) => (
                    <motion.div key={i} className="text-center lg:text-left" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                      <div className="text-3xl font-extrabold text-primary">{s.value}</div>
                      <div className="text-sm font-bold text-foreground">{s.label}</div>
                      <div className="text-xs text-muted-foreground font-medium">{s.sub}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Right - Hero Mock */}
              <motion.div className="flex-1 w-full" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
                <div className="rounded-2xl border border-border bg-white shadow-xl shadow-black/[0.04] overflow-hidden">
                  <div className="flex">
                    <div className="hidden sm:flex w-44 border-r border-border bg-background/50 flex-col">
                      <div className="p-3 border-b border-border flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground">Conversations</span>
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="flex-1 p-2 space-y-1">
                        {[
                          ["NK", "Nalukenge Kate", "Active"],
                          ["OK", "Ochieng Kevin", "Bot"],
                          ["JM", "Jean Mugisha", ""],
                        ].map(([initials, name, tag], i) => (
                          <div key={i} className={cn("p-2 rounded-lg flex items-center gap-2 cursor-pointer", i === 0 ? "bg-primary/10 border border-primary/20" : "hover:bg-background")}>
                            <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0", i === 0 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>{initials}</div>
                            <div className="overflow-hidden flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold truncate">{name}</span>
                                {tag === "Active" && <span className="text-[8px] text-primary font-bold bg-primary/10 px-1 rounded shrink-0">ACTIVE</span>}
                                {tag === "Bot" && <span className="text-[8px] text-emerald-600 font-bold bg-emerald-500/10 px-1 rounded shrink-0">BOT</span>}
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">WhatsApp Business</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col min-h-[320px]">
                      <div className="p-3 border-b border-border bg-background/30 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-foreground">Nalukenge Kate</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">AI Agent · Retail</span>
                      </div>
                      <div className="flex-1 p-4 space-y-3">
                        <div className="flex gap-2 max-w-[85%]">
                          <div className="h-6 w-6 rounded-full bg-background text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0">U</div>
                          <div className="bg-white text-foreground px-3.5 py-2.5 rounded-2xl rounded-bl-none border border-border text-xs shadow-sm">Hi! Do you offer bulk delivery in Kampala?</div>
                        </div>
                        <div className="flex gap-2 max-w-[85%] ml-auto flex-row-reverse">
                          <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">AI</div>
                          <div className="bg-primary text-primary-foreground px-3.5 py-2.5 rounded-2xl rounded-br-none border border-primary/20 text-xs shadow-sm">Yes! Orders over 500,000 UGX qualify for free delivery. Want me to connect you with sales?</div>
                        </div>
                        <div className="flex gap-2 max-w-[85%]">
                          <div className="h-6 w-6 rounded-full bg-background text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0">U</div>
                          <div className="bg-white text-foreground px-3.5 py-2.5 rounded-2xl rounded-bl-none border border-border text-xs shadow-sm">Yes please. Also send your price list.</div>
                        </div>
                        <div className="flex gap-2 max-w-[85%] ml-auto flex-row-reverse">
                          <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">AI</div>
                          <div className="bg-primary text-primary-foreground px-3.5 py-2.5 rounded-2xl rounded-br-none border border-primary/20 text-xs shadow-sm">Transferred you to Sarah. She has your pricing guide ready!</div>
                        </div>
                      </div>
                      <div className="p-3 border-t border-border bg-white">
                        <div className="bg-background/50 border border-border rounded-xl px-4 py-2.5 text-muted-foreground text-[11px]">AI agent is drafting a response...</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ─── AI ASSISTANT ─── */}
        <section className="py-20 lg:py-28 bg-background border-t border-border overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              <motion.div className="flex-1 space-y-8" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                <motion.div variants={fadeUp} custom={0}>
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-primary">
                    <Bot className="h-3.5 w-3.5" /> AI-Powered WhatsApp Agent
                  </span>
                </motion.div>
                <motion.h2 variants={fadeUp} custom={0.1} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                  Doesn&apos;t just chat. It closes.
                </motion.h2>
                <motion.p variants={fadeUp} custom={0.2} className="text-base text-muted-foreground leading-relaxed font-medium">
                  Train HopeChat on your own documents, website URLs, and catalogs. It understands customer intent, answers 24/7, and triggers real actions.
                </motion.p>
                <motion.div variants={fadeUp} custom={0.3} className="grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: Target, title: "Intent Detection", desc: "Spot high-value leads instantly and prioritize conversations that drive revenue." },
                    { icon: Brain, title: "Data-Driven Memory", desc: "Train AI in minutes using PDFs, web links, and Google Sheets for accurate replies." },
                    { icon: Cpu, title: "Real Actions, Not Just Replies", desc: "Auto-trigger workflows, qualify leads, and assign to sales reps seamlessly." },
                    { icon: Layers, title: "Structured WhatsApp Flows", desc: "Interactive buttons, lists, and forms to guide buyers from curiosity to payment." },
                  ].map((item, i) => (
                    <motion.div key={i} className="p-5 rounded-xl bg-white border border-border shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-1 transition-all duration-300" whileHover={{ y: -4 }}>
                      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground mb-1.5">{item.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
                    </motion.div>
                  ))}
                </motion.div>
                <motion.div variants={fadeUp} custom={0.4}>
                  <Link href="/signup" className={cn(buttonVariants(), "bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 h-11 rounded-xl border-0 shadow-md group")}>
                    Start Free Trial <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              </motion.div>

              {/* Chat Widget */}
              <motion.div className="flex-1 w-full max-w-md mx-auto" initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <div className="rounded-2xl border border-border bg-white shadow-lg overflow-hidden">
                  <div className="p-3 bg-background/50 border-b border-border flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-foreground">HopeChat Assistant</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 ml-auto font-bold">● Online</span>
                  </div>
                  <div className="p-4 space-y-3 min-h-[220px]">
                    <div className="flex gap-2 items-start">
                      <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">H</div>
                      <div className="bg-background px-3.5 py-2.5 rounded-2xl rounded-bl-none border border-border text-xs max-w-[85%] shadow-sm">👋 Hi! I&apos;m your HopeChat assistant. How can I help today?</div>
                    </div>
                    <div className="flex gap-2 items-start ml-auto flex-row-reverse max-w-[85%]">
                      <div className="h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0">U</div>
                      <div className="bg-primary text-primary-foreground px-3.5 py-2.5 rounded-2xl rounded-br-none text-xs shadow-sm">Do you ship to Mombasa?</div>
                    </div>
                    <div className="flex gap-2 items-start">
                      <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">H</div>
                      <div className="bg-background px-3.5 py-2.5 rounded-2xl rounded-bl-none border border-border text-xs max-w-[85%] shadow-sm">Yes! Orders to Mombasa ship free in 2–3 days. Want me to start your order?</div>
                    </div>
                  </div>
                  <div className="p-3 border-t border-border">
                    <div className="bg-background/50 border border-border rounded-xl px-4 py-2.5 text-muted-foreground text-[11px]">Type your message...</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section id="features" className="py-20 lg:py-28 bg-white border-t border-border overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-20">
            <motion.div className="text-center space-y-4 max-w-3xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Everything you need to grow on WhatsApp</motion.h2>
              <motion.p variants={fadeUp} custom={0.1} className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                Speed up your entire sales funnel with automation that captures leads, replies instantly, and closes more — all on WhatsApp.
              </motion.p>
            </motion.div>

            {[
              {
                icon: Smartphone,
                title: "WhatsApp Coexistence",
                desc: "Use your existing phone number with zero downtime. Keep phone app chats intact while HopeChat handles background automation.",
                points: ["Same number, no migration downtime", "Existing chats & contacts stay intact", "Use phone app and platform together", "Official Meta-approved coexistence"],
                reverse: false,
                mock: (
                  <div className="bg-white border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3 pb-2 border-b border-border">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-border text-xs font-bold text-foreground"><Smartphone className="h-3.5 w-3.5 text-primary" /> Business App</div>
                      <span className="text-muted-foreground text-xs font-bold">+</span>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary"><Zap className="h-3.5 w-3.5" /> HopeChat</div>
                    </div>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2"><div className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">WA</div>Nalukenge Kate — replied via phone app</div>
                      <div className="flex items-center gap-2"><div className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">HC</div>Ochieng Kevin — auto-replied by HopeChat AI</div>
                    </div>
                  </div>
                ),
              },
              {
                icon: Radio,
                title: "WhatsApp Broadcasts at Scale",
                desc: "Send broadcast campaigns to thousands of contacts with zero ban risk via the Official WhatsApp API.",
                points: ["Official API — zero ban risk", "Audience segmentation & targeting", "Rich media: images, videos, buttons", "Real-time delivery & read analytics"],
                reverse: true,
                mock: (
                  <div className="bg-white border border-border rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center border-b border-border pb-2">
                      <span className="text-xs font-bold text-foreground">Recent Broadcast</span>
                      <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">Delivered</span>
                    </div>
                    {[
                      { label: "Sent", value: "12,450" },
                      { label: "Delivered", value: "12,201", cls: "text-emerald-600" },
                      { label: "Read", value: "9,756", cls: "text-emerald-600" },
                      { label: "Replied", value: "1,892", cls: "text-primary font-bold" },
                    ].map((r, i) => (
                      <div key={i} className="flex justify-between text-xs"><span className="text-muted-foreground">{r.label}</span><span className={cn("font-bold", r.cls || "text-foreground")}>{r.value}</span></div>
                    ))}
                    <div className="h-2 w-full bg-background rounded-full overflow-hidden"><div className="h-full w-[78%] bg-primary rounded-full" /></div>
                  </div>
                ),
              },
              {
                icon: MessageSquareText,
                title: "Bulk SMS Broadcasts",
                desc: "Reach customers who aren't on WhatsApp with affordable bulk SMS campaigns from the same dashboard — no separate tools needed.",
                points: ["Bulk SMS to thousands of recipients", "Audience segmentation & targeting", "Pay per message with credit pricing", "Delivery tracking with one-tap retry"],
                reverse: false,
                mock: (
                  <div className="bg-white border border-border rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center border-b border-border pb-2">
                      <span className="text-xs font-bold text-foreground">SMS Broadcast</span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">Delivered</span>
                    </div>
                    {[
                      { label: "Sent", value: "8,320" },
                      { label: "Delivered", value: "8,014", cls: "text-emerald-600" },
                      { label: "Failed", value: "306", cls: "text-red-500" },
                      { label: "Retried", value: "306", cls: "text-primary font-bold" },
                    ].map((r, i) => (
                      <div key={i} className="flex justify-between text-xs"><span className="text-muted-foreground">{r.label}</span><span className={cn("font-bold", r.cls || "text-foreground")}>{r.value}</span></div>
                    ))}
                    <div className="h-2 w-full bg-background rounded-full overflow-hidden"><div className="h-full w-[96%] bg-emerald-500 rounded-full" /></div>
                  </div>
                ),
              },
              {
                icon: Workflow,
                title: "Visual No-Code Flow Builder",
                desc: "Drag-and-drop builder to qualify leads, auto-reply, and route inquiries without writing code.",
                points: ["Visual drag-and-drop flow builder", "Qualify leads and book calls 24/7", "AI answers trained on your business", "Seamless handoff to a human agent"],
                reverse: false,
                mock: (
                  <div className="bg-white border border-border rounded-xl p-4 space-y-2">
                    <div className="text-xs font-bold text-foreground flex items-center gap-2 border-b border-border pb-2"><Workflow className="h-4 w-4 text-primary" /> Automation: Lead Qualification</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1.5"><div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">1</div>Customer sends message</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1.5"><div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">2</div>AI detects intent & qualifies</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1.5"><div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">3</div>Auto-reply with pricing or handoff</div>
                  </div>
                ),
              },
              {
                icon: Users,
                title: "Shared Team Inbox",
                desc: "One WhatsApp number for your entire team with multi-agent routing, collision detection, custom tags, and internal notes.",
                points: ["Smart routing to the right agent", "Tags, notes, and full chat history", "Assign and collaborate on chats", "One number, unlimited teammates"],
                reverse: true,
                mock: (
                  <div className="bg-white border border-border rounded-xl p-4 space-y-3">
                    <div className="text-xs font-bold text-foreground border-b border-border pb-2 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Team Inbox — 3 agents online</div>
                    {[
                      { name: "Sarah", role: "Sales", chats: "8" },
                      { name: "David", role: "Support", chats: "12" },
                      { name: "HopeChat AI", role: "Virtual Agent", chats: "45" },
                    ].map((a, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold">{a.name[0]}</div>
                          <div><div className="text-xs font-semibold text-foreground">{a.name}</div><div className="text-[10px] text-muted-foreground">{a.role}</div></div>
                        </div>
                        <span className="text-xs font-bold text-foreground">{a.chats} chats</span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                icon: Globe,
                title: "Click-to-WhatsApp Ads",
                desc: "Auto-capture leads from Facebook, Instagram, or website ads straight into an instant automated WhatsApp sequence.",
                points: ["Facebook & Instagram ads → WhatsApp", "Capture IndiaMart & JustDial leads", "Instant automated first reply", "No lead goes cold or unanswered"],
                reverse: false,
                mock: (
                  <div className="bg-white border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border pb-2"><Globe className="h-4 w-4 text-primary" /> Ad → WhatsApp Flow</div>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-background"><MessageSquare className="h-4 w-4 text-primary" /> Facebook Ad: &ldquo;50% Off Today&rdquo; → Chat</div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5"><Zap className="h-4 w-4 text-primary" /> Auto-reply sent: &ldquo;Hi! Here&apos;s your discount code...&rdquo;</div>
                    </div>
                  </div>
                ),
              },
              {
                icon: Timer,
                title: "Automated Drip Sequences",
                desc: "Multi-step follow-ups scheduled on Day 1, Day 3, Day 7 to revive cold leads and boost conversions.",
                points: ["Multi-step timed message sequences", "Triggered by lead actions or tags", "Auto-stops when lead replies or buys", "Track opens, clicks, and conversions"],
                reverse: true,
                mock: (
                  <div className="bg-white border border-border rounded-xl p-4 space-y-2">
                    <div className="text-xs font-bold text-foreground border-b border-border pb-2 flex items-center gap-2"><Timer className="h-4 w-4 text-primary" /> Drip Sequence: New Lead</div>
                    {[
                      { day: "Day 1", msg: "Welcome! Here's what we offer..." },
                      { day: "Day 3", msg: "Following up — need any help?" },
                      { day: "Day 7", msg: "Special offer just for you 🎉" },
                    ].map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-primary shrink-0 w-12">{d.day}</span>
                        <span className="text-muted-foreground">{d.msg}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <div className={cn("flex-1 space-y-5", feature.reverse && "lg:order-2")}>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">{feature.desc}</p>
                  <ul className="space-y-2">
                    {feature.points.map((li, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {li}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={cn("flex-1 w-full", feature.reverse && "lg:order-1")}>
                  <div className="rounded-2xl border border-border bg-background/50 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                    {feature.mock}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── INTEGRATIONS ─── */}
        <section id="integrations" className="py-20 lg:py-28 bg-background border-t border-border overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <motion.div className="text-center space-y-4 max-w-3xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Connects to the tools you already run</motion.h2>
              <motion.p variants={fadeUp} custom={0.1} className="text-base text-muted-foreground leading-relaxed font-medium">
                HopeChat connects smoothly with your payment gateways, CRM, e-commerce store, and Google Sheets.
              </motion.p>
            </motion.div>

            <motion.div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              {([
                ["Shopify", ShoppingCart],
                ["WooCommerce", ShoppingCart],
                ["Stripe", Zap],
                ["HubSpot", Globe],
                ["Zoho CRM", Database],
                ["Google Sheets", Database],
                ["Zapier", Zap],
                ["Make", Workflow],
                ["n8n", Workflow],
              ] as [string, any][]).map(([name, Icon], i) => (
                <motion.div key={i} variants={fadeUp} custom={i * 0.03} className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-bold text-foreground">{name}</span>
                </motion.div>
              ))}
            </motion.div>

            <motion.div className="text-center" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3 text-sm font-medium text-foreground">
                <Zap className="h-4 w-4 text-primary" />
                Need a custom connection? HopeChat supports Webhooks and REST APIs out of the box.
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section id="how-it-works" className="py-20 lg:py-28 bg-white border-t border-border overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
            <motion.div className="text-center space-y-4 max-w-3xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Getting started takes minutes, not months</motion.h2>
              <motion.p variants={fadeUp} custom={0.1} className="text-base text-muted-foreground leading-relaxed font-medium">
                No developers, no long onboarding. Go from sign-up to live automation in three simple steps.
              </motion.p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { step: "01", title: "Connect Your Number", desc: "Link HopeChat in minutes via the official API. No developer required — your existing WhatsApp number works instantly.", highlight: "Live in minutes" },
                { step: "02", title: "Set Up Automations", desc: "Upload your catalog and PDFs, set up visual flows, and configure instant trigger rules that match your business.", highlight: "No code needed" },
                { step: "03", title: "Scale & Automate", desc: "Conversations, lead routing, and follow-ups run 24/7 while you focus on growing your business.", highlight: "Runs 24/7" },
              ].map((item, i) => (
                <motion.div key={i} className="text-center space-y-4" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-lg">{item.step}</div>
                  <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/20">
                    <Zap className="h-3 w-3" />
                    {item.highlight}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PRICING ─── */}
        <section id="pricing" className="py-20 lg:py-28 bg-background border-t border-border overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <motion.div className="text-center space-y-4 max-w-3xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Simple plans that grow with you</motion.h2>
              <motion.p variants={fadeUp} custom={0.1} className="text-base text-muted-foreground leading-relaxed font-medium">
                Every plan includes a free trial. Pay securely with Mobile Money or cards and switch plans any time.
              </motion.p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                {
                  name: "Bronze",
                  tagline: "For solo sellers getting started",
                  price: "65,000",
                  credits: "1,500 credits / month",
                  features: ["AI assistant & shared inbox", "WhatsApp coexistence", "1 team seat", "Sales pipeline & tags"],
                  popular: false,
                },
                {
                  name: "Silver",
                  tagline: "For growing teams running campaigns",
                  price: "180,000",
                  credits: "5,000 credits / month",
                  features: ["Everything in Bronze", "WhatsApp + SMS broadcasts", "Visual flow builder", "3 team seats"],
                  popular: true,
                },
                {
                  name: "Gold",
                  tagline: "For high-volume operators",
                  price: "450,000",
                  credits: "High-volume credits / month",
                  features: ["Everything in Silver", "Multimodal AI", "Larger contact limits", "10 team seats"],
                  popular: false,
                },
              ].map((plan, i) => (
                <motion.div
                  key={i}
                  className={cn(
                    "relative flex flex-col rounded-2xl border p-6 lg:p-8",
                    plan.popular
                      ? "border-primary/40 bg-white shadow-xl shadow-primary/10 lg:scale-[1.03]"
                      : "border-border bg-white shadow-sm",
                  )}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary-foreground shadow-md">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-lg font-extrabold text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1">{plan.tagline}</p>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold tracking-tight text-foreground">UGX {plan.price}</span>
                    <span className="text-sm font-bold text-muted-foreground">/ month</span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-primary">{plan.credits}</p>
                  <ul className="mt-6 space-y-2.5 flex-1">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm font-medium text-foreground">
                        <div className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5 shrink-0">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={cn(
                      buttonVariants(),
                      "w-full mt-8 font-bold rounded-xl h-11",
                      plan.popular
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 border-0"
                        : "bg-white border border-primary/30 text-primary hover:bg-primary/5",
                    )}
                  >
                    Start Free Trial
                  </Link>
                </motion.div>
              ))}
            </div>

            <motion.div className="text-center" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3 text-sm font-medium text-foreground">
                <Zap className="h-4 w-4 text-primary" />
                Pay upfront and save: 3 months at full price, 6 months get 5% off, 12 months get 10% off. Powered by Pesapal.
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── TESTIMONIALS ─── */}
        <section className="py-20 lg:py-28 bg-background border-t border-border overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
            <motion.div className="text-center space-y-4 max-w-3xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Trusted by growing businesses across East Africa</motion.h2>
              <motion.p variants={fadeUp} custom={0.1} className="text-base text-muted-foreground leading-relaxed font-medium">
                See why businesses choose HopeChat to automate their WhatsApp communication.
              </motion.p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { quote: "HopeChat tripled our lead response speed in week one. The shared inbox eliminated chaos across our 8 sales representatives.", name: "Sarah Akello", role: "Operations Manager, Kampala Retail", initials: "SA" },
                { quote: "Our broadcast campaign open rates jumped from 18% on email to 82% on WhatsApp. HopeChat is now essential to our marketing stack.", name: "David Ochieng", role: "Marketing Head, Nairobi Mart", initials: "DO" },
                { quote: "We replaced three separate tools with HopeChat. The AI handles 70% of customer inquiries automatically — our team can finally focus on closing deals.", name: "Grace Mugisha", role: "COO, Kigali Exports", initials: "GM" },
              ].map((t, i) => (
                <motion.div key={i} className="p-6 rounded-2xl bg-white border border-border shadow-sm hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 transition-all duration-500 h-full flex flex-col" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <Quote className="h-6 w-6 text-primary/30 mb-3" />
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium flex-1">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border">
                    <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">{t.initials}</div>
                    <div>
                      <div className="text-sm font-bold text-foreground">{t.name}</div>
                      <div className="text-xs text-muted-foreground font-medium">{t.role}</div>
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
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Frequently asked questions</motion.h2>
              <motion.p variants={fadeUp} custom={0.1} className="text-base text-muted-foreground font-medium">Still have questions? Chat with us and we&apos;ll help you get started.</motion.p>
            </motion.div>

            <motion.div className="text-left space-y-3" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              {faqs.map((faq, i) => (
                <motion.div key={i} variants={fadeUp} custom={i * 0.05} className="rounded-xl border border-border bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300">
                  <button onClick={() => setActiveFaq(activeFaq === i ? null : i)} className="w-full px-6 py-4 flex justify-between items-center text-left font-bold text-foreground text-sm sm:text-base hover:bg-background transition-colors">
                    <span className="pr-4">{faq.q}</span>
                    <ChevronRight className={cn("h-5 w-5 shrink-0 transition-transform duration-300 text-muted-foreground", activeFaq === i && "rotate-90 text-primary")} />
                  </button>
                  <div className="faq-content" data-open={activeFaq === i}>
                    <div className="px-6 pb-4 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border font-medium bg-white">
                      {faq.a}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-16 md:py-24 bg-background border-t border-border overflow-hidden">
          <div className="mx-auto max-w-7xl px-4">
            <motion.div className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8 md:p-16 lg:p-20 text-center overflow-hidden relative shadow-md" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-foreground">
                  Turn WhatsApp into your best sales channel today.
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
                  Join hundreds of growing businesses automating conversations, campaigns, and follow-ups with HopeChat.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 text-base font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all border-0 group")}>
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link href="#" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto h-12 px-8 text-base border-border bg-white text-foreground font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all")}>
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
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <MessageSquare className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold tracking-tight text-foreground">HopeChat</span>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium max-w-xs">
                The WhatsApp CRM and automation platform built for East African businesses. Automate conversations, run broadcast campaigns, build no-code chatbots, and connect your existing tools — all on the official WhatsApp Business API.
              </p>
              <p className="text-xs font-bold text-muted-foreground">Built by HopeTech Solutions Ltd · Kampala, Uganda</p>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Product</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#features" className="hover:text-primary transition-colors">Shared Inbox</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">AI Assistant</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">Broadcasts</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">SMS</Link></li>
                <li><Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Features</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#features" className="hover:text-primary transition-colors">Coexistence</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">Drip Campaigns</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">WhatsApp Ads</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">Flow Builder</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">Team Inbox</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Integrations</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#integrations" className="hover:text-primary transition-colors">Google Sheets</Link></li>
                <li><Link href="#integrations" className="hover:text-primary transition-colors">Zapier</Link></li>
                <li><Link href="#integrations" className="hover:text-primary transition-colors">Shopify</Link></li>
                <li><Link href="#integrations" className="hover:text-primary transition-colors">HubSpot</Link></li>
                <li><Link href="#integrations" className="hover:text-primary transition-colors">REST API</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Company</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Refund Policy</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            <p>© {new Date().getFullYear()} HopeChat by HopeTech Solutions Ltd. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
