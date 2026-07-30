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
  LayoutDashboard,
  Bot,
  BarChart3,
  Globe,
  Users,
  Workflow,
  Radio,
  Quote,
  Mail,
  ShoppingCart,
  Database,
  Webhook,
  Facebook,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
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
        isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const stats = [
  { value: "98%", label: "Open rate", sub: "vs. ~20% on email" },
  { value: "60%", label: "Faster replies", sub: "vs. manual follow-up" },
  { value: "24/7", label: "Always on", sub: "Never miss a lead" },
];

const features = [
  {
    icon: LayoutDashboard,
    title: "WhatsApp Shared Inbox",
    desc: "All conversations in one real-time panel. Route tickets, add internal notes, manage contact tags — your whole team on one WhatsApp number.",
  },
  {
    icon: Bot,
    title: "AI Auto-Replies",
    desc: "Train AI on your business documents. It answers 24/7, detects intent, and escalates to a human when needed — no scripts required.",
  },
  {
    icon: BarChart3,
    title: "Sales Pipeline",
    desc: "Drag-and-drop deal boards linked to WhatsApp chats. Track every lead from first message to closed deal with conversion analytics.",
  },
  {
    icon: Workflow,
    title: "No-Code Automation",
    desc: "Build visual workflows: auto-replies, keyword triggers, delays, webhooks, Google Sheets lookups, and WhatsApp Flow forms — no developer needed.",
  },
  {
    icon: Radio,
    title: "Broadcast Campaigns",
    desc: "Reach your entire list via the official WhatsApp Business API. Rich media, audience segmentation, and real-time delivery analytics.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    desc: "Multiple agents per number. Smart routing, tags, chat history, and workload tracking — built for growing support teams.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Connect",
    desc: "Link your WhatsApp number, configure your team inbox, and upload your business documents — live in under an hour.",
    highlight: "Live in under an hour",
  },
  {
    step: "02",
    title: "Automate",
    desc: "AI handles enquiries 24/7. Broadcasts reach your list in minutes. Workflows run on autopilot while you focus on growth.",
    highlight: "Runs 24/7",
  },
  {
    step: "03",
    title: "Grow",
    desc: "Dashboards show open rates, conversions, and drop-offs. See what's working and double down — every week gets better.",
    highlight: "Improves every week",
  },
];

const testimonials = [
  {
    quote: "HopeChat tripled our lead response rate within the first week. The AI replies handle customer questions even when we're closed.",
    name: "Sarah Akello",
    role: "Operations Manager, Kampala Retail",
    initials: "SA",
  },
  {
    quote: "Our broadcast campaigns now reach 50,000+ customers in minutes. Open rates went from 15% to 78% on WhatsApp.",
    name: "David Ochieng",
    role: "Marketing Head, Nairobi Mart",
    initials: "DO",
  },
  {
    quote: "We replaced three separate tools with HopeChat. The sales pipeline linked to WhatsApp chats saved us hours every day.",
    name: "Grace Mugisha",
    role: "COO, Kigali Exports",
    initials: "GM",
  },
];

const integrations = [
  { name: "Google Sheets", icon: Database },
  { name: "Zapier", icon: Zap },
  { name: "n8n", icon: Workflow },
  { name: "Facebook Ads", icon: Facebook },
  { name: "WooCommerce", icon: ShoppingCart },
  { name: "Mailchimp", icon: Mail },
  { name: "Webhooks", icon: Webhook },
  { name: "REST API", icon: Globe },
];

