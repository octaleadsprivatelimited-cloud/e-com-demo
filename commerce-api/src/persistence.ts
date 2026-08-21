import crypto from "node:crypto";
import {
  Prisma,
  PrismaClient,
  type OrderStatus,
  type UserRole,
} from "@prisma/client";
import { AppError } from "./errors.js";
import type {
  CommerceStore,
  StoredIntegration,
  StoredOrder,
  StoredProduct,
  StoredUser,
} from "./store.js";

const number = (value: Prisma.Decimal | number) => Number(value);
const hash = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");
const orderOperationsInclude = {
  items: true,
  history: { orderBy: { createdAt: "desc" as const }, take: 200 },
  payments: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: {
      refunds: { orderBy: { createdAt: "desc" as const }, take: 100 },
    },
  },
  shipments: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: {
      events: { orderBy: { occurredAt: "desc" as const }, take: 200 },
    },
  },
} satisfies Prisma.OrderInclude;
type PersistedOrder = Prisma.OrderGetPayload<{
  include: typeof orderOperationsInclude;
}>;

function toStoredOrder(order: PersistedOrder): StoredOrder {
  const snapshot = order.addressSnapshot as NonNullable<
    StoredOrder["invoiceSnapshot"]
  >;
  const trackingValue = snapshot.contact?.email || snapshot.contact?.phone;
  const payment = order.payments[0];
  const refunds = payment?.refunds.slice().reverse().map((refund) => ({
    id: refund.id,
    amount: number(refund.amount),
    status: refund.status as "PENDING" | "SUCCEEDED" | "FAILED",
    reason: refund.reason || "Not provided",
    externalId: refund.externalId || undefined,
    idempotencyKey: refund.idempotencyKey,
    createdAt: refund.createdAt.toISOString(),
  }));
  const shipment = order.shipments[0];
  return {
    id: order.id,
    number: order.number,
    userId: order.userId || undefined,
    status: order.status,
    payment: payment
      ? {
          externalId: payment.externalId || undefined,
          provider: payment.provider,
          status: payment.status,
          gatewayTransactionId: payment.gatewayTransactionId || undefined,
          amount: number(payment.amount),
          currency: payment.currency,
          refundedAmount: (refunds || [])
            .filter((refund) => refund.status === "SUCCEEDED")
            .reduce((sum, refund) => sum + refund.amount, 0),
          refunds,
        }
      : null,
    trackingVerificationHash: trackingValue
      ? hash(trackingValue.trim().toLowerCase())
      : undefined,
    shippingSelection: snapshot.shippingSelection,
    shipment: shipment
      ? {
          id: shipment.id,
          provider: shipment.provider,
          externalId: shipment.externalId || undefined,
          awb: shipment.awb || undefined,
          courier: shipment.courier || undefined,
          trackingUrl: shipment.trackingUrl || undefined,
          status: shipment.status,
          createdAt: shipment.createdAt.toISOString(),
          events: shipment.events.slice().reverse().map((event) => ({
            status: event.status,
            location: event.location || undefined,
            occurredAt: event.occurredAt.toISOString(),
          })),
        }
      : undefined,
    invoiceSnapshot: snapshot,
    lines: order.items.map((item) => ({
      variantId: item.variantId,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: number(item.unitPrice),
      tax: number(item.tax),
    })),
    subtotal: number(order.subtotal),
    tax: number(order.tax),
    shipping: number(order.shipping),
    discount: number(order.discount),
    total: number(order.total),
    idempotencyKey: order.idempotencyKey,
    history: order.history.slice().reverse().map((entry) => ({
      from: entry.fromStatus || undefined,
      to: entry.toStatus,
      at: entry.createdAt.toISOString(),
      actor: entry.actorId || undefined,
      source: entry.source,
    })),
    createdAt: order.createdAt.toISOString(),
  };
}

export class PrismaPersistence {
  constructor(readonly db = new PrismaClient()) {}

  async connect() {
    await this.db.$connect();
  }

  async disconnect() {
    await this.db.$disconnect();
  }

  async getSetting<T>(key: string): Promise<T | null> {
    const setting = await this.db.setting.findUnique({ where: { key } });
    return setting ? (setting.value as T) : null;
  }

