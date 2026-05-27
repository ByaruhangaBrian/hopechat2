import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight, Shield, Zap, BarChart3, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white selection:bg-violet-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">HopeChat</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-900">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-violet-600 hover:bg-violet-500 text-white">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 lg:py-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_50%,rgba(124,58,237,0.1),transparent)]" />
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1 text-sm font-medium text-violet-400 mb-8 animate-fade-in">
              <Zap className="h-3.5 w-3.5" />
              <span>Next-gen WhatsApp Marketing</span>
            </div>
            <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
              Automate your WhatsApp <br className="hidden sm:block" /> with AI Intelligence
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-slate-400 mb-10">
              Connect with your customers on the world&apos;s most popular messaging app. Use AI to handle inquiries, broadcast updates, and manage sales pipelines — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="h-12 px-8 bg-violet-600 hover:bg-violet-500 text-white gap-2">
                  Start your free trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-12 px-8 border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white">
                Book a demo
              </Button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 border-t border-slate-900 bg-slate-950/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Everything you need to scale</h2>
              <p className="text-slate-400">Powerful tools designed for growing businesses.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Smart Automations",
                  description: "Build complex workflows with our drag-and-drop builder to handle every customer journey.",
                  icon: Zap,
                },
                {
                  title: "AI Response Engine",
                  description: "Train our AI on your documents to provide instant, accurate answers 24/7.",
                  icon: MessageSquare,
                },
                {
                  title: "Sales Pipelines",
                  description: "Track deals from first contact to close with integrated CRM functionality.",
                  icon: BarChart3,
                },
                {
                  title: "Bulk Broadcasts",
                  description: "Send personalized updates to thousands of contacts with smart rate-limiting.",
                  icon: Users,
                },
                {
                  title: "Team Inbox",
                  description: "A collaborative workspace for your team to handle customer conversations together.",
                  icon: MessageSquare,
                },
                {
                  title: "Strict Privacy",
                  description: "Enterprise-grade isolation ensuring your data remains your data, always.",
                  icon: Shield,
                },
              ].map((feature, i) => (
                <div key={i} className="group p-8 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-violet-500/50 transition-all">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/10 text-violet-500 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="rounded-3xl bg-violet-600 p-8 md:p-16 text-center text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
              <h2 className="text-3xl md:text-4xl font-bold mb-6 relative z-10">Ready to transform your communication?</h2>
              <p className="text-violet-100 mb-10 max-w-xl mx-auto relative z-10">
                Join hundreds of businesses using HopeChat to automate their customer engagement and boost sales.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                <Link href="/signup">
                  <Button size="lg" className="bg-white text-violet-600 hover:bg-slate-100 h-12 px-8">
                    Get Started Now
                  </Button>
                </Link>
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 h-12 px-8">
                  Contact Sales
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">HopeChat</span>
            </div>
            <div className="flex gap-8 text-sm text-slate-500">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Documentation</a>
            </div>
          </div>
          <div className="text-center text-sm text-slate-600 border-t border-slate-900 pt-8">
            © {new Date().getFullYear()} HopeChat2. All rights reserved. Built with precision for modern teams.
          </div>
        </div>
      </footer>
    </div>
  );
}
