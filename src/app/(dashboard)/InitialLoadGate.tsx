"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

export default function InitialLoadGate() {
  const [show, setShow] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const removeSSR = () => document.getElementById("ssr-initial-overlay")?.remove();
    // Remove SSR overlay as soon as client overlay is ready
    removeSSR();
    const prevOverflow = document.documentElement.style.overflow;
    if (show) {
      document.documentElement.style.overflow = "hidden";
    }
    const start = Date.now();
    const MIN_VISIBLE_MS = 300; // avoid flashing
    const TTL_MS = 2500; // maximum time to keep overlay if no signal

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      const t = window.setTimeout(() => setShow(false), wait);
      cleanupTimers.add(t);
    };

    const cleanupTimers = new Set<number>();
    const onCriticalReady: EventListener = () => finish();

    // Listen for app-level signal when critical elements are ready
    window.addEventListener("app:critical-ready", onCriticalReady, { once: true });

    // TTL fallback so we don't block indefinitely
    const ttl = window.setTimeout(() => finish(), TTL_MS);
    cleanupTimers.add(ttl);

    return () => {
      cleanupTimers.forEach((id) => clearTimeout(id));
      cleanupTimers.clear();
      window.removeEventListener("app:critical-ready", onCriticalReady);
      document.documentElement.style.overflow = prevOverflow;
      removeSSR();
    };
  }, [show]);

  if (!show || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] grid place-items-center bg-white dark:bg-black pointer-events-auto">
      <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 text-[hsl(var(--foreground))] animate-spin" aria-hidden />
        <p className="text-sm text-muted-foreground">Loading Dashboard…</p>
      </div>
    </div>,
    document.body
  );
}
