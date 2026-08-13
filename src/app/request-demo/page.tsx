"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  ArrowRight,
  Check,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  Zap,
  Sparkles,
  Menu,
  X,
} from "lucide-react";

const CONTACT_PHONE = "+256 763 149 276";
const CONTACT_EMAIL = "hopetechsolutionsltd@gmail.com";

const COMPANY_SIZES = [
  { value: "1-5", label: "1–5 staff (Small business)" },
  { value: "6-20", label: "6–20 staff (Growing business)" },
  { value: "21-50", label: "21–50 staff (Medium business)" },
  { value: "50+", label: "50+ staff (Large business)" },
];

const SERVICE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "meta-config", label: "Meta / WhatsApp API configuration" },
  { value: "automation-setup", label: "Automation setup" },
  { value: "ai-training", label: "AI assistant training" },
  { value: "broadcast-setup", label: "Broadcast & campaign setup" },
  { value: "team-training", label: "Team onboarding & training" },
  { value: "integrations", label: "Custom integrations" },
];

const inputClass =
  "h-11 bg-muted/30 border-border focus-visible:ring-primary/20";

export default function RequestDemoPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    companySize: "",
    phone: "",
    email: "",
    services: [] as string[],
    message: "",
  });

  const toggleService = (value: string) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(value)
        ? prev.services.filter((s) => s !== value)
        : [...prev.services, value],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/request-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again or reach us directly.");
      setLoading(false);
    }
  };

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
              <Link href="/#features" className="hover:text-primary transition-colors duration-200">Features</Link>
              <Link href="/#pricing" className="hover:text-primary transition-colors duration-200">Pricing</Link>
              <Link href="/#setup-service" className="hover:text-primary transition-colors duration-200">Setup Service</Link>
              <Link href="/#faq" className="hover:text-primary transition-colors duration-200">FAQ</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold text-muted-foreground hover:text-foreground h-9 px-4 hidden sm:inline-flex")}>Log In</Link>
            <Link href="/signup" className={cn(buttonVariants(), "bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 h-9 text-xs sm:text-sm shadow-lg shadow-primary/20 transition-all duration-300 rounded-lg border-0")}>Start Free Trial</Link>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground" aria-label="Toggle Menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="md:hidden border-b border-border bg-white px-4 py-4 space-y-3">
            {[
              { label: "Features", href: "/#features" },
              { label: "Pricing", href: "/#pricing" },
              { label: "Setup Service", href: "/#setup-service" },
              { label: "FAQ", href: "/#faq" },
            ].map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-background">{l.label}</Link>
            ))}
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)} className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}>Log In</Link>
            </div>
          </motion.div>
        )}
      </header>

      <main className="flex-1">
        <section className="relative py-16 md:py-24 overflow-hidden bg-white">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[150px]" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/[0.04] rounded-full blur-[120px]" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">

              {/* ─── Left: pitch / contact ─── */}
              <motion.div className="flex-1 max-w-xl space-y-8" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs sm:text-sm font-bold text-foreground">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  Free demo · No commitment
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-foreground">
                  See HopeChat in action.
                  <br />
                  <span className="text-primary">We&apos;ll set it up for you.</span>
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
                  Book a free walkthrough and see how HopeChat turns WhatsApp into your best
                  sales channel. Prefer a done-for-you setup? We configure Meta, train your AI,
                  and build your automations for a one-time fee based on company size — starting
                  at 300,000 UGX.
                </p>

                <div className="space-y-3">
                  {[
                    { icon: Check, text: "Free live demo — see the product on your own business scenario" },
                    { icon: Sparkles, text: "Get a custom setup-service quote for your company size" },
                    { icon: ShieldCheck, text: "No commitment — try the free trial before you pay anything" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{item.text}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-border bg-background/50 p-6 space-y-4">
                  <div className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Prefer to talk now?</div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">Call or WhatsApp</div>
                      <a href="tel:+256763149276" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">{CONTACT_PHONE}</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">Email us</div>
                      <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">{CONTACT_EMAIL}</a>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ─── Right: form / success ─── */}
              <motion.div className="flex-1 w-full" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
                <div className="rounded-2xl border border-border bg-white shadow-xl shadow-black/[0.04] overflow-hidden">
                  {submitted ? (
                    <div className="p-8 md:p-12 text-center space-y-6">
                      <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <Check className="h-8 w-8" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Request received!</h2>
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium max-w-md mx-auto">
                        Thanks, {form.name.split(" ")[0] || "there"}! Our team will reach out within
                        1 business day to schedule your demo. A confirmation email is on its way.
                      </p>
                      <div className="text-sm text-muted-foreground font-medium">
                        Need us sooner? Call/WhatsApp{" "}
                        <a href="tel:+256763149276" className="font-bold text-primary hover:text-primary/80">{CONTACT_PHONE}</a>{" "}
                        or email{" "}
                        <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-primary hover:text-primary/80">{CONTACT_EMAIL}</a>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto h-11 px-6 rounded-xl")}>Back to Home</Link>
                        <Link href="/signup" className={cn(buttonVariants(), "w-full sm:w-auto h-11 px-6 rounded-xl border-0 shadow-lg shadow-primary/20 group")}>
                          Start Free Trial
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-6">
                      <div className="space-y-1">
                        <h2 className="text-xl font-extrabold tracking-tight text-foreground">Request your free demo</h2>
                        <p className="text-sm text-muted-foreground font-medium">Takes under a minute. We&apos;ll reply within 1 business day.</p>
                      </div>

                      {error && (
                        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                          {error}
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-5">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Full name *</Label>
                          <Input id="name" required autoComplete="name" placeholder="Jane Atim" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="businessName">Business / company name *</Label>
                          <Input id="businessName" required autoComplete="organization" placeholder="Atim Traders Ltd" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className={inputClass} />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="companySize">Company size *</Label>
                        <select
                          id="companySize"
                          required
                          value={form.companySize}
                          onChange={(e) => setForm({ ...form, companySize: e.target.value })}
                          className={cn(inputClass, "w-full rounded-lg border px-3 text-sm font-medium bg-muted/30 border-border outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50", !form.companySize && "text-muted-foreground")}
                        >
                          <option value="" disabled>Select your company size</option>
                          {COMPANY_SIZES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-5">
                        <div className="grid gap-2">
                          <Label htmlFor="phone">Phone / WhatsApp *</Label>
                          <Input id="phone" required type="tel" autoComplete="tel" placeholder="+256 7xx xxx xxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="email">Work email *</Label>
                          <Input id="email" required type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label>What are you interested in?</Label>
                        <div className="flex flex-wrap gap-2">
                          {SERVICE_OPTIONS.map((s) => {
                            const active = form.services.includes(s.value);
                            return (
                              <button
                                key={s.value}
                                type="button"
                                onClick={() => toggleService(s.value)}
                                aria-pressed={active}
                                className={cn(
                                  "rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all duration-200",
                                  active
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                )}
                              >
                                {active && <Check className="mr-1 inline h-3 w-3" />}
                                {s.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="message">Preferred demo time or message</Label>
                        <Textarea id="message" rows={3} placeholder="e.g. Best time: weekday mornings. We run a 12-person retail business and mainly want AI training." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="bg-muted/30 border-border focus-visible:ring-primary/20" />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className={cn(buttonVariants({ size: "lg" }), "w-full h-12 rounded-xl border-0 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/25 transition-all active:scale-[0.98]")}
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                            Sending request...
                          </div>
                        ) : (
                          <>
                            Request Demo
                            <ArrowRight className="ml-2 h-4.5 w-4.5" />
                          </>
                        )}
                      </button>

                      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        We respond within 1 business day — free, no commitment.
                      </p>
                    </form>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="bg-white border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            © {new Date().getFullYear()} HopeChat by HopeTech Solutions Ltd. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-muted-foreground">
            <a href="tel:+256763149276" className="hover:text-primary transition-colors">{CONTACT_PHONE}</a>
            <span className="text-muted-foreground/40">·</span>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-primary transition-colors">{CONTACT_EMAIL}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
