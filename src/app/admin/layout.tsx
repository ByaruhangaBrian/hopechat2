"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Header } from "@/components/layout/header";
import { ShieldCheck } from "lucide-react";

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (!loading && (!user || !user.app_metadata?.is_superadmin)) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="relative flex h-screen items-center justify-center bg-background overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(244,63,94,0.15),rgba(255,255,255,0))]" />
        <div className="relative flex flex-col items-center gap-4 p-8 rounded-2xl border border-border/60 bg-card/70 backdrop-blur-md shadow-2xl">
          <div className="relative flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30">
            <ShieldCheck className="size-6 animate-pulse" />
          </div>
          <div className="text-center">
            <h2 className="text-sm font-bold tracking-tight text-foreground">Super Admin Portal</h2>
            <p className="text-xs text-muted-foreground mt-1">Authenticating security credentials...</p>
          </div>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || !user.app_metadata?.is_superadmin) return null;

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <AdminSidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="relative flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-card/30 via-background to-background">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </AuthProvider>
  );
}
