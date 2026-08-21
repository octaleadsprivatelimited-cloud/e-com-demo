import crypto from "node:crypto";
import type { Money, PaymentProvider, ShippingProvider } from "./contracts.js";
import { AppError } from "./errors.js";

type FetchLike = typeof fetch;
async function providerJson(response: Response) {
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new AppError(502, "PROVIDER_ERROR", "The configured provider rejected the request", { status: response.status, providerCode: body.error && typeof body.error === "object" ? (body.error as Record<string, unknown>).code : undefined });
  return body;
}

export class RazorpayPaymentProvider implements PaymentProvider {
  constructor(private credentials: { keyId: string; keySecret: string }, private request: FetchLike = fetch) {
    if (!credentials.keyId || !credentials.keySecret) throw new AppError(503, "PAYMENT_NOT_CONFIGURED", "Razorpay credentials are incomplete");
  }
  private get authorization() { return `Basic ${Buffer.from(`${this.credentials.keyId}:${this.credentials.keySecret}`).toString("base64")}`; }
  async createOrder(input: { orderId: string; amount: Money; idempotencyKey: string }) {
    const body = await providerJson(await this.request("https://api.razorpay.com/v1/orders", { method: "POST", headers: { authorization: this.authorization, "content-type": "application/json" }, body: JSON.stringify({ amount: Math.round(input.amount.amount * 100), currency: input.amount.currency, receipt: input.idempotencyKey.slice(0, 40), notes: { internalOrderId: input.orderId } }) }));
    if (typeof body.id !== "string") throw new AppError(502, "INVALID_PROVIDER_RESPONSE", "Razorpay response did not contain an order ID");
    return { externalId: body.id, clientToken: this.credentials.keyId };
  }
  async verifyWebhook(raw: Buffer, signature: string) {
    const expected = crypto.createHmac("sha256", this.credentials.keySecret).update(raw).digest("hex"), a = Buffer.from(expected), b = Buffer.from(signature || "");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new AppError(401, "INVALID_WEBHOOK_SIGNATURE", "Webhook signature is invalid");
    const payload = JSON.parse(raw.toString("utf8")) as any;
    const payment = payload.payload?.payment?.entity;
    return { eventId: String(payload.id || payment?.id || ""), type: String(payload.event || ""), paymentId: payment?.id ? String(payment.id) : undefined };
  }
  async refund(input: { paymentId: string; amount: Money; idempotencyKey: string }) {
    const body = await providerJson(await this.request(`https://api.razorpay.com/v1/payments/${encodeURIComponent(input.paymentId)}/refund`, { method: "POST", headers: { authorization: this.authorization, "content-type": "application/json", "x-razorpay-idempotency-key": input.idempotencyKey }, body: JSON.stringify({ amount: Math.round(input.amount.amount * 100), notes: { idempotencyKey: input.idempotencyKey } }) }));
    if (typeof body.id !== "string") throw new AppError(502, "INVALID_PROVIDER_RESPONSE", "Razorpay response did not contain a refund ID");
    return { refundId: body.id };
  }
}
export class DevelopmentPaymentProvider implements PaymentProvider {
  async createOrder(input: {
    orderId: string;
    amount: Money;
    idempotencyKey: string;
  }) {
    if (process.env.NODE_ENV === "production")
      throw new AppError(
        503,
        "PAYMENT_NOT_CONFIGURED",
        "A live payment provider must be configured",
      );
    return {
      externalId: `test_pay_${crypto.createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 16)}`,
      clientToken: "development-only",
    };
  }
  async verifyWebhook(_raw: Buffer, _signature: string): Promise<never> {
    throw new AppError(
      400,
      "UNSUPPORTED_TEST_WEBHOOK",
      "Test provider does not accept payment-success webhooks",
    );
  }
  async refund(input: {
    paymentId: string;
    amount: Money;
    idempotencyKey: string;
  }) {
    return {
      refundId: `test_ref_${crypto.createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 16)}`,
    };
  }
}
export class DevelopmentShippingProvider implements ShippingProvider {
  async rates(input: {
    origin: string;
    destination: string;
    weightGrams: number;
    cod: boolean;
  }) {
    const zone =
        input.origin.slice(0, 2) === input.destination.slice(0, 2)
          ? "LOCAL"
          : "NATIONAL",
      base = zone === "LOCAL" ? 80 : 140,
      weight = Math.ceil(input.weightGrams / 500) * 25;
    return [
      {
        service: "STANDARD",
        amount: {
          amount: base + weight + (input.cod ? 40 : 0),
          currency: "INR",
        },
        etaDays: zone === "LOCAL" ? 2 : 5,
      },
      {
        service: "EXPRESS",
        amount: { amount: base + weight + 180, currency: "INR" },
        etaDays: zone === "LOCAL" ? 1 : 2,
      },
    ];
  }
  async createShipment(input: {
    orderId: string;
    service: string;
    idempotencyKey: string;
  }) {
    if (process.env.NODE_ENV === "production")
      throw new AppError(
        503,
        "SHIPPING_NOT_CONFIGURED",
        "A live shipping provider must be configured",
      );
    return {
      shipmentId: `test_ship_${input.orderId}`,
      awb: `TEST${crypto.createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 10).toUpperCase()}`,
    };
  }
  async verifyWebhook(_raw: Buffer, _signature: string): Promise<never> {
    throw new AppError(
      400,
      "UNSUPPORTED_TEST_WEBHOOK",
      "Test provider does not accept tracking webhooks",
    );
  }
}

