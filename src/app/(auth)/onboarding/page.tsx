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
    e?.preventDefault();
    console.log("[Onboarding] handleSubmit triggered");
    alert("Submission started!"); // Direct feedback

    if (!profile?.business_id) {
      const msg = "Session error: Workspace ID not found.";
      console.error("[Onboarding] " + msg);
      setError(msg);
      alert(msg);
      return;
    }

    if (!businessName.trim()) {
      setError("Please enter a business name.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      console.log("[Onboarding] Updating business:", profile.business_id, "to", businessName.trim());
      
      const { error: updateError, data, status } = await supabase
        .from("businesses")
        .update({ name: businessName.trim() })
        .eq("id", profile.business_id)
        .select();

      console.log("[Onboarding] Supabase response status:", status);

      if (updateError) {
        console.error("[Onboarding] Update error:", updateError);
        const errMsg = `Update failed: ${updateError.message} (Code: ${updateError.code})`;
        setError(errMsg);
        alert(errMsg);
        setLoading(false);
        return;
      }

      console.log("[Onboarding] Update successful:", data);
      alert("Update successful! Refreshing profile...");
      
      await refreshProfile();
      console.log("[Onboarding] Profile refreshed. Redirecting...");
      
      router.push("/dashboard");
    } catch (err) {
      console.error("[Onboarding] Caught exception:", err);
      const errMsg = "Unexpected error: " + (err instanceof Error ? err.message : String(err));
      setError(errMsg);
      alert(errMsg);
      setLoading(false);
    }
  };

  if (authLoading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">Loading Authentication...</p>
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
          </div>
        </div>

        <div className="bg-card p-8 rounded-2xl border border-border shadow-2xl">
          {error && (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                placeholder="Acme Inc."
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={loading}
                className="h-12"
              />
              {!profile?.business_id && (
                <p className="text-xs text-destructive">
                  Still connecting to workspace... 
                  <button type="button" onClick={() => refreshProfile()} className="underline ml-1">Retry</button>
                </p>
              )}
            </div>

            <button 
              type="button"
              onClick={(e) => {
                console.log("[Onboarding] Button clicked directly");
                handleSubmit(e as any);
              }}
              disabled={loading || !businessName.trim() || !profile?.business_id}
              className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? "Saving..." : "Enter Dashboard"}
            </button>
            
            <p className="text-center text-xs text-muted-foreground pt-2">
              Connected as: {profile?.email || "Unknown"}
            </p>
          </div>
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
