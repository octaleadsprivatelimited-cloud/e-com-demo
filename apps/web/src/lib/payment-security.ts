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
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.valid && data?.user?.role === 'customer' ? data.user : null;
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
