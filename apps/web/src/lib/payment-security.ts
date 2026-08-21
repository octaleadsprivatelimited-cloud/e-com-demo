import crypto from 'crypto';
import { getRazorpayKeySecret, getRazorpayWebhookSecret } from './razorpay-config';

export const PAYMENT_PACKAGES = {
  sms_booster: { name: 'SMS Booster', amount: 10000, credits: { sms: 50000, wa: 0, ivr: 0 } },
  ivr_booster: { name: 'IVR Booster', amount: 15000, credits: { sms: 0, wa: 0, ivr: 20000 } },
  wa_booster: { name: 'WhatsApp Booster', amount: 8000, credits: { sms: 0, wa: 10000, ivr: 0 } },
  all_in_one: { name: 'All One Package', amount: 12000, credits: { sms: 10000, wa: 5000, ivr: 5000 } },
} as const;

export async function requireCustomer(authorization: string | null) {
  if (!authorization?.startsWith('Bearer ')) return null;
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const response = await fetch(`${api}/auth/verify-session`, {
    headers: { Authorization: authorization }, cache: 'no-store',
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.valid && data?.user?.role === 'customer' ? data.user : null;
}

type LimitRecord = { count: number; resetAt: number };
const paymentLimits = new Map<string, LimitRecord>();

/** Process-local guard; production must additionally enforce this at the edge. */
export function enforcePaymentRateLimit(
  identity: string,
  action: 'create' | 'confirm',
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const windowMs = 60_000;
  const limit = action === 'create' ? 5 : 20;
  const key = `${action}:${identity}`;
  const current = paymentLimits.get(key);
  if (!current || current.resetAt <= now) {
    paymentLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export function callbackOrigin(requestUrl: string): string {
  const configured = process.env.APP_ORIGIN;
  if (process.env.NODE_ENV === 'production' && !configured) throw new Error('APP_ORIGIN is required in production.');
  return (configured || new URL(requestUrl).origin).replace(/\/$/, '');
}

export function verifyPaymentLinkSignature(input: {
  linkId: string; referenceId: string; status: string; paymentId: string; signature: string;
}): boolean {
  const message = `${input.linkId}|${input.referenceId}|${input.status}|${input.paymentId}`;
  const expected = crypto.createHmac('sha256', getRazorpayKeySecret()).update(message).digest('hex');
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(input.signature, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch { return false; }
}

export function signGrant(payload: object) {
  const grant = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', getRazorpayWebhookSecret()).update(grant).digest('hex');
  return { grant, signature };
}
