"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type StatusResponse = {
  terms_version: number;
  privacy_version: number;
  accepted: boolean;
};

export default function ConsentPage() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/consent/status");
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const body = (await res.json()) as StatusResponse & { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Failed to load consent status");
        if (cancelled) return;
        setStatus(body);
        if (body.accepted) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        if (!cancelled) setError("Could not load your consent status. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const accept = useCallback(async () => {
    if (!status) return;
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch("/api/consent/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terms_version: status.terms_version,
          privacy_version: status.privacy_version,
        }),
      });
      const body = (await res.json()) as { result?: boolean } & Record<string, string | number | undefined>;
      if (!res.ok) {
        const msg =
          typeof body.error === "string"
            ? body.error
            : "Could not record your consent. Please try again.";
        // Stale version — reload status so the screen reflects current versions.
        if (typeof body.current_terms_version === "number" || typeof body.current_privacy_version === "number") {
          const statusRes = await fetch("/api/consent/status");
          const fresh = (await statusRes.json()) as StatusResponse;
          if (statusRes.ok) {
            setStatus(fresh);
            if (fresh.accepted) {
              router.replace("/dashboard");
              return;
            }
          }
        }
        setError(msg);
        setAccepting(false);
        return;
      }
      router.replace("/dashboard");
    } catch {
      setError("Network error while recording your consent. Please try again.");
      setAccepting(false);
    }
  }, [status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shadow-lg shadow-primary/5">
            <MessageSquare className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back to HopeChat</h1>
          <p className="mt-2 text-muted-foreground">
            Our Terms of Service and Privacy Policy have been updated.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Please review and accept</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                To continue using HopeChat, please review and accept our updated{" "}
                <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="my-5 border-t border-border" />

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in zoom-in-95 duration-300"
            >
              {error}
            </div>
          )}

          <Button
            type="button"
            onClick={accept}
            disabled={loading || accepting || !status}
            className="h-11 w-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
          >
            {accepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording consent...
              </>
            ) : (
              <>
                Accept and continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          {!status && loading && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
              Checking your account...
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need help?{" "}
          <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
            Read the Terms
          </Link>{" "}
          or{" "}
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}