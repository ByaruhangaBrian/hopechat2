"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { 
  MessageSquare, 
  ArrowRight, 
  Shield, 
  Zap, 
  Globe, 
  Cpu, 
  Layers, 
  Lock,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  Server,
  Database,
  Key,
  KanbanSquare,
  Users,
  Menu,
  X,
  Check,
  Star,
  Sparkles,
  Megaphone,
  Smartphone,
  Plus,
  Play,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Info,
  SlidersHorizontal,
  FolderSync
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Mock messages database for the live chat simulator (AI chatbot section)
const CHATBOT_MESSAGES = [
  { sender: "user", text: "Hi! We run a retail chain. Can HopeChat handle our WhatsApp queries?" },
  { sender: "typing", text: "" },
  { sender: "bot", text: "Absolutely! HopeChat is built for growing businesses. You get a shared WhatsApp inbox for your team, plus AI-powered replies that handle customer inquiries 24/7." },
  { sender: "user", text: "Nice! Can it also sync customer questions to a sales pipeline?" },
  { sender: "typing", text: "" },
  { sender: "bot", text: "Yes! HopeChat has a built-in sales pipeline. Deal cards are linked directly to live WhatsApp chats. You can track every lead from first message to closed deal." },
  { sender: "user", text: "What about databases? Can it connect to Google Sheets?" },
  { sender: "typing", text: "" },
  { sender: "bot", text: "Of course! With the visual builder, you can set up actions to look up or update Google Sheets automatically when a customer makes an inquiry." }
];

// IntersectionObserver-based FadeIn component for smooth, staggering scroll animations
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

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
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

