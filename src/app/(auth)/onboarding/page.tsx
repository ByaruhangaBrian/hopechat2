"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

function OnboardingContent() {
  const { profile, refreshProfile, loading: authLoading } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Only redirect away if the profile is fully loaded AND the name is NOT the default
    if (!authLoading && profile?.business?.name) {
      if (profile.business.name !== "My Business") {
        router.push("/dashboard");
      }
    }
  }, [profile, authLoading, router]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!profile?.business_id) {
      setError("Session error: Workspace ID not found. Please try refreshing.");
      return;
    }

    if (!businessName.trim()) {
      setError("Please enter a business name.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from("businesses")
        .update({ name: businessName.trim() })
        .eq("id", profile.business_id);

      if (updateError) {
        setError(`Update failed: ${updateError.message}`);
        setLoading(false);
        return;
      }

      await refreshProfile();
      router.push("/dashboard");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  if (authLoading) return (
    <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Initializing your workspace...</p>
      </div>
    </div>
  );

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
              Name your workspace <Sparkles className="h-5 w-5 text-primary" />
            </h1>
            <p className="text-muted-foreground">
              Finalize your setup to enter the dashboard.
            </p>
          </div>
        </div>

        <div className="bg-card p-8 rounded-2xl border border-border shadow-2xl">
          {error && (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in shake duration-500">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                placeholder="e.g. Acme Corp"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={loading}
                autoFocus
                className="h-12 bg-muted/30 border-border"
              />
              {!profile?.business_id && (
                <p className="text-xs text-destructive pt-1 flex items-center gap-1">
                  Workspace sync pending...
                  <button type="button" onClick={() => refreshProfile()} className="underline font-medium">
                    Retry now
                  </button>
                </p>
              )}
            </div>

            <Button 
              type="submit"
              disabled={loading || !businessName.trim() || !profile?.business_id}
              className="w-full h-12 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Enter Dashboard <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
            
            <p className="text-center text-xs text-muted-foreground pt-2">
              Logged in as <span className="text-foreground font-medium">{profile?.email}</span>
            </p>
          </form>
        </div>
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
