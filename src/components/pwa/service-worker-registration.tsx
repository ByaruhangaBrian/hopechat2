"use client";

import { useEffect } from "react";

// Registers /sw.js, which Chromium requires before it will offer to install
// HopeChat as an app (see public/sw.js). Without a registered worker there
// is no `beforeinstallprompt`, and the install banner in
// components/pwa/install-prompt.tsx can never appear.
//
// Deliberately not registered in development: the dev server rewrites
// modules on every edit, and a worker sitting in front of that makes stale
// chunks very hard to reason about.

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // Register after load so the worker never competes with first paint or
    // with Next's own chunk prefetching.
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((error) => {
          // A failed worker costs the install prompt, nothing else. Never
          // let it break the app.
          console.error("[PWA] Service worker registration failed:", error);
        });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}