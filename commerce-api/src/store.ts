import crypto from "node:crypto";
import { AppError } from "./errors.js";
import { assertOrderTransition } from "./order-state.js";
export type StoredUser = {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  passwordHash: string;
  role: string;
  permissions: string[];
  totpSecretEncrypted?: string;
  totpEnabled?: boolean;
};
export type StoredVariant = {
  id: string;
  sku: string;
  title: string;
  price: number;
  mrp: number;
  stock: number;
  reserved: number;
  attributes: Record<string, string>;
  weightGrams: number;
};
export type StoredProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  brand?: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  taxRate: number;
  hsnCode?: string;
  specifications: Record<string, string>;
  seoTitle?: string;
  seoDescription?: string;
  media: Array<{ id?: string; url: string; alt: string; type: "IMAGE" | "VIDEO"; position: number; variantId?: string }>;
  variants: StoredVariant[];
  createdAt: string;
  updatedAt: string;
};
export type StoredShippingSelection = {
  provider: string;
  service: string;
  label: string;
  etaDays: number;
  quotedAmount: number;
  chargedAmount: number;
  currency: string;
  quotedAt: string;
};
export type StoredRefund = {
  id: string;
  amount: number;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  reason: string;
  externalId?: string;
  idempotencyKey: string;
  createdAt: string;
};
export type StoredShipment = {
  id: string;
  provider: string;
  externalId?: string;
  awb?: string;
  courier?: string;
  trackingUrl?: string;
  status: string;
  createdAt: string;
  events: Array<{
    status: string;
    location?: string;
    occurredAt: string;
  }>;
};
export type StoredPayment = {
  externalId?: string;
  clientToken?: string;
  provider?: string;
  status?: string;
  gatewayTransactionId?: string;
  amount?: number;
  currency?: string;
  refundedAmount?: number;
  refunds?: StoredRefund[];
  lastError?: { code?: string; description?: string };
};
export type StoredOrder = {
  id: string;
  number: string;
  userId?: string;
  status: string;
  lines: Array<{
    variantId: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    tax: number;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  idempotencyKey: string;
  trackingVerificationHash?: string;
  shippingSelection?: StoredShippingSelection;
  shipment?: StoredShipment;
  invoiceSnapshot?: {
    contact?: { name?: string; email?: string; phone?: string };
    shipping?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    gstin?: string;
    paymentMethod?: string;
    shippingSelection?: StoredShippingSelection;
  };
  payment?: StoredPayment | null;
  history: Array<{
    from?: string;
    to: string;
    at: string;
    actor?: string;
    source?: string;
  }>;
  createdAt: string;
};
export type StoredIntegration = {
  id: string;
  kind: string;
  provider: string;
  enabled: boolean;
  priority: number;
  environment: string;
  encryptedCredentials: string;
  publicConfig: Record<string, unknown>;
  updatedAt: string;
};
export class CommerceStore {
  users = new Map<string, StoredUser>();
  products = new Map<string, StoredProduct>();
  orders = new Map<string, StoredOrder>();
  integrations = new Map<string, StoredIntegration>();
  webhookIds = new Set<string>();
  sessions = new Map<string, { userId: string; expiresAt: number }>();
  auditLogs: Array<Record<string, unknown>> = [];
  carts = new Map<string, Map<string, number>>();
  wishlists = new Map<string, Set<string>>();
  coupons = new Map<
    string,
    {
      code: string;
      type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
      value: number;
      minimumSpend: number;
      maximumDiscount?: number;
      startsAt: number;
      endsAt: number;
      enabled: boolean;
      usageLimit?: number;
      used: number;
    }
  >();
  returns = new Map<
    string,
    {
      id: string;
      orderId: string;
      userId?: string;
      reason: string;
      status: string;
      createdAt: string;
    }
  >();
  addresses = new Map<string, Array<Record<string, unknown>>>();
  reviews = new Map<string, { id: string; productId: string; userId: string; rating: number; title?: string; body: string; verified: boolean; status: string; createdAt: string }>();
  supportTickets = new Map<string, { id: string; number: string; userId: string; subject: string; priority: string; status: string; createdAt: string; messages: Array<{ id: string; authorId?: string; body: string; internal: boolean; createdAt: string }> }>();
  findUser(email: string) {
    return [...this.users.values()].find(
      (x) => x.email.toLowerCase() === email.toLowerCase(),
    );
  }
  findUserByMobile(mobile:string){return [...this.users.values()].find(user=>user.mobile===mobile)}
  createUser(input: Omit<StoredUser, "id">) {
    if (this.findUser(input.email))
      throw new AppError(
        409,
        "EMAIL_EXISTS",
        "An account already exists for this email",
      );
    const user = { ...input, id: crypto.randomUUID() };
    this.users.set(user.id, user);
    return user;
  }
  listProducts() {
    return [...this.products.values()];
  }
  getProduct(id: string) {
    const product = this.products.get(id);
    if (!product)
      throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found");
    return product;
  }
  saveProduct(
    input: Omit<StoredProduct, "id" | "createdAt" | "updatedAt">,
    id?: string,
  ) {
    if (
      [...this.products.values()].some(
        (x) => x.slug === input.slug && x.id !== id,
      )
    )
      throw new AppError(409, "SLUG_EXISTS", "Product slug already exists");
    const old = id ? this.products.get(id) : undefined,
      now = new Date().toISOString();
    const product = {
      ...input,
      id: id || crypto.randomUUID(),
      createdAt: old?.createdAt || now,
      updatedAt: now,
    };
    this.products.set(product.id, product);
    return product;
  }
  deleteProduct(id: string) {
    const p = this.getProduct(id);
    this.products.set(id, {
      ...p,
      status: "ARCHIVED",
      updatedAt: new Date().toISOString(),
    });
    return this.products.get(id)!;
  }
  findOrderByKey(keyPrefix: string) {
    return [...this.orders.values()].find((x) => x.idempotencyKey.startsWith(`${keyPrefix}.`));
  }
  createOrder(
    order: Omit<StoredOrder, "id" | "number" | "createdAt" | "history">,
  ) {
    const createdAt = new Date().toISOString();
    const result = {
      ...order,
      id: crypto.randomUUID(),
      number: `AR-${String(this.orders.size + 10850)}`,
      createdAt,
      history: [{ to: order.status, at: createdAt }],
    };
    this.orders.set(result.id, result);
    return result;
  }
  transitionOrder(id: string, to: string, actor?: string, source = "ADMIN") {
    const order = this.orders.get(id);
    if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
    assertOrderTransition(order.status, to);
    const from = order.status;
    order.status = to;
    order.history.push({
      from,
      to,
      at: new Date().toISOString(),
      actor,
      source,
    });
    this.auditLogs.push({
      id: crypto.randomUUID(),
      action: "order.status_changed",
      resource: "order",
      resourceId: id,
      actor,
      source,
      before: { status: from },
      after: { status: to },
      createdAt: new Date().toISOString(),
    });
    return order;
  }
  beginRefund(
    orderId: string,
    amount: number,
    idempotencyKey: string,
    reason: string,
  ) {
    if (!Number.isFinite(amount) || amount <= 0)
      throw new AppError(
        422,
        "REFUND_AMOUNT_INVALID",
        "Refund amount must be a finite positive number",
      );
    const order = this.orders.get(orderId);
    if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
    const payment = order.payment;
    if (!payment?.externalId)
      throw new AppError(
        409,
        "PAYMENT_NOT_REFUNDABLE",
        "No captured provider payment is available for refund",
      );
    payment.refunds ||= [];
    const existing = payment.refunds.find(
      (refund) => refund.idempotencyKey === idempotencyKey,
    );
    if (existing) {
      if (existing.amount !== amount || existing.reason !== reason)
        throw new AppError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "This idempotency key was already used for a different refund request",
        );
      if (existing.status === "SUCCEEDED")
        return {
          duplicate: true,
          process: false,
          refund: existing,
          provider: payment.provider || "development",
          externalId: payment.externalId,
        };
      if (existing.status === "PENDING")
        return {
          duplicate: true,
          process: true,
          refund: existing,
          provider: payment.provider || "development",
          externalId: payment.externalId,
        };
    }
    if (!["CAPTURED", "PARTIALLY_REFUNDED"].includes(payment.status || ""))
      throw new AppError(
        409,
        "PAYMENT_NOT_REFUNDABLE",
        "No captured provider payment is available for refund",
      );
    const capturedAmount = payment.amount ?? order.total;
    const committed = payment.refunds
      .filter((refund) => ["PENDING", "SUCCEEDED"].includes(refund.status))
      .reduce((sum, refund) => sum + refund.amount, 0);
    if (amount > capturedAmount - committed + Number.EPSILON)
      throw new AppError(
        422,
        "REFUND_AMOUNT_INVALID",
        "Refund exceeds the remaining captured amount",
      );
    const refund: StoredRefund = existing || {
      id: crypto.randomUUID(),
      amount,
      status: "PENDING",
      reason,
      idempotencyKey,
      createdAt: new Date().toISOString(),
    };
    if (existing) existing.status = "PENDING";
    else payment.refunds.push(refund);
    return {
      duplicate: Boolean(existing),
      process: true,
      refund,
      provider: payment.provider || "development",
      externalId: payment.externalId,
    };
  }
  completeRefund(
    orderId: string,
    refundId: string,
    externalId: string,
    actor?: string,
  ) {
    const order = this.orders.get(orderId);
    const payment = order?.payment;
    const refund = payment?.refunds?.find((item) => item.id === refundId);
    if (!order || !payment || !refund)
      throw new AppError(404, "REFUND_NOT_FOUND", "Refund was not found");
    if (refund.status === "SUCCEEDED") {
      if (refund.externalId && refund.externalId !== externalId)
        throw new AppError(
          409,
          "REFUND_REFERENCE_CONFLICT",
          "Refund was already completed with another provider reference",
        );
      return refund;
    }
    refund.externalId = externalId;
    refund.status = "SUCCEEDED";
    const capturedAmount = payment.amount ?? order.total;
    const refundedAmount = (payment.refunds || [])
      .filter((item) => item.status === "SUCCEEDED")
      .reduce((sum, item) => sum + item.amount, 0);
    payment.refundedAmount = Math.min(capturedAmount, refundedAmount);
    payment.status =
      payment.refundedAmount >= capturedAmount
        ? "REFUNDED"
        : "PARTIALLY_REFUNDED";
    this.auditLogs.unshift({
      id: crypto.randomUUID(),
      action: "payment.refunded",
      resource: "refund",
      resourceId: refund.id,
      actor,
      after: {
        amount: refund.amount,
        reason: refund.reason,
        externalId,
        paymentStatus: payment.status,
      },
      createdAt: new Date().toISOString(),
    });
    return refund;
  }
  failRefund(orderId: string, refundId: string) {
    const refund = this.orders
      .get(orderId)
      ?.payment?.refunds?.find((item) => item.id === refundId);
    if (refund?.status === "PENDING") refund.status = "FAILED";
  }
  reserveMany(lines: Array<{ variantId: string; quantity: number }>) {
    const totals = new Map<string, number>();
    for (const line of lines)
      totals.set(
        line.variantId,
        (totals.get(line.variantId) || 0) + line.quantity,
      );
    const resolved = [...totals].map(([variantId, quantity]) => ({
      ...this.getVariant(variantId),
      quantity,
    }));
    for (const { variant, quantity } of resolved)
      if (variant.stock - variant.reserved < quantity)
        throw new AppError(
          409,
          "INSUFFICIENT_STOCK",
          `Insufficient stock for ${variant.sku}`,
        );
    for (const { variant, quantity } of resolved) variant.reserved += quantity;
  }
  releaseMany(lines: Array<{ variantId: string; quantity: number }>) {
    const totals = new Map<string, number>();
    for (const line of lines)
      totals.set(
        line.variantId,
        (totals.get(line.variantId) || 0) + line.quantity,
      );
    for (const [variantId, quantity] of totals) {
      const { variant } = this.getVariant(variantId);
      variant.reserved = Math.max(0, variant.reserved - quantity);
    }
  }
  getVariant(id: string) {
    for (const product of this.products.values()) {
      const variant = product.variants.find((x) => x.id === id);
      if (variant) return { product, variant };
    }
    throw new AppError(404, "VARIANT_NOT_FOUND", "Product variant not found");
  }
}
export function seedStore(store: CommerceStore) {
  if (store.products.size) return;
  const now = new Date().toISOString();
  store.coupons.set("WELCOME10", {
    code: "WELCOME10",
    type: "PERCENTAGE",
    value: 10,
    minimumSpend: 1000,
    maximumDiscount: 1500,
    startsAt: Date.now() - 86_400_000,
    endsAt: Date.now() + 30 * 86_400_000,
    enabled: true,
    usageLimit: 1000,
    used: 0,
  });
  const definitions: Array<{
    name: string;
    slug: string;
    category: string;
    prices: number[];
    options: string[];
    optionName: string;
    weights?: number[];
  }> = [
    {
      name: "Arc Linen Lounge Chair",
      slug: "arc-linen-lounge-chair",
      category: "Home",
      prices: [18490],
      options: ["Standard"],
      optionName: "Style",
    },
    {
      name: "Form No. 03 Table Lamp",
      slug: "form-no-03-table-lamp",
      category: "Lighting",
      prices: [7490],
      options: ["Standard"],
      optionName: "Style",
    },
    {
      name: "Soft Structure Weekender",
      slug: "soft-structure-weekender",
      category: "Travel",
      prices: [9290],
      options: ["Standard"],
      optionName: "Style",
    },
    {
      name: "Contour Everyday Watch",
      slug: "contour-everyday-watch",
      category: "Accessories",
      prices: [12490],
      options: ["Standard"],
      optionName: "Style",
    },
    {
      name: "Hand-thrown Carafe Set",
      slug: "hand-thrown-carafe-set",
      category: "Dining",
      prices: [3490],
      options: ["Standard"],
      optionName: "Style",
    },
    {
      name: "Field Merino Overshirt",
      slug: "field-merino-overshirt",
      category: "Wardrobe",
      prices: [8490, 8490, 8490, 8490, 8490],
      options: ["S", "M", "L", "XL", "XXL"],
      optionName: "Size",
    },
    {
      name: "Fold Desk Organiser",
      slug: "fold-desk-organiser",
      category: "Workspace",
      prices: [2290],
      options: ["Standard"],
      optionName: "Style",
    },
    {
      name: "Cloud Cotton Throw",
      slug: "cloud-cotton-throw",
      category: "Home",
      prices: [3990],
      options: ["Standard"],
      optionName: "Style",
    },
    {
      name: "Organic Toor Dal",
      slug: "organic-toor-dal",
      category: "Grocery",
      prices: [230, 420, 790],
      options: ["500 g", "1 kg", "2 kg"],
      optionName: "Weight",
      weights: [500, 1000, 2000],
    },
    {
      name: "Everyday Sneaker",
      slug: "everyday-sneaker",
      category: "Footwear",
      prices: [5490, 5490, 5490, 5490, 5490],
      options: ["6", "7", "8", "9", "10"],
      optionName: "Size",
    },
  ];
  for (const p of definitions) {
    const id = crypto.randomUUID();
    store.products.set(id, {
      id,
      name: p.name,
      slug: p.slug,
      description: `Considered ${p.category.toLowerCase()} product`,
      category: p.category,
      status: "ACTIVE",
      taxRate: p.category === "Grocery" ? 5 : 12,
      specifications: {},
      media: [],
      createdAt: now,
      updatedAt: now,
      variants: p.options.map((v, i) => ({
        id: crypto.randomUUID(),
        sku: `AR-${p.slug.slice(0, 3).toUpperCase()}-${i + 1}`,
        title: v,
        price: p.prices[i]!,
        mrp: Math.round(p.prices[i]! * 1.15),
        stock: 25,
        reserved: 0,
        attributes: { [p.optionName]: v },
        weightGrams: p.weights?.[i] || 600,
      })),
    });
  }
}
