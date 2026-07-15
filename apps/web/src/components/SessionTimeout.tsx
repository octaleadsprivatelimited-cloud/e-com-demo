"use client";

import { useEffect, useRef } from "react";

interface SessionTimeoutProps {
  /** Log out after this many minutes with no user activity. */
  idleMinutes?: number;
  /** Hard cap on total session length, regardless of activity. */
  absoluteHours?: number;
  /** Called when the session should end. */
  onTimeout: (reason: "idle" | "absolute") => void;
  /** sessionStorage key that records when the session started. */
  storageKey?: string;
}

/**
 * SessionTimeout — automatic logout on inactivity and on absolute session age.
 * A standard control for regulated/banking-grade apps: it bounds how long a
 * walked-away-from or hijacked session stays usable. Renders nothing.
 */
export function SessionTimeout({
  idleMinutes = 15,
  absoluteHours = 8,
  onTimeout,
  storageKey = "poltica_session_start",
}: SessionTimeoutProps) {
  const cb = useRef(onTimeout);
  cb.current = onTimeout;

  useEffect(() => {
    if (!sessionStorage.getItem(storageKey)) {
      sessionStorage.setItem(storageKey, String(Date.now()));
    }

    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const checkAbsolute = () => {
      const start = Number(sessionStorage.getItem(storageKey) || Date.now());
      if (Date.now() - start > absoluteHours * 3_600_000) {
        cb.current("absolute");
      }
    };

    const reset = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => cb.current("idle"), idleMinutes * 60_000);
      checkAbsolute();
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    const absTimer = setInterval(checkAbsolute, 60_000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (idleTimer) clearTimeout(idleTimer);
      clearInterval(absTimer);
    };
  }, [idleMinutes, absoluteHours, storageKey]);

  return null;
}