const faqs = [
  {
    q: "How does HopeChat differ from Intercom or Zendesk?",
    a: "Traditional platforms charge per seat and store your data on their servers. HopeChat is a WhatsApp-native CRM with AI automation, flat-rate pricing, and your data stays on your infrastructure. Built for East African businesses.",
  },
  {
    q: "How fast can I get started?",
    a: "Sign up and you can be chatting with customers within minutes. We handle the WhatsApp Business API setup — you just invite your team and start replying.",
  },
  {
    q: "Can I train the AI on my own business documents?",
    a: "Yes. Upload your product catalogues, price lists, and FAQs. HopeChat AI learns your business and answers customer questions automatically, escalating only when it doesn't know the answer.",
  },
  {
    q: "How do payments work?",
    a: "Simple credit-based system. Top up your account and usage is deducted automatically. No long-term contracts, no surprise bills.",
  },
  {
    q: "Can I keep my existing WhatsApp Business app?",
    a: "Yes. Connect the same WhatsApp number you already use — no new SIM, no lost history. Use the phone app alongside HopeChat with official Meta coexistence.",
  },
  {
    q: "Is my data safe?",
    a: "Your data stays on your own infrastructure. All messages and tokens are encrypted. Accounts are fully isolated — your conversations are visible only to your team.",
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div className="flex min-h-screen flex-col bg-white text-foreground selection:bg-primary/30 antialiased font-sans">

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-white/95 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30">
                <MessageSquare className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-foreground">HopeChat</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted-foreground">
              <Link href="#features" className="hover:text-primary transition-colors duration-200">Features</Link>
              <Link href="#how-it-works" className="hover:text-primary transition-colors duration-200">How It Works</Link>
              <Link href="#testimonials" className="hover:text-primary transition-colors duration-200">Testimonials</Link>
              <Link href="#faq" className="hover:text-primary transition-colors duration-200">FAQ</Link>
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
                "bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 h-9 text-xs sm:text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] rounded-lg border-0"
              )}
            >
              Start Free Trial
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-white/95 backdrop-blur-md px-4 py-4 space-y-3 mobile-menu-enter">
            <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-background transition-colors">Features</Link>
            <Link href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-background transition-colors">How It Works</Link>
            <Link href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-background transition-colors">Testimonials</Link>
            <Link href="#faq" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-background transition-colors">FAQ</Link>
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}>
                Log In
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">

        {/* Hero Section */}
        <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 lg:pt-32 lg:pb-40 overflow-hidden bg-white">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
          <div className="absolute top-10 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs sm:text-sm font-bold text-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span>WhatsApp CRM for East African Businesses</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.1] text-foreground">
                More Leads. Faster Follow-Up.{" "}
                <span className="text-primary">More Revenue.</span>
              </h1>

              <p className="mx-auto max-w-2xl text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed font-medium">
                HopeChat replies instantly, follows up automatically, and closes sales right inside WhatsApp — so no lead ever goes cold.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full sm:w-auto h-12 px-8 text-base bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 rounded-xl border-0 flex items-center justify-center group"
                  )}
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="#features"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "w-full sm:w-auto h-12 px-8 text-base border-border bg-white hover:bg-background text-foreground font-bold hover:scale-[1.03] hover:shadow-md active:scale-[0.98] transition-all duration-300 rounded-xl flex items-center justify-center"
                  )}
                >
                  Explore Features
                </Link>
              </div>

              <p className="text-xs text-muted-foreground font-medium">No credit card required · Set up in minutes · Cancel anytime</p>
            </div>

            {/* Stats Bar */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              {stats.map((stat, i) => (
                <div key={i} className="text-center space-y-1">
                  <div className="text-3xl sm:text-4xl font-extrabold text-primary">{stat.value}</div>
                  <div className="text-sm font-bold text-foreground">{stat.label}</div>
                  <div className="text-xs text-muted-foreground font-medium">{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Hero Mock */}
            <div className="mt-16 mx-auto max-w-5xl rounded-2xl border border-border bg-white shadow-xl shadow-black/[0.04] overflow-hidden hover:shadow-2xl hover:shadow-black/[0.06] transition-shadow duration-500">
              <div className="flex">
                <div className="w-16 md:w-48 border-r border-border bg-background/50">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <span className="hidden md:inline font-bold tracking-tight text-foreground text-sm">Conversations</span>
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="p-2 space-y-1.5">
                    {["Nalukenge Kate", "Ochieng Kevin", "Jean Mugisha", "Amina Hassan"].map((name, i) => (
                      <div key={i} className={cn("p-2.5 rounded-lg flex gap-2 items-center cursor-pointer transition-colors", i === 0 ? "bg-primary/10 border border-primary/20" : "hover:bg-background")}>
                        <div className={cn("h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold", i === 0 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                          {name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div className="hidden md:block overflow-hidden flex-1">
                          <div className="flex justify-between items-center">
                            <span className={cn("text-xs truncate", i === 0 ? "font-bold text-foreground" : "font-semibold")}>{name}</span>
                            {i === 0 && <span className="text-[9px] text-primary font-black bg-primary/10 px-1 rounded">ACTIVE</span>}
                            {i === 1 && <span className="text-[9px] text-emerald-600 font-bold bg-emerald-500/10 px-1 rounded">BOT</span>}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">WhatsApp Business</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="p-3 border-b border-border bg-background/30 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-foreground">Nalukenge Kate</span>
                    <span className="text-[10px] text-muted-foreground ml-auto font-medium">AI Agent · Retail</span>
                  </div>
                  <div className="p-4 space-y-3 min-h-[200px]">
                    <div className="flex gap-2.5 max-w-[85%]">
                      <div className="h-6 w-6 rounded-full bg-background text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0">U</div>
                      <div className="bg-white text-foreground px-4 py-2.5 rounded-2xl rounded-bl-none border border-border text-xs md:text-sm shadow-sm">
                        Hi! Do you offer bulk delivery in Kampala?
                      </div>
                    </div>
                    <div className="flex gap-2.5 max-w-[85%] ml-auto flex-row-reverse">
                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">AI</div>
                      <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-br-none border border-primary/20 text-xs md:text-sm shadow-sm">
                        Yes! We offer bulk delivery across Kampala. Orders over 500,000 UGX qualify for free delivery. Would you like me to connect you with our sales team?
                      </div>
                    </div>
                    <div className="flex gap-2.5 max-w-[85%]">
                      <div className="h-6 w-6 rounded-full bg-background text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0">U</div>
                      <div className="bg-white text-foreground px-4 py-2.5 rounded-2xl rounded-bl-none border border-border text-xs md:text-sm shadow-sm">
                        Yes please, and can you send me a price list?
                      </div>
                    </div>
                    <div className="flex gap-2.5 max-w-[85%] ml-auto flex-row-reverse">
                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">AI</div>
                      <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-br-none border border-primary/20 text-xs md:text-sm shadow-sm">
                        Absolutely! I&apos;ve transferred you to Sarah on sales. She has your pricing guide ready. One moment please...
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-t border-border bg-white">
                    <div className="bg-background/50 border border-border rounded-xl px-4 py-2.5 text-muted-foreground text-xs">AI agent is drafting a response...</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted-foreground">Trusted by growing businesses across East Africa</p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 lg:py-28 bg-background border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Everything you need to sell on WhatsApp
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                Speed up your entire sales funnel with automation that captures leads, replies instantly, and closes more — all on WhatsApp.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
              {features.map((feature, index) => (
                <FadeIn key={index} delay={index * 100}>
                  <div className="group p-6 rounded-2xl bg-white border border-black/[0.04] shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40 transition-all duration-500 hover:-translate-y-2 flex flex-col justify-between h-full">
                    <div className="space-y-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 transition-all duration-500">
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed font-medium">{feature.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 lg:py-28 bg-white border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Getting started takes minutes, not months
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                No developers, no long onboarding. Go from sign-up to live automation in three simple steps.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {howItWorks.map((item, i) => (
                <FadeIn key={i} delay={i * 150}>
                  <div className="text-center space-y-4">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-xl border border-primary/20">
                      {item.step}
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{item.title}</h3>
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

        {/* Testimonials Section */}
        <section id="testimonials" className="py-20 lg:py-28 bg-background border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Trusted by businesses across East Africa
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                See why growing businesses choose HopeChat to automate their WhatsApp communication.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {testimonials.map((t, i) => (
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

        {/* Integrations Section */}
        <section className="py-20 lg:py-28 bg-white border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Connects to the tools you already run
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                HopeChat plugs straight into your stack over the official API and webhooks — no rip-and-replace, no engineering team.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
              {integrations.map((integration, i) => (
                <FadeIn key={i} delay={i * 50}>
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-border shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-1 transition-all duration-300">
                    <integration.icon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-bold text-foreground">{integration.name}</span>
                  </div>
                </FadeIn>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground font-medium">
              Don&apos;t see your tool? If it has an API or webhook, HopeChat connects to it — directly or through Zapier, Make, and n8n.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-20 lg:py-28 bg-background border-t border-border">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center space-y-16">
            <div className="space-y-3">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Frequently asked questions</h2>
              <p className="text-base text-muted-foreground font-medium">Still have questions? Chat with us and we&apos;ll help you get started.</p>
            </div>

            <div className="text-left space-y-4">
              {faqs.map((faq, i) => (
                <FadeIn key={i} delay={i * 80}>
                  <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300">
                    <button
                      onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                      className="w-full px-6 py-4 flex justify-between items-center text-left font-bold text-foreground text-sm sm:text-base hover:bg-background transition-colors duration-200"
                    >
                      <span className="pr-4">{faq.q}</span>
                      <ChevronRight className={cn("h-5 w-5 shrink-0 transition-transform duration-300 text-muted-foreground", activeFaq === i && "rotate-90 text-primary")} />
                    </button>
                    <div className="faq-content" data-open={activeFaq === i}>
                      <div>
                        <div className="px-6 pb-4 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border font-medium bg-white">
                          {faq.a}
                        </div>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-white border-t border-border">
          <div className="mx-auto max-w-7xl px-4">
            <FadeIn>
              <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8 md:p-16 lg:p-20 text-center text-foreground overflow-hidden relative shadow-md hover:shadow-xl hover:shadow-primary/10 transition-shadow duration-500">
                <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
                  <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-foreground">
                    Turn WhatsApp into your best sales channel
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
                    Join growing businesses automating conversations, campaigns, and follow-ups — no code required.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Link
                      href="/signup"
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 text-base font-bold rounded-xl active:scale-[0.98] transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.03] border-0 flex items-center justify-center group"
                      )}
                    >
                      Start Free Trial
                      <ArrowRight className="ml-2 h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                    <Link
                      href="/login"
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "text-sm font-bold text-muted-foreground hover:text-foreground transition-colors duration-300 py-2 px-4 hover:bg-background"
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

      {/* Footer */}
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
                The WhatsApp CRM and AI platform built for East African businesses. Private, secure, and designed to help you grow.
              </p>
              <p className="text-xs font-bold text-muted-foreground">Built by HopeTech Solutions Ltd · Kampala, Uganda</p>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Product</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#features" className="hover:text-primary transition-colors">Shared Inbox</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">AI Auto-Replies</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">Sales Pipeline</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">Broadcasts</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">No-Code Automations</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Resources</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#" className="hover:text-primary transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">API Reference</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Contact Support</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Company</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Refund Policy</Link></li>
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
