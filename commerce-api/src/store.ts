import crypto from "node:crypto";
import { AppError } from "./errors.js";
import { assertOrderTransition } from "./order-state.js";
export type StoredUser = {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  passwordHash: string;
  passwordEnabled?: boolean;
  role: string;
  permissions: string[];
  totpSecretEncrypted?: string;
  totpEnabled?: boolean;
  tags?: string[];
  note?: string;
  marketingConsent?: boolean;
  marketingConsentUpdatedAt?: string;
  disabledAt?: string;
  authVersion?: number;
  createdAt?: string;
  updatedAt?: string;
};
export type StoredVariant = {
  id: string;
  sku: string;
  title: string;
  active: boolean;
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
  media: Array<{ id: string; url: string; alt: string; type: "IMAGE" | "VIDEO"; position: number; variantId?: string }>;
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
  returnRequestId?: string;
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
      notes?: string;
      status: string;
      createdAt: string;
      updatedAt?: string;
      items?: Array<{
        id: string;
        orderItemId?: string;
        variantId: string;
        name: string;
        sku: string;
        quantity: number;
        condition?: string;
      }>;
    }
  >();
  addresses = new Map<string, Array<Record<string, unknown>>>();
  reviews = new Map<string, { id: string; productId: string; userId: string; rating: number; title?: string; body: string; verified: boolean; status: string; createdAt: string }>();
  supportTickets = new Map<string, { id: string; number: string; userId?: string; subject: string; priority: string; status: string; createdAt: string; updatedAt?: string; messages: Array<{ id: string; authorId?: string; body: string; internal: boolean; createdAt: string }> }>();
  inventoryMovements = new Map<
    string,
    Array<{
      id: string;
      variantId: string;
      quantity: number;
      reason: string;
      referenceId: string;
      actorId: string;
      createdAt: string;
    }>
  >();
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
    const now = new Date().toISOString();
    const user: StoredUser = {
      ...input,
      passwordEnabled: input.passwordEnabled ?? true,
      tags: input.tags || [],
      marketingConsent: input.marketingConsent || false,
      createdAt: input.createdAt || now,
      updatedAt: input.updatedAt || now,
      id: crypto.randomUUID(),
    };
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
    const variantIds = new Set<string>();
    const skus = new Set<string>();
    for (const variant of input.variants) {
      const normalizedSku = variant.sku.trim().toLowerCase();
      if (variantIds.has(variant.id) || skus.has(normalizedSku))
        throw new AppError(
          409,
          "DUPLICATE_VARIANT",
          "Each product variant must have a unique id and SKU",
        );
      variantIds.add(variant.id);
      skus.add(normalizedSku);
      const idOwner = [...this.products.values()].find(
        (product) =>
          product.id !== id &&
          product.variants.some((candidate) => candidate.id === variant.id),
      );
      if (idOwner)
        throw new AppError(
          409,
          "VARIANT_ID_EXISTS",
          "A product variant with this id already exists",
        );
      const owner = [...this.products.values()].find(
        (product) =>
          product.id !== id &&
          product.variants.some(
            (candidate) => candidate.sku.trim().toLowerCase() === normalizedSku,
          ),
      );
      if (owner)
        throw new AppError(
          409,
          "SKU_EXISTS",
          `SKU ${variant.sku} is already assigned to another product`,
        );
    }
    const mediaIds = new Set<string>();
    for (const media of input.media) {
      if (mediaIds.has(media.id))
        throw new AppError(
          409,
          "DUPLICATE_MEDIA",
          "Each product media record must have a unique id",
        );
      mediaIds.add(media.id);
      if (
        media.variantId &&
        !input.variants.some((variant) => variant.id === media.variantId)
      )
        throw new AppError(
          400,
          "MEDIA_VARIANT_INVALID",
          "Product media can only be assigned to a variant in this product",
        );
      const mediaOwner = [...this.products.values()].find(
        (product) =>
          product.id !== id &&
          product.media.some((candidate) => candidate.id === media.id),
      );
      if (mediaOwner)
        throw new AppError(
          409,
          "MEDIA_ID_EXISTS",
          "A product media record with this id already exists",
        );
    }
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
    const receivedReturn =
      from === "RETURN_APPROVED" && to === "RETURNED"
        ? [...this.returns.values()].find(
            (item) => item.orderId === id && item.status === "APPROVED",
          )
        : undefined;
    if (from === "RETURN_APPROVED" && to === "RETURNED" && !receivedReturn)
      throw new AppError(
        409,
        "RETURN_REQUEST_MISSING",
        "An approved return request is required before receiving a return",
      );
    const changedAt = new Date().toISOString();
    order.status = to;
    if (receivedReturn) {
      receivedReturn.status = "RECEIVED";
      receivedReturn.updatedAt = changedAt;
    }
    order.history.push({
      from,
      to,
      at: changedAt,
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
      createdAt: changedAt,
    });
    return order;
  }
  beginRefund(
    orderId: string,
    amount: number,
    idempotencyKey: string,
    reason: string,
    actor?: string,
    requestedReturnId?: string,
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
      if (
        existing.amount !== amount ||
        existing.reason !== reason ||
        (requestedReturnId !== undefined &&
          existing.returnRequestId !== requestedReturnId)
      )
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
      if (existing.status === "PENDING") {
        if (existing.returnRequestId && order.status === "RETURNED")
          this.transitionOrder(order.id, "REFUND_PENDING", actor, "REFUND");
        return {
          duplicate: true,
          process: true,
          refund: existing,
          provider: payment.provider || "development",
          externalId: payment.externalId,
        };
      }
    }
    const linkedReturn = existing?.returnRequestId
      ? this.returns.get(existing.returnRequestId)
      : requestedReturnId
        ? this.returns.get(requestedReturnId)
      : [...this.returns.values()].find(
          (item) => item.orderId === orderId && item.status === "RECEIVED",
        );
    if (
      requestedReturnId &&
      (!linkedReturn ||
        linkedReturn.orderId !== orderId ||
        linkedReturn.status !== "RECEIVED")
    )
      throw new AppError(
        409,
        "RETURN_NOT_RECEIVED",
        "The selected return is not received and ready for refund",
      );
    if (
      !linkedReturn &&
      [...this.returns.values()].some(
        (item) => item.orderId === orderId && item.status === "APPROVED",
      )
    )
      throw new AppError(
        409,
        "RETURN_NOT_RECEIVED",
        "Mark the approved return as received before starting its refund",
      );
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
      returnRequestId: linkedReturn?.id,
      amount,
      status: "PENDING",
      reason,
      idempotencyKey,
      createdAt: new Date().toISOString(),
    };
    if (existing) {
      existing.status = "PENDING";
      existing.returnRequestId ||= linkedReturn?.id;
    }
    else payment.refunds.push(refund);
    if (refund.returnRequestId && order.status === "RETURNED")
      this.transitionOrder(order.id, "REFUND_PENDING", actor, "REFUND");
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
    if (refund.returnRequestId) {
      const linkedReturn = this.returns.get(refund.returnRequestId);
      if (linkedReturn) {
        linkedReturn.status = "REFUNDED";
        linkedReturn.updatedAt = new Date().toISOString();
      }
      if (order.status === "REFUND_PENDING")
        this.transitionOrder(
          order.id,
          payment.status === "REFUNDED" ? "REFUNDED" : "RETURNED",
          actor,
          "REFUND",
        );
    }
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
    const order = this.orders.get(orderId);
    const refund = order?.payment?.refunds?.find((item) => item.id === refundId);
    if (refund?.status === "PENDING") {
      refund.status = "FAILED";
      if (refund.returnRequestId && order?.status === "REFUND_PENDING")
        this.transitionOrder(order.id, "RETURNED", undefined, "REFUND");
    }
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
  adjustInventory(
    variantId: string,
    quantity: number,
    reason: string,
    referenceId: string,
    actorId: string,
  ) {
    for (const movements of this.inventoryMovements.values()) {
      const duplicate = movements.find(
        (movement) => movement.referenceId === referenceId,
      );
      if (!duplicate) continue;
      if (
        duplicate.variantId !== variantId ||
        duplicate.quantity !== quantity ||
        duplicate.reason !== reason
      )
        throw new AppError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "This idempotency key was already used for another inventory adjustment",
        );
      const { variant } = this.getVariant(variantId);
      return { variant, movement: duplicate, replayed: true };
    }
    const { variant } = this.getVariant(variantId);
    if (variant.stock + quantity < variant.reserved)
      throw new AppError(
        409,
        "INVENTORY_ADJUSTMENT_INVALID",
        "Adjustment would reduce stock below reserved quantity",
      );
    variant.stock += quantity;
    const movement = {
      id: crypto.randomUUID(),
      variantId,
      quantity,
      reason,
      referenceId,
      actorId,
      createdAt: new Date().toISOString(),
    };
    const movements = this.inventoryMovements.get(variantId) || [];
    movements.unshift(movement);
    this.inventoryMovements.set(variantId, movements);
    this.auditLogs.unshift({
      id: crypto.randomUUID(),
      userId: actorId,
      action: "inventory.adjusted",
      resource: "variant",
      resourceId: variantId,
      after: { onHand: variant.stock, quantity, reason, referenceId },
      createdAt: movement.createdAt,
    });
    return { variant, movement, replayed: false };
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
        active: true,
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
