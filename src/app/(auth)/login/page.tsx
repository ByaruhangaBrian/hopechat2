"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, ShieldCheck, Zap, BarChart3, Globe } from "lucide-react";
import { GoogleIcon } from "@/components/ui/google-icon";
import { logHttpEvent } from "@/lib/logs/http-logs";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      
      void logHttpEvent({
        direction: 'system',
        service: 'auth',
        endpoint: 'login',
        payload: { email, error: error.message },
        statusCode: 401,
        note: 'login_failed'
      });
      return;
    }

    void logHttpEvent({
      userId: data.user.id,
      direction: 'system',
      service: 'auth',
      endpoint: 'login',
      payload: { email },
      statusCode: 200,
      note: 'login_success'
    });

    router.push("/dashboard");
  };

  const handleGoogleLogin = async () => {
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

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-background">
      {/* Left side: Branding & Info (Hidden on mobile) */}
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
            The intelligent hub for <br />
            <span className="text-primary">WhatsApp Marketing.</span>
          </h1>
          
          <div className="space-y-6">
            {[
              { icon: Zap, text: "Automate responses with custom AI logic" },
              { icon: BarChart3, text: "Track sales pipelines and deal value" },
              { icon: ShieldCheck, text: "Enterprise-grade data isolation" },
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
            Trusted by businesses worldwide
          </p>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12">
        <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Mobile Header (Visible only on small screens) */}
          <div className="lg:hidden flex flex-col items-center mb-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <MessageSquare className="h-6 w-6 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">HopeChat</h2>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="mt-2 text-muted-foreground">
              Please enter your details to sign in
            </p>
          </div>

          <div className="grid gap-4">
            <Button
              variant="outline"
              type="button"
              className="h-11 border-border bg-card hover:bg-muted/50 transition-colors"
              onClick={handleGoogleLogin}
            >
              <GoogleIcon className="mr-2 h-4 w-4" />
              Continue with Google
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-4 text-muted-foreground font-medium">
                  Or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="grid gap-4">
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

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-muted/30 border-border focus-visible:ring-primary/20"
                />
              </div>

              <Button type="submit" disabled={loading} className="h-11 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Signing in...
                  </div>
                ) : (
                  "Sign in to account"
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
