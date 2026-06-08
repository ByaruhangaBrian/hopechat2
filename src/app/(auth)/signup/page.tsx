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
  Zap, 
  BarChart3, 
  ShieldCheck, 
  Globe,
  ArrowRight,
  ChevronLeft
} from "lucide-react";
import { GoogleIcon } from "@/components/ui/google-icon";
import { logHttpEvent } from "@/lib/logs/http-logs";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // WhatsApp Setup (Step 2)
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setStep(2);
  };

  const handleSignup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          business_name: businessName,
          onboarding_whatsapp: phoneNumberId ? {
            phone_number_id: phoneNumberId,
            waba_id: wabaId,
            access_token: accessToken,
          } : null,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);

      void logHttpEvent({
        direction: 'system',
        service: 'auth',
        endpoint: 'signup',
        payload: { email, businessName, error: error.message },
        statusCode: 400,
        note: 'signup_failed'
      });
      return;
    }

    void logHttpEvent({
      userId: data.user?.id,
      direction: 'system',
      service: 'auth',
      endpoint: 'signup',
      payload: { email, businessName },
      statusCode: 201,
      note: 'signup_success'
    });

    setSuccess(true);
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    }
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
              We&apos;ve sent a confirmation link to <span className="font-semibold text-foreground">{email}</span>.
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
            Scale your business with <br />
            <span className="text-primary">Conversational AI.</span>
          </h1>
          
          <div className="space-y-6">
            {[
              { icon: Zap, text: "Set up automations in minutes" },
              { icon: BarChart3, text: "Visual pipelines for deal tracking" },
              { icon: ShieldCheck, text: "Privacy-first, self-hosted option" },
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
            Empowering modern support teams
          </p>
        </div>
      </div>

      {/* Right side: Signup Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-sm space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Mobile Header */}
          <div className="lg:hidden flex flex-col items-center mb-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <MessageSquare className="h-6 w-6 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">HopeChat</h2>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {step === 1 ? "Create account" : "Connect WhatsApp"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {step === 1 
                ? "Join hundreds of businesses today" 
                : "Optional: Skip this now to do it later"}
            </p>
          </div>

          <div className="grid gap-4">
            {step === 1 && (
              <>
                <Button
                  variant="outline"
                  type="button"
                  className="h-11 border-border bg-card hover:bg-muted/50 transition-colors"
                  onClick={handleGoogleSignup}
                >
                  <GoogleIcon className="mr-2 h-4 w-4" />
                  Sign up with Google
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-4 text-muted-foreground font-medium">
                      Or use your email
                    </span>
                  </div>
                </div>

                <form onSubmit={handleNextStep} className="grid gap-4">
                  {error && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in zoom-in-95 duration-300">
                      {error}
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      disabled={loading}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-11 bg-muted/30 border-border"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="businessName">Business name</Label>
                    <Input
                      id="businessName"
                      placeholder="Acme Inc."
                      disabled={loading}
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                      className="h-11 bg-muted/30 border-border"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      disabled={loading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 bg-muted/30 border-border"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 6 characters"
                      disabled={loading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 bg-muted/30 border-border"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repeat password"
                      disabled={loading}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="h-11 bg-muted/30 border-border"
                    />
                  </div>

                  <Button type="submit" className="h-11 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 group transition-all active:scale-[0.98]">
                    Continue setup
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </form>
              </>
            )}

            {step === 2 && (
              <form onSubmit={handleSignup} className="grid gap-4 animate-in slide-in-from-right-4 duration-500">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 mb-2">
                  <p className="text-xs text-primary font-medium leading-relaxed">
                    Link your Meta WhatsApp Business API now to start sending messages immediately. You can also skip this and configure it later.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                  <Input
                    id="phoneNumberId"
                    placeholder="e.g. 100234567890123"
                    disabled={loading}
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    className="h-11 bg-muted/30 border-border"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="wabaId">WhatsApp Business Account ID</Label>
                  <Input
                    id="wabaId"
                    placeholder="e.g. 100234567890456"
                    disabled={loading}
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    className="h-11 bg-muted/30 border-border"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="accessToken">Permanent Access Token</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    placeholder="Enter Meta access token"
                    disabled={loading}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="h-11 bg-muted/30 border-border"
                  />
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  <Button disabled={loading} className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Creating account...
                      </div>
                    ) : (
                      "Finish account setup"
                    )}
                  </Button>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStep(1)}
                      disabled={loading}
                      className="flex-1 h-11 text-muted-foreground hover:bg-muted"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleSignup()}
                      disabled={loading}
                      className="flex-1 h-11 text-muted-foreground hover:bg-muted"
                    >
                      Skip for now
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
