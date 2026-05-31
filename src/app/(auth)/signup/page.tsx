"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageSquare, CheckCircle } from "lucide-react";

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
          // Store WhatsApp config in metadata for post-confirmation auto-setup
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

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl text-white">
              Check your email
            </CardTitle>
            <CardDescription className="text-slate-400">
              We&apos;ve sent a confirmation link to{" "}
              <span className="text-white">{email}</span>. Please check your
              inbox and click the link to verify your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button
                variant="outline"
                className="w-full border-slate-700 text-slate-300 hover:bg-muted hover:text-white"
              >
                Back to sign in
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl text-white">Create account</CardTitle>
          <CardDescription className="text-slate-400">
            Get started with HopeChat
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleNextStep} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="fullName" className="text-slate-300">
                  Full name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="border-slate-700 bg-muted text-white placeholder:text-slate-500 focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="businessName" className="text-slate-300">
                  Business name
                </Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="Acme Inc."
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  className="border-slate-700 bg-muted text-white placeholder:text-slate-500 focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-slate-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-slate-700 bg-muted text-white placeholder:text-slate-500 focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-slate-300">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-slate-700 bg-muted text-white placeholder:text-slate-500 focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">
                  Confirm password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="border-slate-700 bg-muted text-white placeholder:text-slate-500 focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <Button
                type="submit"
                className="mt-2 h-10 w-full bg-primary text-white hover:bg-primary"
              >
                Continue setup
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-white">WhatsApp Configuration (Optional)</h3>
                <p className="text-xs text-slate-400">Link your Meta WhatsApp Business API now or skip to do it later in settings.</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="phoneNumberId" className="text-slate-300">
                  Phone Number ID
                </Label>
                <Input
                  id="phoneNumberId"
                  placeholder="e.g. 100234567890123"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  className="border-slate-700 bg-muted text-white placeholder:text-slate-500"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="wabaId" className="text-slate-300">
                  WhatsApp Business Account ID
                </Label>
                <Input
                  id="wabaId"
                  placeholder="e.g. 100234567890456"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  className="border-slate-700 bg-muted text-white placeholder:text-slate-500"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="accessToken" className="text-slate-300">
                  Permanent Access Token
                </Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="Enter your Meta access token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="border-slate-700 bg-muted text-white placeholder:text-slate-500"
                />
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-10 w-full bg-primary text-white hover:bg-primary"
                >
                  {loading ? "Creating account..." : "Finish setup"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleSignup()}
                  disabled={loading}
                  className="text-slate-400 hover:bg-muted hover:text-white"
                >
                  Skip for now
                </Button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary hover:text-primary"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

