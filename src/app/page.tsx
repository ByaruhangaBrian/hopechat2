"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  ArrowRight, 
  Shield, 
  Zap, 
  BarChart3, 
  Users, 
  Globe, 
  Cpu, 
  Layers, 
  Lock,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  Clock,
  Briefcase,
  Gamepad2,
  GraduationCap,
  ShoppingBag,
  Building2,
  HeartPulse
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const [activeIndustry, setActiveIndustry] = useState("retail");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
                <MessageSquare className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">HopeChat</span>
            </div>
            <nav className="hidden lg:flex items-center gap-8 text-[15px] font-semibold text-muted-foreground">
              <div className="group relative">
                <button className="flex items-center gap-1 hover:text-primary transition-colors py-4">
                  Products <ChevronRight className="h-4 w-4 rotate-90" />
                </button>
                {/* Simple dropdown simulation */}
                <div className="absolute top-full left-0 w-64 bg-card border border-border rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-4 grid gap-2">
                  <Link href="#ai" className="hover:bg-muted p-2 rounded-lg flex items-center gap-2 transition-colors">
                    <Cpu className="h-4 w-4 text-primary" /> AI & Automation
                  </Link>
                  <Link href="#omnichannel" className="hover:bg-muted p-2 rounded-lg flex items-center gap-2 transition-colors">
                    <Layers className="h-4 w-4 text-primary" /> Omnichannel Inbox
                  </Link>
                  <Link href="#marketing" className="hover:bg-muted p-2 rounded-lg flex items-center gap-2 transition-colors">
                    <TrendingUp className="h-4 w-4 text-primary" /> Sales Marketing
                  </Link>
                </div>
              </div>
              <Link href="#solutions" className="hover:text-primary transition-colors">Solutions</Link>
              <Link href="#roi" className="hover:text-primary transition-colors">ROI</Link>
              <Link href="#security" className="hover:text-primary transition-colors">Trust</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="font-semibold text-muted-foreground hover:text-foreground">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 h-11 shadow-lg shadow-primary/20">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Enterprise Hero Section */}
        <section className="relative pt-24 pb-32 lg:pt-32 lg:pb-48 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_50%)]" />
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-bold text-primary mb-10 animate-in fade-in slide-in-from-bottom-2 duration-1000">
              <Zap className="h-4 w-4" />
              <span>Next-Generation AI for Customer Experience</span>
            </div>
            <h1 className="mx-auto max-w-5xl text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl mb-8 leading-[1.1] animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
              Redefine CX with <br className="hidden sm:block" />
              <span className="text-primary">Intelligent WhatsApp AI</span>
            </h1>
            <p className="mx-auto max-w-3xl text-xl text-muted-foreground mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
              Experience-Led, Easy-to-Use, and Efficiency-Driven. HopeChat helps 100,000+ businesses scale their customer engagement with self-hosted, secure AI workflows.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
              <Link href="/signup">
                <Button size="lg" className="h-14 px-10 text-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-bold shadow-2xl shadow-primary/30 active:scale-95 transition-all">
                  Get Started Now <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> No credit card required. Free 14-day trial.
              </p>
            </div>

            {/* 5 Capability Pillars */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 lg:gap-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-700">
              {[
                { icon: Globe, label: "Omnichannel", desc: "WhatsApp, Web, API" },
                { icon: Layers, label: "Scenario-based", desc: "Tailored Workflows" },
                { icon: Cpu, label: "Generative", desc: "Advanced LLM Power" },
                { icon: TrendingUp, label: "Multi-faceted", desc: "Support & Sales" },
                { icon: Lock, label: "Secure", desc: "GDPR Compliant" },
              ].map((pillar, i) => (
                <div key={i} className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all mx-auto">
                    <pillar.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold mb-1">{pillar.label}</h3>
                  <p className="text-[12px] text-muted-foreground font-medium">{pillar.desc}</p>
                </div>
              ))}
            </div>

            {/* Trusted By Section */}
            <div className="mt-32 space-y-8 animate-in fade-in duration-1000 delay-1000">
              <p className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground/60">Trusted by 100,000+ forward-thinking companies</p>
              <div className="flex flex-wrap justify-center items-center gap-12 lg:gap-20 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                {["Samsung", "Oppo", "Michael Kors", "Shein", "J&T Express"].map((brand) => (
                  <span key={brand} className="text-2xl font-black tracking-tighter text-foreground cursor-default">{brand}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Product Scenarios */}
        <section id="ai" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                  Engagement Scenario 01
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">AI & Automation: Handle Complex Inquiries at Scale</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Train our AI on your unique business documentation to provide instant, human-like answers 24/7. Reduce human workload by up to 60% with smart automation.
                </p>
                <ul className="space-y-4">
                  {[
                    "Self-learning AI Knowledge Base",
                    "Seamless Handover to Human Agents",
                    "Multi-language Support for Global Operations",
                    "Automated Workflow Triggers"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-foreground font-medium">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button variant="ghost" className="text-primary font-bold group hover:bg-primary/5">
                  Explore AI Automation <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              <div className="flex-1 w-full max-w-xl aspect-square bg-card rounded-3xl border border-border shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                <div className="absolute inset-8 border-2 border-dashed border-border rounded-2xl flex items-center justify-center">
                  <Cpu className="h-32 w-32 text-primary/20 group-hover:scale-110 transition-transform duration-500" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="omnichannel" className="py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
              <div className="flex-1 space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                  Engagement Scenario 02
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Omnichannel Inbox: Centralize Every Conversation</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Bring all your WhatsApp, Web, and API communications into a single, high-performance workspace. Collaborate with your team in real-time.
                </p>
                <ul className="space-y-4">
                  {[
                    "Unified Multi-agent Dashboard",
                    "Real-time Team Collaboration & Chat",
                    "Comprehensive Contact Management",
                    "Integrated WhatsApp Web Experience"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-foreground font-medium">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button variant="ghost" className="text-primary font-bold group hover:bg-primary/5">
                  Explore Omnichannel Solutions <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              <div className="flex-1 w-full max-w-xl aspect-square bg-card rounded-3xl border border-border shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-bl from-primary/10 to-transparent" />
                <div className="absolute inset-8 border-2 border-dashed border-border rounded-2xl flex items-center justify-center">
                  <Layers className="h-32 w-32 text-primary/20 group-hover:scale-110 transition-transform duration-500" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="marketing" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                  Engagement Scenario 03
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Proactive Marketing: Convert & Engage Automatically</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Run bulk broadcast campaigns with smart rate-limiting. Track leads through visual sales pipelines and never miss a follow-up.
                </p>
                <ul className="space-y-4">
                  {[
                    "High-volume Broadcast Campaigns",
                    "Visual Drag-and-drop Pipelines",
                    "Automated Follow-up Sequences",
                    "ROI Tracking & Performance Analytics"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-foreground font-medium">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 h-12 shadow-lg shadow-primary/20">
                    Try Proactive Marketing
                  </Button>
                </Link>
              </div>
              <div className="flex-1 w-full max-w-xl aspect-square bg-card rounded-3xl border border-border shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
                <div className="absolute inset-8 border-2 border-dashed border-border rounded-2xl flex items-center justify-center">
                  <TrendingUp className="h-32 w-32 text-primary/20 group-hover:scale-110 transition-transform duration-500" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ROI Section */}
        <section id="roi" className="py-32">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-6xl font-extrabold mb-16 tracking-tight text-foreground">Maximize Your ROI with <br /> Intelligent AI Tools</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { label: "Overall ROI", value: "234%", desc: "Average increase in customer engagement efficiency" },
                { label: "Workload Reduced", value: "60%", desc: "Drop in manual inquiry handling through AI automation" },
                { label: "Faster Response", value: "35%", desc: "Improvement in first-response time across channels" },
              ].map((metric, i) => (
                <div key={i} className="p-10 rounded-[2rem] bg-primary text-primary-foreground space-y-4 shadow-2xl shadow-primary/20 group transition-all hover:-translate-y-2">
                  <p className="text-primary-foreground/70 font-bold uppercase tracking-widest text-sm">{metric.label}</p>
                  <div className="text-6xl font-extrabold group-hover:scale-110 transition-transform">{metric.value}</div>
                  <p className="text-primary-foreground/90 font-medium leading-relaxed">{metric.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Industry Solutions */}
        <section id="solutions" className="py-24 bg-card border-y border-border">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl font-extrabold tracking-tight text-foreground">Solutions for Every Industry</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Tailored strategies to help businesses across diverse sectors excel in customer experience.</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              {[
                { id: "retail", icon: ShoppingBag, label: "Retail & E-comm" },
                { id: "finance", icon: Building2, label: "Financial Services" },
                { id: "gaming", icon: Gamepad2, label: "Gaming & Entertainment" },
                { id: "edu", icon: GraduationCap, label: "Education" },
                { id: "enterprise", icon: Briefcase, label: "Enterprise" },
                { id: "health", icon: HeartPulse, label: "Life Services" },
              ].map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => setActiveIndustry(ind.id)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all border",
                    activeIndustry === ind.id 
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                      : "bg-muted/50 text-muted-foreground border-transparent hover:border-border hover:bg-muted"
                  )}
                >
                  <ind.icon className="h-4 w-4" />
                  {ind.label}
                </button>
              ))}
            </div>

            <div className="max-w-4xl mx-auto p-8 lg:p-12 rounded-[2rem] bg-muted/30 border border-border animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold capitalize text-foreground">{activeIndustry.replace('-', ' ')} Solution</h3>
                  <div className="space-y-4">
                    <div className="flex gap-4 items-start">
                      <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">1</div>
                      <p className="text-muted-foreground leading-relaxed"><span className="text-foreground font-bold">Integrate Tools:</span> Connect your existing CRM and inventory management directly with WhatsApp.</p>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">2</div>
                      <p className="text-muted-foreground leading-relaxed"><span className="text-foreground font-bold">Engage Users:</span> Automated welcome messages and abandoned cart recovery on the most used app.</p>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">3</div>
                      <p className="text-muted-foreground leading-relaxed"><span className="text-foreground font-bold">Boost ROI:</span> Drive higher conversion rates with personalized recommendations and instant support.</p>
                    </div>
                  </div>
                </div>
                <div className="h-64 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="text-4xl font-extrabold text-primary">35%</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sign-off Rate Increase</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section id="security" className="py-24 overflow-hidden relative">
          <div className="container mx-auto px-4 text-center space-y-12">
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground">Enterprise-Grade Security & Scalability</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { title: "Advanced AI Stack", desc: "Native integration with OpenAI, Amazon Bedrock, and Anthropic Claude for the most advanced LLM capabilities.", icon: Cpu },
                { title: "Secure & Compliant", desc: "Enterprise-grade data isolation, self-hosted options, and full GDPR compliance ensuring complete data privacy.", icon: Shield },
                { title: "Flexible & Open", desc: "Powerful APIs and webhooks allow you to integrate HopeChat seamlessly into your existing technical architecture.", icon: Zap },
              ].map((item, i) => (
                <div key={i} className="p-8 rounded-[2rem] bg-card border border-border space-y-4 text-left group hover:border-primary/50 transition-all">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-4xl font-extrabold mb-16 tracking-tight text-foreground">Frequently Asked Questions</h2>
            <div className="grid gap-6 text-left">
              {[
                { q: "How is HopeChat different from standard WhatsApp Web?", a: "Unlike standard WhatsApp Web, HopeChat is an enterprise-grade platform with AI automation, multi-agent support, sales pipelines, and bulk broadcast capabilities designed specifically for scale." },
                { q: "Can I integrate my own LLM models?", a: "Yes, our AI stack is designed to be flexible. You can connect your own API keys for OpenAI, Claude, or Bedrock, or use our pre-configured models." },
                { q: "Is my data secure and isolated?", a: "Absolutely. HopeChat uses strict multi-tenant isolation at the database level. Each business's data is logically separated, and we offer self-hosted options for ultimate control." },
                { q: "Do you offer a free trial?", a: "We offer a 14-day full-featured free trial so you can experience the power of HopeChat AI before committing." }
              ].map((faq, i) => (
                <div key={i} className="p-8 rounded-[2rem] bg-card border border-border space-y-3">
                  <h3 className="text-lg font-bold flex gap-3 text-foreground"><span className="text-primary font-black">Q.</span> {faq.q}</h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px] pl-7">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="rounded-[3rem] bg-primary p-12 lg:p-24 text-center text-primary-foreground overflow-hidden relative shadow-2xl shadow-primary/40">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[30rem] h-[30rem] bg-white/10 rounded-full blur-[100px]" />
              <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[30rem] h-[30rem] bg-black/10 rounded-full blur-[100px]" />
              <h2 className="text-4xl md:text-7xl font-extrabold mb-8 relative z-10 tracking-tighter leading-none animate-in zoom-in-95 duration-700">Ready to Scale <br /> Your Business?</h2>
              <p className="text-primary-foreground/80 mb-12 max-w-xl mx-auto relative z-10 text-lg font-medium">
                Join 100,000+ companies using HopeChat to automate their customer engagement and maximize efficiency.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
                <Link href="/signup">
                  <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-16 px-12 text-xl font-black rounded-2xl shadow-2xl shadow-black/20 active:scale-95 transition-all">
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="/login" className="text-primary-foreground/80 hover:text-white font-bold transition-colors">
                  Contact our sales team
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Enterprise Footer */}
      <footer className="bg-card border-t border-border pt-24 pb-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-24">
            <div className="col-span-2 md:col-span-1 space-y-6">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
                  <MessageSquare className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">HopeChat</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pr-4">
                The world&apos;s most advanced self-hosted WhatsApp CRM and AI automation platform. Trusted by thousands of businesses worldwide.
              </p>
              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer group">
                  <Globe className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer group">
                  <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Products</h4>
              <ul className="space-y-4 text-sm text-muted-foreground font-medium">
                <li><Link href="#ai" className="hover:text-primary transition-colors">AI & Automation</Link></li>
                <li><Link href="#omnichannel" className="hover:text-primary transition-colors">Omnichannel Inbox</Link></li>
                <li><Link href="#marketing" className="hover:text-primary transition-colors">Sales Marketing</Link></li>
                <li><Link href="/pipelines" className="hover:text-primary transition-colors">Pipelines</Link></li>
                <li><Link href="/broadcasts" className="hover:text-primary transition-colors">Broadcasts</Link></li>
                <li><Link href="/ai" className="hover:text-primary transition-colors">AI Knowledge Base</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Solutions</h4>
              <ul className="space-y-4 text-sm text-muted-foreground font-medium">
                <li><button onClick={() => setActiveIndustry("retail")} className="hover:text-primary transition-colors">Retail & E-commerce</button></li>
                <li><button onClick={() => setActiveIndustry("finance")} className="hover:text-primary transition-colors">Financial Services</button></li>
                <li><button onClick={() => setActiveIndustry("gaming")} className="hover:text-primary transition-colors">Gaming & Entertainment</button></li>
                <li><button onClick={() => setActiveIndustry("edu")} className="hover:text-primary transition-colors">Education</button></li>
                <li><button onClick={() => setActiveIndustry("enterprise")} className="hover:text-primary transition-colors">Enterprise</button></li>
                <li><button onClick={() => setActiveIndustry("health")} className="hover:text-primary transition-colors">Life Services</button></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Resources</h4>
              <ul className="space-y-4 text-sm text-muted-foreground font-medium">
                <li><Link href="#" className="hover:text-primary transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Developer Portal</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Security Overview</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Contact Support</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-muted-foreground/60 uppercase tracking-[0.1em]">
            <p>© {new Date().getFullYear()} HopeChat AI. All Rights Reserved.</p>
            <div className="flex gap-8">
              <span>GDPR Compliant</span>
              <span>ISO 27001 Certified</span>
              <span>256-bit Encryption</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