// Floating particle orb component for background glows
function FloatingOrb({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div 
      className={cn("absolute rounded-full blur-[80px] pointer-events-none animate-float", className)}
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeIndustry, setActiveIndustry] = useState("retail");
  const [activeSupportSlot, setActiveSupportSlot] = useState(1); // Default to Standard (30 min)

  // Chat simulator states
  const [visibleMessages, setVisibleMessages] = useState<Array<{ sender: string; text: string }>>([CHATBOT_MESSAGES[0]]);
  const currentStepRef = useRef(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll within the chat container
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [visibleMessages]);

  // Chat simulation loop
  useEffect(() => {
    let cancelled = false;
    const runChatSimulation = async () => {
      while (!cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 3500));
        if (cancelled) break;
        
        const nextTypingIndex = (currentStepRef.current + 1) % CHATBOT_MESSAGES.length;
        setVisibleMessages((prev) => [...prev, CHATBOT_MESSAGES[nextTypingIndex]]);
        
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (cancelled) break;
        
        const nextMessageIndex = (nextTypingIndex + 1) % CHATBOT_MESSAGES.length;
        setVisibleMessages((prev) => {
          const list = [...prev];
          list[list.length - 1] = CHATBOT_MESSAGES[nextMessageIndex];
          return list;
        });

        currentStepRef.current = nextMessageIndex;

        if (visibleMessages.length > 8) {
          setVisibleMessages([CHATBOT_MESSAGES[0]]);
          currentStepRef.current = 0;
        }
      }
    };

    runChatSimulation();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased font-sans selection:bg-primary/20">
      
      {/* 1. Navigation / Header (Sticky Glassmorphic) */}
      <header className="fixed inset-x-0 top-0 z-50 transition-all duration-300">
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 sm:pt-5">
          <nav className="relative flex items-center justify-between gap-4 rounded-2xl border border-border/50 bg-background/60 px-3 py-2.5 pl-4 transition-[background-color,border-color,box-shadow,padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] border-white/70 bg-white/60 shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_14px_34px_-20px_rgba(11,170,110,0.15)] backdrop-blur-md">
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/80 to-transparent"></span>
            
            {/* Kept original HopeChat logo */}
            <Link href="/" className="group flex shrink-0 items-center gap-2.5 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <span className="relative flex items-center justify-center">
                <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-xl bg-primary/25 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100"></span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30">
                  <MessageSquare className="h-4.5 w-4.5 text-white" />
                </div>
              </span>
              <span className="text-lg font-extrabold tracking-tight text-foreground bg-clip-text">HopeChat</span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden items-center gap-1 lg:flex">
              <Link href="#features" className="group relative rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground outline-none transition-colors duration-200 hover:text-foreground">
                Features
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-primary to-primary/60 transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
              </Link>
              <Link href="#pricing" className="group relative rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground outline-none transition-colors duration-200 hover:text-foreground">
                Pricing
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-primary to-primary/60 transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
              </Link>
              <Link href="#solutions" className="group relative rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground outline-none transition-colors duration-200 hover:text-foreground">
                Solutions
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-primary to-primary/60 transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
              </Link>
              <Link href="#security" className="group relative rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground outline-none transition-colors duration-200 hover:text-foreground">
                Security
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-primary to-primary/60 transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
              </Link>
              <Link href="#faq" className="group relative rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground outline-none transition-colors duration-200 hover:text-foreground">
                FAQ
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-primary to-primary/60 transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
              </Link>
            </div>

            {/* Desktop CTAs */}
            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              <Link href="/login" className="rounded-lg px-3.5 py-2 text-sm font-bold text-muted-foreground outline-none transition-colors duration-200 hover:text-foreground">
                Log in
              </Link>
              <Link href="/signup" className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(11,170,110,0.5)] outline-none transition-[transform,box-shadow] duration-200 hover:shadow-[0_12px_26px_-8px_rgba(11,170,110,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.97]">
                <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"></span>
                <span className="relative">Start Free Trial</span>
                <ArrowRight className="relative h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Mobile menu trigger */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background/60 text-foreground outline-none transition-colors duration-200 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95 lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </nav>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="mx-auto w-full max-w-6xl px-4 pt-2 lg:hidden">
            <div className="flex flex-col gap-1.5 rounded-2xl border border-border/50 bg-background/95 px-4 py-4 shadow-lg backdrop-blur-md animate-slide-down">
              <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">Features</Link>
              <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">Pricing</Link>
              <Link href="#solutions" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">Solutions</Link>
              <Link href="#security" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">Security</Link>
              <Link href="#faq" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">FAQ</Link>
              
              <div className="mt-3 pt-3 border-t border-border/50 flex flex-col gap-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block text-center px-4 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/50 transition-colors">Log In</Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="block text-center bg-primary hover:bg-primary/95 text-white font-bold px-4 py-2.5 text-sm rounded-xl shadow-md transition-all">Start Free Trial</Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        
        {/* 2. Hero Section (More Leads. Faster Follow-Up. More Deals.) */}
        <section className="relative overflow-hidden pt-28 pb-20 sm:pt-32 lg:pt-36 bg-background">
          {/* Ambient glows styled in HopeChat teal */}
          <div className="pointer-events-none absolute inset-0 hidden md:block">
            <div className="absolute -top-24 left-1/3 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/[0.12] blur-[150px]"></div>
            <div className="absolute right-0 top-32 h-[320px] w-[320px] rounded-full bg-primary/[0.08] blur-[130px]"></div>
          </div>

          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
            <div className="text-center lg:text-left space-y-6">
              
              {/* Official badge */}
              <div className="flex justify-center lg:justify-start">
                <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-border bg-card px-3 py-2 text-[11px] sm:text-xs font-bold shadow-sm sm:gap-2 sm:px-4 sm:py-2">
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    {/* Meta partner logo representation */}
                    <svg className="h-4 w-4 shrink-0 text-primary" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                      <path d="M5,19.5c0-4.6,2.3-9.4,5-9.4c1.5,0,2.7,0.9,4.6,3.6c-1.8,2.8-2.9,4.5-2.9,4.5c-2.4,3.8-3.2,4.6-4.5,4.6  C5.9,22.9,5,21.7,5,19.5 M20.7,17.8L19,15c-0.4-0.7-0.9-1.4-1.3-2c1.5-2.3,2.7-3.5,4.2-3.5c3,0,5.4,4.5,5.4,10.1  c0,2.1-0.7,3.3-2.1,3.3S23.3,22,20.7,17.8 M16.4,11c-2.2-2.9-4.1-4-6.3-4C5.5,7,2,13.1,2,19.5c0,4,1.9,6.5,5.1,6.5  c2.3,0,3.9-1.1,6.9-6.3c0,0,1.2-2.2,2.1-3.7c0.3,0.5,0.6,1,0.9,1.6l1.4,2.4c2.7,4.6,4.2,6.1,6.9,6.1c3.1,0,4.8-2.6,4.8-6.7  C30,12.6,26.4,7,22.1,7C19.8,7,18,8.8,16.4,11" />
                    </svg>
                    <span>Meta Business Partner</span>
                  </span>
                  <span className="hidden h-4 w-px bg-border sm:block" aria-hidden="true"></span>
                  <span className="inline-flex items-center gap-1.5 text-primary">
                    {/* WhatsApp logo representation */}
                    <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <span>Official WhatsApp API</span>
                  </span>
                </div>
              </div>

              {/* Title & Copy */}
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1] text-foreground">
                More Leads. <br className="hidden sm:inline" />
                Faster Follow-Ups. <br />
                <span className="relative inline-block mt-1 sm:mt-0 sm:whitespace-nowrap">
                  <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">More Deals.</span>
                  <svg className="absolute -bottom-2.5 left-0 hidden w-full text-primary/30 sm:block" viewBox="0 0 300 12" fill="none" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M2 8.5C60 3 150 2 298 7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>

              <p className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0 leading-relaxed font-medium">
                HopeChat replies instantly, follows up automatically, and coordinates sales right inside the chat — so no lead ever goes cold on WhatsApp.
              </p>

              {/* CTAs */}
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3.5 sm:flex-row sm:justify-center lg:justify-start">
                  <Link href="/signup" className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary text-white font-bold h-12 w-full sm:w-auto px-8 shadow-[0_8px_24px_-6px_rgba(11,170,110,0.4)] transition-[transform,box-shadow] duration-200 hover:shadow-[0_12px_28px_-6px_rgba(11,170,110,0.5)] active:scale-[0.98]">
                    <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"></span>
                    <span>Start Free Trial</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                  <Link href="#pricing" className="inline-flex items-center justify-center font-bold rounded-xl border border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/30 transition-all duration-200 h-12 w-full sm:w-auto px-8 active:scale-[0.98]">
                    <span>View Pricing</span>
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground">No credit card required · Set up in minutes · Cancel anytime</p>
              </div>

              {/* Trust Badge */}
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3 lg:justify-start pt-2">
                <div className="flex items-center gap-0.5 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Trusted by <span className="font-extrabold text-foreground">2,000+ growing businesses</span> globally
                </p>
              </div>

              {/* Stats Row */}
              <div className="mt-8 hidden sm:flex items-center justify-center gap-10 lg:justify-start pt-4 border-t border-border/50">
                <div className="text-left space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-lg text-foreground">
                    <span>98%</span>
                    <TrendingUp className="h-4.5 w-4.5 text-primary shrink-0" />
                  </div>
                  <div className="text-xs font-bold text-foreground">Open Rate</div>
                  <div className="text-[10px] text-muted-foreground leading-none">vs. ~20% on traditional email</div>
                </div>
                <div className="text-left space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-lg text-foreground">
                    <span>5.2x</span>
                    <TrendingUp className="h-4.5 w-4.5 text-primary shrink-0" />
                  </div>
                  <div className="text-xs font-bold text-foreground">Faster Replies</div>
                  <div className="text-[10px] text-muted-foreground leading-none">vs. manual response workflow</div>
                </div>
                <div className="text-left space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-lg text-foreground">
                    <span>24/7</span>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                    </span>
                  </div>
                  <div className="text-xs font-bold text-foreground">Always Online</div>
                  <div className="text-[10px] text-muted-foreground leading-none">Never miss a late-night lead</div>
                </div>
              </div>

            </div>

            {/* Right Side: Interactive HTML/CSS Dashboard Mockup */}
            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <div className="absolute inset-x-6 -bottom-6 top-10 -z-10 rounded-[32px] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent blur-2xl"></div>
              
              <div className="w-full rounded-2xl border border-border bg-card shadow-2xl overflow-hidden aspect-[16/10] flex text-left font-sans text-[11px] md:text-xs select-none">
                {/* Left Mini Sidebar */}
                <div className="w-12 sm:w-44 border-r border-border bg-muted/30 flex flex-col">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <span className="hidden sm:inline font-bold text-foreground">Inbox</span>
                    <div className="h-4 w-4 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 flex gap-2 items-center cursor-pointer">
                      <div className="h-7 w-7 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center font-extrabold text-[10px]">NK</div>
                      <div className="hidden sm:block overflow-hidden flex-1 leading-none">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-bold text-foreground truncate">Nalukenge Kate</span>
                        </div>
                        <p className="text-[10px] text-primary font-bold">Active Chat</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg hover:bg-muted/50 flex gap-2 items-center cursor-pointer transition-colors">
                      <div className="h-7 w-7 shrink-0 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-extrabold text-[10px]">OK</div>
                      <div className="hidden sm:block overflow-hidden flex-1 leading-none">
                        <span className="font-semibold text-muted-foreground truncate block">Ochieng Kevin</span>
                        <p className="text-[9px] text-muted-foreground mt-0.5 truncate">Auto-replied 2m ago</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg hover:bg-muted/50 flex gap-2 items-center cursor-pointer transition-colors">
                      <div className="h-7 w-7 shrink-0 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-extrabold text-[10px]">JM</div>
                      <div className="hidden sm:block overflow-hidden flex-1 leading-none">
                        <span className="font-semibold text-muted-foreground truncate block">Jean Mugisha</span>
                        <p className="text-[9px] text-muted-foreground mt-0.5 truncate">Closed yesterday</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Active Conversation Mockup */}
                <div className="flex-1 flex flex-col bg-card">
                  <div className="p-3 border-b border-border bg-muted/10 flex justify-between items-center leading-none">
                    <div>
                      <span className="font-bold text-foreground block">Nalukenge Kate</span>
                      <span className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" /> WhatsApp • Assigned to AI Agent
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold text-[9px] uppercase tracking-wider">Retail</span>
                  </div>

                  {/* Message Loop */}
                  <div className="flex-1 p-3 space-y-2 bg-muted/5 overflow-y-auto">
                    <div className="flex gap-2 items-end max-w-[85%]">
                      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center font-bold text-[8px] text-muted-foreground shrink-0">NK</div>
                      <div className="px-3 py-1.5 bg-muted/40 rounded-xl rounded-bl-none border border-border text-[11px] leading-relaxed">
                        Hi! We run a Kampala-based retail chain. Can HopeChat handle our WhatsApp queries?
                      </div>
                    </div>
                    <div className="flex gap-2 items-end max-w-[85%] ml-auto flex-row-reverse">
                      <div className="h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[8px] shrink-0">AI</div>
                      <div className="px-3 py-1.5 bg-primary text-white rounded-xl rounded-br-none text-[11px] leading-relaxed">
                        Absolutely! HopeChat is built for growing businesses. You get a shared inbox for your team, plus AI replies that handle queries 24/7.
                      </div>
                    </div>
                    <div className="flex gap-2 items-end max-w-[85%]">
                      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center font-bold text-[8px] text-muted-foreground shrink-0">NK</div>
                      <div className="px-3 py-1.5 bg-muted/40 rounded-xl rounded-bl-none border border-border text-[11px] leading-relaxed">
                        Nice! Can we sync chats to our sales pipeline?
                      </div>
                    </div>
                    <div className="flex gap-2 items-end max-w-[85%] ml-auto flex-row-reverse animate-pulse">
                      <div className="h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[8px] shrink-0">AI</div>
                      <div className="px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-xl rounded-br-none text-[10px] leading-tight italic">
                        Writing response...
                      </div>
                    </div>
                  </div>

                  <div className="p-2 border-t border-border bg-card flex gap-2">
                    <div className="flex-1 bg-muted/20 border border-border rounded-xl px-2.5 py-1.5 text-muted-foreground flex justify-between items-center text-[10px]">
                      <span>HopeChat AI auto-drafting response...</span>
                      <Zap className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                </div>

                {/* Right CRM Details Sidebar */}
                <div className="hidden md:flex w-48 border-l border-border bg-muted/30 flex-col p-3 space-y-3.5">
                  <div className="space-y-1">
                    <h4 className="font-extrabold uppercase tracking-wider text-[9px] text-muted-foreground">Deal Pipeline</h4>
                    <div className="p-2 rounded-xl bg-card border border-border space-y-1.5 shadow-sm">
                      <div className="flex justify-between items-center leading-none">
                        <span className="text-[10px] text-muted-foreground font-medium">Stage:</span>
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold text-[8px] uppercase">Qualified</span>
                      </div>
                      <div className="flex justify-between items-center leading-none">
                        <span className="text-[10px] text-muted-foreground font-medium">Value:</span>
                        <span className="font-bold text-foreground">4,500,000 UGX</span>
                      </div>
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-2/5 rounded-full" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold uppercase tracking-wider text-[9px] text-muted-foreground">Information</h4>
                    <div className="p-2 rounded-xl bg-card border border-border space-y-1 leading-tight shadow-sm">
                      <span className="font-bold text-foreground block">Kampala Retail Ltd</span>
                      <span className="text-[9px] text-muted-foreground block">Uganda</span>
                      <span className="text-[9px] text-primary font-semibold block">+256 700 123456</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold uppercase tracking-wider text-[9px] text-muted-foreground">Active Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-card border border-border text-[9px] font-bold text-muted-foreground">Retail</span>
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary">Kampala</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* 3. AI Chatbot Section (Doesn't just chat. It closes.) */}
        <section id="ai-chatbot" className="relative overflow-hidden py-24 sm:py-32 border-t border-border/50">
          <div className="pointer-events-none absolute inset-0 hidden md:block">
            <div className="absolute right-1/4 top-16 h-[480px] w-[560px] translate-x-1/3 rounded-full bg-primary/[0.05] blur-[150px]"></div>
            <div className="absolute left-0 bottom-0 h-[360px] w-[420px] rounded-full bg-primary/[0.04] blur-[140px]"></div>
          </div>

          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-12">
            
            {/* Left Content */}
            <div className="space-y-6 text-center lg:text-left">
              <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-wider">
                AI WhatsApp Assistant
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Doesn&#x27;t just chat. <br />
                <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">It closes deals.</span>
              </h2>
              <p className="mx-auto lg:mx-0 max-w-lg text-base text-muted-foreground leading-relaxed font-medium">
                Trained on your own product files and FAQ documents, the AI understand client intent, answers queries instantly 24/7, and triggers automations automatically.
              </p>

              <div className="mt-8 grid gap-5 text-left max-w-xl mx-auto lg:mx-0">
                <div className="flex gap-4 p-4 rounded-xl border border-border bg-card/50 hover:border-primary/30 transition-all duration-300">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Automated Intent Detection</h3>
                    <p className="text-xs text-muted-foreground mt-1">Recognize hot leads instantly when they request pricing, call-backs, or place orders. Prioritize high-value deals.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl border border-border bg-card/50 hover:border-primary/30 transition-all duration-300">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Data-Driven Knowledge Base</h3>
                    <p className="text-xs text-muted-foreground mt-1">Train the assistant in minutes. Upload catalogs, policy documents, or URL lists. It responds accurately in your brand voice.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl border border-border bg-card/50 hover:border-primary/30 transition-all duration-300">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Real Database Actions</h3>
                    <p className="text-xs text-muted-foreground mt-1">Not just words—it performs actions. Update Google Sheets databases, check store stocks, or assign tickets to agents.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-center lg:justify-start">
                <Link href="/signup" className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(11,170,110,0.5)] active:scale-[0.97] transition-all">
                  <span>Deploy Your AI Bot</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            {/* Right Content: Mobile Chat Simulator Mockup */}
            <div className="relative mx-auto w-full max-w-[360px]">
              <div className="absolute inset-x-6 -bottom-6 top-10 -z-10 rounded-[3rem] bg-gradient-to-br from-primary/15 to-transparent blur-2xl"></div>
              
              {/* Outer Phone Frame */}
              <div className="relative aspect-[9/18] rounded-[2.5rem] border-4 border-muted-foreground/30 bg-card shadow-2xl p-2.5 overflow-hidden flex flex-col font-sans text-xs">
                {/* Internal UI */}
                <div className="flex-1 flex flex-col rounded-[2rem] bg-card border border-border/50 overflow-hidden relative">
                  
                  {/* Chat Head */}
                  <div className="p-3 border-b border-border bg-muted/20 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-black">AI</div>
                    <div className="leading-none flex-1">
                      <p className="font-bold text-foreground">HopeChat Assistant</p>
                      <span className="text-[9px] text-primary font-bold">● Online</span>
                    </div>
                  </div>

                  {/* Messages Feed */}
                  <div 
                    ref={chatContainerRef}
                    className="flex-1 p-3 overflow-y-auto space-y-2 bg-muted/5 scrollbar-thin transition-all duration-300"
                  >
                    {visibleMessages.map((msg, index) => {
                      if (msg.sender === "typing") {
                        return (
                          <div key={index} className="flex gap-2 items-end max-w-[85%]">
                            <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[8px] shrink-0">AI</div>
                            <div className="bg-muted/40 border border-border px-3 py-2 rounded-xl rounded-bl-none text-muted-foreground">
                              <div className="flex gap-1 items-center py-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      const isBot = msg.sender === "bot";
                      return (
                        <div key={index} className={cn("flex gap-2 items-end max-w-[85%]", isBot ? "mr-auto" : "ml-auto flex-row-reverse")}>
                          <div className={cn("h-5 w-5 rounded-full flex items-center justify-center font-bold text-[8px] shrink-0", isBot ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                            {isBot ? "AI" : "You"}
                          </div>
                          <div className={cn("px-3 py-2 rounded-xl text-[11px] leading-relaxed border shadow-sm", isBot ? "bg-primary text-white border-primary/10 rounded-bl-none" : "bg-card text-foreground border-border rounded-br-none")}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Input Box */}
                  <div className="p-2 border-t border-border bg-card">
                    <div className="bg-muted/30 border border-border rounded-full px-3 py-1.5 text-muted-foreground flex justify-between items-center text-[10px]">
                      <span>Ask a question...</span>
                      <div className="h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center">
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Float badges around the simulator */}
              <div className="absolute left-[-20px] top-12 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg animate-float">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span className="leading-none text-left">
                  <span className="block text-[10px] font-bold text-foreground">70%+ Resolved</span>
                  <span className="block text-[8px] text-muted-foreground">on first contact</span>
                </span>
              </div>

              <div className="absolute right-[-10px] bottom-16 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg animate-float-delayed">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Database className="h-4 w-4" />
                </span>
                <span className="leading-none text-left">
                  <span className="block text-[10px] font-bold text-foreground">Knowledge Sync</span>
                  <span className="block text-[8px] text-muted-foreground">Updated live</span>
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* 4. Done-For-You Setup Section (Talk to a real expert) */}
        <section className="relative overflow-hidden py-24 sm:py-32 border-t border-border/50 bg-muted/20">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center space-y-12">
            <div className="space-y-4 max-w-2xl mx-auto">
              <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-wider">
                Free Expert Onboarding
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Talk to a WhatsApp Expert, whenever you need one.
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                Designing chatbot automations and connecting API numbers can feel complex. Let our team do the heavy lifting for you—completely free.
              </p>
            </div>

            {/* Interactive Support Cards */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                {
                  id: 0,
                  title: "Quick Connection",
                  time: "15 mins",
                  subtitle: "API Setup & Import",
                  desc: "Connect your existing WhatsApp Business number to the official Meta Cloud API, import your contacts, and get ready to send broadcasts.",
                  action: "Schedule Call",
                  badge: "Quick"
                },
                {
                  id: 1,
                  title: "Workflow Design",
                  time: "30 mins",
                  subtitle: "Chatbot & Rules",
                  desc: "Design custom visual conversation flows. We will help map your FAQs, configure keyword triggers, and build interactive WhatsApp menus.",
                  action: "Book Setup Slot",
                  badge: "Most Popular"
                },
                {
                  id: 2,
                  title: "API & Sync Scoping",
                  time: "60 mins",
                  subtitle: "CRM & Webhook Sync",
                  desc: "Architect complex data pipelines. Connect HopeChat webhooks to Google Sheets, sync deals to external databases, and configure automatic triggers.",
                  action: "Request Custom Scope",
                  badge: "Enterprise"
                }
              ].map((slot) => {
                const isActive = activeSupportSlot === slot.id;
                return (
                  <div 
                    key={slot.id}
                    onClick={() => setActiveSupportSlot(slot.id)}
                    className={cn(
                      "p-6 rounded-2xl border text-left flex flex-col justify-between cursor-pointer transition-all duration-300 relative bg-card shadow-sm hover:shadow-md",
                      isActive 
                        ? "border-primary ring-2 ring-primary/20 scale-[1.02] -translate-y-1 shadow-lg shadow-primary/5" 
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    {isActive && (
                      <span className="absolute top-0 right-6 -translate-y-1/2 rounded-full bg-primary px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">
                        {slot.badge}
                      </span>
                    )}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-border/50 pb-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{slot.title}</span>
                        <span className="text-xs font-extrabold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">{slot.time}</span>
                      </div>
                      <h3 className="text-base font-extrabold text-foreground">{slot.subtitle}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{slot.desc}</p>
                    </div>
                    
                    <div className="pt-6">
                      <Link 
                        href="https://wa.me/256700123456" 
                        target="_blank"
                        className={cn(
                          buttonVariants({ variant: isActive ? "default" : "outline", size: "sm" }),
                          "w-full rounded-xl text-xs font-bold transition-all"
                        )}
                      >
                        {slot.action}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. Features Grid ("Everything you need to sell on WhatsApp") */}
        <section id="features" className="relative py-24 sm:py-32 border-t border-border/50 bg-background">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-16">
            
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-wider">
                Full-Service Feature Suite
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Everything you need to grow on WhatsApp
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                Speed up your lead responses, simplify team coordination, and automate outbound messages — all powered by the official API.
              </p>
            </div>

            {/* 6 Feature cards grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
              {[
                {
                  icon: Smartphone,
                  title: "Keep Your App. Add Automation.",
                  desc: "Connect the same WhatsApp number you use today without losing history. Keep chatting on the WhatsApp Business app while HopeChat automates in the background."
                },
                {
                  icon: Megaphone,
                  title: "WhatsApp Broadcasts at Scale",
                  desc: "Send personalized campaign messages to your entire subscriber list in minutes. Deliver transactional details, discount codes, or stock updates with 99.9% reliability."
                },
                {
                  icon: SlidersHorizontal,
                  title: "Build Visual Workflows Without Code",
                  desc: "Configure visual chatbot flows, keyword auto-replies, action rules, and time delays. Map your business processes using a visual drag-and-drop editor."
                },
                {
                  icon: Users,
                  title: "Your Entire Team. One Number.",
                  desc: "Invite multiple sales and support agents to handle conversations at once from a single shared inbox. Assign chats, coordinate tickets, and add internal notes."
                },
                {
                  icon: FolderSync,
                  title: "Capture Leads on Autopilot",
                  desc: "Leads from your Facebook Ads, Instagram Ads, Google Sheets, or website forms drop directly into active WhatsApp conversations with immediate automated replies."
                },
                {
                  icon: Zap,
                  title: "Drip Campaigns & Sequences",
                  desc: "Set up automated drip sequences to follow up with new leads on WhatsApp. Send structured follow-ups (Day 1, Day 3, Day 7) to improve conversion rates."
                }
              ].map((feature, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="group p-6 rounded-2xl bg-card border border-border/80 shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full">
                    <div className="space-y-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        <feature.icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-extrabold text-foreground group-hover:text-primary transition-colors duration-300">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>

          </div>
        </section>

        {/* 6. Integrations Section (Animated Connective Hub) */}
        <section id="integrations" className="relative overflow-hidden py-24 sm:py-32 border-t border-border/50 bg-muted/10">
          
          {/* Ambient center blur */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[380px] w-[580px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.04] blur-[150px]"></div>
          </div>

          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative space-y-12">
            
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-wider">
                Connected Workspace
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Connects to the tools you already run
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                HopeChat plugs directly into your payment gateways, e-commerce stores, CRMs, and sheet databases over the official API. No developers required.
              </p>
            </div>

            {/* Premium Visual Integration Hub Mockup */}
            <div className="relative max-w-3xl mx-auto aspect-[16/8] hidden md:flex items-center justify-center">
              
              {/* Central HopeChat Hub */}
              <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border-2 border-primary bg-card shadow-xl shadow-primary/10">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20 text-white font-black animate-pulse-glow">
                  <MessageSquare className="h-8 w-8" />
                </div>
              </div>

              {/* Connection Lines (SVG) */}
              <svg className="absolute inset-0 h-full w-full pointer-events-none opacity-40">
                {/* Left links */}
                <line x1="150" y1="50" x2="384" y2="150" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1="120" y1="150" x2="384" y2="150" stroke="var(--primary)" strokeWidth="1.5" />
                <line x1="150" y1="250" x2="384" y2="150" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="4 4" />
                
                {/* Right links */}
                <line x1="614" y1="50" x2="384" y2="150" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1="644" y1="150" x2="384" y2="150" stroke="var(--primary)" strokeWidth="1.5" />
                <line x1="614" y1="250" x2="384" y2="150" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="4 4" />
              </svg>

              {/* Floating Logos left */}
              <div className="absolute left-[80px] top-[20px] flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 shadow-sm hover:border-primary/30 transition-all duration-300">
                <span className="h-6 w-6 bg-orange-500 rounded-lg flex items-center justify-center text-[10px] text-white font-bold">S</span>
                <span className="font-bold text-[10px]">Shopify</span>
              </div>
              <div className="absolute left-[30px] top-[130px] flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 shadow-sm hover:border-primary/30 transition-all duration-300">
                <span className="h-6 w-6 bg-emerald-500 rounded-lg flex items-center justify-center text-[10px] text-white font-bold">G</span>
                <span className="font-bold text-[10px]">Google Sheets</span>
              </div>
              <div className="absolute left-[80px] top-[230px] flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 shadow-sm hover:border-primary/30 transition-all duration-300">
                <span className="h-6 w-6 bg-purple-600 rounded-lg flex items-center justify-center text-[10px] text-white font-bold">W</span>
                <span className="font-bold text-[10px]">WooCommerce</span>
              </div>

              {/* Floating Logos right */}
              <div className="absolute right-[80px] top-[20px] flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 shadow-sm hover:border-primary/30 transition-all duration-300">
                <span className="h-6 w-6 bg-indigo-500 rounded-lg flex items-center justify-center text-[10px] text-white font-bold">M</span>
                <span className="font-bold text-[10px]">Make.com</span>
              </div>
              <div className="absolute right-[30px] top-[130px] flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 shadow-sm hover:border-primary/30 transition-all duration-300">
                <span className="h-6 w-6 bg-orange-600 rounded-lg flex items-center justify-center text-[10px] text-white font-bold">Z</span>
                <span className="font-bold text-[10px]">Zapier</span>
              </div>
              <div className="absolute right-[80px] top-[230px] flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 shadow-sm hover:border-primary/30 transition-all duration-300">
                <span className="h-6 w-6 bg-blue-600 rounded-lg flex items-center justify-center text-[10px] text-white font-bold">C</span>
                <span className="font-bold text-[10px]">Calendly</span>
              </div>

            </div>

            {/* Mobile Layout list of integrations */}
            <div className="md:hidden grid grid-cols-2 gap-3 max-w-sm mx-auto">
              {["Shopify", "WooCommerce", "Google Sheets", "Make.com", "Zapier", "Calendly"].map((tool) => (
                <div key={tool} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm justify-center">
                  <span className="h-5 w-5 bg-primary/10 rounded-full flex items-center justify-center text-[10px] font-bold text-primary">✓</span>
                  <span className="font-bold text-xs">{tool}</span>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-muted-foreground max-w-md mx-auto">
              Don&#x27;t see your platform? HopeChat connects to any tool using REST APIs and direct Webhooks, as well as native Zapier, Make, and n8n pipelines.
            </p>
          </div>
        </section>

        {/* 7. How It Works Section ("Getting started takes minutes") */}
        <section className="relative overflow-hidden py-24 sm:py-32 border-t border-border/50 bg-background">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-16">
            
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-wider">
                Launch Guide
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Getting started takes minutes, not months
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                No complex onboarding. Go from registration to running automatic WhatsApp replies in three simple steps.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  step: "01",
                  title: "Connect & Upload",
                  desc: "Connect your phone number to the official API. Upload product lists or FAQs to train your custom AI agent instantly."
                },
                {
                  step: "02",
                  title: "Build Automations",
                  desc: "Configure keyword auto-replies, workflow delays, and visual flows to route messages or handle requests."
                },
                {
                  step: "03",
                  title: "Scale Conversions",
                  desc: "Run broadcasts, delegate tickets to your team via the Shared Inbox, and review statistics via your analytics dashboard."
                }
              ].map((step, idx) => (
                <div key={idx} className="relative p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4 flex flex-col justify-between">
                  <span className="text-4xl font-black text-primary/10 tracking-tight block">
                    {step.step}
                  </span>
                  <div className="space-y-2">
                    <h3 className="text-sm font-extrabold text-foreground">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* 8. Built on the Official API Section */}
        <section className="bg-gradient-to-br from-primary/[0.04] via-card to-primary/[0.02] py-16 md:py-24 border-t border-border/50">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
            
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6 text-center lg:text-left">
                <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-wider">
                  Meta Official API Partner
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                  Built on the official WhatsApp Business API
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium max-w-lg mx-auto lg:mx-0">
                  HopeChat connects to the official WhatsApp Business API via Meta Business. Every message you send is delivered with enterprise-grade reliability, zero risk of number bans, and full Meta compliance.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <Link href="/signup" className="inline-flex items-center justify-center bg-primary text-white font-bold h-10 px-6 text-xs rounded-xl shadow-md transition-all hover:bg-primary/95">
                    Get Started Free
                  </Link>
                  <Link href="#pricing" className="inline-flex items-center justify-center border border-border bg-card text-foreground font-bold h-10 px-6 text-xs rounded-xl hover:border-primary/50 transition-all">
                    View Pricing
                  </Link>
                </div>
              </div>

              {/* Grid cards */}
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    title: "Official API Access",
                    desc: "Direct Meta connection ensuring 99.9% message reliability. Compliance verification built-in."
                  },
                  {
                    title: "Click-to-WhatsApp Ads",
                    desc: "Integrate Instagram & Facebook ads to funnel leads directly into automated chats."
                  },
                  {
                    title: "No-Code Workflows",
                    desc: "Build lead collection, checkouts, and customer surveys without developer aid."
                  },
                  {
                    title: "Live Analytics",
                    desc: "Track open rates, reading times, conversion logs, and team response metrics in real time."
                  }
                ].map((card, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-border bg-card space-y-2">
                    <h3 className="text-xs font-bold text-foreground">{card.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* 9. Testimonials Section */}
        <section className="relative py-24 sm:py-32 border-t border-border/50 bg-background">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
            
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-wider">
                Social Proof
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Trusted by 2,000+ businesses
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                See how growing sales teams and support channels scale their WhatsApp operations with HopeChat.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                {
                  quote: "HopeChat tripled our lead response rate within the first week. The automated sequences and pipeline integration save us hours daily.",
                  author: "Rajesh Sharma",
                  role: "Founder & CEO, TechSolutions"
                },
                {
                  quote: "Our broadcast campaigns reach 50,000+ customers in minutes. WhatsApp open rates went to 82% compared to just 12% on old email lists.",
                  author: "Priya Mehta",
                  role: "Marketing Head, StyleKart"
                },
                {
                  quote: "We replaced three separate tools with HopeChat. The shared inbox lets our agents coordinate seamlessly and ensure no lead goes cold.",
                  author: "David Chen",
                  role: "COO, GlobalRetail Inc"
                },
                {
                  quote: "Student registration inquiries are handled 24/7. The AI assistant answers pricing and term questions instantly, saving our admin team massive effort.",
                  author: "Anita Desai",
                  role: "Director, EduLearn Academy"
                },
                {
                  quote: "Automated order updates and delivery details on WhatsApp reduced our support ticket workload by 60%. Clients love the quick notifications.",
                  author: "Michael Torres",
                  role: "Co-Founder, FreshBites Delivery"
                },
                {
                  quote: "The analytics dashboard gives us exact data on every WhatsApp broadcast. We optimized our copy and doubled conversions.",
                  author: "Sneha Kapoor",
                  role: "VP of Support, FinServe Solutions"
                }
              ].map((t, idx) => (
                <div key={idx} className="p-6 rounded-2xl border border-border bg-card flex flex-col justify-between space-y-4 shadow-sm hover:border-primary/30 transition-all duration-300">
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    “{t.quote}”
                  </p>
                  <div className="flex items-center gap-2 border-t border-border/50 pt-3">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                      {t.author[0]}
                    </div>
                    <div className="leading-none">
                      <span className="block text-xs font-bold text-foreground">{t.author}</span>
                      <span className="block text-[9px] text-muted-foreground mt-0.5">{t.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* 10. FAQ Section (Accordion Layout) */}
        <section id="faq" className="py-24 sm:py-32 border-t border-border/50 bg-muted/20">
          <div className="container mx-auto max-w-3xl px-4 text-center space-y-16">
            
            <div className="space-y-4">
              <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-wider">
                Support FAQ
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                Frequently asked questions
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                Find answers to common questions about setting up and automating HopeChat.
              </p>
            </div>

            <div className="text-left space-y-4">
              {[
                {
                  q: "What is HopeChat?",
                  a: "HopeChat is an official WhatsApp Business API CRM. It helps businesses centralize customer chats, auto-reply to FAQs 24/7 with custom AI, coordinate team seats via a Shared Inbox, run broadcast marketing campaigns, and track deals via a built-in visual sales pipeline."
                },
                {
                  q: "Do I need to know how to code?",
                  a: "No! HopeChat is built for non-technical users. The visual workflow builder, FAQ document sync, and CRM pipeline tools are all drag-and-drop. Our setup team is also available to configure your account for free."
                },
                {
                  q: "How does the AI Assistant differ from a normal chatbot?",
                  a: "Normal chatbots follow strict 'if/else' keyword conditions. The HopeChat AI reads and understands your uploaded catalogs, FAQ sheets, or URLs, and replies contextually in natural language. It can understand customer intents and escalate to human agents when it doesn't have the answer."
                },
                {
                  q: "How does the Knowledge Base work?",
                  a: "The Knowledge Base is where you store information for your AI. You can upload PDF brochures, paste text guides, or import website URLs. HopeChat uses this data to answer questions based on your specific documents."
                },
                {
                  q: "Which integrations are supported?",
                  a: "We support integrations with WooCommerce, Shopify, Google Sheets, Calendly, Stripe, and Meta Lead Ads. You can also connect custom databases or CRMs via outbound webhooks and our REST API, or use Zapier and Make."
                },
                {
                  q: "Is my data secure?",
                  a: "Yes. HopeChat is built on private, secure infrastructure. Your data and customer logs are isolated, encrypted in transit and at rest, and fully secure, making it compliant with strict privacy laws."
                }
              ].map((faq, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:border-primary/30 transition-all duration-300">
                    <button 
                      onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                      className="w-full px-5 py-4 flex justify-between items-center text-left font-bold text-foreground text-xs sm:text-sm hover:bg-muted/40 transition-colors duration-200"
                    >
                      <span className="pr-4">{faq.q}</span>
                      <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300", activeFaq === i && "rotate-90 text-primary")} />
                    </button>
                    <div 
                      className="faq-content" 
                      data-open={activeFaq === i}
                    >
                      <div>
                        <div className="px-5 pb-4 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border bg-card font-medium">
                          {faq.a}
                        </div>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>

            <div className="pt-4 text-xs font-bold text-muted-foreground">
              Still have questions?{" "}
              <Link href="https://wa.me/256700123456" target="_blank" className="text-primary hover:underline">
                Chat with our team on WhatsApp
              </Link>
            </div>
          </div>
        </section>

        {/* 11. Final CTA Banner */}
        <section className="py-24 sm:py-32 bg-background border-t border-border/50">
          <div className="container mx-auto px-4">
            <FadeIn>
              <div className="rounded-3xl bg-gradient-to-br from-primary/[0.08] via-primary/[0.02] to-transparent border border-primary/20 p-8 md:p-16 lg:p-20 text-center relative overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-500">
                {/* Blur bubbles */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
                  <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                    Turn WhatsApp into your best sales channel.
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
                    Join growing businesses automating customer queries, broadcasts campaigns, and sales pipelines. Free setup support included.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Link href="/signup" className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary text-white font-bold h-12 w-full sm:w-auto px-8 shadow-lg shadow-primary/25 hover:shadow-xl active:scale-[0.98] transition-all">
                      <span>Get Started Free</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                    <Link href="https://wa.me/256700123456" target="_blank" className="inline-flex items-center justify-center font-bold rounded-xl border border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/30 transition-all h-12 w-full sm:w-auto px-8 active:scale-[0.98]">
                      <span>Talk to Sales</span>
                    </Link>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

      </main>

      {/* 12. Footer */}
      <footer className="bg-card border-t border-border/80 pt-16 pb-8 text-xs">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1 space-y-4">
              
              {/* Kept original HopeChat logo */}
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold tracking-tight text-foreground">HopeChat</span>
              </Link>
              
              <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                The WhatsApp CRM and AI automation platform built for growing businesses. Private, compliant, and built to scale your revenue.
              </p>
            </div>

            <div>
              <h4 className="font-extrabold uppercase tracking-wider text-foreground mb-4">Product</h4>
              <ul className="space-y-2.5 text-muted-foreground font-semibold">
                <li><Link href="#features" className="hover:text-primary transition-colors">Shared Inbox</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">AI Auto-Replies</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">Sales Pipeline</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">Outbound Broadcasts</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold uppercase tracking-wider text-foreground mb-4">Solutions</h4>
              <ul className="space-y-2.5 text-muted-foreground font-semibold">
                <li><button onClick={() => setActiveIndustry("retail")} className="hover:text-primary transition-colors text-left">E-commerce</button></li>
                <li><button onClick={() => setActiveIndustry("finance")} className="hover:text-primary transition-colors text-left">Fintech & Services</button></li>
                <li><button onClick={() => setActiveIndustry("gaming")} className="hover:text-primary transition-colors text-left">Betting & Gaming</button></li>
                <li><button onClick={() => setActiveIndustry("enterprise")} className="hover:text-primary transition-colors text-left">Enterprise Teams</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold uppercase tracking-wider text-foreground mb-4">Resources</h4>
              <ul className="space-y-2.5 text-muted-foreground font-semibold">
                <li><Link href="#" className="hover:text-primary transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">API Reference</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="https://wa.me/256700123456" target="_blank" className="hover:text-primary transition-colors">Contact Support</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <p>© {new Date().getFullYear()} HopeChat. All rights reserved.</p>
            <div className="flex gap-6">
              <span>Privacy First</span>
              <span>Encrypted Channels</span>
              <span>API Certified</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
