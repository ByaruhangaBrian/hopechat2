"use client";

import Link from "next/link";
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
  Smartphone,
  Search,
  Layers,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform",
        isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div className="flex min-h-screen flex-col bg-white text-foreground selection:bg-primary/30 antialiased font-sans">

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <MessageSquare className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-foreground">HopeChat</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted-foreground">
              <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
              <Link href="#how-it-works" className="hover:text-primary transition-colors">How It Works</Link>
              <Link href="#testimonials" className="hover:text-primary transition-colors">Testimonials</Link>
              <Link href="#faq" className="hover:text-primary transition-colors">FAQ</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "text-sm font-bold text-muted-foreground hover:text-foreground h-9 px-4 hidden sm:inline-flex"
              )}
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className={cn(
                buttonVariants(),
                "bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 h-9 text-xs sm:text-sm shadow-md shadow-primary/20 hover:shadow-lg transition-all duration-300 rounded-lg border-0"
              )}
            >
              Start Free Trial
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-white px-4 py-4 space-y-3 mobile-menu-enter">
            <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-background">Features</Link>
            <Link href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-background">How It Works</Link>
            <Link href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-background">Testimonials</Link>
            <Link href="#faq" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-background">FAQ</Link>
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}>Log In</Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">

        {/* ───────────────────── HERO ───────────────────── */}
        <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 lg:pt-28 lg:pb-40 overflow-hidden bg-white">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[150px] -z-10 pointer-events-none" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              {/* Left column */}
              <div className="flex-1 text-center lg:text-left space-y-6 max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs sm:text-sm font-bold text-foreground">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span>Official WhatsApp Business API</span>
                </div>

                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1] text-foreground">
                  More Leads. Faster Follow-Up.{" "}
                  <span className="text-primary">More Revenue.</span>
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                  HopeChat replies instantly, follows up automatically, and closes sales right inside the chat — so no lead ever goes cold on WhatsApp.
                </p>

                <div className="flex flex-col sm:flex-row items-center lg:justify-start gap-3">
                  <Link
                    href="/signup"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "w-full sm:w-auto h-12 px-8 text-base bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:shadow-xl transition-all duration-300 rounded-xl border-0"
                    )}
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4.5 w-4.5" />
                  </Link>
                  <Link
                    href="#features"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "w-full sm:w-auto h-12 px-8 text-base border-border bg-white text-foreground font-bold rounded-xl"
                    )}
                  >
                    Book a Call
                  </Link>
                </div>

                <p className="text-xs text-muted-foreground font-medium">No credit card required · Set up in minutes · Cancel anytime</p>

                <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-muted-foreground pt-4">Trusted by growing businesses across East Africa</p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-6 pt-2">
                  {[
                    { value: "98%", label: "Open rate", sub: "vs. ~20% on email" },
                    { value: "60%", label: "Faster replies", sub: "vs. manual follow-up" },
                    { value: "24/7", label: "Always on", sub: "Never miss a lead" },
                  ].map((s, i) => (
                    <div key={i} className="text-center lg:text-left">
                      <div className="text-3xl font-extrabold text-primary">{s.value}</div>
                      <div className="text-sm font-bold text-foreground">{s.label}</div>
                      <div className="text-xs text-muted-foreground font-medium">{s.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column - large hero mock */}
              <div className="flex-1 w-full">
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
                          <div className="bg-white text-foreground px-3.5 py-2.5 rounded-2xl rounded-bl-none border border-border text-xs shadow-sm">
                            Hi! Do you offer bulk delivery in Kampala?
                          </div>
                        </div>
                        <div className="flex gap-2 max-w-[85%] ml-auto flex-row-reverse">
                          <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">AI</div>
                          <div className="bg-primary text-primary-foreground px-3.5 py-2.5 rounded-2xl rounded-br-none border border-primary/20 text-xs shadow-sm">
                            Yes! We offer bulk delivery across Kampala. Orders over 500,000 UGX qualify for free delivery. Want me to connect you with sales?
                          </div>
                        </div>
                        <div className="flex gap-2 max-w-[85%]">
                          <div className="h-6 w-6 rounded-full bg-background text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0">U</div>
                          <div className="bg-white text-foreground px-3.5 py-2.5 rounded-2xl rounded-bl-none border border-border text-xs shadow-sm">
                            Yes please. Also send me your price list.
                          </div>
                        </div>
                        <div className="flex gap-2 max-w-[85%] ml-auto flex-row-reverse">
                          <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">AI</div>
                          <div className="bg-primary text-primary-foreground px-3.5 py-2.5 rounded-2xl rounded-br-none border border-primary/20 text-xs shadow-sm">
                            Transferred you to Sarah. She has your pricing guide ready!
                          </div>
                        </div>
                      </div>
                      <div className="p-3 border-t border-border bg-white">
                        <div className="bg-background/50 border border-border rounded-xl px-4 py-2.5 text-muted-foreground text-[11px]">AI agent is drafting a response...</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────── AI CHATBOT SECTION ───────────────────── */}
        <section className="py-20 lg:py-28 bg-background border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              {/* Left: text + feature cards */}
              <div className="flex-1 space-y-8">
                <div className="space-y-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-primary">
                    <Bot className="h-3.5 w-3.5" /> AI WhatsApp Chatbot
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                    Doesn&apos;t just chat. It closes.
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed font-medium">
                    Trained on your own content, it understands intent, answers 24/7, and drives real outcomes inside WhatsApp — no scripts, no coding.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: Target, title: "Intent Detection", desc: "Spot hot leads the moment they message. Identify high-value customers and prioritize conversations that drive revenue." },
                    { icon: Brain, title: "Data-Driven Memory", desc: "Train your AI in minutes. Use PDFs, website URLs, and Google Sheets to deliver accurate, context-aware replies." },
                    { icon: Cpu, title: "Real Actions, Not Just Replies", desc: "From message to execution. Trigger flows, qualify leads, and hand off to your team — automatically." },
                    { icon: Layers, title: "Guided Execution", desc: "Turn conversations into outcomes. Structured WhatsApp flows that guide customers from interest to action." },
                  ].map((item, i) => (
                    <div key={i} className="p-5 rounded-xl bg-white border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground mb-1.5">{item.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants(),
                    "bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 h-11 rounded-xl border-0 shadow-md"
                  )}
                >
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>

              {/* Right: chat widget */}
              <div className="flex-1 w-full max-w-md mx-auto">
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
                      <div className="bg-background px-3.5 py-2.5 rounded-2xl rounded-bl-none border border-border text-xs max-w-[85%] shadow-sm">
                        👋 Hi! I&apos;m your HopeChat assistant. How can I help today?
                      </div>
                    </div>
                    <div className="flex gap-2 items-start ml-auto flex-row-reverse max-w-[85%]">
                      <div className="h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0">U</div>
                      <div className="bg-primary text-primary-foreground px-3.5 py-2.5 rounded-2xl rounded-br-none text-xs shadow-sm">
                        Do you ship to Mombasa?
                      </div>
                    </div>
                    <div className="flex gap-2 items-start">
                      <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">H</div>
                      <div className="bg-background px-3.5 py-2.5 rounded-2xl rounded-bl-none border border-border text-xs max-w-[85%] shadow-sm">
                        Yes! Orders to Mombasa ship free and arrive in 2–3 days. Want me to start your order?
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-t border-border">
                    <div className="bg-background/50 border border-border rounded-xl px-4 py-2.5 text-muted-foreground text-[11px]">Type your message...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────── FEATURES SECTION ───────────────────── */}
        <section id="features" className="py-20 lg:py-28 bg-white border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-20">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Everything you need to sell on WhatsApp
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                Speed up your entire sales funnel with automation that captures leads, replies instantly, and closes more — all on WhatsApp.
              </p>
            </div>

            {/* Feature 1 - Coexistence */}
            <FadeIn>
              <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
                <div className="flex-1 space-y-5">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Keep Your App. Add the Power of Automation.</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                    Connect the same WhatsApp number you already use — no new SIM, no lost history. Keep chatting from the WhatsApp Business app on your phone while the platform runs automations alongside it. Your chats and contacts come with you.
                  </p>
                  <ul className="space-y-2">
                    {["Same number, no migration downtime", "Existing chats & contacts stay intact", "Use the phone app and platform together", "Official Meta-approved coexistence"].map((li, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {li}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 w-full">
                  <div className="rounded-2xl border border-border bg-background/50 p-6 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-border text-xs font-bold text-foreground">
                        <Smartphone className="h-4 w-4 text-primary" />
                        Business App
                      </div>
                      <div className="text-muted-foreground text-sm font-bold">+</div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
                        <Zap className="h-4 w-4" />
                        HopeChat
                      </div>
                    </div>
                    <div className="bg-white border border-border rounded-xl p-4">
                      <div className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Both active simultaneously
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">WA</div>
                          <span>Nalukenge Kate — replied via phone app</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">HC</div>
                          <span>Ochieng Kevin — auto-replied by HopeChat AI</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Feature 2 - Broadcasts */}
            <FadeIn delay={100}>
              <div className="flex flex-col lg:flex-row-reverse items-center gap-10 lg:gap-16">
                <div className="flex-1 space-y-5">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Radio className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">WhatsApp Broadcasts at Scale</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                    Reach your entire list in minutes via the official WhatsApp Business API. No bans, no limits — just personalized campaigns with industry-leading open rates.
                  </p>
                  <ul className="space-y-2">
                    {["Official API — zero ban risk", "Audience segmentation & targeting", "Rich media: images, videos, buttons", "Real-time delivery & read analytics"].map((li, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {li}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 w-full">
                  <div className="rounded-2xl border border-border bg-background/50 p-6 shadow-sm">
                    <div className="bg-white border border-border rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-border pb-2">
                        <span className="text-xs font-bold text-foreground">Recent Broadcast</span>
                        <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">Delivered</span>
                      </div>
                      {[
                        { label: "Sent", value: "12,450" },
                        { label: "Delivered", value: "12,201", color: "text-emerald-600" },
                        { label: "Read", value: "9,756", color: "text-emerald-600" },
                        { label: "Replied", value: "1,892", color: "text-primary font-bold" },
                      ].map((row, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span className={cn("font-bold", row.color || "text-foreground")}>{row.value}</span>
                        </div>
                      ))}
                      <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                        <div className="h-full w-[78%] bg-primary rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Feature 3 - No Code */}
            <FadeIn delay={200}>
              <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
                <div className="flex-1 space-y-5">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Workflow className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Build a Sales Bot Without Writing Code</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                    Drag, drop, and launch chatbot flows that qualify leads, answer questions, and book calls — exactly the way your business works. No developer, no delay.
                  </p>
                  <ul className="space-y-2">
                    {["Visual drag-and-drop flow builder", "Qualify leads and book calls 24/7", "AI answers trained on your business", "Seamless handoff to a human agent"].map((li, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {li}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 w-full">
                  <div className="rounded-2xl border border-border bg-background/50 p-6 shadow-sm">
                    <div className="bg-white border border-border rounded-xl p-4 space-y-2">
                      <div className="text-xs font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                        <Workflow className="h-4 w-4 text-primary" />
                        Automation Flow: Lead Qualification
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1.5">
                        <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">1</div>
                        <span>Customer sends message</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1.5">
                        <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">2</div>
                        <span>AI detects intent & qualifies</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1.5">
                        <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">3</div>
                        <span>Auto-reply with pricing or handoff</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Feature 4 - Shared Inbox */}
            <FadeIn delay={300}>
              <div className="flex flex-col lg:flex-row-reverse items-center gap-10 lg:gap-16">
                <div className="flex-1 space-y-5">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Your Entire Team. One WhatsApp Number.</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                    Multiple agents handle conversations at once from one shared inbox — with smart routing, tags, and full customer history so nothing falls through the cracks.
                  </p>
                  <ul className="space-y-2">
                    {["Smart routing to the right agent", "Tags, notes, and full chat history", "Assign and collaborate on chats", "One number, unlimited teammates"].map((li, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {li}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 w-full">
                  <div className="rounded-2xl border border-border bg-background/50 p-6 shadow-sm">
                    <div className="bg-white border border-border rounded-xl p-4 space-y-3">
                      <div className="text-xs font-bold text-foreground border-b border-border pb-2 flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Team Inbox — 3 agents online
                      </div>
                      {[
                        { name: "Sarah", role: "Sales", chats: "8" },
                        { name: "David", role: "Support", chats: "12" },
                        { name: "HopeChat AI", role: "Virtual Agent", chats: "45" },
                      ].map((agent, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold">{agent.name[0]}</div>
                            <div>
                              <div className="text-xs font-semibold text-foreground">{agent.name}</div>
                              <div className="text-[10px] text-muted-foreground">{agent.role}</div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-foreground">{agent.chats} chats</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ───────────────────── INTEGRATIONS ───────────────────── */}
        <section className="py-20 lg:py-28 bg-background border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Connects to the tools you already run
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed font-medium">
                HopeChat plugs straight into your payments, CRM, store, and automation stack over the official API and webhooks — no rip-and-replace, no engineering team.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
              {[
                ["Google Sheets", Database],
                ["Zapier", Zap],
                ["n8n", Workflow],
                ["WooCommerce", ShoppingCart],
                ["Mailchimp", Mail],
                ["Facebook Ads", Globe],
                ["Webhooks", Webhook],
                ["REST API", Globe],
              ].map(([name, Icon], i) => (
                <FadeIn key={i} delay={i * 50}>
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-bold text-foreground">{name}</span>
                  </div>
                </FadeIn>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground font-medium">
              Don&apos;t see your tool? If it has an API or webhook, HopeChat connects to it — directly or through Zapier, Make, and n8n.
            </p>
          </div>
        </section>

        {/* ───────────────────── HOW IT WORKS ───────────────────── */}
        <section id="how-it-works" className="py-20 lg:py-28 bg-white border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Getting started takes minutes, not months
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed font-medium">
                No developers, no long onboarding. Go from sign-up to live automation in three simple steps.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { step: "01", title: "Connect and configure", desc: "Link your WhatsApp number, define your chatbot flows, and set your automation rules — all through a simple visual builder. Most businesses are live within a single afternoon.", highlight: "Live in one afternoon" },
                { step: "02", title: "Conversations run on autopilot", desc: "Leads get instant replies. Customers get follow-ups. Broadcasts reach your entire list at once. All of it runs in the background while you focus on actually growing.", highlight: "Runs 24/7" },
                { step: "03", title: "See exactly what's making you money", desc: "Real-time dashboards show open rates, reply rates, conversions, and drop-offs. Know what's working, double down on it, and cut what isn't.", highlight: "Improves every week" },
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 150}>
                  <div className="text-center space-y-4">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-lg">
                      {item.step}
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/20">
                      <Zap className="h-3 w-3" />
                      {item.highlight}
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────── META BUSINESS SECTION ───────────────────── */}
        <section className="py-20 lg:py-28 bg-background border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold text-foreground">
                <Globe className="h-3.5 w-3.5 text-primary" />
                Built on the Official WhatsApp Business API
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Enterprise-Grade Reliability. Full Meta Compliance.
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed font-medium">
                HopeChat connects to the official WhatsApp Business API through Meta. Every message you send — broadcasts, chatbot replies, order updates — is delivered with enterprise-grade reliability and full Meta compliance.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {[
                { icon: Globe, title: "Official WhatsApp Business API", desc: "Direct connection through Meta — enterprise-grade delivery, full compliance, and 99.9% message reliability." },
                { icon: Search, title: "Click-to-WhatsApp Ads", desc: "Facebook and Instagram ads drop leads straight into a WhatsApp conversation with an auto-reply waiting." },
                { icon: Workflow, title: "Build Chatbots Without Code", desc: "Launch sales bots, support bots, and lead qualification flows in minutes with drag-and-drop builder." },
                { icon: BarChart3, title: "Real-Time Campaign Analytics", desc: "See exactly what's driving revenue. Track delivered, read, replied, and conversion rates live." },
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="p-5 rounded-xl bg-white border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground mb-1.5">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            <div className="text-center">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 h-12 text-base rounded-xl shadow-md border-0"
                )}
              >
                Get Started Free <ArrowRight className="ml-2 h-4.5 w-4.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ───────────────────── TESTIMONIALS ───────────────────── */}
        <section id="testimonials" className="py-20 lg:py-28 bg-white border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Trusted by growing businesses across East Africa
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed font-medium">
                See why growing businesses choose HopeChat to automate their WhatsApp communication.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { quote: "HopeChat tripled our lead response rate within the first week. The automation workflows are incredibly easy to set up.", name: "Sarah Akello", role: "Operations Manager, Kampala Retail", initials: "SA" },
                { quote: "Our broadcast campaigns now reach 50,000+ customers in minutes. Open rates went from 15% to 78% on WhatsApp.", name: "David Ochieng", role: "Marketing Head, Nairobi Mart", initials: "DO" },
                { quote: "We replaced three separate tools with HopeChat. The integration with our CRM was seamless and saved us hours daily.", name: "Grace Mugisha", role: "COO, Kigali Exports", initials: "GM" },
              ].map((t, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="p-6 rounded-2xl bg-white border border-border shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-500 hover:-translate-y-1 h-full flex flex-col">
                    <Quote className="h-6 w-6 text-primary/30 mb-3" />
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium flex-1">&ldquo;{t.quote}&rdquo;</p>
                    <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border">
                      <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">{t.initials}</div>
                      <div>
                        <div className="text-sm font-bold text-foreground">{t.name}</div>
                        <div className="text-xs text-muted-foreground font-medium">{t.role}</div>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────── FAQ ───────────────────── */}
        <section id="faq" className="py-20 lg:py-28 bg-background border-t border-border">
          <div className="mx-auto max-w-3xl px-4 text-center space-y-12">
            <div className="space-y-3">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Frequently asked questions</h2>
              <p className="text-base text-muted-foreground font-medium">Still have questions? Chat with us and we&apos;ll help you get started.</p>
            </div>

            <div className="text-left space-y-3">
              {[
                { q: "What is HopeChat?", a: "HopeChat is a WhatsApp CRM and automation platform that helps businesses automate customer conversations, follow up on leads instantly, run broadcast campaigns, and build no-code workflows — all powered by the official WhatsApp Business API. It includes a shared inbox, AI assistant, knowledge base, chatbot builder, and integrations." },
                { q: "Do I need to know how to code?", a: "No. HopeChat is built for non-technical users. You can set up automations, train the AI, and manage your team inbox without writing a single line of code. If you have a developer, we also provide a full API." },
                { q: "What is the AI Assistant and how is it different from a regular chatbot?", a: "HopeChat AI is trained on your own business documents — PDFs, websites, and spreadsheets. Unlike a rule-based chatbot, it understands context, detects customer intent, and provides accurate answers. It learns from your content and improves over time." },
                { q: "Which integrations does HopeChat support?", a: "We connect with Google Sheets, Zapier, n8n, WooCommerce, Mailchimp, Facebook Ads, and any service with a REST API or webhook. Our integration library is growing." },
                { q: "Can I capture leads from Facebook Ads automatically?", a: "Yes. Leads from Facebook and Instagram ads land directly in a WhatsApp conversation, with an automated reply waiting the moment they inquire. This works for IndiaMart and JustDial too." },
                { q: "How do I get started?", a: "Sign up for a free trial, connect your WhatsApp number, and you can be live within an afternoon. No credit card required. We handle the WhatsApp Business API setup." },
              ].map((faq, i) => (
                <FadeIn key={i} delay={i * 60}>
                  <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300">
                    <button
                      onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                      className="w-full px-6 py-4 flex justify-between items-center text-left font-bold text-foreground text-sm sm:text-base hover:bg-background transition-colors"
                    >
                      <span className="pr-4">{faq.q}</span>
                      <ChevronRight className={cn("h-5 w-5 shrink-0 transition-transform duration-300 text-muted-foreground", activeFaq === i && "rotate-90 text-primary")} />
                    </button>
                    <div className="faq-content" data-open={activeFaq === i}>
                      <div className="px-6 pb-4 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border font-medium bg-white">
                        {faq.a}
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────── CTA ───────────────────── */}
        <section className="py-16 md:py-24 bg-white border-t border-border">
          <div className="mx-auto max-w-7xl px-4">
            <FadeIn>
              <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8 md:p-16 lg:p-20 text-center overflow-hidden relative shadow-md">
                <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
                  <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-foreground">
                    Turn WhatsApp into your best sales channel.
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
                    Join growing businesses automating conversations, campaigns, and follow-ups — no code required.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Link
                      href="/signup"
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 text-base font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl border-0"
                      )}
                    >
                      Start Free Trial
                      <ArrowRight className="ml-2 h-4.5 w-4.5" />
                    </Link>
                    <Link
                      href="/login"
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "text-sm font-bold text-muted-foreground hover:text-foreground py-2 px-4 hover:bg-background"
                      )}
                    >
                      Talk to Sales
                    </Link>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

      </main>

      {/* ───────────────────── FOOTER ───────────────────── */}
      <footer className="bg-white border-t border-border pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <MessageSquare className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold tracking-tight text-foreground">HopeChat</span>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                The WhatsApp CRM and automation platform built for East African businesses. Automate conversations, run broadcast campaigns, build no-code chatbots, and connect your existing tools — all on the official WhatsApp Business API.
              </p>
              <p className="text-xs font-bold text-muted-foreground">Built by HopeTech Solutions Ltd · Kampala, Uganda</p>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Product</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#features" className="hover:text-primary">Shared Inbox</Link></li>
                <li><Link href="#features" className="hover:text-primary">AI Assistant</Link></li>
                <li><Link href="#features" className="hover:text-primary">Broadcasts</Link></li>
                <li><Link href="#features" className="hover:text-primary">No-Code Chatbot</Link></li>
                <li><Link href="#features" className="hover:text-primary">Sales Pipeline</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Resources</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#" className="hover:text-primary">Documentation</Link></li>
                <li><Link href="#" className="hover:text-primary">API Reference</Link></li>
                <li><Link href="#" className="hover:text-primary">Help Center</Link></li>
                <li><Link href="#" className="hover:text-primary">Contact Support</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Company</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#" className="hover:text-primary">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-primary">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-primary">Refund Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            <p>© {new Date().getFullYear()} HopeChat by HopeTech Solutions Ltd. All rights reserved.</p>
            <div className="flex gap-6">
              <span>Privacy First</span>
              <span>Always Encrypted</span>
              <span>Made in Uganda</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
