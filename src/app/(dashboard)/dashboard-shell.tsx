"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/client";

// Auth-gated dashboard shell. Extracted from the layout so the layout
// itself can stay a server component and export metadata (noindex) —
// client components can't export Next's metadata object.

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  // Profile loading state - wait for profile if user is present
  const loading = authLoading || (user && !profile);

  // Sidebar drawer state — only used on mobile. On lg+ the sidebar is
  // always visible and this stays at `false` (ignored by the component).
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (profile?.business?.name === "My Business") {
        router.push("/onboarding");
      }
    }
  }, [user, profile, loading, router]);

  // Handle post-signup onboarding automation
  useEffect(() => {
    async function processOnboarding() {
      // Read WhatsApp config from sessionStorage (set during signup)
      let onboardingConfig: Record<string, string> | null = null;
      try {
        const stored = sessionStorage.getItem('onboarding_whatsapp');
        if (stored) {
          onboardingConfig = JSON.parse(stored);
        }
      } catch {
        return;
      }

      if (!onboardingConfig) return;

      try {
        console.log("[Onboarding] Automating WhatsApp setup...");
        const res = await fetch('/api/whatsapp/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(onboardingConfig),
        });

        if (res.ok) {
          console.log("[Onboarding] WhatsApp setup successful. Clearing sessionStorage...");
          sessionStorage.removeItem('onboarding_whatsapp');
        } else {
          const errData = await res.json();
          console.error('[Onboarding] WhatsApp setup failed:', errData.error);
        }
      } catch (err) {
        console.error('[Onboarding] WhatsApp setup exception:', err);
      }
    }

    if (!loading && user) {
      processOnboarding();
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        {/* Thinner horizontal padding on mobile so cards have room to breathe. */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </AuthProvider>
  );
}

