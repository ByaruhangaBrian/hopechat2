"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  MessageSquare, 
  CheckCircle, 
  ArrowLeft, 
  Zap, 
  BarChart3, 
  ShieldCheck, 
  Globe 
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-8 text-center animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col items-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-xl shadow-primary/5">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Check your email</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-sm">
              We&apos;ve sent a password reset link to <span className="font-semibold text-foreground">{email}</span>.
            </p>
          </div>
          <div className="pt-4">
            <Link href="/login">
              <Button variant="outline" className="h-11 px-8 border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                Back to sign in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-background">
      {/* Left side: Branding & Info */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-muted/30 border-r border-border relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_50%,rgba(16,185,129,0.05),transparent)]" />
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <MessageSquare className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">HopeChat</span>
        </div>

        <div className="space-y-8 relative z-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            Forgot your password? <br />
            <span className="text-primary">We&apos;ve got you covered.</span>
          </h1>
          
          <div className="space-y-6">
            {[
              { icon: Zap, text: "Fast and secure recovery" },
              { icon: BarChart3, text: "Resume your sales tracking" },
              { icon: ShieldCheck, text: "Protected authentication flow" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="text-lg text-muted-foreground font-medium group-hover:text-foreground transition-colors duration-300">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Reliable support for your business
          </p>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12">
        <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Mobile Header */}
          <div className="lg:hidden flex flex-col items-center mb-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <MessageSquare className="h-6 w-6 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">HopeChat</h2>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Reset password</h2>
            <p className="mt-2 text-muted-foreground">
              Enter your email and we&apos;ll send you a recovery link
            </p>
          </div>

          <form onSubmit={handleReset} className="grid gap-4">
            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in zoom-in-95 duration-300">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-muted/30 border-border focus-visible:ring-primary/20"
              />
            </div>

            <Button disabled={loading} className="h-11 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Sending...
                </div>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
