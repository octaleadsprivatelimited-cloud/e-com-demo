import crypto from "node:crypto";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import { CommerceStore } from "../src/store.js";
const config: AppConfig = {
  NODE_ENV: "test",
  PORT: 4001,
  DATABASE_URL: "postgresql://test:test@localhost/test",
  JWT_SECRET: "test-access-secret-that-is-at-least-32-chars",
  JWT_REFRESH_SECRET: "test-refresh-secret-that-is-at-least-32-chars",
  INTEGRATION_ENCRYPTION_KEY: "test-encryption-key-that-is-at-least-32-chars",
  CORS_ORIGINS: "http://localhost:5173",
  USE_DATABASE: false,
};
let server: Server,
  base: string,
  store: CommerceStore,
  adminToken: string,
  customerToken: string;
async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  return {
    status: response.status,
    body: (await response.json()) as any,
    headers: response.headers,
  };
}
beforeAll(async () => {
  store = new CommerceStore();
  const created = await createApp({ config, store });
  server = created.app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  base = `http://127.0.0.1:${address.port}`;
  const login = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "admin@asterrow.local",
      password: "ChangeMe!123",
    }),
  });
  adminToken = login.body.data.accessToken;
});
afterAll(
  () =>
    new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    ),
);
describe("commerce API", () => {
  it("reports health without leaking internals", async () => {
    const r = await request("/health");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      success: true,
      data: { status: "healthy" },
    });
  });
  it("serves and securely updates white-label storefront settings", async () => {
    const initial = await request("/api/v1/storefront/config");
    expect(initial.body.data.storeName).toBe("Aster & Row");
    const unauthorized = await request("/api/v1/admin/storefront-config");
    expect(unauthorized.status).toBe(401);
    const updated = { ...initial.body.data, storeName: "Customer Store", primaryDomain: "shop.customer.test" };
    const saved = await request("/api/v1/admin/storefront-config", { method: "PUT", headers: { authorization: `Bearer ${adminToken}` }, body: JSON.stringify(updated) });
    expect(saved.status).toBe(200);
    const branded = await request("/api/v1/storefront/config");
    expect(branded.body.data.storeName).toBe("Customer Store");
    expect(store.auditLogs.some(log => log.action === "storefront.settings.updated")).toBe(true);
  });
  it("validates registration and hashes passwords", async () => {
    const bad = await request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "A", email: "bad", password: "1" }),
    });
    expect(bad.status).toBe(400);
    const good = await request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Ananya Sharma",
        email: "ananya@example.com",
        password: "StrongPass!44",
      }),
    });
    expect(good.status).toBe(201);
    expect(store.findUser("ananya@example.com")!.passwordHash).not.toContain(
      "StrongPass!44",
    );
    const login = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "ananya@example.com",
        password: "StrongPass!44",
      }),
    });
    customerToken = login.body.data.accessToken;
  });
  it("enforces admin RBAC", async () => {
    const denied = await request("/api/v1/admin/products", {
      method: "POST",
      body: "{}",
    });
    expect(denied.status).toBe(401);
    const listed = await request("/api/v1/products");
    expect(listed.body.data.length).toBeGreaterThan(0);
  });
  it("rotates refresh sessions and revokes them on logout", async () => {
    const login = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@asterrow.local",
        password: "ChangeMe!123",
      }),
    });
    const cookie = login.headers.get("set-cookie")!.split(";")[0]!;
    const refreshed = await request("/api/v1/auth/refresh", {
      method: "POST",
      headers: { cookie },
    });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTypeOf("string");
    const replay = await request("/api/v1/auth/refresh", {
      method: "POST",
      headers: { cookie },
    });
    expect(replay.status).toBe(401);
    const rotatedCookie = refreshed.headers.get("set-cookie")!.split(";")[0]!;
    const logout = await request("/api/v1/auth/logout", {
      method: "POST",
      headers: { cookie: rotatedCookie },
    });
    expect(logout.status).toBe(200);
    const revoked = await request("/api/v1/auth/refresh", {
      method: "POST",
      headers: { cookie: rotatedCookie },
    });
    expect(revoked.status).toBe(401);
  });
  it("creates and archives variant products", async () => {
    const payload = {
      name: "Linen Dress",
      slug: "linen-dress",
      description: "A long-lasting linen dress made in small batches.",
      category: "Wardrobe",
      status: "ACTIVE",
      taxRate: 12,
      hsnCode: "6204",
      variants: [
        {
          sku: "AR-DRS-M",
          title: "M / Navy",
          price: 4990,
          mrp: 5990,
          stock: 10,
          reserved: 0,
          attributes: { Size: "M", Color: "Navy" },
          weightGrams: 450,
        },
      ],
    };
    const made = await request("/api/v1/admin/products", {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload),
    });
    expect(made.status).toBe(201);
    expect(made.body.data.variants[0].attributes.Size).toBe("M");
    const archived = await request(
      `/api/v1/admin/products/${made.body.data.id}`,
      { method: "DELETE", headers: { authorization: `Bearer ${adminToken}` } },
    );
    expect(archived.body.data.status).toBe("ARCHIVED");
  });
  it("persists guest carts and authenticated wishlists", async () => {
    const product = store.listProducts()[0]!,
      variant = product.variants[0]!;
    const cart = await request("/api/v1/cart/items", {
      method: "PUT",
      body: JSON.stringify({ variantId: variant.id, quantity: 2 }),
    });
    expect(cart.status).toBe(200);
    const cartToken = cart.headers.get("x-cart-token")!;
    const listed = await request("/api/v1/cart", {
      headers: { "x-cart-token": cartToken },
    });
    expect(listed.body.data[0]).toMatchObject({
      variantId: variant.id,
      quantity: 2,
    });
    const saved = await request(`/api/v1/wishlist/${product.id}`, {
      method: "PUT",
      headers: { authorization: `Bearer ${customerToken}` },
    });
    expect(saved.status).toBe(200);
    const wishlist = await request("/api/v1/wishlist", {
      headers: { authorization: `Bearer ${customerToken}` },
    });
    expect(wishlist.body.data[0].id).toBe(product.id);
  });
  it("supports customer addresses, moderated reviews, and support tickets", async () => {
    const address = await request("/api/v1/account/addresses", { method: "POST", headers: { authorization: `Bearer ${customerToken}` }, body: JSON.stringify({ label: "Home", line1: "1 Test Road", city: "Hyderabad", state: "Telangana", postalCode: "500081", country: "IN", isDefault: true }) });
    expect(address.status).toBe(201);
    const addresses = await request("/api/v1/account/addresses", { headers: { authorization: `Bearer ${customerToken}` } });
    expect(addresses.body.data).toHaveLength(1);
    const product = store.listProducts()[0]!;
    const review = await request("/api/v1/account/reviews", { method: "POST", headers: { authorization: `Bearer ${customerToken}` }, body: JSON.stringify({ productId: product.id, rating: 5, title: "Beautiful", body: "Thoughtfully made and exactly as described." }) });
    expect(review.status).toBe(201);
    const moderated = await request(`/api/v1/admin/reviews/${review.body.data.id}`, { method: "PATCH", headers: { authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ status: "APPROVED" }) });
    expect(moderated.status).toBe(200);
    const publicReviews = await request(`/api/v1/products/${product.id}/reviews`);
    expect(publicReviews.body.data[0].rating).toBe(5);
    const ticket = await request("/api/v1/account/support", { method: "POST", headers: { authorization: `Bearer ${customerToken}` }, body: JSON.stringify({ subject: "Delivery question", message: "Please confirm the expected delivery window.", priority: "NORMAL" }) });
    expect(ticket.status).toBe(201);
    const tickets = await request("/api/v1/account/support", { headers: { authorization: `Bearer ${customerToken}` } });
    expect(tickets.body.data[0].number).toMatch(/^SUP-/);
  });
  it("validates coupons and applies discounts authoritatively", async () => {
    const validation = await request("/api/v1/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ code: "WELCOME10", subtotal: 2000 }),
    });
    expect(validation.body.data.discount).toBe(200);
    const variant = store.listProducts()[0]!.variants[0]!,
      key = `checkout-${crypto.randomUUID()}`;
    const checkout = await request("/api/v1/checkout", {
      method: "POST",
      headers: {
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": key,
      },
      body: JSON.stringify({
        lines: [{ variantId: variant.id, quantity: 1 }],
        postalCode: "500081",
        contact: { name: "Test Customer", email: "customer@example.com", phone: "+919876543210" },
        shippingAddress: { line1: "1 Test Road", city: "Hyderabad", state: "Telangana", country: "IN" },
        paymentProvider: "cod",
        couponCode: "WELCOME10",
      }),
    });
    expect(checkout.status).toBe(201);
    expect(checkout.body.data.order.discount).toBeGreaterThan(0);
  });
  it("calculates checkout server-side and is idempotent", async () => {
    const product = store.listProducts().find((x) => x.status === "ACTIVE")!,
      variant = product.variants[0]!,
      payload = {
        lines: [{ variantId: variant.id, quantity: 2 }],
        postalCode: "500081",
        contact: { name: "Test Customer", email: "customer@example.com", phone: "+919876543210" },
        shippingAddress: { line1: "1 Test Road", city: "Hyderabad", state: "Telangana", country: "IN" },
        paymentProvider: "razorpay",
      },
      key = `checkout-${crypto.randomUUID()}`;
    const one = await request("/api/v1/checkout", {
      method: "POST",
      headers: { "idempotency-key": key },
      body: JSON.stringify(payload),
    });
    expect(one.status).toBe(201);
    expect(one.body.data.order.subtotal).toBe(variant.price * 2);
    const two = await request("/api/v1/checkout", {
      method: "POST",
      headers: { "idempotency-key": key },
      body: JSON.stringify(payload),
    });
    expect(two.status).toBe(200);
    expect(two.body.data.order.id).toBe(one.body.data.order.id);
    const conflict = await request("/api/v1/checkout", {
      method: "POST",
      headers: { "idempotency-key": key },
      body: JSON.stringify({ ...payload, lines: [{ variantId: variant.id, quantity: 1 }] }),
    });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });
  it("rejects overselling", async () => {
    const variant = store.listProducts().find((x) => x.status === "ACTIVE")!
      .variants[0]!;
    const r = await request("/api/v1/checkout", {
      method: "POST",
      headers: { "idempotency-key": `checkout-${crypto.randomUUID()}` },
      body: JSON.stringify({
        lines: [
          { variantId: variant.id, quantity: 20 },
          { variantId: variant.id, quantity: 20 },
        ],
        postalCode: "500081",
        contact: { name: "Test Customer", email: "customer@example.com", phone: "+919876543210" },
        shippingAddress: { line1: "1 Test Road", city: "Hyderabad", state: "Telangana", country: "IN" },
        paymentProvider: "cod",
      }),
    });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("INSUFFICIENT_STOCK");
  });
  it("does not reserve any stock when a multi-line cart fails", async () => {
    const products = store.listProducts().filter((x) => x.status === "ACTIVE");
    const available = products[1]!.variants[0]!;
    const unavailable = products[2]!.variants[0]!;
    const before = available.reserved;
    const r = await request("/api/v1/checkout", {
      method: "POST",
      headers: { "idempotency-key": `checkout-${crypto.randomUUID()}` },
      body: JSON.stringify({
        lines: [
          { variantId: available.id, quantity: 1 },
          { variantId: unavailable.id, quantity: 20 },
          { variantId: unavailable.id, quantity: 20 },
        ],
        postalCode: "500081",
        contact: { name: "Test Customer", email: "customer@example.com", phone: "+919876543210" },
        shippingAddress: { line1: "1 Test Road", city: "Hyderabad", state: "Telangana", country: "IN" },
        paymentProvider: "cod",
      }),
    });
    expect(r.status).toBe(409);
    expect(available.reserved).toBe(before);
  });
  it("enforces the order state machine and creates shipments only when packed", async () => {
    const order = [...store.orders.values()].find((candidate) => candidate.status === "PAYMENT_PENDING")!;
    const invalid = await request(`/api/v1/admin/orders/${order.id}/status`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: "DELIVERED" }),
    });
    expect(invalid.status).toBe(409);
    process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
    const webhookBody = JSON.stringify({
      type: "payment.captured",
      orderId: order.id,
    });
    const signature = crypto
      .createHmac("sha256", "test-webhook-secret")
      .update(webhookBody)
      .digest("hex");
    const paid = await request("/webhooks/razorpay", {
      method: "POST",
      headers: {
        "x-event-id": "evt_payment_captured_1",
        "x-webhook-signature": signature,
      },
      body: webhookBody,
    });
    expect(paid.status).toBe(202);
    const duplicate = await request("/webhooks/razorpay", {
      method: "POST",
      headers: {
        "x-event-id": "evt_payment_captured_1",
        "x-webhook-signature": signature,
      },
      body: webhookBody,
    });
    expect(duplicate.body.data.duplicate).toBe(true);
    for (const status of ["CONFIRMED", "PROCESSING", "PACKED"]) {
      const changed = await request(`/api/v1/admin/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status }),
      });
      expect(changed.status).toBe(200);
    }
    const shipment = await request(
      `/api/v1/admin/orders/${order.id}/shipment`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ service: "STANDARD" }),
      },
    );
    expect(shipment.status).toBe(201);
    expect(store.orders.get(order.id)!.status).toBe("SHIPPED");
    expect(store.auditLogs.length).toBeGreaterThanOrEqual(5);
  });
  it("does not expose tracking details without matching checkout contact", async () => {
    const order = [...store.orders.values()][0]!;
    const denied = await request(`/api/v1/orders/${order.number}/track?contact=attacker@example.com`);
    expect(denied.status).toBe(404);
    const allowed = await request(`/api/v1/orders/${order.number}/track?contact=customer@example.com`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.number).toBe(order.number);
  });
  it("encrypts integration credentials and never returns plaintext", async () => {
    const r = await request("/api/v1/admin/integrations", {
      method: "PUT",
      headers: { authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        kind: "PAYMENT",
        provider: "Razorpay",
        enabled: true,
        priority: 1,
        environment: "TEST",
        credentials: { keySecret: "super-secret-1234" },
        publicConfig: { currency: "INR" },
      }),
    });
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).not.toContain("super-secret-1234");
    expect(r.body.data.maskedKeys.keySecret).toMatch(/1234$/);
  });
  it("rejects unsigned webhooks", async () => {
    const r = await request("/webhooks/razorpay", {
      method: "POST",
      headers: { "x-event-id": "evt_1", "x-webhook-signature": "bad" },
      body: JSON.stringify({ type: "payment.captured" }),
    });
    expect(r.status).toBe(401);
  });
});
