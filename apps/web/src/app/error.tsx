"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Route error boundary (AUTO-DETECT + AUTO-RECOVER).
 * Any render/runtime error in a page is caught here instead of white-screening
 * the app. It attempts one automatic recovery, then offers a manual retry.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [autoTried, setAutoTried] = useState(false);

  useEffect(() => {
    // Log for monitoring (would ship to Sentry/Datadog in production).
    console.error("[UI error]", error);
    // One automatic recovery attempt for transient render errors.
    if (!autoTried) {
      setAutoTried(true);
      const t = setTimeout(() => reset(), 800);
      return () => clearTimeout(t);
    }
  }, [error, reset, autoTried]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-5 bg-card border border-border rounded-2xl p-8 shadow-sm">
        <div className="mx-auto h-14 w-14 rounded-full bg-amber-500/10 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mt-1">
            We hit a temporary problem loading this page. Trying to recover
            automatically…
          </p>
          {error?.digest && (
            <p className="text-[10px] text-muted-foreground/70 mt-2 font-mono">
              Ref: {error.digest}
            </p>
          )}
        </div>
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    </div>
  );
}
