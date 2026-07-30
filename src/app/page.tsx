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
  Check
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Mock messages database for the dynamic landing page preview
const MOCK_MESSAGES = [
  { sender: "customer", text: "Hi! We run a Kampala-based retail chain. Can HopeChat handle our WhatsApp Business queries?" },
  { sender: "typing", text: "" },
  { sender: "bot", text: "Absolutely! HopeChat is built for East African businesses. You get a shared WhatsApp inbox for your whole team plus AI-powered replies that handle customer questions 24/7." },
  { sender: "customer", text: "Nice. Can it handle customer questions even when the office is closed?" },
  { sender: "typing", text: "" },
  { sender: "bot", text: "Yes! HopeChat AI works 24/7. Just upload your FAQ documents and product catalogues and it learns your business automatically." },
  { sender: "customer", text: "We also need to track deals. Can we link WhatsApp chats to a sales pipeline?" },
  { sender: "typing", text: "" },
  { sender: "bot", text: "Of course! HopeChat has a built-in sales pipeline where deal cards are linked directly to live WhatsApp conversations. Track every lead from first message to closed deal." }
];

// Reusable IntersectionObserver-based FadeIn component for smooth, staggering scroll animations
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

// Floating particle orb component for hero background
function FloatingOrb({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div 
      className={cn("absolute rounded-full blur-[80px] pointer-events-none animate-float", className)}
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

export default function LandingPage() {
  const [activeIndustry, setActiveIndustry] = useState("retail");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Chat simulator states
  const [visibleMessages, setVisibleMessages] = useState<Array<{ sender: string; text: string }>>([MOCK_MESSAGES[0]]);
  const currentStepRef = useRef(0);
  
  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scoped Auto scroll within the chat container only (fixes window jumping bug)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [visibleMessages]);

  // Chat simulation effect loop - runs once on mount, no re-trigger
  useEffect(() => {
    let cancelled = false;
    const runChatSimulation = async () => {
      while (!cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        if (cancelled) break;
        
        const nextTypingIndex = (currentStepRef.current + 1) % MOCK_MESSAGES.length;
        setVisibleMessages((prev) => [...prev, MOCK_MESSAGES[nextTypingIndex]]);
        
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (cancelled) break;
        
        const nextMessageIndex = (nextTypingIndex + 1) % MOCK_MESSAGES.length;
        setVisibleMessages((prev) => {
          const list = [...prev];
          list[list.length - 1] = MOCK_MESSAGES[nextMessageIndex];
          return list;
        });

        currentStepRef.current = nextMessageIndex;

        if (visibleMessages.length > 8) {
          setVisibleMessages([MOCK_MESSAGES[0]]);
          currentStepRef.current = 0;
        }
      }
    };

    runChatSimulation();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[oklch(0.2_0.04_170)] selection:bg-[oklch(0.5_0.15_170)]/30 antialiased font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[oklch(0.94_0.02_170)] bg-white/95 backdrop-blur-lg transition-all duration-300 shadow-sm shadow-black/[0.02]">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[oklch(0.5_0.15_170)] shadow-md shadow-[oklch(0.5_0.15_170)]/20 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[oklch(0.5_0.15_170)]/30">
                <MessageSquare className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-[oklch(0.2_0.04_170)] bg-clip-text">HopeChat</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted-foreground">
              <Link href="#features" className="hover:text-[oklch(0.5_0.15_170)] transition-colors duration-200 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[oklch(0.5_0.15_170)] after:transition-all after:duration-300 hover:after:w-full">Features</Link>
              <Link href="#pricing" className="hover:text-[oklch(0.5_0.15_170)] transition-colors duration-200 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[oklch(0.5_0.15_170)] after:transition-all after:duration-300 hover:after:w-full">Pricing</Link>
              <Link href="#solutions" className="hover:text-[oklch(0.5_0.15_170)] transition-colors duration-200 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[oklch(0.5_0.15_170)] after:transition-all after:duration-300 hover:after:w-full">Solutions</Link>
              <Link href="#roi" className="hover:text-[oklch(0.5_0.15_170)] transition-colors duration-200 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[oklch(0.5_0.15_170)] after:transition-all after:duration-300 hover:after:w-full">ROI</Link>
              <Link href="#security" className="hover:text-[oklch(0.5_0.15_170)] transition-colors duration-200 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[oklch(0.5_0.15_170)] after:transition-all after:duration-300 hover:after:w-full">Security</Link>
              <Link href="#faq" className="hover:text-[oklch(0.5_0.15_170)] transition-colors duration-200 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[oklch(0.5_0.15_170)] after:transition-all after:duration-300 hover:after:w-full">FAQ</Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "text-sm font-bold text-muted-foreground hover:text-[oklch(0.2_0.04_170)] h-9 px-4 hidden sm:inline-flex transition-all duration-200"
              )}
            >
              Log In
            </Link>
            <Link 
              href="/signup" 
              className={cn(
                buttonVariants(),
                "bg-[oklch(0.5_0.15_170)] hover:bg-[oklch(0.5_0.15_170)]/90 text-white font-bold px-5 h-9 text-xs sm:text-sm shadow-md shadow-[oklch(0.5_0.15_170)]/20 hover:shadow-lg hover:shadow-[oklch(0.5_0.15_170)]/30 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] rounded-lg border-0"
              )}
            >
              Start Free Trial
            </Link>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[oklch(0.94_0.02_170)] text-muted-foreground hover:text-[oklch(0.2_0.04_170)] transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[oklch(0.94_0.02_170)] bg-white/95 backdrop-blur-md px-4 py-4 space-y-3 mobile-menu-enter">
            <Link 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-[oklch(0.2_0.04_170)] rounded-lg hover:bg-[oklch(0.98_0.01_170)] transition-colors duration-200"
            >
              Features
            </Link>
            <Link 
              href="#pricing" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-[oklch(0.2_0.04_170)] rounded-lg hover:bg-[oklch(0.98_0.01_170)] transition-colors duration-200"
            >
              Pricing
            </Link>
            <Link 
              href="#solutions" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-[oklch(0.2_0.04_170)] rounded-lg hover:bg-[oklch(0.98_0.01_170)] transition-colors duration-200"
            >
              Solutions
            </Link>
            <Link 
              href="#roi" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-[oklch(0.2_0.04_170)] rounded-lg hover:bg-[oklch(0.98_0.01_170)] transition-colors duration-200"
            >
              ROI
            </Link>
            <Link 
              href="#security" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-[oklch(0.2_0.04_170)] rounded-lg hover:bg-[oklch(0.98_0.01_170)] transition-colors duration-200"
            >
              Security
            </Link>
            <Link 
              href="#faq" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-[oklch(0.2_0.04_170)] rounded-lg hover:bg-[oklch(0.98_0.01_170)] transition-colors duration-200"
            >
              FAQ
            </Link>
            <div className="pt-2 border-t border-[oklch(0.94_0.02_170)] flex flex-col gap-2">
              <Link 
                href="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full justify-center"
                )}
              >
                Log In
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        
        {/* Enterprise Hero Section (Bright, Ambient Glow) */}
        <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 lg:pt-32 lg:pb-40 overflow-hidden bg-white">
          {/* Floating particle orbs for ambient background effect */}
          <FloatingOrb className="top-20 left-[10%] w-[300px] h-[300px] bg-[oklch(0.88_0.1_165)]/25 animate-float" delay={0} />
          <FloatingOrb className="top-40 right-[15%] w-[250px] h-[250px] bg-[oklch(0.5_0.15_170)]/15 animate-float-delayed" delay={1000} />
          <FloatingOrb className="bottom-20 left-[20%] w-[200px] h-[200px] bg-[oklch(0.88_0.1_165)]/20 animate-float" delay={2000} />
          <FloatingOrb className="top-1/2 right-[10%] w-[180px] h-[180px] bg-[oklch(0.5_0.15_170)]/10 animate-float-delayed" delay={1500} />
          {/* Fresh Mint Green & Emerald Teal ambient blur glow */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[oklch(0.88_0.1_165)]/30 rounded-full blur-[120px] -z-10 pointer-events-none animate-pulse-glow" />
          <div className="absolute top-10 right-1/4 w-[400px] h-[400px] bg-[oklch(0.5_0.15_170)]/10 rounded-full blur-[100px] -z-10 pointer-events-none animate-pulse-glow" style={{ animationDelay: "1500ms" }} />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
            
            {/* Top Tagline Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.5_0.15_170)]/20 bg-[oklch(0.88_0.1_165)] px-4 py-1.5 text-xs sm:text-sm font-bold text-[oklch(0.2_0.04_170)] animate-in fade-in slide-in-from-bottom-2 duration-700">
              <Zap className="h-3.5 w-3.5 text-[oklch(0.5_0.15_170)]" />
              <span>WhatsApp CRM • AI Auto-Replies • Sales Pipeline</span>
            </div>
            
            {/* Main Headline */}
            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.15] text-[oklch(0.2_0.04_170)] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Turn WhatsApp Into Your <span className="text-[oklch(0.5_0.15_170)]">Business Command Center</span>
            </h1>
            
            {/* Description */}
            <p className="mx-auto max-w-2xl text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
              Built for African businesses. HopeChat connects your team and AI agents to WhatsApp so you never miss a customer enquiry and close more deals.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Link 
                href="/signup" 
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full sm:w-auto h-12 px-8 text-base bg-[oklch(0.5_0.15_170)] hover:bg-[oklch(0.5_0.15_170)]/90 text-white gap-2 font-bold shadow-lg shadow-[oklch(0.5_0.15_170)]/25 hover:shadow-xl hover:shadow-[oklch(0.5_0.15_170)]/30 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 rounded-xl border-0 flex items-center justify-center group"
                )}
              >
                Start Free Trial 
                <ArrowRight className="ml-2 h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link 
                href="#features" 
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full sm:w-auto h-12 px-8 text-base border-[oklch(0.94_0.02_170)] bg-white hover:bg-[oklch(0.98_0.01_170)] text-[oklch(0.2_0.04_170)] font-bold hover:scale-[1.03] hover:shadow-md active:scale-[0.98] transition-all duration-300 rounded-xl flex items-center justify-center"
                )}
              >
                Explore Features
              </Link>
            </div>

            {/* Elevated Crisp White Mock Chat Interface */}
            <div className="relative mx-auto max-w-5xl rounded-2xl border border-[oklch(0.94_0.02_170)] bg-white shadow-xl shadow-black/[0.04] overflow-hidden aspect-[16/10] md:aspect-[16/9] flex text-left font-sans text-[11px] sm:text-xs md:text-sm animate-in fade-in zoom-in-95 duration-1000 delay-400 hover:shadow-2xl hover:shadow-black/[0.06] transition-shadow duration-500">
              {/* Left Column: Side Navigation Mock */}
              <div className="w-16 md:w-56 border-r border-[oklch(0.94_0.02_170)] flex flex-col bg-[oklch(0.98_0.01_170)]/50">
                <div className="p-3 border-b border-[oklch(0.94_0.02_170)] flex items-center justify-between">
                  <span className="hidden md:inline font-bold tracking-tight text-[oklch(0.2_0.04_170)]">Conversations</span>
                  <div className="h-4 w-4 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  <div className="p-2.5 rounded-lg bg-[oklch(0.5_0.15_170)]/10 border border-[oklch(0.5_0.15_170)]/20 flex gap-2 items-center cursor-pointer">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-[oklch(0.5_0.15_170)]/20 text-[oklch(0.5_0.15_170)] flex items-center justify-center font-bold">NK</div>
                    <div className="hidden md:block overflow-hidden flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[oklch(0.2_0.04_170)] truncate">Nalukenge Kate</span>
                        <span className="text-[10px] text-[oklch(0.5_0.15_170)] font-black">ACTIVE</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">WhatsApp Business</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg hover:bg-[oklch(0.98_0.01_170)] flex gap-2 items-center cursor-pointer transition-colors">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">OK</div>
                    <div className="hidden md:block overflow-hidden flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold truncate">Ochieng Kevin</span>
                        <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-1 rounded font-bold">BOT</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">Auto-replied 2m ago</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg hover:bg-[oklch(0.98_0.01_170)] flex gap-2 items-center cursor-pointer transition-colors">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">JM</div>
                    <div className="hidden md:block overflow-hidden flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold truncate">Jean Mugisha</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">Closed yesterday</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Column: Active Chat Feed Mock */}
              <div className="flex-1 flex flex-col bg-white">
                {/* Active chat header */}
                <div className="p-3 border-b border-[oklch(0.94_0.02_170)] bg-[oklch(0.98_0.01_170)]/30 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-[oklch(0.2_0.04_170)] block">Nalukenge Kate</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> WhatsApp Session • Assigned to AI Agent
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[oklch(0.5_0.15_170)]/10 border border-[oklch(0.5_0.15_170)]/20 text-[oklch(0.5_0.15_170)] font-bold text-[10px] uppercase">Retail</span>
                  </div>
                </div>

                {/* Animated Message History Feed */}
                <div 
                  ref={chatContainerRef} 
                  className="flex-1 p-4 overflow-y-auto space-y-3 bg-[oklch(0.98_0.01_170)]/10 transition-all duration-300"
                >
                  {visibleMessages.map((msg, index) => {
                    if (msg.sender === "typing") {
                      return (
                        <div key={index} className="flex gap-2.5 items-end max-w-[85%] animate-in fade-in duration-300">
                          <div className="h-6 w-6 rounded-full bg-[oklch(0.5_0.15_170)]/15 text-[oklch(0.5_0.15_170)] flex items-center justify-center text-[10px] font-bold">Bot</div>
                          <div className="bg-[oklch(0.98_0.01_170)] px-4 py-2.5 rounded-2xl rounded-bl-none border border-[oklch(0.94_0.02_170)] text-muted-foreground">
                            <div className="flex gap-1 items-center py-1">
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
                      <div 
                        key={index} 
                        className={cn("flex gap-2.5 items-end max-w-[85%] animate-in slide-in-from-bottom-2 duration-300", 
                          isBot ? "ml-auto flex-row-reverse" : "mr-auto")}
                      >
                        <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", 
                          isBot ? "bg-[oklch(0.5_0.15_170)] text-white" : "bg-[oklch(0.98_0.01_170)] text-muted-foreground")}
                        >
                          {isBot ? "Bot" : "User"}
                        </div>
                        <div className={cn(
                          "px-4 py-2.5 rounded-2xl text-xs md:text-sm shadow-sm leading-relaxed border transition-all duration-200",
                          isBot 
                            ? "bg-[oklch(0.5_0.15_170)] text-white border-[oklch(0.5_0.15_170)]/20 rounded-br-none" 
                            : "bg-white text-[oklch(0.2_0.04_170)] border-[oklch(0.94_0.02_170)] rounded-bl-none"
                        )}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Input box bottom mock */}
                <div className="p-3 border-t border-[oklch(0.94_0.02_170)] bg-white flex gap-2">
                  <div className="flex-1 bg-[oklch(0.98_0.01_170)]/50 border border-[oklch(0.94_0.02_170)] rounded-xl px-3 py-2 text-muted-foreground flex justify-between items-center text-[11px] md:text-xs">
                    <span className="font-medium">Message response auto-drafted by HopeChat AI agent...</span>
                    <Button size="icon" className="h-6 w-6 shrink-0 bg-[oklch(0.5_0.15_170)]/20 hover:bg-[oklch(0.5_0.15_170)]/30 text-[oklch(0.5_0.15_170)] rounded-lg border-0">
                      <Zap className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: CRM Sidebar Mock */}
              <div className="hidden lg:flex w-64 border-l border-[oklch(0.94_0.02_170)] flex-col bg-[oklch(0.98_0.01_170)]/50 p-4 space-y-4">
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground mb-2">Customer Profile</h4>
                  <div className="p-3 rounded-xl bg-white border border-[oklch(0.94_0.02_170)] space-y-1.5 shadow-sm shadow-black/[0.01]">
                    <span className="font-bold text-[oklch(0.2_0.04_170)] block">Nalukenge Kate</span>
                    <span className="text-xs text-muted-foreground block font-medium">Operations Manager, Kampala Retail</span>
                    <span className="text-[11px] text-[oklch(0.5_0.15_170)] font-semibold block">+256 700 123456</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground mb-2">Deal Pipeline</h4>
                  <div className="p-3 rounded-xl bg-white border border-[oklch(0.94_0.02_170)] space-y-2 shadow-sm shadow-black/[0.01]">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-muted-foreground">Stage:</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[10px]">Qualified</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-muted-foreground">Value:</span>
                      <span className="font-bold text-[oklch(0.2_0.04_170)]">4,500,000</span>
                    </div>
                    <div className="h-1.5 w-full bg-[oklch(0.98_0.01_170)] rounded-full overflow-hidden">
                      <div className="h-full bg-[oklch(0.5_0.15_170)] rounded-full w-1/3" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-white text-[oklch(0.2_0.04_170)] border border-[oklch(0.94_0.02_170)] text-[10px] font-bold shadow-sm shadow-black/[0.01]">Retail</span>
                    <span className="px-2 py-0.5 rounded-md bg-white text-[oklch(0.2_0.04_170)] border border-[oklch(0.94_0.02_170)] text-[10px] font-bold shadow-sm shadow-black/[0.01]">Lead</span>
                    <span className="px-2 py-0.5 rounded-md bg-[oklch(0.5_0.15_170)]/10 text-[oklch(0.5_0.15_170)] border border-[oklch(0.5_0.15_170)]/20 text-[10px] font-bold">Kampala</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trusted By / Enterprise Brands */}
            <div className="pt-8 space-y-6 animate-in fade-in duration-750 delay-500">
              <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-muted-foreground">Trusted by forward-thinking teams across East Africa</p>
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-40 hover:opacity-70 transition-opacity duration-500 grayscale hover:grayscale-0 select-none">
                {["MTN", "AIRTEL", "SAFARICOM", "JUMIA", "NOKIA"].map((brand) => (
                  <span key={brand} className="text-lg md:text-xl font-black tracking-widest text-[oklch(0.2_0.04_170)] hover:text-[oklch(0.5_0.15_170)] transition-colors duration-300 cursor-default">{brand}</span>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* Feature Capabilities Grid (Sage Backdrop) */}
        <section id="features" className="py-20 lg:py-28 border-t border-[oklch(0.94_0.02_170)] bg-[oklch(0.98_0.01_170)] relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[oklch(0.2_0.04_170)]">Everything You Need to Scale Customer Communication</h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                Everything you need to manage customer conversations, automate replies, and grow sales—all inside WhatsApp.
              </p>
            </div>

            {/* Staggered white boxes with border border-black/[0.04] and gentle shadows */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
              {[
                {
                  icon: Globe,
                  title: "WhatsApp Shared Inbox",
                  desc: "All WhatsApp conversations in one real-time panel. Route tickets to team members, add internal notes, manage contact tags, and track conversation status from open to resolved."
                },
                {
                  icon: Cpu,
                  title: "AI-Powered Auto-Replies",
                  desc: "HopeChat AI responds to customers 24/7 using your business documents. Automatic escalation to human agents when needed."
                },
                {
                  icon: KanbanSquare,
                  title: "Visual Sales Pipeline",
                  desc: "Drag-and-drop pipeline boards linked to WhatsApp chats. Track deals from first enquiry to close with analytics and conversion metrics."
                },
                {
                  icon: Zap,
                  title: "No-Code Automation Builder",
                  desc: "Build visual workflows with 16 step types: auto-replies, keyword triggers, time delays, webhooks, Google Sheets lookups, and interactive WhatsApp Flow forms."
                },
                {
                  icon: Lock,
                  title: "Your Data, Your Control",
                  desc: "Your customer conversations stay on your own private infrastructure. No third-party servers, no data sharing—complete privacy by default."
                },
                {
                  icon: Shield,
                  title: "Enterprise Privacy",
                  desc: "Every message and token is encrypted. Your data is isolated from other accounts with strict access controls. Built for businesses that take privacy seriously."
                }
              ].map((item, index) => (
                <FadeIn key={index} delay={index * 100}>
                  <div className="group p-6 rounded-2xl bg-white border border-black/[0.04] shadow-sm hover:shadow-xl hover:shadow-[oklch(0.5_0.15_170)]/10 hover:border-[oklch(0.5_0.15_170)]/40 transition-all duration-500 hover:-translate-y-2 flex flex-col justify-between h-full">
                    <div className="space-y-4">
                      <div className="h-12 w-12 rounded-xl bg-[oklch(0.5_0.15_170)]/5 text-[oklch(0.5_0.15_170)] flex items-center justify-center group-hover:bg-[oklch(0.5_0.15_170)] group-hover:text-white group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-md">
                        <item.icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-lg font-bold text-[oklch(0.2_0.04_170)] tracking-tight group-hover:text-[oklch(0.5_0.15_170)] transition-colors duration-300">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section (Bright, Staggered, 3-Tier Grid) */}
        <section id="pricing" className="py-20 lg:py-28 bg-white relative">
          {/* Subtle Mint background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[oklch(0.88_0.1_165)]/20 rounded-full blur-[130px] -z-10 pointer-events-none animate-pulse-glow" />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="px-2.5 py-1 rounded-md bg-[oklch(0.5_0.15_170)]/10 border border-[oklch(0.5_0.15_170)]/20 text-[oklch(0.5_0.15_170)] font-bold text-xs uppercase tracking-wider">Simple Pricing</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[oklch(0.2_0.04_170)]">Simple, Transparent Pricing</h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                Choose the best fit for your team size. Simple, transparent pricing with no hidden fees.
              </p>
            </div>

            {/* 3-Tier Responsive Grid */}
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
              
              {/* Bronze Plan Card */}
              <FadeIn delay={0}>
                <div className="bg-white border border-[oklch(0.94_0.02_170)] rounded-2xl p-8 flex flex-col justify-between h-full shadow-sm hover:shadow-xl hover:shadow-[oklch(0.5_0.15_170)]/10 hover:border-[oklch(0.5_0.15_170)]/30 hover:-translate-y-2 transition-all duration-500 group">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-[oklch(0.2_0.04_170)] tracking-tight group-hover:text-[oklch(0.5_0.15_170)] transition-colors duration-300">BRONZE</h3>
                      <p className="text-xs text-muted-foreground font-semibold mt-1">Perfect for solo founders and startup testing</p>
                    </div>
                    <div className="py-2 border-y border-[oklch(0.94_0.02_170)]">
                      <span className="text-3xl font-extrabold text-[oklch(0.2_0.04_170)]">65,000</span>
                      <span className="text-xs text-muted-foreground font-bold"> / month</span>
                    </div>
                    <ul className="space-y-3 text-xs md:text-sm font-semibold">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span>1,500 Base Monthly Credits</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span>1 Max Team Seat (Agent)</span>
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground/60 line-through">
                        <X className="h-4 w-4 text-red-400 shrink-0" />
                        <span>Bulk Broadcast Campaigns</span>
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground/60 line-through">
                        <X className="h-4 w-4 text-red-400 shrink-0" />
                        <span>Interactive Visual Flows</span>
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground/60 line-through">
                        <X className="h-4 w-4 text-red-400 shrink-0" />
                        <span>Multimodal Processing</span>
                      </li>
                    </ul>
                  </div>
                  <div className="pt-8">
                    <Link 
                      href="/signup" 
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full h-11 border-[oklch(0.94_0.02_170)] hover:bg-[oklch(0.98_0.01_170)] text-[oklch(0.2_0.04_170)] font-bold rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center"
                      )}
                    >
                      Start Bronze Plan
                    </Link>
                  </div>
                </div>
              </FadeIn>

              {/* Silver Plan Card (Most Popular, highlighted in emerald teal border and mint badge) */}
              <FadeIn delay={100}>
                <div className="bg-white border-2 border-[oklch(0.5_0.15_170)] rounded-2xl p-8 flex flex-col justify-between h-full shadow-lg shadow-[oklch(0.5_0.15_170)]/15 relative scale-[1.02] hover:shadow-2xl hover:shadow-[oklch(0.5_0.15_170)]/25 hover:scale-[1.04] transition-all duration-500 group">
                  <div className="absolute top-0 right-8 -translate-y-1/2 rounded-full bg-[oklch(0.5_0.15_170)] border border-[oklch(0.5_0.15_170)]/30 px-3 py-1 text-[10px] font-black tracking-wider text-white uppercase shadow-lg shadow-[oklch(0.5_0.15_170)]/20 animate-pulse-glow">
                    MOST POPULAR
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-[oklch(0.5_0.15_170)] tracking-tight">SILVER</h3>
                      <p className="text-xs text-muted-foreground font-semibold mt-1">Great for growing customer support teams</p>
                    </div>
                    <div className="py-2 border-y border-[oklch(0.94_0.02_170)]">
                      <span className="text-3xl font-extrabold text-[oklch(0.2_0.04_170)]">180,000</span>
                      <span className="text-xs text-muted-foreground font-bold"> / month</span>
                    </div>
                    <ul className="space-y-3 text-xs md:text-sm font-semibold">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span>5,000 Base Monthly Credits</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span>3 Max Team Seats (Agents)</span>
                      </li>
                      <li className="flex items-center gap-2 text-[oklch(0.2_0.04_170)]">
                        <Check className="h-4 w-4 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span className="font-bold">Bulk Broadcast Campaigns</span>
                      </li>
                      <li className="flex items-center gap-2 text-[oklch(0.2_0.04_170)]">
                        <Check className="h-4 w-4 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span className="font-bold">Interactive Visual Flows</span>
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground/60 line-through">
                        <X className="h-4 w-4 text-red-400 shrink-0" />
                        <span>Multimodal Processing</span>
                      </li>
                    </ul>
                  </div>
                  <div className="pt-8">
                    <Link 
                      href="/signup" 
                      className={cn(
                        buttonVariants(),
                        "w-full h-11 bg-[oklch(0.5_0.15_170)] hover:bg-[oklch(0.5_0.15_170)]/90 text-white font-bold rounded-xl active:scale-[0.98] transition-transform shadow-md border-0 flex items-center justify-center"
                      )}
                    >
                      Start Silver Plan
                    </Link>
                  </div>
                </div>
              </FadeIn>

              {/* Gold Plan Card */}
              <FadeIn delay={200}>
                <div className="bg-white border border-[oklch(0.94_0.02_170)] rounded-2xl p-8 flex flex-col justify-between h-full shadow-sm hover:shadow-xl hover:shadow-[oklch(0.5_0.15_170)]/10 hover:border-[oklch(0.5_0.15_170)]/30 hover:-translate-y-2 transition-all duration-500 group">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-[oklch(0.2_0.04_170)] tracking-tight group-hover:text-[oklch(0.5_0.15_170)] transition-colors duration-300">GOLD</h3>
                      <p className="text-xs text-muted-foreground font-semibold mt-1">For power users running full automation at scale</p>
                    </div>
                    <div className="py-2 border-y border-[oklch(0.94_0.02_170)]">
                      <span className="text-3xl font-extrabold text-[oklch(0.2_0.04_170)]">450,000</span>
                      <span className="text-xs text-muted-foreground font-bold"> / month</span>
                    </div>
                    <ul className="space-y-3 text-xs md:text-sm font-semibold">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span>9,999,999 Base Monthly Credits</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span>10 Max Team Seats (Agents)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span>Bulk Broadcast Campaigns</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span>Interactive Visual Flows</span>
                      </li>
                      <li className="flex items-center gap-2 text-[oklch(0.5_0.15_170)] font-extrabold">
                        <Check className="h-4 w-4 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span>Multimodal Support (Image/Voice)</span>
                      </li>
                    </ul>
                  </div>
                  <div className="pt-8">
                    <Link 
                      href="/signup" 
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full h-11 border-[oklch(0.94_0.02_170)] hover:bg-[oklch(0.98_0.01_170)] text-[oklch(0.2_0.04_170)] font-bold rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center"
                      )}
                    >
                      Start Gold Plan
                    </Link>
                  </div>
                </div>
              </FadeIn>

            </div>
          </div>
        </section>

        {/* Deep-Dive Product Scenarios (Alternating Sage Section) */}
        <section className="py-20 lg:py-28 bg-[oklch(0.98_0.01_170)] border-y border-[oklch(0.94_0.02_170)] space-y-24 md:space-y-36 relative">
          {/* Subtle glow pops */}
          <div className="absolute top-1/4 left-10 w-[300px] h-[300px] bg-[oklch(0.88_0.1_165)]/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-10 w-[300px] h-[300px] bg-[oklch(0.5_0.15_170)]/5 rounded-full blur-[80px] pointer-events-none" />
          
          {/* Scenario 1 */}
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                <div className="flex-1 space-y-6 max-w-xl text-left">
                  <span className="px-2.5 py-1 rounded-md bg-[oklch(0.88_0.1_165)] border border-[oklch(0.5_0.15_170)]/10 text-[oklch(0.2_0.04_170)] font-bold text-xs uppercase tracking-wider">AI AUTOMATION</span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-[oklch(0.2_0.04_170)]">Train Your AI Agent on Your Business Documents</h2>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                    Upload your product catalogues, FAQs, and brand guidelines. HopeChat AI learns your business and responds to customers 24/7.
                  </p>
                  <ul className="space-y-3 text-sm sm:text-base font-semibold text-foreground">
                    {["AI responds 24/7 using your business documents", "Automatic escalation when customers need a human agent", "Knowledge base with expiry dates and active/inactive toggles"].map((li, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 w-full max-w-xl aspect-square md:aspect-[4/3] rounded-2xl bg-white border border-[oklch(0.94_0.02_170)] shadow-md flex items-center justify-center p-6 relative hover:shadow-xl hover:shadow-[oklch(0.5_0.15_170)]/10 hover:border-[oklch(0.5_0.15_170)]/30 transition-all duration-500">
                  <div className="w-full bg-[oklch(0.98_0.01_170)]/45 border border-[oklch(0.94_0.02_170)] rounded-xl p-4 space-y-4">
                    <div className="flex justify-between items-center border-b border-[oklch(0.94_0.02_170)] pb-2">
                      <span className="font-bold text-[oklch(0.2_0.04_170)] flex items-center gap-1.5"><Cpu className="h-4 w-4 text-[oklch(0.5_0.15_170)]" /> Knowledge Base</span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-[oklch(0.88_0.1_165)] border border-[oklch(0.5_0.15_170)]/15 px-2 py-0.5 rounded-full animate-pulse-glow">Synchronized</span>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { name: "product-catalogue.pdf", size: "2.4 MB", status: "Active" },
                        { name: "faq-english-luganda.md", size: "18.2 KB", status: "Active" },
                        { name: "pricing-ugx.json", size: "3.8 KB", status: "Active" }
                      ].map((file, i) => (
                        <div key={i} className="flex justify-between items-center p-2.5 rounded-lg border border-[oklch(0.94_0.02_170)] bg-white">
                          <span className="font-semibold text-xs md:text-sm text-[oklch(0.2_0.04_170)] truncate max-w-[60%]">{file.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{file.size}</span>
                            <span className="text-[10px] text-[oklch(0.5_0.15_170)] font-bold">{file.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex justify-between items-center text-xs text-muted-foreground border-t border-[oklch(0.94_0.02_170)]">
                      <span>1,248 knowledge segments active</span>
                      <Button variant="ghost" className="h-7 text-xs text-[oklch(0.5_0.15_170)] font-bold px-2.5">Sync Source +</Button>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Scenario 2 */}
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-16">
                <div className="flex-1 space-y-6 max-w-xl text-left">
                  <span className="px-2.5 py-1 rounded-md bg-[oklch(0.88_0.1_165)] border border-[oklch(0.5_0.15_170)]/10 text-[oklch(0.2_0.04_170)] font-bold text-xs uppercase tracking-wider">TEAM WORKSPACE</span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-[oklch(0.2_0.04_170)]">Unified Collaboration with Multi-Agent Assignment</h2>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                    Assign conversations to team members, track workload, and manage handoffs between AI and human agents. Perfect for growing support teams in Kampala and beyond.
                  </p>
                  <ul className="space-y-3 text-sm sm:text-base font-semibold text-foreground">
                    {["Auto-routing based on tags and keywords", "Internal notes hidden from customers", "Real-time workload and response time tracking"].map((li, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 w-full max-w-xl aspect-square md:aspect-[4/3] rounded-2xl bg-white border border-[oklch(0.94_0.02_170)] shadow-md flex items-center justify-center p-6 relative hover:shadow-xl hover:shadow-[oklch(0.5_0.15_170)]/10 hover:border-[oklch(0.5_0.15_170)]/30 transition-all duration-500">
                  <div className="w-full bg-[oklch(0.98_0.01_170)]/45 border border-[oklch(0.94_0.02_170)] rounded-xl p-4 space-y-4">
                    <div className="flex justify-between items-center border-b border-[oklch(0.94_0.02_170)] pb-2">
                      <span className="font-bold text-[oklch(0.2_0.04_170)] flex items-center gap-1.5"><Users className="h-4 w-4 text-[oklch(0.5_0.15_170)]" /> Active Agents</span>
                      <span className="text-[10px] text-[oklch(0.5_0.15_170)] font-bold bg-[oklch(0.88_0.1_165)] border border-[oklch(0.5_0.15_170)]/15 px-2 py-0.5 rounded-full">4 Online</span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { name: "Akello Sarah", role: "Sales Rep", chats: 8, status: "Active" },
                        { name: "Mugisha David", role: "Support Lead", chats: 12, status: "Active" },
                        { name: "HopeChat AI", role: "Virtual Agent", chats: 45, status: "Active" }
                      ].map((agent, i) => (
                        <div key={i} className="flex justify-between items-center p-2.5 rounded-lg border border-[oklch(0.94_0.02_170)] bg-white">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-[oklch(0.5_0.15_170)]/15 text-[oklch(0.5_0.15_170)] flex items-center justify-center text-xs font-bold">{agent.name[0]}</div>
                            <div>
                              <span className="font-bold text-xs text-[oklch(0.2_0.04_170)] block">{agent.name}</span>
                              <span className="text-[10px] text-muted-foreground block font-medium">{agent.role}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-[oklch(0.2_0.04_170)] block">{agent.chats} active</span>
                            <span className="text-[9px] text-emerald-600 font-bold block">{agent.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Scenario 3 */}
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                <div className="flex-1 space-y-6 max-w-xl text-left">
                  <span className="px-2.5 py-1 rounded-md bg-[oklch(0.88_0.1_165)] border border-[oklch(0.5_0.15_170)]/10 text-[oklch(0.2_0.04_170)] font-bold text-xs uppercase tracking-wider">SALES CONVERSIONS</span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-[oklch(0.2_0.04_170)]">Visual Pipeline Management</h2>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                    Track deal values and monitor your pipeline. Connect WhatsApp chats to deal cards, move them between stages, and watch conversion metrics grow.
                  </p>
                  <ul className="space-y-3 text-sm sm:text-base font-semibold text-foreground">
                    {["Link WhatsApp contacts to pipeline deals", "Drag-and-drop deal stages with custom values", "Full deal history logged within conversation archives"].map((li, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 w-full max-w-xl aspect-square md:aspect-[4/3] rounded-2xl bg-white border border-[oklch(0.94_0.02_170)] shadow-md flex items-center justify-center p-4 relative hover:shadow-xl hover:shadow-[oklch(0.5_0.15_170)]/10 hover:border-[oklch(0.5_0.15_170)]/30 transition-all duration-500">
                  <div className="w-full h-full flex gap-3 overflow-x-auto text-[11px] sm:text-xs">
                    {[
                      { title: "New Lead", count: 2, cards: [{ title: "Nalukenge Kate", company: "Kampala Retail", value: "4.5M" }] },
                      { title: "Qualified", count: 1, cards: [{ title: "Ochieng Kevin", company: "Entebbe Logistics", value: "2.8M" }] },
                      { title: "Proposal Sent", count: 1, cards: [{ title: "Jean Mugisha", company: "Kigali Exports", value: "7.2M" }] }
                    ].map((column, i) => (
                      <div key={i} className="flex-1 min-w-[130px] bg-[oklch(0.98_0.01_170)]/40 border border-[oklch(0.94_0.02_170)] rounded-xl p-2.5 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-[oklch(0.2_0.04_170)] block truncate">{column.title}</span>
                            <span className="text-[10px] text-muted-foreground bg-white px-1.5 py-0.5 rounded border border-[oklch(0.94_0.02_170)]">{column.count}</span>
                          </div>
                          <div className="space-y-2">
                            {column.cards.map((card, j) => (
                              <div key={j} className="p-2 bg-white border border-[oklch(0.94_0.02_170)] rounded-lg shadow-sm space-y-1.5">
                                <span className="font-bold text-[oklch(0.2_0.04_170)] block truncate">{card.title}</span>
                                <span className="text-[10px] text-muted-foreground block truncate">{card.company}</span>
                                <span className="text-xs font-extrabold text-[oklch(0.5_0.15_170)] block">{card.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="pt-2 text-center text-muted-foreground border-t border-[oklch(0.94_0.02_170)] mt-4">
                          <span>+ New Deal</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ROI metrics banner (Bright white surfaces with moss borders) */}
        <section id="roi" className="py-20 lg:py-28 bg-white">
          <div className="container mx-auto px-4 text-center space-y-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto text-[oklch(0.2_0.04_170)]">
              Real Efficiencies. Fully Measured.
            </h2>
            <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { label: "Cost Savings", value: "85%", desc: "Less overhead compared to traditional per-seat customer service platforms." },
                { label: "Faster Replies", value: "60%", desc: "Average decrease in support tickets handled by AI before they reach your team." },
                { label: "More Sales", value: "24%", desc: "Increase in lead-to-deal conversion rates with WhatsApp pipeline routing." }
              ].map((metric, index) => (
                <FadeIn key={index} delay={index * 150}>
                  <div className="p-8 rounded-2xl bg-white border border-[oklch(0.94_0.02_170)] shadow-sm flex flex-col justify-between text-left space-y-4 hover:border-[oklch(0.5_0.15_170)]/40 hover:shadow-xl hover:shadow-[oklch(0.5_0.15_170)]/10 hover:-translate-y-2 transition-all duration-500 h-full group">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground group-hover:text-[oklch(0.5_0.15_170)] transition-colors duration-300">{metric.label}</span>
                    <div className="text-5xl font-extrabold text-[oklch(0.5_0.15_170)] tracking-tight group-hover:scale-105 transition-transform duration-300 origin-left">{metric.value}</div>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">{metric.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Industry Solutions with state-driven tabs (Sage Section) */}
        <section id="solutions" className="py-20 lg:py-28 bg-[oklch(0.98_0.01_170)] border-y border-[oklch(0.94_0.02_170)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <h2 className="text-3xl font-extrabold tracking-tight text-[oklch(0.2_0.04_170)]">Built for East African Businesses</h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                Whether you run a Kampala retail shop or a Nairobi fintech, HopeChat has tailored WhatsApp workflows for your industry.
              </p>
            </div>

            {/* Dynamic Pill Selector Grid */}
            <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
              {[
                { id: "retail", label: "Retail & E-commerce" },
                { id: "finance", label: "Financial Services" },
                { id: "gaming", label: "Gaming & Betting" },
                { id: "edu", label: "Education" },
                { id: "enterprise", label: "Enterprise" }
              ].map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => setActiveIndustry(ind.id)}
                  className={cn(
                    "px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold border transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]",
                    activeIndustry === ind.id 
                      ? "bg-[oklch(0.5_0.15_170)] text-white border-[oklch(0.5_0.15_170)] shadow-lg shadow-[oklch(0.5_0.15_170)]/20" 
                      : "bg-white text-muted-foreground border-[oklch(0.94_0.02_170)] hover:bg-[oklch(0.98_0.01_170)] hover:border-[oklch(0.5_0.15_170)]/30 hover:shadow-md"
                  )}
                >
                  {ind.label}
                </button>
              ))}
            </div>

            {/* Detailed industry response preview wrapped in elevated white card */}
            <FadeIn>
              <div className="max-w-4xl mx-auto p-6 md:p-8 rounded-2xl bg-white border border-[oklch(0.94_0.02_170)] shadow-sm hover:shadow-lg transition-shadow duration-500 animate-fade-in-scale" key={activeIndustry}>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-6 text-left">
                    <h3 className="text-xl md:text-2xl font-bold capitalize text-[oklch(0.2_0.04_170)]">{activeIndustry.replace('-', ' ')} in East Africa</h3>
                    
                    {activeIndustry === "retail" && (
                      <div className="space-y-4">
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Recover sales and drive conversions via WhatsApp, the most-used channel in Uganda:</p>
                        <div className="space-y-3 text-xs md:text-sm font-medium">
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Automate order confirmations and delivery updates via WhatsApp.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Send abandoned cart reminders with Mobile Money payment links.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Integrate with Google Sheets for inventory and order tracking.</span></div>
                        </div>
                      </div>
                    )}

                    {activeIndustry === "finance" && (
                      <div className="space-y-4">
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Secure WhatsApp support for fintechs, SACCOs, and mobile money operators:</p>
                        <div className="space-y-3 text-xs md:text-sm font-medium">
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Your own private infrastructure for BOU/CKU compliance requirements.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>End-to-end encryption for all transaction messages.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Automated KYC document collection via WhatsApp flows.</span></div>
                        </div>
                      </div>
                    )}

                    {activeIndustry === "gaming" && (
                      <div className="space-y-4">
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Support sports betting and gaming platforms 24/7 via WhatsApp:</p>
                        <div className="space-y-3 text-xs md:text-sm font-medium">
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>AI handles 70%+ of account and balance inquiries automatically.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Send match results, odds updates, and promotional broadcasts.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Link game webhooks to WhatsApp for real-time notifications.</span></div>
                        </div>
                      </div>
                    )}

                    {activeIndustry === "edu" && (
                      <div className="space-y-4">
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Automate school communications and parent updates via WhatsApp:</p>
                        <div className="space-y-3 text-xs md:text-sm font-medium">
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Auto-reply to fee payment enquiries and registration FAQs.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Broadcast exam schedules, report cards, and event reminders.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Safe parent communication channels with AI-powered routing.</span></div>
                        </div>
                      </div>
                    )}

                    {activeIndustry === "enterprise" && (
                      <div className="space-y-4">
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Multi-branch enterprise deployments across East Africa:</p>
                        <div className="space-y-3 text-xs md:text-sm font-medium">
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Multi-agent workspaces with role-based access control.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Separate conversation partitions for Kampala, Nairobi, Dar branches.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>High-throughput WhatsApp API with payment integration.</span></div>
                        </div>
                      </div>
                    )}

                  </div>

                  <div className="h-48 md:h-64 rounded-xl bg-gradient-to-br from-[oklch(0.5_0.15_170)]/10 to-[oklch(0.88_0.1_165)]/20 border border-[oklch(0.5_0.15_170)]/20 flex flex-col items-center justify-center p-6 text-center space-y-2 hover:from-[oklch(0.5_0.15_170)]/15 hover:to-[oklch(0.88_0.1_165)]/25 transition-all duration-500">
                    <div className="text-4xl md:text-5xl font-black text-[oklch(0.5_0.15_170)] tracking-tight animate-fade-in-scale">
                      {activeIndustry === "retail" && "45%"}
                      {activeIndustry === "finance" && "0"}
                      {activeIndustry === "gaming" && "70%"}
                      {activeIndustry === "edu" && "3.5x"}
                      {activeIndustry === "enterprise" && "100%"}
                    </div>
                    <div className="text-[10px] md:text-xs font-extrabold text-muted-foreground uppercase tracking-widest leading-relaxed">
                      {activeIndustry === "retail" && "Order Recovery via WhatsApp"}
                      {activeIndustry === "finance" && "Compliance Breach Incidents"}
                      {activeIndustry === "gaming" && "AI Resolution Rate"}
                      {activeIndustry === "edu" && "Parent Response Speed"}
                      {activeIndustry === "enterprise" && "Data Sovereignty Compliance"}
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Enterprise Security Section */}
        <section id="security" className="py-20 lg:py-28 bg-white border-b border-[oklch(0.94_0.02_170)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
            <h2 className="text-3xl font-extrabold tracking-tight text-[oklch(0.2_0.04_170)]">Your Data Stays Yours. Always.</h2>
            <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
              {[
                {
                  icon: Lock,
                  title: "Private by Design",
                  desc: "Your data stays on your own infrastructure. No third-party servers access your customer conversations or business information."
                },
                {
                  icon: Shield,
                  title: "Account Isolation",
                  desc: "Every business account is fully isolated. Your conversations, contacts, and deals are visible only to your team."
                },
                {
                  icon: Key,
                  title: "Encrypted Everywhere",
                  desc: "All messages, tokens, and sensitive data are encrypted automatically. Built for businesses that handle sensitive customer information."
                }
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="p-6 rounded-2xl bg-white border border-black/[0.04] space-y-4 hover:border-[oklch(0.5_0.15_170)]/40 hover:shadow-xl hover:shadow-[oklch(0.5_0.15_170)]/10 hover:-translate-y-2 transition-all duration-500 h-full shadow-sm group">
                    <div className="h-12 w-12 rounded-xl bg-[oklch(0.5_0.15_170)]/5 text-[oklch(0.5_0.15_170)] flex items-center justify-center group-hover:bg-[oklch(0.5_0.15_170)] group-hover:text-white group-hover:scale-110 transition-all duration-500">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-[oklch(0.2_0.04_170)] tracking-tight group-hover:text-[oklch(0.5_0.15_170)] transition-colors duration-300">{item.title}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section id="faq" className="py-20 lg:py-28 bg-[oklch(0.98_0.01_170)]">
          <div className="container mx-auto px-4 max-w-3xl text-center space-y-16">
            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-[oklch(0.2_0.04_170)]">Frequently Asked Questions</h2>
              <p className="text-base text-muted-foreground font-medium">Common questions about HopeChat for East African businesses.</p>
            </div>

            <div className="text-left space-y-4">
              {[
                { 
                  q: "How does HopeChat differ from Intercom or Zendesk?", 
                  a: "Traditional platforms charge per team member and store your data on their servers. HopeChat gives you a WhatsApp-native CRM where you control your own data, pay a flat rate, and get AI-powered automation built for East African businesses." 
                },
                { 
                  q: "How fast can I get started?", 
                  a: "Sign up and you can be chatting with customers within minutes. We handle the WhatsApp Business API setup and infrastructure—you just invite your team and start replying." 
                },
                { 
                  q: "Can I train the AI on my own business documents?", 
                  a: "Yes. Upload your product catalogues, price lists, and FAQs and HopeChat AI learns your business. It answers customer questions based on what you teach it and escalates when it doesn't know the answer." 
                },
                { 
                  q: "How do payments work?", 
                  a: "HopeChat uses a simple credit-based system. You top up your account and usage is deducted automatically. No long-term contracts or surprise bills." 
                }
              ].map((faq, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="rounded-xl border border-[oklch(0.94_0.02_170)] bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-[oklch(0.5_0.15_170)]/30 transition-all duration-300">
                    <button 
                      onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                      className="w-full px-6 py-4 flex justify-between items-center text-left font-bold text-[oklch(0.2_0.04_170)] text-sm sm:text-base hover:bg-[oklch(0.98_0.01_170)] transition-colors duration-200"
                    >
                      <span className="pr-4">{faq.q}</span>
                      <ChevronRight className={cn("h-5 w-5 shrink-0 transition-transform duration-300 text-muted-foreground group-hover:text-[oklch(0.5_0.15_170)]", activeFaq === i && "rotate-90 text-[oklch(0.5_0.15_170)]")} />
                    </button>
                    <div 
                      className="faq-content" 
                      data-open={activeFaq === i}
                    >
                      <div>
                        <div className="px-6 pb-4 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-[oklch(0.94_0.02_170)] font-medium bg-white">
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

        {/* Clean, Bright Call to Action Banner (Full Light Theme overlay) */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4">
            <FadeIn>
              <div className="rounded-3xl bg-gradient-to-br from-[oklch(0.5_0.15_170)]/10 via-[oklch(0.88_0.1_165)]/10 to-transparent border border-[oklch(0.5_0.15_170)]/20 p-8 md:p-16 lg:p-20 text-center text-[oklch(0.2_0.04_170)] overflow-hidden relative shadow-md hover:shadow-xl hover:shadow-[oklch(0.5_0.15_170)]/10 transition-shadow duration-500 animate-gradient">
                {/* Blur backdrop bubbles */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-80 h-80 bg-[oklch(0.88_0.1_165)]/20 rounded-full blur-3xl pointer-events-none animate-float" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-80 h-80 bg-[oklch(0.5_0.15_170)]/15 rounded-full blur-3xl pointer-events-none animate-float-delayed" />
                
                <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
                  <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-[oklch(0.2_0.04_170)]">Ready to Own Your WhatsApp CRM?</h2>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
                    Get HopeChat in minutes. Start managing customer conversations, deals, and AI agents—all inside WhatsApp.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Link 
                      href="/signup" 
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "w-full sm:w-auto bg-[oklch(0.5_0.15_170)] hover:bg-[oklch(0.5_0.15_170)]/90 text-white h-12 px-8 text-base font-bold rounded-xl active:scale-[0.98] transition-all duration-300 shadow-lg shadow-[oklch(0.5_0.15_170)]/20 hover:shadow-xl hover:shadow-[oklch(0.5_0.15_170)]/30 hover:scale-[1.03] border-0 flex items-center justify-center group"
                      )}
                    >
                      Get Started Free
                      <ArrowRight className="ml-2 h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                    <Link 
                      href="/login" 
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "text-sm font-bold text-muted-foreground hover:text-[oklch(0.2_0.04_170)] transition-colors duration-300 py-2 px-4 hover:bg-[oklch(0.98_0.01_170)]"
                      )}
                    >
                      Contact Support Team
                    </Link>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[oklch(0.94_0.02_170)] pt-16 pb-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[oklch(0.5_0.15_170)]">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold tracking-tight text-[oklch(0.2_0.04_170)]">HopeChat</span>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                The WhatsApp CRM and AI platform built for East African businesses. Private, secure, and designed to help you grow.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[oklch(0.2_0.04_170)] mb-4">Product</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#features" className="hover:text-primary transition-colors">WhatsApp Inbox</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">AI Auto-Replies</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">Sales Pipeline</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">No-Code Automations</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[oklch(0.2_0.04_170)] mb-4">Solutions</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><button onClick={() => setActiveIndustry("retail")} className="hover:text-primary transition-colors text-left">E-commerce</button></li>
                <li><button onClick={() => setActiveIndustry("finance")} className="hover:text-primary transition-colors text-left">Fintech & SACCOs</button></li>
                <li><button onClick={() => setActiveIndustry("gaming")} className="hover:text-primary transition-colors text-left">Gaming & Betting</button></li>
                <li><button onClick={() => setActiveIndustry("enterprise")} className="hover:text-primary transition-colors text-left">Enterprise</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[oklch(0.2_0.04_170)] mb-4">Resources</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#" className="hover:text-primary transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">API Reference</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Contact Support</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[oklch(0.94_0.02_170)] flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            <p>© {new Date().getFullYear()} HopeChat by HopeTech Solutions Ltd. Uganda.</p>
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
