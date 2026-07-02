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
  { sender: "customer", text: "Hey! We want to migrate our sales team from Intercom. Does HopeChat support self-hosting on AWS?" },
  { sender: "typing", text: "" },
  { sender: "bot", text: "Absolutely! HopeChat is fully open-source and optimized for self-hosting. You can deploy it with one-click on AWS, Hostinger, or your private servers, ensuring complete data ownership and zero per-seat licensing fees." },
  { sender: "customer", text: "That sounds amazing. What LLM models are supported for the automated AI agents?" },
  { sender: "typing", text: "" },
  { sender: "bot", text: "We natively integrate with OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, and Amazon Bedrock. You can easily train agents on your own support files or sync with your existing internal documentation." },
  { sender: "customer", text: "Perfect. We have a visual sales pipeline setup. Can we link deals to WhatsApp chats?" },
  { sender: "typing", text: "" },
  { sender: "bot", text: "Yes! HopeChat features a built-in Kanban pipeline where deal cards are linked directly to live chat histories, making it seamless to track conversions and hand over to human reps." }
];

// Reusable IntersectionObserver-based FadeIn component for smooth, staggering scroll animations
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
      { threshold: 0.05 }
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
        "transition-all duration-700 ease-out transform",
        isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [activeIndustry, setActiveIndustry] = useState("retail");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Chat simulator states
  const [visibleMessages, setVisibleMessages] = useState<Array<{ sender: string; text: string }>>([MOCK_MESSAGES[0]]);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scoped Auto scroll within the chat container only (fixes window jumping bug)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [visibleMessages]);

  // Chat simulation effect loop
  useEffect(() => {
    const runChatSimulation = async () => {
      let step = currentStep;
      while (true) {
        // Step 1: Wait for 3 seconds, then show typing indicator
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const nextTypingIndex = (step + 1) % MOCK_MESSAGES.length;
        
        setVisibleMessages((prev) => [...prev, MOCK_MESSAGES[nextTypingIndex]]);
        
        // Step 2: Wait 1.5 seconds for typing, then replace typing with bot text
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const nextMessageIndex = (nextTypingIndex + 1) % MOCK_MESSAGES.length;
        
        setVisibleMessages((prev) => {
          const list = [...prev];
          list[list.length - 1] = MOCK_MESSAGES[nextMessageIndex];
          return list;
        });

        step = (nextMessageIndex) % MOCK_MESSAGES.length;
        setCurrentStep(step);

        // Reset if we reached the end of MOCK_MESSAGES to prevent memory growth
        if (visibleMessages.length > 8) {
          setVisibleMessages([MOCK_MESSAGES[0]]);
          setCurrentStep(0);
          step = 0;
        }
      }
    };

    runChatSimulation();
  }, [currentStep, visibleMessages.length]);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[oklch(0.2_0.04_170)] selection:bg-[oklch(0.5_0.15_170)]/30 antialiased font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[oklch(0.94_0.02_170)] bg-white/90 backdrop-blur-md transition-all duration-300">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[oklch(0.5_0.15_170)] shadow-md shadow-[oklch(0.5_0.15_170)]/20 transition-all duration-300 group-hover:scale-105">
                <MessageSquare className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-[oklch(0.2_0.04_170)] bg-clip-text">HopeChat</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted-foreground">
              <Link href="#features" className="hover:text-[oklch(0.2_0.04_170)] transition-colors duration-200">Features</Link>
              <Link href="#pricing" className="hover:text-[oklch(0.2_0.04_170)] transition-colors duration-200">Pricing</Link>
              <Link href="#solutions" className="hover:text-[oklch(0.2_0.04_170)] transition-colors duration-200">Solutions</Link>
              <Link href="#roi" className="hover:text-[oklch(0.2_0.04_170)] transition-colors duration-200">ROI</Link>
              <Link href="#security" className="hover:text-[oklch(0.2_0.04_170)] transition-colors duration-200">Security</Link>
              <Link href="#faq" className="hover:text-[oklch(0.2_0.04_170)] transition-colors duration-200">FAQ</Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "text-sm font-bold text-muted-foreground hover:text-[oklch(0.2_0.04_170)] h-9 px-4 hidden sm:inline-flex"
              )}
            >
              Log In
            </Link>
            <Link 
              href="/signup" 
              className={cn(
                buttonVariants(),
                "bg-[oklch(0.5_0.15_170)] hover:bg-[oklch(0.5_0.15_170)]/90 text-white font-bold px-5 h-9 text-xs sm:text-sm shadow-md shadow-[oklch(0.5_0.15_170)]/15 transition-transform hover:scale-[1.02] active:scale-[0.98] duration-200 rounded-lg border-0"
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
          <div className="md:hidden border-b border-[oklch(0.94_0.02_170)] bg-white px-4 py-4 space-y-3 animate-in slide-in-from-top-4 duration-200">
            <Link 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-[oklch(0.2_0.04_170)] rounded-lg hover:bg-[oklch(0.98_0.01_170)]"
            >
              Features
            </Link>
            <Link 
              href="#pricing" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-[oklch(0.2_0.04_170)] rounded-lg hover:bg-[oklch(0.98_0.01_170)]"
            >
              Pricing
            </Link>
            <Link 
              href="#solutions" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-[oklch(0.2_0.04_170)] rounded-lg hover:bg-[oklch(0.98_0.01_170)]"
            >
              Solutions
            </Link>
            <Link 
              href="#roi" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-[oklch(0.2_0.04_170)] rounded-lg hover:bg-[oklch(0.98_0.01_170)]"
            >
              ROI
            </Link>
            <Link 
              href="#security" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-[oklch(0.2_0.04_170)] rounded-lg hover:bg-[oklch(0.98_0.01_170)]"
            >
              Security
            </Link>
            <Link 
              href="#faq" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-[oklch(0.2_0.04_170)] rounded-lg hover:bg-[oklch(0.98_0.01_170)]"
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
          {/* Fresh Mint Green & Emerald Teal ambient blur glow */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[oklch(0.88_0.1_165)]/30 rounded-full blur-[120px] -z-10 pointer-events-none" />
          <div className="absolute top-10 right-1/4 w-[400px] h-[400px] bg-[oklch(0.5_0.15_170)]/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
            
            {/* Top Tagline Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.5_0.15_170)]/20 bg-[oklch(0.88_0.1_165)] px-4 py-1.5 text-xs sm:text-sm font-bold text-[oklch(0.2_0.04_170)] animate-in fade-in slide-in-from-bottom-2 duration-700">
              <Zap className="h-3.5 w-3.5 text-[oklch(0.5_0.15_170)]" />
              <span>Self-Hosted • Privacy First • Advanced AI Integrations</span>
            </div>
            
            {/* Main Headline */}
            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.15] text-[oklch(0.2_0.04_170)] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              The Self-Hosted <span className="text-[oklch(0.5_0.15_170)]">Chat CRM</span> & <span className="text-[oklch(0.5_0.15_170)]">AI Agent Platform</span>
            </h1>
            
            {/* Description */}
            <p className="mx-auto max-w-2xl text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
              Take back control of your customer relationships. HopeChat connects your team and automated AI agents to WhatsApp, Web Chat, and Custom APIs with complete data sovereignty and zero per-seat licensing fees.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Link 
                href="/signup" 
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full sm:w-auto h-12 px-8 text-base bg-[oklch(0.5_0.15_170)] hover:bg-[oklch(0.5_0.15_170)]/90 text-white gap-2 font-bold shadow-lg shadow-[oklch(0.5_0.15_170)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 rounded-xl border-0 flex items-center justify-center"
                )}
              >
                Deploy Free Trial <ArrowRight className="ml-2 h-4.5 w-4.5" />
              </Link>
              <Link 
                href="#features" 
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full sm:w-auto h-12 px-8 text-base border-[oklch(0.94_0.02_170)] bg-white hover:bg-[oklch(0.98_0.01_170)] text-[oklch(0.2_0.04_170)] font-bold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 rounded-xl flex items-center justify-center"
                )}
              >
                Explore Features
              </Link>
            </div>

            {/* Elevated Crisp White Mock Chat Interface */}
            <div className="relative mx-auto max-w-5xl rounded-2xl border border-[oklch(0.94_0.02_170)] bg-white shadow-xl shadow-black/[0.03] overflow-hidden aspect-[16/10] md:aspect-[16/9] flex text-left font-sans text-[11px] sm:text-xs md:text-sm animate-in fade-in zoom-in-95 duration-1000 delay-400">
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
                    <div className="h-8 w-8 shrink-0 rounded-full bg-[oklch(0.5_0.15_170)]/20 text-[oklch(0.5_0.15_170)] flex items-center justify-center font-bold">SJ</div>
                    <div className="hidden md:block overflow-hidden flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[oklch(0.2_0.04_170)] truncate">Sarah Jenkins</span>
                        <span className="text-[10px] text-[oklch(0.5_0.15_170)] font-black">ACTIVE</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">Connected via WhatsApp</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg hover:bg-[oklch(0.98_0.01_170)] flex gap-2 items-center cursor-pointer transition-colors">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">AR</div>
                    <div className="hidden md:block overflow-hidden flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold truncate">Alex Rivera</span>
                        <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-1 rounded font-bold">BOT</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">Auto-replied 2m ago</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg hover:bg-[oklch(0.98_0.01_170)] flex gap-2 items-center cursor-pointer transition-colors">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">JL</div>
                    <div className="hidden md:block overflow-hidden flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold truncate">James Lee</span>
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
                    <span className="font-bold text-[oklch(0.2_0.04_170)] block">Sarah Jenkins</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> WhatsApp Session • Assigned to AI Agent
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[oklch(0.5_0.15_170)]/10 border border-[oklch(0.5_0.15_170)]/20 text-[oklch(0.5_0.15_170)] font-bold text-[10px] uppercase">Enterprise</span>
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
                    <span className="font-bold text-[oklch(0.2_0.04_170)] block">Sarah Jenkins</span>
                    <span className="text-xs text-muted-foreground block font-medium">VP of Sales, TechCorp</span>
                    <span className="text-[11px] text-[oklch(0.5_0.15_170)] font-semibold block">s.jenkins@techcorp.io</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground mb-2">Deal Pipeline</h4>
                  <div className="p-3 rounded-xl bg-white border border-[oklch(0.94_0.02_170)] space-y-2 shadow-sm shadow-black/[0.01]">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-muted-foreground">Stage:</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[10px]">Triage</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-muted-foreground">Value:</span>
                      <span className="font-bold text-[oklch(0.2_0.04_170)]">$12,400.00</span>
                    </div>
                    <div className="h-1.5 w-full bg-[oklch(0.98_0.01_170)] rounded-full overflow-hidden">
                      <div className="h-full bg-[oklch(0.5_0.15_170)] rounded-full w-1/3" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-white text-[oklch(0.2_0.04_170)] border border-[oklch(0.94_0.02_170)] text-[10px] font-bold shadow-sm shadow-black/[0.01]">AWS Deploy</span>
                    <span className="px-2 py-0.5 rounded-md bg-white text-[oklch(0.2_0.04_170)] border border-[oklch(0.94_0.02_170)] text-[10px] font-bold shadow-sm shadow-black/[0.01]">Lead</span>
                    <span className="px-2 py-0.5 rounded-md bg-[oklch(0.5_0.15_170)]/10 text-[oklch(0.5_0.15_170)] border border-[oklch(0.5_0.15_170)]/20 text-[10px] font-bold">Enterprise</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trusted By / Enterprise Brands */}
            <div className="pt-8 space-y-6 animate-in fade-in duration-750 delay-500">
              <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-muted-foreground">Trusted by forward-thinking teams globally</p>
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 hover:opacity-80 transition-opacity duration-300 grayscale select-none">
                {["SAMSUNG", "OPPO", "MICHAEL KORS", "SHEIN", "J&T EXPRESS"].map((brand) => (
                  <span key={brand} className="text-lg md:text-xl font-black tracking-widest text-[oklch(0.2_0.04_170)]">{brand}</span>
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
                Skip vendor lock-in. Get a robust, secure customer chat stack deployed straight to your cloud, fully customized for human support and autonomous AI workflows.
              </p>
            </div>

            {/* Staggered white boxes with border border-black/[0.04] and gentle shadows */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
              {[
                {
                  icon: Globe,
                  title: "Omnichannel Team Inbox",
                  desc: "Bring WhatsApp Business, Web Chat widgets, and custom developer APIs into a single collaborative panel. Route tickets, add internal notes, and tag conversations instantly."
                },
                {
                  icon: Cpu,
                  title: "Self-Learning AI Agents",
                  desc: "Connect LLM models (OpenAI GPT, Claude, or AWS Bedrock) with your help documents. Automate up to 60% of common customer questions with smart handovers to human agents."
                },
                {
                  icon: KanbanSquare,
                  title: "Integrated Sales Pipeline",
                  desc: "Map chats to real-time sales opportunities. Drag-and-drop deals through custom Kanban boards linked directly back to conversation context and history details."
                },
                {
                  icon: Zap,
                  title: "Visual No-Code Builder",
                  desc: "Create auto-replies, conditional trigger sequences, webhook integrations, and schedules visually. Support interactive customer routing paths effortlessly."
                },
                {
                  icon: Server,
                  title: "Sovereign Self-Hosting",
                  desc: "Deploy securely on Hostinger, AWS, or local physical servers. Run your own Supabase database instance with absolute code, token, and data control."
                },
                {
                  icon: Lock,
                  title: "GDPR & RLS Security",
                  desc: "Protect sensitive data with AES-256-GCM token encryption and strict Postgres Row-Level Security. Avoid vendor database compliance traps."
                }
              ].map((item, index) => (
                <FadeIn key={index} delay={index * 100}>
                  <div className="group p-6 rounded-2xl bg-white border border-black/[0.04] shadow-sm hover:shadow-md hover:border-[oklch(0.5_0.15_170)]/40 transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between h-full">
                    <div className="space-y-4">
                      <div className="h-10 w-10 rounded-xl bg-[oklch(0.5_0.15_170)]/5 text-[oklch(0.5_0.15_170)] flex items-center justify-center group-hover:bg-[oklch(0.5_0.15_170)] group-hover:text-white transition-all duration-300">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-bold text-[oklch(0.2_0.04_170)] tracking-tight">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section (Bright, Staggered, 3-Tier UGX Grid) */}
        <section id="pricing" className="py-20 lg:py-28 bg-white relative">
          {/* Subtle Mint background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[oklch(0.88_0.1_165)]/20 rounded-full blur-[130px] -z-10 pointer-events-none" />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="px-2.5 py-1 rounded-md bg-[oklch(0.5_0.15_170)]/10 border border-[oklch(0.5_0.15_170)]/20 text-[oklch(0.5_0.15_170)] font-bold text-xs uppercase tracking-wider">Simple Pricing</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[oklch(0.2_0.04_170)]">Sovereignty-Focused Pricing Plans</h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                Choose the best fit for your team size. Pay only for the resources you deploy, with zero per-agent seat markup.
              </p>
            </div>

            {/* 3-Tier Responsive Grid */}
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
              
              {/* Bronze Plan Card */}
              <FadeIn delay={0}>
                <div className="bg-white border border-[oklch(0.94_0.02_170)] rounded-2xl p-8 flex flex-col justify-between h-full shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-[oklch(0.2_0.04_170)] tracking-tight">BRONZE</h3>
                      <p className="text-xs text-muted-foreground font-semibold mt-1">Perfect for solo founders and startup testing</p>
                    </div>
                    <div className="py-2 border-y border-[oklch(0.94_0.02_170)]">
                      <span className="text-3xl font-extrabold text-[oklch(0.2_0.04_170)]">UGX 65,000</span>
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
                      Deploy Bronze Plan
                    </Link>
                  </div>
                </div>
              </FadeIn>

              {/* Silver Plan Card (Most Popular, highlighted in emerald teal border and mint badge) */}
              <FadeIn delay={100}>
                <div className="bg-white border-2 border-[oklch(0.5_0.15_170)] rounded-2xl p-8 flex flex-col justify-between h-full shadow-md relative scale-102">
                  <div className="absolute top-0 right-8 -translate-y-1/2 rounded-full bg-[oklch(0.88_0.1_165)] border border-[oklch(0.5_0.15_170)]/20 px-3 py-1 text-[10px] font-black tracking-wider text-[oklch(0.2_0.04_170)] uppercase shadow-sm">
                    MOST POPULAR
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-[oklch(0.5_0.15_170)] tracking-tight">SILVER</h3>
                      <p className="text-xs text-muted-foreground font-semibold mt-1">Great for growing customer support teams</p>
                    </div>
                    <div className="py-2 border-y border-[oklch(0.94_0.02_170)]">
                      <span className="text-3xl font-extrabold text-[oklch(0.2_0.04_170)]">UGX 180,000</span>
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
                      Deploy Silver Plan
                    </Link>
                  </div>
                </div>
              </FadeIn>

              {/* Gold Plan Card */}
              <FadeIn delay={200}>
                <div className="bg-white border border-[oklch(0.94_0.02_170)] rounded-2xl p-8 flex flex-col justify-between h-full shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-[oklch(0.2_0.04_170)] tracking-tight">GOLD</h3>
                      <p className="text-xs text-muted-foreground font-semibold mt-1">For power users running full automation at scale</p>
                    </div>
                    <div className="py-2 border-y border-[oklch(0.94_0.02_170)]">
                      <span className="text-3xl font-extrabold text-[oklch(0.2_0.04_170)]">UGX 450,000</span>
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
                      Deploy Gold Plan
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
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-[oklch(0.2_0.04_170)]">Train Conversational AI Agents on Your Documentation</h2>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                    Provide instantaneous, context-aware support. By feeding HopeChat your technical manuals, FAQs, or brand files, your AI agents learn in seconds.
                  </p>
                  <ul className="space-y-3 text-sm sm:text-base font-semibold text-foreground">
                    {["Fully automated answers with 0ms delay", "Custom instructions to match your brand voice", "Graceful transfer to human reps when custom queries occur"].map((li, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 w-full max-w-xl aspect-square md:aspect-[4/3] rounded-2xl bg-white border border-[oklch(0.94_0.02_170)] shadow-md flex items-center justify-center p-6 relative">
                  <div className="w-full bg-[oklch(0.98_0.01_170)]/45 border border-[oklch(0.94_0.02_170)] rounded-xl p-4 space-y-4">
                    <div className="flex justify-between items-center border-b border-[oklch(0.94_0.02_170)] pb-2">
                      <span className="font-bold text-[oklch(0.2_0.04_170)] flex items-center gap-1.5"><Cpu className="h-4 w-4 text-[oklch(0.5_0.15_170)]" /> Training Database</span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-[oklch(0.88_0.1_165)] border border-[oklch(0.5_0.15_170)]/15 px-2 py-0.5 rounded-full">Synchronized</span>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { name: "support-faq.md", size: "24.8 KB", status: "Active" },
                        { name: "product-specifications.pdf", size: "1.2 MB", status: "Active" },
                        { name: "pricing-tier-lookup.json", size: "4.1 KB", status: "Active" }
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
                    Say goodbye to sharing a single browser window. Enable multiple team members to manage a single customer touchpoint with dedicated assignments, labels, and collaboration metrics.
                  </p>
                  <ul className="space-y-3 text-sm sm:text-base font-semibold text-foreground">
                    {["Auto-routing based on tags and keywords", "Internal notes for collaboration hidden from clients", "Daily workload, reply speed, and resolution statistics"].map((li, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 w-full max-w-xl aspect-square md:aspect-[4/3] rounded-2xl bg-white border border-[oklch(0.94_0.02_170)] shadow-md flex items-center justify-center p-6 relative">
                  <div className="w-full bg-[oklch(0.98_0.01_170)]/45 border border-[oklch(0.94_0.02_170)] rounded-xl p-4 space-y-4">
                    <div className="flex justify-between items-center border-b border-[oklch(0.94_0.02_170)] pb-2">
                      <span className="font-bold text-[oklch(0.2_0.04_170)] flex items-center gap-1.5"><Users className="h-4 w-4 text-[oklch(0.5_0.15_170)]" /> Active Agents</span>
                      <span className="text-[10px] text-[oklch(0.5_0.15_170)] font-bold bg-[oklch(0.88_0.1_165)] border border-[oklch(0.5_0.15_170)]/15 px-2 py-0.5 rounded-full">4 Online</span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { name: "Jessica Chen", role: "Sales Rep", chats: 8, status: "Active" },
                        { name: "David Miller", role: "Support Lead", chats: 12, status: "Active" },
                        { name: "AI Auto-Bot", role: "Virtual Agent", chats: 45, status: "Active" }
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
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-[oklch(0.2_0.04_170)]">Visual Pipeline Management Directly in the CRM</h2>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                    Track client value without leaving the chat view. Connect deals to active conversations, categorize prospects, and track metrics visually using modern Kanban boards.
                  </p>
                  <ul className="space-y-3 text-sm sm:text-base font-semibold text-foreground">
                    {["Link customer contacts to pipeline cards", "One-click updates to deal values and stages", "Full transition history logged within chat archives"].map((li, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 w-full max-w-xl aspect-square md:aspect-[4/3] rounded-2xl bg-white border border-[oklch(0.94_0.02_170)] shadow-md flex items-center justify-center p-4 relative">
                  <div className="w-full h-full flex gap-3 overflow-x-auto text-[11px] sm:text-xs">
                    {[
                      { title: "Incoming", count: 2, cards: [{ title: "Sarah Jenkins", company: "TechCorp", value: "$12,400" }] },
                      { title: "Meeting Set", count: 1, cards: [{ title: "Marcus Aurelius", company: "Empire Inc", value: "$4,500" }] },
                      { title: "Proposal Sent", count: 1, cards: [{ title: "Elena Rostova", company: "Novus Group", value: "$9,200" }] }
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
                { label: "Sovereignty Savings", value: "85%", desc: "Decrease in licensing overhead compared to standard SaaS platform models." },
                { label: "Autonomous Support", value: "60%", desc: "Average drop in human support inquiries through self-learning AI agents." },
                { label: "Conversion Lift", value: "24%", desc: "Increase in lead-to-deal conversion rates using active pipeline chat routing." }
              ].map((metric, index) => (
                <FadeIn key={index} delay={index * 150}>
                  <div className="p-8 rounded-2xl bg-white border border-[oklch(0.94_0.02_170)] shadow-sm flex flex-col justify-between text-left space-y-4 hover:border-[oklch(0.5_0.15_170)]/30 transition-colors h-full">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">{metric.label}</span>
                    <div className="text-5xl font-extrabold text-[oklch(0.5_0.15_170)] tracking-tight">{metric.value}</div>
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
              <h2 className="text-3xl font-extrabold tracking-tight text-[oklch(0.2_0.04_170)]">Customized for Your Industry</h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                Whether you manage high-volume online shopping or high-trust enterprise integrations, HopeChat has tailored logic workflows.
              </p>
            </div>

            {/* Dynamic Pill Selector Grid */}
            <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
              {[
                { id: "retail", label: "Retail & E-commerce" },
                { id: "finance", label: "Financial Services" },
                { id: "gaming", label: "Gaming & Entertainment" },
                { id: "edu", label: "Education" },
                { id: "enterprise", label: "Enterprise Solutions" }
              ].map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => setActiveIndustry(ind.id)}
                  className={cn(
                    "px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold border transition-all duration-300",
                    activeIndustry === ind.id 
                      ? "bg-[oklch(0.5_0.15_170)] text-white border-[oklch(0.5_0.15_170)] shadow-md shadow-[oklch(0.5_0.15_170)]/10" 
                      : "bg-white text-muted-foreground border-[oklch(0.94_0.02_170)] hover:bg-[oklch(0.98_0.01_170)]"
                  )}
                >
                  {ind.label}
                </button>
              ))}
            </div>

            {/* Detailed industry response preview wrapped in elevated white card */}
            <FadeIn>
              <div className="max-w-4xl mx-auto p-6 md:p-8 rounded-2xl bg-white border border-[oklch(0.94_0.02_170)] shadow-sm animate-in fade-in duration-300">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-6 text-left">
                    <h3 className="text-xl md:text-2xl font-bold capitalize text-[oklch(0.2_0.04_170)]">{activeIndustry.replace('-', ' ')} Implementation</h3>
                    
                    {activeIndustry === "retail" && (
                      <div className="space-y-4">
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Recover shopping momentum and drive conversions automatically on the most-used channels:</p>
                        <div className="space-y-3 text-xs md:text-sm font-medium">
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Automate abandoned cart notifications via WhatsApp.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Send instant shipping updates and delivery codes.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Integrate with Shopify, WooCommerce, or custom platforms.</span></div>
                        </div>
                      </div>
                    )}

                    {activeIndustry === "finance" && (
                      <div className="space-y-4">
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Provide secure, isolated advice and ticket management for sensitive operations:</p>
                        <div className="space-y-3 text-xs md:text-sm font-medium">
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Bank-grade self-hosted infrastructure ensuring absolute isolation.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Secure storage with AES-256-GCM message token encryption.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Strict adherence to KYC documentation constraints.</span></div>
                        </div>
                      </div>
                    )}

                    {activeIndustry === "gaming" && (
                      <div className="space-y-4">
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Support online players 24/7 with zero waiting cues and instant checkups:</p>
                        <div className="space-y-3 text-xs md:text-sm font-medium">
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>AI automation handles 70%+ of account recovery inquiries.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Automate match status, rank queries, and system patch updates.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Link game server webhooks directly to custom chat channels.</span></div>
                        </div>
                      </div>
                    )}

                    {activeIndustry === "edu" && (
                      <div className="space-y-4">
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Coordinate schedules, deadlines, and parent updates automatically:</p>
                        <div className="space-y-3 text-xs md:text-sm font-medium">
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Automate class registrations and program FAQs.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Send broadcast reminders for payment deadlines or events.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Provide safe parent channels with automated routing.</span></div>
                        </div>
                      </div>
                    )}

                    {activeIndustry === "enterprise" && (
                      <div className="space-y-4">
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Deploy customized multi-agent setups with absolute sovereign scale:</p>
                        <div className="space-y-3 text-xs md:text-sm font-medium">
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>SSO authentication, custom workflows, and detailed audit trails.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>Dedicated workspace partitions for multiple brands or branches.</span></div>
                          <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-[oklch(0.5_0.15_170)] shrink-0" /><span>High throughput API routing utilizing cloud load balancers.</span></div>
                        </div>
                      </div>
                    )}

                  </div>

                  <div className="h-48 md:h-64 rounded-xl bg-gradient-to-br from-[oklch(0.5_0.15_170)]/10 to-[oklch(0.88_0.1_165)]/20 border border-[oklch(0.5_0.15_170)]/20 flex flex-col items-center justify-center p-6 text-center space-y-2">
                    <div className="text-4xl md:text-5xl font-black text-[oklch(0.5_0.15_170)] tracking-tight">
                      {activeIndustry === "retail" && "45%"}
                      {activeIndustry === "finance" && "0"}
                      {activeIndustry === "gaming" && "70%"}
                      {activeIndustry === "edu" && "3.5x"}
                      {activeIndustry === "enterprise" && "100%"}
                    </div>
                    <div className="text-[10px] md:text-xs font-extrabold text-muted-foreground uppercase tracking-widest leading-relaxed">
                      {activeIndustry === "retail" && "Average Cart Recovery Rate"}
                      {activeIndustry === "finance" && "Compliance Breach Incidents"}
                      {activeIndustry === "gaming" && "Autonomous Support Resolution"}
                      {activeIndustry === "edu" && "Speed to Triage Optimization"}
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
            <h2 className="text-3xl font-extrabold tracking-tight text-[oklch(0.2_0.04_170)]">Zero Trust. Full Control.</h2>
            <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
              {[
                {
                  icon: Server,
                  title: "Self-Hosted sovereignty",
                  desc: "Your code, your credentials, your database. Deploy on Hostinger or AWS and retain absolute ownership over client communication logs."
                },
                {
                  icon: Database,
                  title: "Postgres RLS Isolation",
                  desc: "Strict Row-Level Security on every Supabase table guarantees logic separation between accounts, preventing database bleed risks."
                },
                {
                  icon: Key,
                  title: "AES-256 Encryption",
                  desc: "All incoming message data, API tokens, and webhook secrets are encrypted at rest using industry-standard AES-256-GCM configurations."
                }
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="p-6 rounded-2xl bg-white border border-black/[0.04] space-y-4 hover:border-[oklch(0.5_0.15_170)]/30 transition-all duration-300 h-full shadow-sm">
                    <div className="h-10 w-10 rounded-xl bg-[oklch(0.5_0.15_170)]/5 text-[oklch(0.5_0.15_170)] flex items-center justify-center">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-[oklch(0.2_0.04_170)] tracking-tight">{item.title}</h3>
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
              <p className="text-base text-muted-foreground font-medium">Find answers to common technical and licensing questions.</p>
            </div>

            <div className="text-left space-y-4">
              {[
                { 
                  q: "How does HopeChat differ from traditional SaaS chat platforms?", 
                  a: "Traditional SaaS platforms store your customer conversations on their servers and charge you per team member per month. HopeChat is a self-hosted template: you host it on your own server, meaning you pay zero per-seat licensing fees and retain full compliance ownership over your database logs." 
                },
                { 
                  q: "What do I need to prepare before self-hosting HopeChat?", 
                  a: "You will need a basic cloud hosting server (e.g., Hostinger Managed Node.js, AWS EC2, or Vercel), a free Supabase account for auth and database logic, and a Meta Developer account if you wish to connect the official WhatsApp Business Cloud API." 
                },
                { 
                  q: "Can I connect other LLMs besides the pre-configured ones?", 
                  a: "Yes. The AI Agent architecture is built modularly. You can easily extend the models in the settings, connect local running models like Ollama, or input custom endpoints for other API integrations." 
                },
                { 
                  q: "How are automatic backups and database migrations handled?", 
                  a: "Database migration structures are maintained locally within the repository under Supabase config files. When updating your deployment, you run simple CLI commands to push database schemas without interrupting current chat streams." 
                }
              ].map((faq, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="rounded-xl border border-[oklch(0.94_0.02_170)] bg-white overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                      className="w-full px-6 py-4 flex justify-between items-center text-left font-bold text-[oklch(0.2_0.04_170)] text-sm sm:text-base hover:bg-[oklch(0.98_0.01_170)] transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground", activeFaq === i && "rotate-90 text-[oklch(0.5_0.15_170)]")} />
                    </button>
                    {activeFaq === i && (
                      <div className="px-6 pb-4 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-[oklch(0.94_0.02_170)] font-medium bg-white">
                        {faq.a}
                      </div>
                    )}
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
              <div className="rounded-3xl bg-gradient-to-br from-[oklch(0.5_0.15_170)]/10 via-[oklch(0.88_0.1_165)]/10 to-transparent border border-[oklch(0.5_0.15_170)]/20 p-8 md:p-16 lg:p-20 text-center text-[oklch(0.2_0.04_170)] overflow-hidden relative shadow-md">
                {/* Blur backdrop bubbles */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-80 h-80 bg-[oklch(0.88_0.1_165)]/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-80 h-80 bg-[oklch(0.5_0.15_170)]/15 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
                  <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-[oklch(0.2_0.04_170)]">Ready to Own Your Chat Infrastructure?</h2>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
                    Deploy HopeChat in minutes. Start managing customer deals, conversations, and automated AI agents directly on your cloud.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Link 
                      href="/signup" 
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "w-full sm:w-auto bg-[oklch(0.5_0.15_170)] hover:bg-[oklch(0.5_0.15_170)]/90 text-white h-12 px-8 text-base font-bold rounded-xl active:scale-[0.98] transition-transform shadow-md border-0 flex items-center justify-center"
                      )}
                    >
                      Get Started Free
                    </Link>
                    <Link 
                      href="/login" 
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "text-sm font-bold text-muted-foreground hover:text-[oklch(0.2_0.04_170)] transition-colors py-2 px-4"
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
                The open-source, self-hosted web chat CRM and multi-agent AI assistant platform. Built for privacy, ownership, and scale.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[oklch(0.2_0.04_170)] mb-4">Product</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#features" className="hover:text-primary transition-colors">Shared Inbox</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">AI Agents</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">Kanban Pipelines</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">No-Code Builder</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[oklch(0.2_0.04_170)] mb-4">Solutions</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><button onClick={() => setActiveIndustry("retail")} className="hover:text-primary transition-colors text-left">E-commerce</button></li>
                <li><button onClick={() => setActiveIndustry("finance")} className="hover:text-primary transition-colors text-left">Finance</button></li>
                <li><button onClick={() => setActiveIndustry("gaming")} className="hover:text-primary transition-colors text-left">Gaming</button></li>
                <li><button onClick={() => setActiveIndustry("enterprise")} className="hover:text-primary transition-colors text-left">Enterprise</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[oklch(0.2_0.04_170)] mb-4">Sovereign Cloud</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#" className="hover:text-primary transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">GitHub Repository</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Supabase Setup</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Hostinger Deploy</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[oklch(0.94_0.02_170)] flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            <p>© {new Date().getFullYear()} HopeChat AI. GDPR Compliant. MIT Licensed.</p>
            <div className="flex gap-6">
              <span>GDPR Sovereign</span>
              <span>256-bit AES</span>
              <span>Postgres RLS</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
