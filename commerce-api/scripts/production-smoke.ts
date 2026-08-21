const base = process.env.SMOKE_API_URL || "http://127.0.0.1:4002";
const email = "persistence-smoke@asterrow.local";
const password = "PersistenceSmoke!44";

async function call(path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  const body = (await response.json()) as any;
  if (!response.ok)
    throw new Error(
      `${path}: ${response.status} ${body?.error?.code || "ERROR"}`,
    );
  return { response, data: body.data };
}

const registration = await fetch(`${base}/api/v1/auth/register`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "Persistence Smoke", email, password }),
});
if (registration.status !== 201 && registration.status !== 409)
  throw new Error(`register: ${registration.status}`);
const login = await call("/api/v1/auth/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});
const cookie = login.response.headers.get("set-cookie")?.split(";")[0];
if (!cookie) throw new Error("refresh cookie missing");
const refreshed = await call("/api/v1/auth/refresh", {
  method: "POST",
  headers: { cookie },
});
const products = await call("/api/v1/products");
const variant = products.data[0]?.variants[0];
if (!variant) throw new Error("seeded variant missing");
const checkout = await call("/api/v1/checkout", {
  method: "POST",
  headers: {
    authorization: `Bearer ${login.data.accessToken}`,
    "idempotency-key": "smoke-persistence-checkout-v1",
  },
  body: JSON.stringify({
    lines: [{ variantId: variant.id, quantity: 1 }],
    postalCode: "500081",
    contact: { name: "Smoke Customer", email, phone: "+919876543210" },
    shippingAddress: { line1: "1 Smoke Test Road", city: "Hyderabad", state: "Telangana", country: "IN" },
    paymentProvider: "cod",
  }),
});
const order = checkout.data.order || checkout.data;
const track = await call(`/api/v1/orders/${order.number}/track?contact=${encodeURIComponent(email)}`);
console.log(
  JSON.stringify({
    registered: registration.status,
    refreshRotated: typeof refreshed.data.accessToken === "string",
    products: products.data.length,
    order: track.data.number,
    status: track.data.status,
  }),
);
