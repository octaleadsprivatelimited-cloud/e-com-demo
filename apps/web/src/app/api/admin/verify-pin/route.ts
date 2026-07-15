import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Admin PIN verification (SERVER-ONLY)
 * ────────────────────────────────────
 * The admin PIN is read from the server-only ADMIN_PIN env var and is never
 * shipped to the browser. The client posts the entered PIN here; only a
 * boolean result is returned.
 *
 * Brute-force protection: a 6-digit PIN is only ~1M combinations, so this route
 * is rate-limited per client IP with exponential-ish lockout. In production this
 * counter should live in a shared store (Redis) rather than process memory, and
 * the gate should be replaced with proper server-enforced session/role auth.
 */

// In-memory attempt tracker (per server process).
const attempts = new Map<string, { count: number; firstAt: number; lockedUntil: number }>();
const WINDOW_MS = 15 * 60_000; // 15 minutes
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60_000; // lock for 15 minutes after too many failures

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const now = Date.now();
  const rec = attempts.get(ip);

  // Locked out?
  if (rec && rec.lockedUntil > now) {
    const retry = Math.ceil((rec.lockedUntil - now) / 1000);
    return NextResponse.json(
      { success: false, message: `Too many attempts. Try again in ${retry}s.` },
      { status: 429, headers: { 'Retry-After': String(retry) } },
    );
  }

  try {
    const { pin } = await req.json();

    const adminPin = process.env.ADMIN_PIN;
    if (!adminPin) {
      console.error('ADMIN_PIN env var is not configured.');
      return NextResponse.json(
        { success: false, message: 'Admin access is not configured.' },
        { status: 500 },
      );
    }

    if (typeof pin !== 'string' || pin.length === 0) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Constant-time comparison to avoid timing side-channels.
    const a = Buffer.from(pin);
    const b = Buffer.from(adminPin);
    const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!valid) {
      // Record the failed attempt / apply lockout.
      const cur =
        rec && now - rec.firstAt < WINDOW_MS
          ? rec
          : { count: 0, firstAt: now, lockedUntil: 0 };
      cur.count += 1;
      if (cur.count >= MAX_ATTEMPTS) {
        cur.lockedUntil = now + LOCK_MS;
      }
      attempts.set(ip, cur);
      console.warn(`[admin] failed PIN attempt from ${ip} (${cur.count}/${MAX_ATTEMPTS})`);
      return NextResponse.json({ success: false }, { status: 401 });
    }

    // Success — clear any failure record.
    attempts.delete(ip);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
