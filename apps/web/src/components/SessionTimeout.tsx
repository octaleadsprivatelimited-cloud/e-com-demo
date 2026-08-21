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
    const idleStorageKey = `${storageKey}_last_activity`;
    let timedOut = false;

    if (!sessionStorage.getItem(storageKey)) {
      sessionStorage.setItem(storageKey, String(Date.now()));
    }

    if (!sessionStorage.getItem(idleStorageKey)) {
      sessionStorage.setItem(idleStorageKey, String(Date.now()));
    }

    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let lastRecordedActivity = Number(sessionStorage.getItem(idleStorageKey) || Date.now());

    const timeout = (reason: "idle" | "absolute") => {
      if (timedOut) return;
      timedOut = true;
      cb.current(reason);
    };

    const checkExpiry = () => {
      const now = Date.now();
      const start = Number(sessionStorage.getItem(storageKey) || Date.now());
      const lastActivity = Number(sessionStorage.getItem(idleStorageKey) || now);
      if (now - start >= absoluteHours * 3_600_000) {
        timeout("absolute");
        return true;
      }
      if (now - lastActivity >= idleMinutes * 60_000) {
        timeout("idle");
        return true;
      }
      return false;
    };

    const reset = () => {
      if (checkExpiry()) return;
      const now = Date.now();
      // Mousemove can fire many times per second; persist activity at most
      // twice per minute while still resetting the in-memory timer instantly.
      if (now - lastRecordedActivity >= 30_000) {
        lastRecordedActivity = now;
        sessionStorage.setItem(idleStorageKey, String(now));
      }
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => timeout("idle"), idleMinutes * 60_000);
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    if (!checkExpiry()) reset();
    const expiryTimer = setInterval(checkExpiry, 60_000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (idleTimer) clearTimeout(idleTimer);
      clearInterval(expiryTimer);
    };
  }, [idleMinutes, absoluteHours, storageKey]);

  return null;
}
