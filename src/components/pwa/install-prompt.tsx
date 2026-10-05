"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

// BeforeInstallPromptEvent isn't in lib.dom yet (it landed in TS as an
// open proposal), so declare the shape we actually use. `prompt()` and
// `userChoice` are the whole reason we intercept this event — the browser's
// own install UI is not something a page can trigger on demand.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallState =
  /** Chromium fired beforeinstallprompt — we can drive the real dialog. */
  | "native"
  /** iOS Safari: no event exists, but Add to Home Screen does. */
  | "manual"
  /** Already installed, unsupported, or the user said no. Show nothing. */
  | "unavailable";

const DISMISSED_KEY = "hopechat_install_dismissed";
const DAYS_BETWEEN_OFFERS = 30;
const MS_PER_DAY = 86400000;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari still exposes the legacy vendor-only property.
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function isIOS(): boolean {
  // iPadOS 13+ reports as desktop Safari; the touch-point count is the
  // only reliable tell.
  return (
    /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Dismissals are respected, but only for a month — people upgrade phones. */
function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return Number.isFinite(at) && Date.now() - at < DAYS_BETWEEN_OFFERS * MS_PER_DAY;
  } catch {
    // Private mode / blocked storage — treat as not dismissed.
    return false;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // Best-effort only.
  }
}

/**
 * Asks the browser to install HopeChat as a standalone app.
 *
 * Chromium: we hold the `beforeinstallprompt` event and fire it from our
 * own button, so the copy and the timing are ours. iOS Safari never fires
 * that event, so we fall back to Share → Add to Home Screen instructions.
 *
 * Mount once, inside the authed shell — the manifest's `start_url` is
 * /dashboard, so this is the screen an installed copy opens on.
 */
export function InstallPrompt() {
  const [state, setState] = useState<InstallState>("unavailable");
  const [visible, setVisible] = useState(false);
  // The browser only hands us this event once and it expires, so it has to
  // survive re-renders in a ref — never in state (a state copy would be
  // stale the moment React re-runs).
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onBeforeInstall = (event: Event) => {
      // Suppress Chrome's own mini-infobar: we're presenting a real UI.
      event.preventDefault();
      deferredPrompt.current = event as BeforeInstallPromptEvent;
      setState("native");
      setVisible(true);
    };

    const onInstalled = () => {
      deferredPrompt.current = null;
      setState("unavailable");
      setVisible(false);
      rememberDismissal();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // Safari fires no event, so decide the fallback path ourselves. Phones
    // only — offering "Add to Home Screen" on a desktop is noise.
    if (isIOS()) {
      setState("manual");
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    rememberDismissal();
  }, []);

  const install = useCallback(async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredPrompt.current = null;
    // "accepted" is handled by the appinstalled listener; a refusal means
    // the browser won't ask again on its own, so stop showing up.
    if (outcome === "dismissed") dismiss();
  }, [dismiss]);

  if (!visible || state === "unavailable") return null;

  return (
    <div className="flex flex-col gap-3 border-b border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-semibold">Install HopeChat on this device</p>
          <p className="text-xs text-muted-foreground">
            {state === "native"
              ? "Open it in its own window, launch from your home screen, and jump straight to the inbox."
              : "Tap Share, then choose “Add to Home Screen” to launch HopeChat full-screen."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {state === "native" && (
          <button
            type="button"
            onClick={install}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Download className="h-3.5 w-3.5" />
            Install App
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}