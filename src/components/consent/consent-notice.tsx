"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONSENT_EVENT = "hopechat:consent-pending";
const OPEN_CONSENT_EVENT = "hopechat:consent-open";
const DISMISS_KEY = "hc_consent_dismissed";

type Versions = { terms: number; privacy: number };

function announcePending(pending: boolean) {
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { pending } }));
}

/**
 * Blocking-but-dismissible consent notice for `soft` tenants (Task 15).
 *
 * - Shows once per browser until dismissed (or until accepted).
 * - Accept calls `POST /api/consent/accept`; on success the notice and the
 *   sidebar badge clear with no full reload.
 * - Failure keeps the notice open with an inline `role="alert"` error.
 * - While open, focus is trapped and Esc dismisses.
 *
 * Hard-gated (`required`) tenants never reach the dashboard — the proxy
 * redirects them to /consent — so anything that renders here is soft or
 * pre-cutoff and must not be blocked from working.
 */
export function ConsentNotice() {
  const [versions, setVersions] = useState<Versions | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Load consent status once on mount.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/consent/status");
        if (!res.ok) return;
        const body = (await res.json()) as {
          terms_version?: number;
          privacy_version?: number;
          accepted: boolean;
        };
        if (cancelled) return;
        if (body.accepted) {
          announcePending(false);
          return;
        }
        const next: Versions = {
          terms: body.terms_version ?? 1,
          privacy: body.privacy_version ?? 1,
        };
        setVersions(next);
        let dismissed = false;
        try {
          dismissed = localStorage.getItem(DISMISS_KEY) === "1";
        } catch {
          // localStorage may be unavailable (SSR); show the notice.
        }
        announcePending(true);
        if (!dismissed) setOpen(true);
      } catch {
        // Never break the dashboard over the notice.
      }
    }

    void load();

    const onOpenRequest = () => {
      setError(null);
      setOpen(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, onOpenRequest);
    return () => {
      cancelled = true;
      window.removeEventListener(OPEN_CONSENT_EVENT, onOpenRequest);
    };
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    announcePending(true);
  }, []);

  // Focus trap + Esc while open.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = overlayRef.current;

    function focusables(): HTMLElement[] {
      if (!container) return [];
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );
    }

    const list = focusables();
    list[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        return;
      }
      if (e.key !== "Tab") return;
      const current = focusables();
      if (current.length === 0) return;
      const first = current[0];
      const last = current[current.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [open, dismiss]);

  const accept = useCallback(async () => {
    if (!versions || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/consent/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terms_version: versions.terms,
          privacy_version: versions.privacy,
        }),
      });
      const body = (await res.json()) as Record<string, string | number | undefined> | null;
      if (!res.ok) {
        // Stale versions — re-fetch so a retry uses the live versions.
        if (
          typeof body?.current_terms_version === "number" ||
          typeof body?.current_privacy_version === "number"
        ) {
          const fresh = await fetch("/api/consent/status");
          const freshBody = (await fresh.json()) as {
            terms_version?: number;
            privacy_version?: number;
            accepted?: boolean;
          };
          if (fresh.ok && freshBody.accepted) {
            announcePending(false);
            setOpen(false);
            setSubmitting(false);
            return;
          }
          if (fresh.ok) {
            setVersions({
              terms: freshBody.terms_version ?? versions.terms,
              privacy: freshBody.privacy_version ?? versions.privacy,
            });
            setError("Our policies were updated while you were reviewing. Please review and accept again.");
            setSubmitting(false);
            return;
          }
        }
        setError(typeof body?.error === "string" ? body.error : "Could not record your consent. Please try again.");
        setSubmitting(false);
        return;
      }
      announcePending(false);
      setOpen(false);
      setSubmitting(false);
    } catch {
      setError("Network error while recording your consent. Please try again.");
      setSubmitting(false);
    }
  }, [versions, submitting]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-notice-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss notice"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <h2 id="consent-notice-title" className="mt-4 text-lg font-semibold text-foreground">
          Please review our updated policies
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          To continue using HopeChat, please review and accept our updated{" "}
          <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
            Privacy Policy
          </Link>
          . You can dismiss this for now, but a reminder will stay in your sidebar.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in zoom-in-95 duration-300"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={accept}
            disabled={submitting || !versions}
            className="h-11 flex-1 bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Recording consent...
              </>
            ) : (
              "Accept and continue"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={dismiss}
            disabled={submitting}
            className="h-11 text-muted-foreground hover:bg-muted"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}

export const consentEvents = { CONSENT_EVENT, OPEN_CONSENT_EVENT };