  async saveSetting(key: string, value: Prisma.InputJsonValue) {
    await this.db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async hydrate(store: CommerceStore) {
    const [
      users,
      products,
      orders,
      coupons,
      integrations,
      carts,
      wishlistItems,
      returns,
    ] = await Promise.all([
      this.db.user.findMany({
        include: {
          roleAssignments: {
            include: {
              role: {
                include: { permissions: { include: { permission: true } } },
              },
            },
          },
        },
      }),
      this.db.product.findMany({
        where: { deletedAt: null },
        include: {
          category: true,
          brand: true,
          variants: { include: { inventory: true } },
          media: { orderBy: { position: "asc" } },
        },
      }),
      this.db.order.findMany({ include: orderOperationsInclude }),
      this.db.coupon.findMany({
        include: { _count: { select: { orders: true } } },
      }),
      this.db.integrationConfig.findMany(),
      this.db.cart.findMany({ include: { items: true } }),
      this.db.wishlistItem.findMany(),
      this.db.returnRequest.findMany(),
    ]);
    for (const user of users) {
      const permissions = [
        ...new Set(
          user.roleAssignments.flatMap((assignment) =>
            assignment.role.permissions.map((entry) => entry.permission.key),
          ),
        ),
      ];
      store.users.set(user.id, {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile || undefined,
        passwordHash: user.passwordHash,
        role: user.role,
        permissions,
        totpEnabled: user.totpEnabled,
        totpSecretEncrypted: user.totpSecret
          ? Buffer.from(user.totpSecret).toString("base64")
          : undefined,
      });
    }
    for (const product of products) {
      store.products.set(product.id, {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        category: product.category.name,
        brand: product.brand?.name,
        status: product.status as StoredProduct["status"],
        taxRate: number(product.taxRate),
        hsnCode: product.hsnCode || undefined,
        specifications: product.specifications as Record<string, string>,
        seoTitle: product.seoTitle || undefined,
        seoDescription: product.seoDescription || undefined,
        media: product.media.map((item) => ({
          id: item.id,
          url: item.url,
          alt: item.alt,
          type: item.type as "IMAGE" | "VIDEO",
          position: item.position,
          variantId: item.variantId || undefined,
        })),
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        variants: product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          title: variant.title,
          price: number(variant.price),
          mrp: number(variant.mrp),
          stock: variant.inventory?.onHand || 0,
          reserved: variant.inventory?.reserved || 0,
          attributes: variant.attributes as Record<string, string>,
          weightGrams: variant.weightGrams,
        })),
      });
    }
    for (const order of orders) store.orders.set(order.id, toStoredOrder(order));
    for (const coupon of coupons)
      store.coupons.set(coupon.code, {
        code: coupon.code,
        type: coupon.type,
        value: number(coupon.value),
        minimumSpend: number(coupon.minimumSpend),
        maximumDiscount: coupon.maximumDiscount
          ? number(coupon.maximumDiscount)
          : undefined,
        startsAt: coupon.startsAt.getTime(),
        endsAt: coupon.endsAt.getTime(),
        enabled: coupon.enabled,
        usageLimit: coupon.usageLimit || undefined,
        used: coupon._count.orders,
      });
    for (const integration of integrations)
      store.integrations.set(integration.id, {
        id: integration.id,
        kind: integration.kind,
        provider: integration.provider,
        enabled: integration.enabled,
        priority: integration.priority,
        environment: integration.environment,
        encryptedCredentials: Buffer.from(
          integration.encryptedCredentials,
        ).toString("base64"),
        publicConfig: integration.publicConfig as Record<string, unknown>,
        updatedAt: integration.updatedAt.toISOString(),
      });
    for (const cart of carts) {
      const key = cart.userId
        ? `user:${cart.userId}`
        : cart.guestToken
          ? `guest:${cart.guestToken}`
          : undefined;
      if (key)
        store.carts.set(
          key,
          new Map(cart.items.map((item) => [item.variantId, item.quantity])),
        );
    }
    for (const item of wishlistItems) {
      const list = store.wishlists.get(item.userId) || new Set<string>();
      list.add(item.productId);
      store.wishlists.set(item.userId, list);
    }
    for (const request of returns)
      store.returns.set(request.id, {
        id: request.id,
        orderId: request.orderId,
        userId: request.userId || undefined,
        reason: request.reason,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
      });
  }

  async saveUser(user: StoredUser) {
    await this.db.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        passwordHash: user.passwordHash,
        role: user.role as UserRole,
      },
    });
  }
  async deleteCustomerAccount(userId: string) {
    return this.db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (!user)
        throw new AppError(404, "ACCOUNT_NOT_FOUND", "Account not found");
      if (user.role !== "CUSTOMER")
        throw new AppError(
          403,
          "CUSTOMER_ACCOUNT_REQUIRED",
          "Staff accounts cannot be deleted here",
        );
      const orders = await tx.order.findMany({
        where: { userId },
        select: { id: true },
      });
      const deletedAt = new Date().toISOString();
      for (const order of orders)
        await tx.order.update({
          where: { id: order.id },
          data: {
            userId: null,
            addressSnapshot: {
              redacted: true,
              deletedAt,
              retentionReason: "financial_and_fulfilment_record",
            },
          },
        });
      await tx.auditLog.create({
        data: {
          userId,
          action: "customer.account_deleted",
          resource: "user",
          resourceId: userId,
          after: { retainedOrders: orders.length, personalDataRedacted: true },
        },
      });
      await tx.user.delete({ where: { id: userId } });
      return { deleted: true, retainedOrders: orders.length };
    });
  }
  async saveTotp(userId: string, encryptedSecret: string, enabled: boolean) {
    await this.db.user.update({
      where: { id: userId },
      data: {
        totpSecret: Buffer.from(encryptedSecret, "base64"),
        totpEnabled: enabled,
      },
    });
  }

  async queueNotification(input: {
    userId?: string;
    channel: string;
    template: string;
    destination: string;
    payload: Prisma.InputJsonValue;
  }) {
    return this.db.notification.create({
      data: { ...input, status: "QUEUED" },
    });
  }

  async saveSession(jti: string, userId: string, expiresAt: number) {
    await this.db.session.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        tokenHash: hash(jti),
        expiresAt: new Date(expiresAt),
      },
    });
  }

  async getSession(jti: string) {
    return this.db.session.findFirst({
      where: {
        tokenHash: hash(jti),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async revokeSession(jti: string) {
    await this.db.session.updateMany({
      where: { tokenHash: hash(jti), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async consumeSession(jti: string) {
    const changed = await this.db.session.updateMany({
      where: {
        tokenHash: hash(jti),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    });
    return changed.count === 1;
  }

  async saveProduct(product: StoredProduct) {
    const category = await this.db.category.upsert({
      where: {
        slug: product.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      },
      update: { name: product.category },
      create: {
        name: product.category,
        slug: product.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      },
    });
    const brand = product.brand
      ? await this.db.brand.upsert({
          where: {
            slug: product.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          },
          update: { name: product.brand },
          create: {
            name: product.brand,
            slug: product.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          },
        })
      : undefined;
    await this.db.$transaction(async (tx) => {
      await tx.product.upsert({
        where: { id: product.id },
        update: {
          name: product.name,
          slug: product.slug,
          description: product.description,
          status: product.status,
          categoryId: category.id,
          brandId: brand?.id,
          hsnCode: product.hsnCode,
          taxRate: product.taxRate,
          specifications: product.specifications,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
        },
        create: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          status: product.status,
          categoryId: category.id,
          brandId: brand?.id,
          hsnCode: product.hsnCode,
          taxRate: product.taxRate,
          specifications: product.specifications,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
        },
      });
      for (const variant of product.variants) {
        await tx.productVariant.upsert({
          where: { id: variant.id },
          update: {
            sku: variant.sku,
            title: variant.title,
            price: variant.price,
            mrp: variant.mrp,
            weightGrams: variant.weightGrams,
            attributes: variant.attributes,
          },
          create: {
            id: variant.id,
            productId: product.id,
            sku: variant.sku,
            title: variant.title,
            price: variant.price,
            mrp: variant.mrp,
            weightGrams: variant.weightGrams,
            attributes: variant.attributes,
          },
        });
        await tx.inventory.upsert({
          where: { variantId: variant.id },
          update: { onHand: variant.stock, reserved: variant.reserved },
          create: {
            variantId: variant.id,
            onHand: variant.stock,
            reserved: variant.reserved,
          },
        });
      }
      await tx.productMedia.deleteMany({ where: { productId: product.id } });
      if (product.media.length) {
        const allowedVariantIds = new Set(
          product.variants.map((variant) => variant.id),
        );
        await tx.productMedia.createMany({
          data: product.media.map((item) => ({
            id: item.id || crypto.randomUUID(),
            productId: product.id,
            variantId:
              item.variantId && allowedVariantIds.has(item.variantId)
                ? item.variantId
                : null,
            url: item.url,
            alt: item.alt,
            type: item.type,
            position: item.position,
          })),
        });
      }
    });
  }

  async addProductMedia(input: {
    id: string;
    productId: string;
    url: string;
    alt: string;
    position: number;
  }) {
    return this.db.productMedia.create({ data: { ...input, type: "IMAGE" } });
  }

  async archiveProduct(id: string) {
    await this.db.product.update({
      where: { id },
      data: { status: "ARCHIVED", deletedAt: new Date() },
    });
  }

  async adjustInventory(
    variantId: string,
    quantity: number,
    reason: string,
    actorId: string,
  ) {
    return this.db.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({ where: { variantId } });
      if (!inventory || inventory.onHand + quantity < inventory.reserved)
        throw new AppError(
          409,
          "INVENTORY_ADJUSTMENT_INVALID",
          "Adjustment would reduce stock below reserved quantity",
        );
      const updated = await tx.inventory.update({
        where: { variantId },
        data: {
          onHand: { increment: quantity },
          version: { increment: 1 },
          movements: { create: { quantity, reason, referenceId: actorId } },
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "inventory.adjusted",
          resource: "variant",
          resourceId: variantId,
          before: { onHand: inventory.onHand },
          after: { onHand: updated.onHand, reason },
        },
      });
      return updated;
    });
  }

  listAddresses(userId: string) {
    return this.db.address.findMany({
      where: { userId },
      orderBy: { isDefault: "desc" },
    });
  }
  async saveAddress(
    userId: string,
    input: {
      label: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      isDefault: boolean;
    },
  ) {
    return this.db.$transaction(async (tx) => {
      if (input.isDefault)
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      return tx.address.create({ data: { userId, ...input } });
    });
  }
  async deleteAddress(userId: string, id: string) {
    const deleted = await this.db.address.deleteMany({ where: { id, userId } });
    if (!deleted.count)
      throw new AppError(404, "ADDRESS_NOT_FOUND", "Address not found");
  }
  listApprovedReviews(productId: string) {
    return this.db.review.findMany({
      where: { productId, status: "APPROVED" },
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        verified: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async saveReview(
    userId: string,
    input: { productId: string; rating: number; title?: string; body: string },
    verified: boolean,
  ) {
    try {
      return await this.db.review.create({
        data: { userId, ...input, verified, status: "PENDING" },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new AppError(
          409,
          "REVIEW_EXISTS",
          "You have already reviewed this product",
        );
      throw error;
    }
  }

  async refreshOrders(store: CommerceStore) {
    const orders = await this.db.order.findMany({
      include: orderOperationsInclude,
      orderBy: { createdAt: "desc" },
    });
    const persistedIds = new Set(orders.map((order) => order.id));
    for (const id of store.orders.keys())
      if (!persistedIds.has(id)) store.orders.delete(id);
    for (const order of orders) store.orders.set(order.id, toStoredOrder(order));
  }

  async refreshOrder(store: CommerceStore, orderId: string) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: orderOperationsInclude,
    });
    if (!order) {
      store.orders.delete(orderId);
      return null;
    }
    const stored = toStoredOrder(order);
    store.orders.set(order.id, stored);
    return stored;
  }

  async listAdminOrdersPage(input: {
    page: number;
    pageSize: number;
    search?: string;
    status?: OrderStatus;
  }) {
    const search = input.search?.trim();
    const where: Prisma.OrderWhereInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: "insensitive" as const } },
              {
                addressSnapshot: {
                  path: ["contact", "name"],
                  string_contains: search,
                },
              },
              {
                addressSnapshot: {
                  path: ["contact", "email"],
                  string_contains: search,
                },
              },
              {
                addressSnapshot: {
                  path: ["contact", "phone"],
                  string_contains: search,
                },
              },
              {
                user: {
                  is: {
                    OR: [
                      { name: { contains: search, mode: "insensitive" as const } },
                      { email: { contains: search, mode: "insensitive" as const } },
                      { mobile: { contains: search, mode: "insensitive" as const } },
                    ],
                  },
                },
              },
              {
                items: {
                  some: {
                    OR: [
                      { name: { contains: search, mode: "insensitive" as const } },
                      { sku: { contains: search, mode: "insensitive" as const } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };
    const terminalStatuses: OrderStatus[] = ["CANCELLED", "FAILED", "REFUNDED"];
    const [orders, filteredTotal, totalOrders, activeCount, readyToShip, orderValue] =
      await this.db.$transaction([
        this.db.order.findMany({
          where,
          include: orderOperationsInclude,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        this.db.order.count({ where }),
        this.db.order.count(),
        this.db.order.count({ where: { status: { notIn: terminalStatuses } } }),
        this.db.order.count({ where: { status: "PACKED" } }),
        this.db.order.aggregate({
          where: { status: { notIn: ["CANCELLED", "FAILED"] } },
          _sum: { total: true },
        }),
      ]);
    return {
      orders: orders.map(toStoredOrder),
      filteredTotal,
      summary: {
        totalOrders,
        activeCount,
        readyToShip,
        orderValue: number(orderValue._sum.total || 0),
        currency: "INR",
      },
    };
  }
  listCustomerReviews(userId: string) {
    return this.db.review.findMany({
      where: { userId },
      select: {
        id: true,
        productId: true,
        rating: true,
        title: true,
        body: true,
        verified: true,
        status: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            media: {
              where: { type: "IMAGE" },
              orderBy: { position: "asc" },
              take: 1,
              select: { url: true, alt: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  listReviews() {
    return this.db.review.findMany({
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async moderateReview(id: string, status: string, actorId: string) {
    const review = await this.db.review.update({
      where: { id },
      data: { status },
    });
    await this.db.auditLog.create({
      data: {
        userId: actorId,
        action: "review.moderated",
        resource: "review",
        resourceId: id,
        after: { status },
      },
    });
    return review;
  }
  async createSupportTicket(
    userId: string,
    input: { subject: string; message: string; priority: string },
  ) {
    const number = `SUP-${Date.now().toString(36).toUpperCase()}`;
    return this.db.supportTicket.create({
      data: {
        number,
        userId,
        subject: input.subject,
        priority: input.priority,
        messages: { create: { authorId: userId, body: input.message } },
      },
      include: { messages: true },
    });
  }
  listSupportTickets(userId?: string) {
    return this.db.supportTicket.findMany({
      where: userId ? { userId } : undefined,
      include: {
        messages: {
          where: userId ? { internal: false } : undefined,
          orderBy: { createdAt: "asc" },
        },
        user: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }
  async replySupportTicket(
    id: string,
    actorId: string,
    message: string,
    status: string | undefined,
    customerId?: string,
  ) {
    const ticket = await this.db.supportTicket.findFirst({
      where: { id, ...(customerId ? { userId: customerId } : {}) },
    });
    if (!ticket)
      throw new AppError(404, "TICKET_NOT_FOUND", "Support ticket not found");
    await this.db.$transaction([
      this.db.supportMessage.create({
        data: { ticketId: id, authorId: actorId, body: message },
      }),
      this.db.supportTicket.update({
        where: { id },
        data: { status: status || (customerId ? "OPEN" : "WAITING_CUSTOMER") },
      }),
    ]);
    return this.db.supportTicket.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  async saveCartItem(key: string, variantId: string, quantity: number) {
    await this.db.$transaction(async (tx) => {
      const userId = key.startsWith("user:") ? key.slice(5) : undefined;
      const guestToken = key.startsWith("guest:") ? key.slice(6) : undefined;
      let cart = userId
        ? await tx.cart.findFirst({ where: { userId } })
        : guestToken
          ? await tx.cart.findUnique({ where: { guestToken } })
          : null;
      cart ||= await tx.cart.create({
        data: {
          userId,
          guestToken,
          expiresAt: guestToken
            ? new Date(Date.now() + 30 * 86_400_000)
            : undefined,
        },
      });
      if (quantity === 0)
        await tx.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
      else
        await tx.cartItem.upsert({
          where: { cartId_variantId: { cartId: cart.id, variantId } },
          update: { quantity },
          create: { cartId: cart.id, variantId, quantity },
        });
    });
  }

  async saveWishlist(userId: string, productId: string, saved: boolean) {
    if (saved)
      await this.db.wishlistItem.upsert({
        where: { userId_productId: { userId, productId } },
        update: {},
        create: { userId, productId },
      });
    else
      await this.db.wishlistItem.deleteMany({ where: { userId, productId } });
  }

  async saveCoupon(coupon: {
    code: string;
    type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
    value: number;
    minimumSpend: number;
    maximumDiscount?: number;
    startsAt: number;
    endsAt: number;
    enabled: boolean;
    usageLimit?: number;
  }) {
    await this.db.coupon.upsert({
      where: { code: coupon.code },
      update: {
        type: coupon.type,
        value: coupon.value,
        minimumSpend: coupon.minimumSpend,
        maximumDiscount: coupon.maximumDiscount,
        startsAt: new Date(coupon.startsAt),
        endsAt: new Date(coupon.endsAt),
        enabled: coupon.enabled,
        usageLimit: coupon.usageLimit,
      },
      create: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minimumSpend: coupon.minimumSpend,
        maximumDiscount: coupon.maximumDiscount,
        startsAt: new Date(coupon.startsAt),
        endsAt: new Date(coupon.endsAt),
        enabled: coupon.enabled,
        usageLimit: coupon.usageLimit,
      },
    });
  }

  async transitionOrder(
    orderId: string,
    from: string,
    to: string,
    actorId?: string,
    source = "ADMIN",
  ) {
    await this.db.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id: orderId, status: from as OrderStatus },
        data: { status: to as OrderStatus },
      });
      if (changed.count !== 1)
        throw new AppError(
          409,
          "STALE_ORDER_STATE",
          "Order state changed; reload and try again",
        );
      await tx.orderHistory.create({
        data: {
          orderId,
          fromStatus: from as OrderStatus,
          toStatus: to as OrderStatus,
          actorId,
          source,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "order.status_changed",
          resource: "order",
          resourceId: orderId,
          before: { status: from },
          after: { status: to },
        },
      });
    });
  }

  async saveShipment(
    orderId: string,
    provider: string,
    result: { shipmentId: string; awb: string; trackingUrl?: string },
  ) {
    return this.db.shipment.upsert({
      where: { idempotencyKey: `ship:${orderId}` },
      update: {
        provider,
        externalId: result.shipmentId,
        awb: result.awb,
        trackingUrl: result.trackingUrl,
        status: "SHIPPED",
      },
      create: {
        orderId,
        provider,
        externalId: result.shipmentId,
        awb: result.awb,
        trackingUrl: result.trackingUrl,
        status: "SHIPPED",
        idempotencyKey: `ship:${orderId}`,
      },
    });
  }

  async shipmentContext(orderId: string) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
    const snapshot = order.addressSnapshot as any;
    return {
      shippingAddress: {
        ...snapshot.shipping,
        ...snapshot.contact,
        cod: String(snapshot.paymentMethod || "").toLowerCase() === "cod",
        weightGrams: 500,
      },
      orderTotal: { amount: Number(order.total), currency: "INR" },
      items: order.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        price: Number(item.unitPrice),
      })),
    };
  }

  async trackingDetails(orderId: string) {
    const shipment = await this.db.shipment.findFirst({
      where: { orderId },
      orderBy: { createdAt: "desc" },
      include: { events: { orderBy: { occurredAt: "asc" } } },
    });
    return shipment
      ? {
          awb: shipment.awb,
          courier: shipment.courier || shipment.provider,
          trackingUrl: shipment.trackingUrl,
          status: shipment.status,
          events: shipment.events.map((event) => ({
            status: event.status,
            location: event.location,
            occurredAt: event.occurredAt.toISOString(),
          })),
        }
      : null;
  }

  async processWebhook(input: {
    provider: string;
    eventId: string;
    payloadHash: string;
    orderId?: string;
    from?: string;
    to?: string;
    paymentId?: string;
    paymentStatus?:
      "CAPTURED" | "FAILED" | "REFUNDED" | "AUTHORIZED" | "CANCELLED";
    externalPaymentId?: string;
    paymentAmount?: number;
    paymentErrorCode?: string;
    paymentErrorDescription?: string;
    shipmentId?: string;
    shipmentStatus?: string;
    location?: string;
    occurredAt?: Date;
    safePayload?: Prisma.InputJsonValue;
  }) {
    try {
      await this.db.$transaction(async (tx) => {
        await tx.webhookEvent.create({
          data: {
            provider: input.provider,
            externalId: input.eventId,
            signatureValid: true,
            status: "PROCESSED",
            payloadHash: input.payloadHash,
            safePayload: input.safePayload,
            processedAt: new Date(),
          },
        });
        if (input.orderId && input.from && input.to) {
          const changed = await tx.order.updateMany({
            where: { id: input.orderId, status: input.from as OrderStatus },
            data: { status: input.to as OrderStatus },
          });
          if (changed.count !== 1)
            throw new AppError(
              409,
              "STALE_ORDER_STATE",
              "Order state changed before webhook processing",
            );
          await tx.orderHistory.create({
            data: {
              orderId: input.orderId,
              fromStatus: input.from as OrderStatus,
              toStatus: input.to as OrderStatus,
              source: input.provider,
            },
          });
        }
        if (input.paymentId && input.paymentStatus) {
          await tx.payment.update({
            where: { id: input.paymentId },
            data: {
              status: input.paymentStatus,
              gatewayTransactionId: input.externalPaymentId,
            },
          });
          if (input.externalPaymentId)
            await tx.paymentTransaction.create({
              data: {
                paymentId: input.paymentId,
                providerEventId: `${input.provider}:${input.eventId}:${input.externalPaymentId}`,
                kind: input.paymentStatus,
                amount: input.paymentAmount || 0,
                safePayload: {
                  errorCode: input.paymentErrorCode,
                  errorDescription: input.paymentErrorDescription,
                },
              },
            });
        }
        if (input.shipmentId && input.shipmentStatus) {
          await tx.shipment.update({
            where: { id: input.shipmentId },
            data: { status: input.shipmentStatus },
          });
          await tx.trackingEvent.create({
            data: {
              shipmentId: input.shipmentId,
              providerEventId: `${input.provider}:${input.eventId}`,
              status: input.shipmentStatus,
              location: input.location,
              occurredAt: input.occurredAt || new Date(),
            },
          });
        }
      });
      return { duplicate: false };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return { duplicate: true };
      throw error;
    }
  }

  async resolvePaymentWebhook(provider: string, externalOrderId: string) {
    const payment = await this.db.payment.findFirst({
      where: {
        provider: { equals: provider, mode: "insensitive" },
        externalId: externalOrderId,
      },
      include: { order: true },
    });
    if (!payment)
      throw new AppError(
        404,
        "PAYMENT_NOT_FOUND",
        "Webhook payment was not found",
      );
    return {
      orderId: payment.orderId,
      status: payment.order.status,
      paymentId: payment.id,
    };
  }

  async resolveShipmentWebhook(provider: string, awb: string) {
    const shipment = await this.db.shipment.findFirst({
      where: { provider: { equals: provider, mode: "insensitive" }, awb },
      include: { order: true },
    });
    if (!shipment)
      throw new AppError(
        404,
        "SHIPMENT_NOT_FOUND",
        "Webhook shipment was not found",
      );
    return {
      orderId: shipment.orderId,
      status: shipment.order.status,
      shipmentId: shipment.id,
    };
  }

  async saveReturn(request: {
    id: string;
    orderId: string;
    userId: string;
    reason: string;
    status: string;
  }) {
    await this.db.returnRequest.create({ data: request });
  }

  async decideReturn(
    id: string,
    status: "APPROVED" | "REJECTED",
    notes?: string,
  ) {
    const changed = await this.db.returnRequest.updateMany({
      where: { id, status: "REQUESTED" },
      data: { status, notes },
    });
    if (changed.count !== 1)
      throw new AppError(
        409,
        "RETURN_ALREADY_DECIDED",
        "Return request is no longer pending",
      );
  }

  async listCustomerPayments(userId: string) {
    const payments = await this.db.payment.findMany({
      where: { order: { userId } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        provider: true,
        externalId: true,
        gatewayTransactionId: true,
        status: true,
        amount: true,
        currency: true,
        verifiedAt: true,
        createdAt: true,
        order: {
          select: { id: true, number: true, status: true, createdAt: true },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            kind: true,
            amount: true,
            createdAt: true,
            safePayload: true,
          },
        },
        refunds: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            externalId: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    return payments.map((payment) => {
      const refunds = payment.refunds.map((refund) => ({
        id: refund.id,
        reference: refund.externalId,
        amount: Number(refund.amount),
        status: refund.status,
        createdAt: refund.createdAt,
      }));
      return {
        id: payment.id,
        orderId: payment.order.id,
        orderNumber: payment.order.number,
        orderStatus: payment.order.status,
        provider: payment.provider,
        status: payment.status,
        amount: Number(payment.amount),
        currency: payment.currency,
        providerReference: payment.externalId,
        transactionId: payment.gatewayTransactionId,
        refundedAmount: refunds
          .filter((refund) => refund.status !== "FAILED")
          .reduce((sum, refund) => sum + refund.amount, 0),
        refunds,
        events: payment.transactions.map((transaction) => {
          const safe =
            transaction.safePayload &&
            typeof transaction.safePayload === "object"
              ? (transaction.safePayload as Record<string, unknown>)
              : {};
          return {
            id: transaction.id,
            type: transaction.kind,
            amount: Number(transaction.amount),
            errorCode:
              typeof safe.errorCode === "string" ? safe.errorCode : undefined,
            errorDescription:
              typeof safe.errorDescription === "string"
                ? safe.errorDescription
                : undefined,
            createdAt: transaction.createdAt,
          };
        }),
        createdAt: payment.createdAt,
        verifiedAt: payment.verifiedAt,
      };
    });
  }

  async listPayments() {
    const payments = await this.db.payment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        order: { select: { number: true, userId: true } },
        transactions: { orderBy: { createdAt: "desc" } },
        refunds: { orderBy: { createdAt: "desc" } },
      },
    });
    return payments.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
      transactions: payment.transactions.map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
      })),
      refunds: payment.refunds.map((refund) => ({
        ...refund,
        amount: Number(refund.amount),
      })),
    }));
  }

  async paymentForOrder(orderNumber: string, providerOrderId: string) {
    return this.db.payment.findFirst({
      where: { externalId: providerOrderId, order: { number: orderNumber } },
      include: { order: true },
    });
  }

  async recordPaymentClientEvent(input: {
    orderNumber: string;
    providerOrderId: string;
    type: "CANCELLED" | "FAILED";
    gatewayPaymentId?: string;
    errorCode?: string;
    errorDescription?: string;
  }) {
    return this.db.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: {
          externalId: input.providerOrderId,
          order: { number: input.orderNumber },
        },
      });
      if (!payment)
        throw new AppError(
          404,
          "PAYMENT_NOT_FOUND",
          "Payment attempt was not found",
        );
      const providerEventId = `client:${input.type}:${input.gatewayPaymentId || crypto.randomUUID()}`;
      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          providerEventId,
          kind: input.type,
          amount: 0,
          safePayload: {
            errorCode: input.errorCode,
            errorDescription: input.errorDescription,
          },
        },
      });
      return tx.payment.update({
        where: { id: payment.id },
        data: {
          status: input.type as never,
          gatewayTransactionId: input.gatewayPaymentId,
        },
      });
    });
  }

  async createPaymentAttempt(
    orderId: string,
    provider: string,
    externalId: string,
    amount: number,
    idempotencyKey: string,
  ) {
    return this.db.payment.create({
      data: {
        orderId,
        provider,
        externalId,
        status: "CREATED",
        amount,
        currency: "INR",
        idempotencyKey,
      },
    });
  }

  async reconcilePayment(
    paymentId: string,
    status: {
      status: string;
      gatewayPaymentId?: string;
      amount?: number;
      currency?: string;
      errorCode?: string;
      errorDescription?: string;
    },
  ) {
    return this.db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { order: true },
      });
      if (!payment)
        throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment was not found");
      if (
        status.amount !== undefined &&
        Math.abs(status.amount - Number(payment.amount)) > 0.01
      )
        throw new AppError(
          422,
          "PAYMENT_AMOUNT_MISMATCH",
          "Gateway amount does not match the order amount",
        );
      const providerEventId = `reconcile:${payment.provider}:${status.gatewayPaymentId || payment.externalId}:${status.status}`;
      await tx.paymentTransaction.upsert({
        where: { providerEventId },
        update: {
          safePayload: {
            errorCode: status.errorCode,
            errorDescription: status.errorDescription,
          },
        },
        create: {
          paymentId: payment.id,
          providerEventId,
          kind: `RECONCILE_${status.status}`,
          amount: status.amount || 0,
          safePayload: {
            errorCode: status.errorCode,
            errorDescription: status.errorDescription,
          },
        },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: status.status as never,
          gatewayTransactionId: status.gatewayPaymentId,
          verifiedAt:
            status.status === "CAPTURED" ? new Date() : payment.verifiedAt,
        },
      });
      if (
        status.status === "CAPTURED" &&
        payment.order.status === "PAYMENT_PENDING"
      ) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: "PAID" },
        });
        await tx.orderHistory.create({
          data: {
            orderId: payment.orderId,
            fromStatus: "PAYMENT_PENDING",
            toStatus: "PAID",
            source: `${payment.provider}:reconciliation`,
            metadata: { gatewayPaymentId: status.gatewayPaymentId },
          },
        });
      }
      return {
        paymentId: payment.id,
        orderNumber: payment.order.number,
        ...status,
      };
    });
  }

  async beginRefund(
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
    return this.db.$transaction(
      async (tx) => {
        const existing = await tx.refund.findUnique({
          where: { idempotencyKey },
        });
        if (existing) {
          if (
            Number(existing.amount) !== amount ||
            (existing.reason !== null && existing.reason !== reason)
          )
            throw new AppError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This idempotency key was already used for a different refund request",
            );
          const existingPayment = await tx.payment.findUnique({
            where: { id: existing.paymentId },
          });
          if (!existingPayment || existingPayment.orderId !== orderId)
            throw new AppError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This idempotency key belongs to another refund operation",
            );
          if (existing.reason === null)
            await tx.refund.update({
              where: { id: existing.id },
              data: { reason },
            });
          if (existing.status === "SUCCEEDED")
            return {
              duplicate: true,
              process: false,
              refund: { ...existing, reason: existing.reason || reason },
              provider: existingPayment.provider,
              externalId: existingPayment.externalId,
            };
          if (existing.status === "PENDING") {
            if (!existingPayment.externalId)
              throw new AppError(
                409,
                "PAYMENT_NOT_REFUNDABLE",
                "No captured provider payment is available for refund",
              );
            return {
              duplicate: true,
              process: true,
              refund: { ...existing, reason: existing.reason || reason },
              provider: existingPayment.provider,
              externalId: existingPayment.externalId,
            };
          }
          if (
            existing.status !== "FAILED" ||
            !existingPayment.externalId ||
            !["CAPTURED", "PARTIALLY_REFUNDED"].includes(
              existingPayment.status,
            )
          )
            throw new AppError(
              409,
              "PAYMENT_NOT_REFUNDABLE",
              "No captured provider payment is available for refund",
            );
          const committed = await tx.refund.aggregate({
            where: {
              paymentId: existingPayment.id,
              status: { in: ["PENDING", "SUCCEEDED"] },
            },
            _sum: { amount: true },
          });
          if (
            amount >
            Number(existingPayment.amount) -
              Number(committed._sum.amount || 0)
          )
            throw new AppError(
              422,
              "REFUND_AMOUNT_INVALID",
              "Refund exceeds the remaining captured amount",
            );
          const reserved = await tx.refund.updateMany({
            where: { id: existing.id, status: "FAILED" },
            data: { status: "PENDING", reason },
          });
          if (reserved.count !== 1) {
            const latest = await tx.refund.findUnique({
              where: { id: existing.id },
            });
            if (latest?.status === "SUCCEEDED")
              return {
                duplicate: true,
                process: false,
                refund: latest,
                provider: existingPayment.provider,
                externalId: existingPayment.externalId,
              };
            if (latest?.status !== "PENDING")
              throw new AppError(
                409,
                "REFUND_RETRY_CONFLICT",
                "Refund retry state changed; reload and try again",
              );
          }
          return {
            duplicate: true,
            process: true,
            refund: { ...existing, status: "PENDING", reason },
            provider: existingPayment.provider,
            externalId: existingPayment.externalId,
          };
        }
        const payment = await tx.payment.findFirst({
          where: {
            orderId,
            status: { in: ["CAPTURED", "PARTIALLY_REFUNDED"] },
          },
          orderBy: { createdAt: "desc" },
          include: { refunds: true },
        });
        if (!payment?.externalId)
          throw new AppError(
            409,
            "PAYMENT_NOT_REFUNDABLE",
            "No captured provider payment is available for refund",
          );
        const committed = payment.refunds
          .filter((refund) => ["PENDING", "SUCCEEDED"].includes(refund.status))
          .reduce((sum, refund) => sum + Number(refund.amount), 0);
        if (amount > Number(payment.amount) - committed)
          throw new AppError(
            422,
            "REFUND_AMOUNT_INVALID",
            "Refund exceeds the remaining captured amount",
          );
        const refund = await tx.refund.create({
          data: {
            paymentId: payment.id,
            amount,
            status: "PENDING",
            idempotencyKey,
            reason,
          },
        });
        return {
          duplicate: false,
          process: true,
          refund,
          provider: payment.provider,
          externalId: payment.externalId,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async completeRefund(id: string, externalId: string, actorId?: string) {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.refund.findUnique({ where: { id } });
      if (!existing)
        throw new AppError(404, "REFUND_NOT_FOUND", "Refund was not found");
      if (
        existing.status === "SUCCEEDED" &&
        existing.externalId &&
        existing.externalId !== externalId
      )
        throw new AppError(
          409,
          "REFUND_REFERENCE_CONFLICT",
          "Refund was already completed with another provider reference",
        );
      const changed =
        existing.status === "SUCCEEDED"
          ? { count: 0 }
          : await tx.refund.updateMany({
              where: { id, status: { in: ["PENDING", "FAILED"] } },
              data: { externalId, status: "SUCCEEDED" },
            });
      const refund = await tx.refund.findUnique({ where: { id } });
      if (!refund || refund.status !== "SUCCEEDED")
        throw new AppError(
          409,
          "REFUND_COMPLETION_CONFLICT",
          "Refund state changed before completion",
        );
      const payment = await tx.payment.findUnique({
        where: { id: refund.paymentId },
      });
      if (!payment)
        throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment was not found");
      const refunded = await tx.refund.aggregate({
        where: { paymentId: payment.id, status: "SUCCEEDED" },
        _sum: { amount: true },
      });
      const refundedAmount = Number(refunded._sum.amount || 0);
      const paymentStatus =
        refundedAmount >= Number(payment.amount)
          ? "REFUNDED"
          : "PARTIALLY_REFUNDED";
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: paymentStatus },
      });
      if (changed.count === 1)
        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: "payment.refunded",
            resource: "refund",
            resourceId: refund.id,
            after: {
              amount: Number(refund.amount),
              reason: refund.reason,
              externalId,
              paymentStatus,
              refundedAmount,
            },
          },
        });
      return { refund, paymentStatus, refundedAmount };
    });
  }

  async failRefund(id: string) {
    await this.db.refund.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "FAILED" },
    });
  }

  async saveOrderAndReservations(
    order: StoredOrder,
    addressSnapshot: Prisma.InputJsonValue,
    provider: string,
    couponCode?: string,
    paymentExternalId?: string,
  ) {
    await this.db.$transaction(
      async (tx) => {
        const coupon = couponCode
          ? await tx.coupon.findUnique({
              where: { code: couponCode.toUpperCase() },
            })
          : null;
        if (coupon) {
          const usage = await tx.order.count({
            where: { couponId: coupon.id },
          });
          if (coupon.usageLimit !== null && usage >= coupon.usageLimit)
            throw new AppError(
              422,
              "COUPON_LIMIT_REACHED",
              "Coupon usage limit has been reached",
            );
          if (order.userId) {
            const perUser = await tx.order.count({
              where: { couponId: coupon.id, userId: order.userId },
            });
            if (perUser >= coupon.perUserLimit)
              throw new AppError(
                422,
                "COUPON_USER_LIMIT_REACHED",
                "Coupon has already been used by this account",
              );
          }
        }
        for (const line of order.lines) {
          const changed =
            await tx.$executeRaw`UPDATE "Inventory" SET "reserved" = "reserved" + ${line.quantity}, "version" = "version" + 1 WHERE "variantId" = ${line.variantId}::uuid AND "onHand" - "reserved" >= ${line.quantity}`;
          if (changed !== 1)
            throw new AppError(
              409,
              "INSUFFICIENT_STOCK",
              `Insufficient stock for ${line.sku}`,
            );
        }
        await tx.order.create({
          data: {
            id: order.id,
            number: order.number,
            userId: order.userId,
            couponId: coupon?.id,
            status: order.status as OrderStatus,
            subtotal: order.subtotal,
            discount: order.discount,
            tax: order.tax,
            shipping: order.shipping,
            total: order.total,
            addressSnapshot,
            idempotencyKey: order.idempotencyKey,
            items: {
              create: order.lines.map((line) => ({
                variantId: line.variantId,
                name: line.name,
                sku: line.sku,
                attributes: {},
                unitPrice: line.unitPrice,
                quantity: line.quantity,
                tax: line.tax,
              })),
            },
            history: {
              create: {
                toStatus: order.status as OrderStatus,
                source: "CHECKOUT",
              },
            },
            payments:
              provider === "cod"
                ? undefined
                : {
                    create: {
                      provider,
                      status: "CREATED",
                      amount: order.total,
                      currency: "INR",
                      externalId: paymentExternalId,
                      idempotencyKey: `pay:${order.idempotencyKey}`,
                    },
                  },
          },
        });
        const snapshot = addressSnapshot as {
          contact?: { email?: string; phone?: string };
        };
        if (snapshot.contact?.email)
          await tx.notification.create({
            data: {
              userId: order.userId,
              channel: "EMAIL",
              template: "order.created",
              destination: snapshot.contact.email,
              payload: {
                orderId: order.id,
                orderNumber: order.number,
                total: order.total,
              },
              status: "QUEUED",
            },
          });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async saveIntegration(record: StoredIntegration) {
    await this.db.integrationConfig.upsert({
      where: {
        kind_provider_environment: {
          kind: record.kind as never,
          provider: record.provider,
          environment: record.environment,
        },
      },
      update: {
        enabled: record.enabled,
        priority: record.priority,
        encryptedCredentials: Buffer.from(
          record.encryptedCredentials,
          "base64",
        ),
        publicConfig: record.publicConfig as Prisma.InputJsonValue,
      },
      create: {
        id: record.id,
        kind: record.kind as never,
        provider: record.provider,
        environment: record.environment,
        enabled: record.enabled,
        priority: record.priority,
        encryptedCredentials: Buffer.from(
          record.encryptedCredentials,
          "base64",
        ),
        publicConfig: record.publicConfig as Prisma.InputJsonValue,
      },
    });
  }
}
