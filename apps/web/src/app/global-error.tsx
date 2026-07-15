"use client";

import { useEffect } from "react";

/**
 * Root error boundary — the last line of defence. Catches errors thrown in the
 * root layout itself (where the normal error boundary can't run). Must render
 * its own <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[fatal UI error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>The app hit a problem</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>
            Please reload. If it keeps happening, contact support.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