export class ShiprocketShippingProvider implements ShippingProvider {
  constructor(private credentials: { token: string; pickupPostcode: string; pickupLocation: string }, private request: FetchLike = fetch) {
    if (!credentials.token || !credentials.pickupPostcode || !credentials.pickupLocation) throw new AppError(503, "SHIPPING_NOT_CONFIGURED", "Shiprocket credentials are incomplete");
  }
  private get headers() { return { authorization: `Bearer ${this.credentials.token}`, "content-type": "application/json" }; }
  async rates(input: { origin: string; destination: string; weightGrams: number; cod: boolean }) {
    const query = new URLSearchParams({ pickup_postcode: input.origin || this.credentials.pickupPostcode, delivery_postcode: input.destination, weight: String(Math.max(.001, input.weightGrams / 1000)), cod: input.cod ? "1" : "0" });
    const body = await providerJson(await this.request(`https://apiv2.shiprocket.in/v1/external/courier/serviceability/?${query}`, { headers: this.headers }));
    const couriers = (body.data as any)?.available_courier_companies;
    if (!Array.isArray(couriers) || !couriers.length) throw new AppError(422, "PINCODE_NOT_SERVICEABLE", "No Shiprocket courier services this destination");
    return couriers.slice(0, 10).map((courier: any) => ({ service: String(courier.courier_company_id), amount: { amount: Number(courier.rate || courier.freight_charge || 0), currency: "INR" }, etaDays: Number(courier.estimated_delivery_days || 5) }));
  }
  async createShipment(input: { orderId: string; service: string; idempotencyKey: string; shippingAddress?: Record<string, unknown>; items?: Array<{ name: string; sku: string; quantity: number; price: number }> }) {
    if (!input.shippingAddress || !input.items?.length) throw new AppError(422, "SHIPMENT_DETAILS_REQUIRED", "A complete shipping address and order items are required");
    const a = input.shippingAddress as any;
    const body = await providerJson(await this.request("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", { method: "POST", headers: this.headers, body: JSON.stringify({ order_id: input.orderId, order_date: new Date().toISOString().slice(0, 16).replace("T", " "), pickup_location: this.credentials.pickupLocation, billing_customer_name: a.name, billing_address: a.line1, billing_address_2: a.line2 || "", billing_city: a.city, billing_pincode: a.postalCode, billing_state: a.state, billing_country: a.country || "India", billing_email: a.email, billing_phone: a.phone, shipping_is_billing: true, order_items: input.items.map(item => ({ name: item.name, sku: item.sku, units: item.quantity, selling_price: item.price })), payment_method: a.cod ? "COD" : "Prepaid", sub_total: input.items.reduce((sum, item) => sum + item.price * item.quantity, 0), length: 10, breadth: 10, height: 10, weight: Math.max(.1, Number(a.weightGrams || 500) / 1000) }) }));
    const shipmentId = String(body.shipment_id || ""), awb = String(body.awb_code || "");
    if (!shipmentId) throw new AppError(502, "INVALID_PROVIDER_RESPONSE", "Shiprocket response did not contain a shipment ID");
    return { shipmentId, awb, trackingUrl: awb ? `https://shiprocket.co/tracking/${encodeURIComponent(awb)}` : undefined };
  }
  async verifyWebhook(raw: Buffer, signature: string) {
    const expected = crypto.createHmac("sha256", this.credentials.token).update(raw).digest("hex"), a = Buffer.from(expected), b = Buffer.from(signature || "");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new AppError(401, "INVALID_WEBHOOK_SIGNATURE", "Webhook signature is invalid");
    const payload = JSON.parse(raw.toString("utf8")) as any;
    return { eventId: String(payload.id || payload.awb || payload.awb_code), awb: String(payload.awb || payload.awb_code), status: String(payload.current_status || payload.status), occurredAt: new Date(payload.current_timestamp || Date.now()) };
  }
}
