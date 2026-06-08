"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, ArrowRight, Sparkles } from "lucide-react";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

function OnboardingContent() {
  const { profile, refreshProfile, loading: authLoading } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && profile && profile.business?.name !== "My Business") {
      router.push("/dashboard");
    }
  }, [profile, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Onboarding] Starting submission...");
    console.log("[Onboarding] Profile state:", { 
      business_id: profile?.business_id, 
      user_id: profile?.id,
      loading: authLoading 
    });

    if (!profile?.business_id) {
      console.error("[Onboarding] No business_id found in profile");
      setError("Session error: Workspace ID not found. Please try logging out and back in.");
      return;
    }

    if (!businessName.trim()) {
      setError("Please enter a business name.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      console.log("[Onboarding] Attempting to update business name to:", businessName);
      const { error: updateError, data } = await supabase
        .from("businesses")
        .update({ name: businessName.trim() })
        .eq("id", profile.business_id)
        .select();

      if (updateError) {
        console.error("[Onboarding] Supabase update error:", updateError);
        setError(`Update failed: ${updateError.message}`);
        setLoading(false);
        return;
      }

      console.log("[Onboarding] Update successful, result:", data);
      console.log("[Onboarding] Refreshing profile...");
      
      await refreshProfile();
      
      console.log("[Onboarding] Redirection to dashboard...");
      router.push("/dashboard");
    } catch (err) {
      console.error("[Onboarding] Unexpected error during submission:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_50%,rgba(16,185,129,0.05),transparent)]" />
      
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/20">
            <MessageSquare className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
              Let&apos;s name your workspace <Sparkles className="h-5 w-5 text-primary" />
            </h1>
            <p className="text-muted-foreground text-lg">
              One last step to get you started with HopeChat.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-card p-8 rounded-2xl border border-border shadow-2xl shadow-black/20">
          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in shake duration-500">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="businessName" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Business Name
            </Label>
            <Input
              id="businessName"
              placeholder="e.g. Acme Corporation"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              autoFocus
              disabled={loading || !profile?.business_id}
              className="h-12 bg-muted/30 border-border text-lg focus-visible:ring-primary/20"
            />
            {!profile?.business_id && !authLoading && (
              <p className="text-xs text-destructive pt-1">
                Session still loading... If this takes too long, try{" "}
                <button 
                  type="button" 
                  onClick={() => refreshProfile()} 
                  className="underline hover:text-destructive/80"
                >
                  refreshing your session
                </button>.
              </p>
            )}
            <p className="text-xs text-muted-foreground pt-1">
              This is how your team and workspace will be identified.
            </p>
          </div>

          <Button 
            disabled={loading || !businessName.trim() || !profile?.business_id} 
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 group transition-all active:scale-[0.98]"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Setting up...
              </div>
            ) : !profile?.business_id ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Initializing...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 font-bold text-lg">
                Enter Dashboard <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </div>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <AuthProvider>
      <OnboardingContent />
    </AuthProvider>
  );
}
