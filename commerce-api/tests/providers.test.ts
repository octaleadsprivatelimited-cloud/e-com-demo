import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { RazorpayPaymentProvider } from "../src/providers.js";

describe("Razorpay payment adapter", () => {
  it("creates provider orders in minor currency units without exposing the secret", async () => {
    const request = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ id: "order_live_123" }), { status: 200, headers: { "content-type": "application/json" } }));
    const provider = new RazorpayPaymentProvider({ keyId: "rzp_live_public", keySecret: "private-secret" }, request as typeof fetch);
    const result = await provider.createOrder({ orderId: "internal-order", amount: { amount: 1250.45, currency: "INR" }, idempotencyKey: "checkout-unique-key" });
    expect(result).toEqual({ externalId: "order_live_123", clientToken: "rzp_live_public" });
    const [url, init] = request.mock.calls[0]!;
    expect(url).toBe("https://api.razorpay.com/v1/orders");
    expect(JSON.parse(String(init?.body))).toMatchObject({ amount: 125045, notes: { internalOrderId: "internal-order" } });
    expect(JSON.stringify(result)).not.toContain("private-secret");
  });

  it("accepts valid signed events and rejects tampering", async () => {
    const provider = new RazorpayPaymentProvider({ keyId: "key", keySecret: "webhook-secret" });
    const raw = Buffer.from(JSON.stringify({ id: "evt_1", event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } }));
    const signature = crypto.createHmac("sha256", "webhook-secret").update(raw).digest("hex");
    await expect(provider.verifyWebhook(raw, signature)).resolves.toMatchObject({ eventId: "evt_1", type: "payment.captured", paymentId: "pay_1" });
    await expect(provider.verifyWebhook(Buffer.from(`${raw.toString()} `), signature)).rejects.toMatchObject({ code: "INVALID_WEBHOOK_SIGNATURE" });
  });

  it("sends idempotent partial refund requests", async () => {
    const request = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ id: "rfnd_1" }), { status: 200, headers: { "content-type": "application/json" } }));
    const provider = new RazorpayPaymentProvider({ keyId: "key", keySecret: "secret" }, request as typeof fetch);
    await expect(provider.refund({ paymentId: "pay_1", amount: { amount: 99.5, currency: "INR" }, idempotencyKey: "refund-order-line-1" })).resolves.toEqual({ refundId: "rfnd_1" });
    const [, init] = request.mock.calls[0]!;
    expect(init?.headers).toMatchObject({ "x-razorpay-idempotency-key": "refund-order-line-1" });
    expect(JSON.parse(String(init?.body)).amount).toBe(9950);
  });
});
