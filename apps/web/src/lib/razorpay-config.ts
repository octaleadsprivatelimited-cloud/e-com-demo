/**
 * Razorpay Server Configuration (SERVER-ONLY)
 * ───────────────────────────────────────────
 * Reads Razorpay credentials from environment variables. These values must
 * NEVER be hardcoded in source and must NEVER use the NEXT_PUBLIC_ prefix,
 * which would leak the secret into the client bundle.
 *
 * Required env vars (set in apps/web/.env — server-side only):
 *   RAZORPAY_KEY_ID
 *   RAZORPAY_KEY_SECRET
 *   RAZORPAY_WEBHOOK_SECRET   (used to verify webhook/payment signatures)
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in apps/web/.env (server-side, no NEXT_PUBLIC_ prefix).`
    );
  }
  return value;
}

export function getRazorpayKeyId(): string {
  return required("RAZORPAY_KEY_ID");
}

export function getRazorpayKeySecret(): string {
  return required("RAZORPAY_KEY_SECRET");
}

export function getRazorpayWebhookSecret(): string {
  return required("RAZORPAY_WEBHOOK_SECRET");
}

/** Basic auth header for Razorpay REST API calls. */
export function razorpayBasicAuthHeader(): string {
  const token = Buffer.from(
    `${getRazorpayKeyId()}:${getRazorpayKeySecret()}`
  ).toString("base64");
  return `Basic ${token}`;
}
