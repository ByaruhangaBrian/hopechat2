"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
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
  X
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Mock messages database for the dynamic landing page preview
const MOCK_MESSAGES = [
  { sender: "customer", text: "Hey! We want to migrate our sales team from Intercom. Does HopeChat2 support self-hosting on AWS?" },
  { sender: "typing", text: "" },
  { sender: "bot", text: "Absolutely! HopeChat2 is fully open-source and optimized for self-hosting. You can deploy it with one-click on AWS, Hostinger, or your private servers, ensuring complete data ownership and zero per-seat licensing fees." },
  { sender: "customer", text: "That sounds amazing. What LLM models are supported for the automated AI agents?" },
  { sender: "typing", text: "" },
  { sender: "bot", text: "We natively integrate with OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, and Amazon Bedrock. You can easily train agents on your own support files or sync with your existing internal documentation." },
  { sender: "customer", text: "Perfect. We have a visual sales pipeline setup. Can we link deals to WhatsApp chats?" },
  { sender: "typing", text: "" },
  { sender: "bot", text: "Yes! HopeChat2 features a built-in Kanban pipeline where deal cards are linked directly to live chat histories, making it seamless to track conversions and hand over to human reps." }
];

export default function LandingPage() {
  const [activeIndustry, setActiveIndustry] = useState("retail");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Chat simulator states
  const [visibleMessages, setVisibleMessages] = useState<Array<{ sender: string; text: string }>>([MOCK_MESSAGES[0]]);
  const [currentStep, setCurrentStep] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat preview
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages]);

  // Chat simulation effect
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
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/30 antialiased font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md transition-all duration-300">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20 transition-all duration-300 group-hover:scale-105">
                <MessageSquare className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-foreground bg-clip-text">HopeChat<span className="text-primary">2</span></span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted-foreground">
              <Link href="#features" className="hover:text-foreground transition-colors duration-200">Features</Link>
              <Link href="#solutions" className="hover:text-foreground transition-colors duration-200">Solutions</Link>
              <Link href="#roi" className="hover:text-foreground transition-colors duration-200">ROI</Link>
              <Link href="#security" className="hover:text-foreground transition-colors duration-200">Security</Link>
              <Link href="#faq" className="hover:text-foreground transition-colors duration-200">FAQ</Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-block">
              <Button variant="ghost" className="text-sm font-bold text-muted-foreground hover:text-foreground h-9 px-4">
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-5 h-9 text-xs sm:text-sm shadow-md shadow-primary/10 transition-transform active:scale-[0.98] duration-200 rounded-lg">
                Start Free Trial
              </Button>
            </Link>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-background px-4 py-4 space-y-3 animate-in slide-in-from-top-4 duration-200">
            <Link 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
            >
              Features
            </Link>
            <Link 
              href="#solutions" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
            >
              Solutions
            </Link>
            <Link 
              href="#roi" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
            >
              ROI
            </Link>
            <Link 
              href="#security" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
            >
              Security
            </Link>
            <Link 
              href="#faq" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
            >
              FAQ
            </Link>
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-center">Log In</Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        
        {/* Enterprise Hero Section */}
        <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 lg:pt-32 lg:pb-40 overflow-hidden">
          {/* Accent lighting radial gradient backdrop */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_60%)]" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
            
            {/* Top Tagline Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs sm:text-sm font-bold text-primary animate-in fade-in slide-in-from-bottom-2 duration-700">
              <Zap className="h-3.5 w-3.5" />
              <span>Self-Hosted • Privacy First • Advanced AI Integrations</span>
            </div>
            
            {/* Main Headline */}
            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.15] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              The Self-Hosted <span className="text-primary">Chat CRM</span> & <span className="text-primary">AI Agent Platform</span>
            </h1>
            
            {/* Description */}
            <p className="mx-auto max-w-2xl text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
              Take back control of your customer relationships. HopeChat2 connects your team and automated AI agents to WhatsApp, Web Chat, and Custom APIs with complete data sovereignty and zero per-seat licensing fees.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base bg-primary hover:bg-primary/95 text-primary-foreground gap-2 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 rounded-xl">
                  Deploy Free Trial <ArrowRight className="h-4.5 w-4.5" />
                </Button>
              </Link>
              <Link href="#features" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base border-border hover:bg-muted text-foreground font-bold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 rounded-xl">
                  Explore Features
                </Button>
              </Link>
            </div>

            {/* Simulated Live Chat Interface (Visual centerpiece instead of simple image) */}
            <div className="relative mx-auto max-w-5xl rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md shadow-2xl overflow-hidden aspect-[16/10] md:aspect-[16/9] flex text-left font-sans text-[11px] sm:text-xs md:text-sm animate-in fade-in zoom-in-95 duration-1000 delay-400">
              {/* Top gradient blur border highlights */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              
              {/* Left Column: Side Navigation Mock */}
              <div className="w-16 md:w-56 border-r border-border/50 flex flex-col bg-background/50">
                <div className="p-3 border-b border-border/50 flex items-center justify-between">
                  <span className="hidden md:inline font-bold tracking-tight text-foreground">Conversations</span>
                  <div className="h-4 w-4 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex gap-2 items-center cursor-pointer">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">SJ</div>
                    <div className="hidden md:block overflow-hidden flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-foreground truncate">Sarah Jenkins</span>
                        <span className="text-[10px] text-primary font-black">ACTIVE</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">Connected via WhatsApp</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg hover:bg-muted/50 flex gap-2 items-center cursor-pointer transition-colors">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">AR</div>
                    <div className="hidden md:block overflow-hidden flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold truncate">Alex Rivera</span>
                        <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1 rounded font-bold">BOT</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">Auto-replied 2m ago</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg hover:bg-muted/50 flex gap-2 items-center cursor-pointer transition-colors">
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
              <div className="flex-1 flex flex-col">
                {/* Active chat header */}
                <div className="p-3 border-b border-border/50 bg-background/20 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-foreground block">Sarah Jenkins</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> WhatsApp Session • Assigned to AI Agent
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-bold text-[10px] uppercase">Enterprise</span>
                  </div>
                </div>

                {/* Animated Message History Feed */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/10">
                  {visibleMessages.map((msg, index) => {
                    if (msg.sender === "typing") {
                      return (
                        <div key={index} className="flex gap-2.5 items-end max-w-[85%]">
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">Bot</div>
                          <div className="bg-muted px-4 py-2.5 rounded-2xl rounded-bl-none border border-border/30 text-muted-foreground">
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
                      <div key={index} className={cn("flex gap-2.5 items-end max-w-[85%]", isBot ? "ml-auto flex-row-reverse" : "mr-auto")}>
                        <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", 
                          isBot ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                        >
                          {isBot ? "Bot" : "User"}
                        </div>
                        <div className={cn(
                          "px-4 py-2.5 rounded-2xl text-xs md:text-sm shadow-sm leading-relaxed border",
                          isBot 
                            ? "bg-primary text-primary-foreground border-primary/20 rounded-br-none" 
                            : "bg-card text-foreground border-border/50 rounded-bl-none"
                        )}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Input box bottom mock */}
                <div className="p-3 border-t border-border/50 bg-background/50 flex gap-2">
                  <div className="flex-1 bg-background border border-border/60 rounded-xl px-3 py-2 text-muted-foreground flex justify-between items-center text-[11px] md:text-xs">
                    <span>Message response auto-drafted by HopeChat AI agent...</span>
                    <Button size="icon" className="h-6 w-6 shrink-0 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg border-0">
                      <Zap className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: CRM Sidebar Mock */}
              <div className="hidden lg:flex w-64 border-l border-border/50 flex-col bg-background/50 p-4 space-y-4">
                <div>
                  <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] text-muted-foreground mb-2">Customer Profile</h4>
                  <div className="p-3 rounded-xl bg-card border border-border/40 space-y-1.5">
                    <span className="font-bold text-foreground block">Sarah Jenkins</span>
                    <span className="text-xs text-muted-foreground block">VP of Sales, TechCorp</span>
                    <span className="text-[11px] text-primary font-semibold block">s.jenkins@techcorp.io</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] text-muted-foreground mb-2">Deal Pipeline</h4>
                  <div className="p-3 rounded-xl bg-card border border-border/40 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-muted-foreground">Stage:</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-[10px]">Triage</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-muted-foreground">Value:</span>
                      <span className="font-bold text-foreground">$12,400.00</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full w-1/3" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] text-muted-foreground mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60 text-[10px] font-bold">AWS Deploy</span>
                    <span className="px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60 text-[10px] font-bold">Lead</span>
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">Enterprise</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trusted By / Enterprise Brands */}
            <div className="pt-8 space-y-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-muted-foreground">Trusted by forward-thinking teams globally</p>
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 hover:opacity-80 transition-opacity duration-300 grayscale select-none">
                {["SAMSUNG", "OPPO", "MICHAEL KORS", "SHEIN", "J&T EXPRESS"].map((brand) => (
                  <span key={brand} className="text-lg md:text-xl font-black tracking-widest text-foreground">{brand}</span>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* Feature Capabilities Grid */}
        <section id="features" className="py-20 lg:py-28 border-t border-border/40 bg-muted/10 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Everything You Need to Scale Customer Communication</h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Skip vendor lock-in. Get a robust, secure customer chat stack deployed straight to your cloud, fully customized for human support and autonomous AI workflows.
              </p>
            </div>

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
                <div key={index} className="group p-6 rounded-2xl bg-card border border-border/40 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Deep-Dive Product Scenarios */}
        <section className="py-20 lg:py-28 space-y-24 md:space-y-36">
          
          {/* Scenario 1 */}
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              <div className="flex-1 space-y-6 max-w-xl text-left">
                <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-wider">AI AUTOMATION</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">Train Conversational AI Agents on Your Documentation</h2>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                  Provide instantaneous, context-aware support. By feeding HopeChat2 your technical manuals, FAQs, or brand files, your AI agents learn in seconds.
                </p>
                <ul className="space-y-3 text-sm sm:text-base font-semibold text-foreground">
                  {["Fully automated answers with 0ms delay", "Custom instructions to match your brand voice", "Graceful transfer to human reps when custom queries occur"].map((li, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" />
                      <span>{li}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full max-w-xl aspect-square md:aspect-[4/3] rounded-2xl bg-card border border-border/50 overflow-hidden relative shadow-lg flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="w-full bg-background border border-border/50 rounded-xl p-4 space-y-4">
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <span className="font-bold text-foreground flex items-center gap-1.5"><Cpu className="h-4 w-4 text-primary" /> Training Database</span>
                    <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">Synchronized</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { name: "support-faq.md", size: "24.8 KB", status: "Active" },
                      { name: "product-specifications.pdf", size: "1.2 MB", status: "Active" },
                      { name: "pricing-tier-lookup.json", size: "4.1 KB", status: "Active" }
                    ].map((file, i) => (
                      <div key={i} className="flex justify-between items-center p-2.5 rounded-lg border border-border/30 bg-muted/30">
                        <span className="font-semibold text-xs md:text-sm text-foreground truncate max-w-[60%]">{file.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{file.size}</span>
                          <span className="text-[10px] text-primary font-bold">{file.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 flex justify-between items-center text-xs text-muted-foreground border-t border-border/30">
                    <span>1,248 knowledge segments active</span>
                    <Button variant="ghost" className="h-7 text-xs text-primary font-bold px-2.5">Sync Source +</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scenario 2 */}
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-16">
              <div className="flex-1 space-y-6 max-w-xl text-left">
                <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-wider">TEAM WORKSPACE</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">Unified Collaboration with Multi-Agent Assignment</h2>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                  Say goodbye to sharing a single browser window. Enable multiple team members to manage a single customer touchpoint with dedicated assignments, labels, and collaboration metrics.
                </p>
                <ul className="space-y-3 text-sm sm:text-base font-semibold text-foreground">
                  {["Auto-routing based on tags and keywords", "Internal notes for collaboration hidden from clients", "Daily workload, reply speed, and resolution statistics"].map((li, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" />
                      <span>{li}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full max-w-xl aspect-square md:aspect-[4/3] rounded-2xl bg-card border border-border/50 overflow-hidden relative shadow-lg flex items-center justify-center p-6 bg-gradient-to-bl from-primary/5 to-transparent">
                <div className="w-full bg-background border border-border/50 rounded-xl p-4 space-y-4">
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <span className="font-bold text-foreground flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> Active Agents</span>
                    <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">4 Online</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: "Jessica Chen", role: "Sales Rep", chats: 8, status: "Active" },
                      { name: "David Miller", role: "Support Lead", chats: 12, status: "Active" },
                      { name: "AI Auto-Bot", role: "Virtual Agent", chats: 45, status: "Active" }
                    ].map((agent, i) => (
                      <div key={i} className="flex justify-between items-center p-2.5 rounded-lg border border-border/30 bg-muted/20">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">{agent.name[0]}</div>
                          <div>
                            <span className="font-bold text-xs text-foreground block">{agent.name}</span>
                            <span className="text-[10px] text-muted-foreground block">{agent.role}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-foreground block">{agent.chats} active</span>
                          <span className="text-[9px] text-emerald-500 font-bold block">{agent.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scenario 3 */}
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              <div className="flex-1 space-y-6 max-w-xl text-left">
                <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-wider">SALES CONVERSIONS</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">Visual Pipeline Management Directly in the CRM</h2>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                  Track client value without leaving the chat view. Connect deals to active conversations, categorize prospects, and track metrics visually using modern Kanban boards.
                </p>
                <ul className="space-y-3 text-sm sm:text-base font-semibold text-foreground">
                  {["Link customer contacts to pipeline cards", "One-click updates to deal values and stages", "Full transition history logged within chat archives"].map((li, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" />
                      <span>{li}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full max-w-xl aspect-square md:aspect-[4/3] rounded-2xl bg-card border border-border/50 overflow-hidden relative shadow-lg flex items-center justify-center p-4 bg-gradient-to-tr from-primary/5 to-transparent">
                <div className="w-full h-full flex gap-3 overflow-x-auto text-[11px] sm:text-xs">
                  {[
                    { title: "Incoming", count: 2, cards: [{ title: "Sarah Jenkins", company: "TechCorp", value: "$12,400" }] },
                    { title: "Meeting Set", count: 1, cards: [{ title: "Marcus Aurelius", company: "Empire Inc", value: "$4,500" }] },
                    { title: "Proposal Sent", count: 1, cards: [{ title: "Elena Rostova", company: "Novus Group", value: "$9,200" }] }
                  ].map((column, i) => (
                    <div key={i} className="flex-1 min-w-[130px] bg-muted/30 border border-border/50 rounded-xl p-2.5 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-foreground block truncate">{column.title}</span>
                          <span className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/40">{column.count}</span>
                        </div>
                        <div className="space-y-2">
                          {column.cards.map((card, j) => (
                            <div key={j} className="p-2 bg-background border border-border/60 rounded-lg shadow-sm space-y-1.5">
                              <span className="font-bold text-foreground block truncate">{card.title}</span>
                              <span className="text-[10px] text-muted-foreground block truncate">{card.company}</span>
                              <span className="text-xs font-extrabold text-primary block">{card.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2 text-center text-muted-foreground border-t border-border/30 mt-4">
                        <span>+ New Deal</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ROI metrics banner */}
        <section id="roi" className="py-20 lg:py-28 bg-muted/20 border-y border-border/40">
          <div className="container mx-auto px-4 text-center space-y-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto">
              Real Efficiencies. Fully Measured.
            </h2>
            <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { label: "Sovereignty Savings", value: "85%", desc: "Decrease in licensing overhead compared to standard SaaS platform models." },
                { label: "Autonomous Support", value: "60%", desc: "Average drop in human support inquiries through self-learning AI agents." },
                { label: "Conversion Lift", value: "24%", desc: "Increase in lead-to-deal conversion rates using active pipeline chat routing." }
              ].map((metric, index) => (
                <div key={index} className="p-8 rounded-2xl bg-card border border-border/40 shadow-sm flex flex-col justify-between text-left space-y-4 hover:border-primary/20 transition-colors">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">{metric.label}</span>
                  <div className="text-5xl font-extrabold text-primary tracking-tight">{metric.value}</div>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">{metric.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Industry Solutions with state-driven tabs */}
        <section id="solutions" className="py-20 lg:py-28">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <h2 className="text-3xl font-extrabold tracking-tight">Customized for Your Industry</h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                Whether you manage high-volume online shopping or high-trust enterprise integrations, HopeChat2 has tailored logic workflows.
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
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/10" 
                      : "bg-background text-muted-foreground border-border/60 hover:bg-muted"
                  )}
                >
                  {ind.label}
                </button>
              ))}
            </div>

            {/* Detailed industry response preview */}
            <div className="max-w-4xl mx-auto p-6 md:p-8 rounded-2xl bg-card border border-border/40 shadow-sm animate-in fade-in duration-300">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6 text-left">
                  <h3 className="text-xl md:text-2xl font-bold capitalize text-foreground">{activeIndustry.replace('-', ' ')} Implementation</h3>
                  
                  {activeIndustry === "retail" && (
                    <div className="space-y-4">
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Recover shopping momentum and drive conversions automatically on the most-used channels:</p>
                      <div className="space-y-3 text-xs md:text-sm font-medium">
                        <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" /><span>Automate abandoned cart notifications via WhatsApp.</span></div>
                        <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" /><span>Send instant shipping updates and delivery codes.</span></div>
                        <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" /><span>Integrate with Shopify, WooCommerce, or custom platforms.</span></div>
                      </div>
                    </div>
                  )}

                  {activeIndustry === "finance" && (
                    <div className="space-y-4">
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Provide secure, isolated advice and ticket management for sensitive operations:</p>
                      <div className="space-y-3 text-xs md:text-sm font-medium">
                        <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" /><span>Bank-grade self-hosted infrastructure ensuring absolute isolation.</span></div>
                        <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" /><span>Secure storage with AES-256-GCM message token encryption.</span></div>
                        <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" /><span>Strict adherence to KYC documentation constraints.</span></div>
                      </div>
                    </div>
                  )}

                  {activeIndustry === "gaming" && (
                    <div className="space-y-4">
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Support online players 24/7 with zero waiting cues and instant checkups:</p>
                      <div className="space-y-3 text-xs md:text-sm font-medium">
                        <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" /><span>AI automation handles 70%+ of account recovery inquiries.</span></div>
                        <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" /><span>Automate match status, rank queries, and system patch updates.</span></div>
                        <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" /><span>Link game server webhooks directly to custom chat channels.</span></div>
                      </div>
                    </div>
                  )}

                  {activeIndustry === "edu" && (
                    <div className="space-y-4">
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Coordinate schedules, deadlines, and parent updates automatically:</p>
                      <div className="space-y-3 text-xs md:text-sm font-medium">
                        <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" /><span>Automate class registrations and program FAQs.</span></div>
                        <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" /><span>Send broadcast reminders for payment deadlines or events.</span></div>
                        <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" /><span>Provide safe parent channels with automated routing.</span></div>
                      </div>
                    </div>
                  )}

                  {activeIndustry === "enterprise" && (
                    <div className="space-y-4">
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Deploy customized multi-agent setups with absolute sovereign scale:</p>
                      <div className="space-y-3 text-xs md:text-sm font-medium">
                        <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" /><span>SSO authentication, custom workflows, and detailed audit trails.</span></div>
                        <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" /><span>Dedicated workspace partitions for multiple brands or branches.</span></div>
                        <div className="flex gap-3"><CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" /><span>High throughput API routing utilizing cloud load balancers.</span></div>
                      </div>
                    </div>
                  )}

                </div>

                <div className="h-48 md:h-64 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex flex-col items-center justify-center p-6 text-center space-y-2">
                  <div className="text-4xl md:text-5xl font-black text-primary tracking-tight">
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
          </div>
        </section>

        {/* Enterprise Security Section */}
        <section id="security" className="py-20 lg:py-28 border-t border-border/40 bg-muted/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
            <h2 className="text-3xl font-extrabold tracking-tight">Zero Trust. Full Control.</h2>
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
                <div key={i} className="p-6 rounded-2xl bg-card border border-border/40 space-y-4 hover:border-primary/20 transition-all duration-300">
                  <div className="h-10 w-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight">{item.title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section id="faq" className="py-20 lg:py-28">
          <div className="container mx-auto px-4 max-w-3xl text-center space-y-16">
            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold tracking-tight">Frequently Asked Questions</h2>
              <p className="text-base text-muted-foreground">Find answers to common technical and licensing questions.</p>
            </div>

            <div className="text-left space-y-4">
              {[
                { 
                  q: "How does HopeChat2 differ from traditional SaaS chat platforms?", 
                  a: "Traditional SaaS platforms store your customer conversations on their servers and charge you per team member per month. HopeChat2 is a self-hosted template: you host it on your own server, meaning you pay zero per-seat licensing fees and retain full compliance ownership over your database logs." 
                },
                { 
                  q: "What do I need to prepare before self-hosting HopeChat2?", 
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
                <div key={i} className="rounded-xl border border-border/40 bg-card overflow-hidden">
                  <button 
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    className="w-full px-6 py-4 flex justify-between items-center text-left font-bold text-foreground text-sm sm:text-base hover:bg-muted/30 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground", activeFaq === i && "rotate-90 text-primary")} />
                  </button>
                  {activeFaq === i && (
                    <div className="px-6 pb-4 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/20 font-medium">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 p-8 md:p-16 lg:p-20 text-center text-primary-foreground overflow-hidden relative shadow-xl">
              {/* Blur backdrop bubbles */}
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none">Ready to Own Your Chat Infrastructure?</h2>
                <p className="text-sm sm:text-base text-primary-foreground/80 leading-relaxed font-medium">
                  Deploy HopeChat2 in minutes. Start managing customer deals, conversations, and automated AI agents directly on your cloud.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Link href="/signup" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto bg-primary-foreground text-emerald-900 hover:bg-primary-foreground/95 h-12 px-8 text-base font-bold rounded-xl active:scale-[0.98] transition-transform shadow-lg shadow-black/10">
                      Get Started Free
                    </Button>
                  </Link>
                  <Link href="/login" className="text-sm font-bold text-primary-foreground/90 hover:text-primary-foreground transition-colors py-2 px-4">
                    Contact Support Team
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border/40 pt-16 pb-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <MessageSquare className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold tracking-tight text-foreground">HopeChat2</span>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The open-source, self-hosted web chat CRM and multi-agent AI assistant platform. Built for privacy, ownership, and scale.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Product</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#features" className="hover:text-primary transition-colors">Shared Inbox</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">AI Agents</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">Kanban Pipelines</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">No-Code Builder</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Solutions</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><button onClick={() => setActiveIndustry("retail")} className="hover:text-primary transition-colors text-left">E-commerce</button></li>
                <li><button onClick={() => setActiveIndustry("finance")} className="hover:text-primary transition-colors text-left">Finance</button></li>
                <li><button onClick={() => setActiveIndustry("gaming")} className="hover:text-primary transition-colors text-left">Gaming</button></li>
                <li><button onClick={() => setActiveIndustry("enterprise")} className="hover:text-primary transition-colors text-left">Enterprise</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-4">Sovereign Cloud</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li><Link href="#" className="hover:text-primary transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">GitHub Repository</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Supabase Setup</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Hostinger Deploy</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-border/30 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            <p>© {new Date().getFullYear()} HopeChat2 AI. GDPR Compliant. MIT Licensed.</p>
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
