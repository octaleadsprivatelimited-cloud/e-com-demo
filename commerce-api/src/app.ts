import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { pinoHttp } from "pino-http";
import { loadConfig, type AppConfig } from "./config.js";
import { AppError, errorHandler, notFound } from "./errors.js";
import {
  authenticate,
  authorize,
  optionalAuthenticate,
  SecretVault,
  base32Encode,
  signAccessToken,
  verifyHmac,
  verifyTotp,
  type Principal,
} from "./security.js";
import {
  checkoutSchema,
  addressSchema,
  cartItemSchema,
  couponSchema,
  credentials,
  integrationSchema,
  inventoryAdjustmentSchema,
  orderStatusSchema,
  productSchema,
  registerSchema,
  refundSchema,
  reviewModerationSchema,
  reviewSchema,
  returnSchema,
  returnDecisionSchema,
  supportReplySchema,
  supportTicketSchema,
  totpVerifySchema,
  storefrontConfigSchema,
} from "./schemas.js";
import { validate } from "./validate.js";
import { CommerceStore, seedStore } from "./store.js";
import {
  DevelopmentPaymentProvider,
  DevelopmentShippingProvider,
  RazorpayPaymentProvider,
  ShiprocketShippingProvider,
} from "./providers.js";
import { hashPassword, verifyPassword } from "./passwords.js";
import { PrismaPersistence } from "./persistence.js";
import { assertOrderTransition } from "./order-state.js";
import { defaultStorefrontConfig, normalizeHostname, storefrontSettingKey, type StorefrontConfig } from "./storefront-config.js";

const ok = (
  res: express.Response,
  data: unknown,
  message = "Success",
  status = 200,
) => res.status(status).json({ success: true, data, message });
function limiter(limit: number, windowMs: number): express.RequestHandler {
  const buckets = new Map<string, { count: number; reset: number }>();
  return (req, _res, next) => {
    const key = req.ip || "unknown",
      now = Date.now(),
      old = buckets.get(key),
      bucket =
        !old || old.reset < now ? { count: 0, reset: now + windowMs } : old;
    bucket.count++;
    if (buckets.size >= 10_000 && !buckets.has(key)) {
      for (const [candidate, value] of buckets) {
        if (value.reset <= now) buckets.delete(candidate);
      }
      while (buckets.size >= 10_000) buckets.delete(buckets.keys().next().value!);
    }
    buckets.set(key, bucket);
    if (bucket.count > limit)
      return next(
        new AppError(429, "RATE_LIMITED", "Too many requests; try again later"),
      );
    next();
  };
}
export async function createApp(overrides?: {
  config?: AppConfig;
  store?: CommerceStore;
  persistence?: PrismaPersistence | null;
}) {
  const config = overrides?.config || loadConfig(),
    store = overrides?.store || new CommerceStore(),
    persistence =
      overrides?.persistence === undefined
        ? config.NODE_ENV === "production" || config.USE_DATABASE
          ? new PrismaPersistence()
          : null
        : overrides.persistence,
    vault = new SecretVault(config.INTEGRATION_ENCRYPTION_KEY),
    developmentPayments = new DevelopmentPaymentProvider(),
    developmentShipping = new DevelopmentShippingProvider();
  const developmentStorefronts = new Map<string, StorefrontConfig>();
  if (persistence) {
    await persistence.connect();
    await persistence.hydrate(store);
  } else seedStore(store);
  const resolvePaymentProvider = (requested: string) => {
    const integration = [...store.integrations.values()].filter((entry) => entry.kind === "PAYMENT" && entry.enabled && entry.provider.toLowerCase() === requested.toLowerCase()).sort((a, b) => a.priority - b.priority)[0];
    if (integration?.provider.toLowerCase() === "razorpay") {
      const secrets = vault.decrypt<Record<string, string>>(integration.encryptedCredentials);
      return new RazorpayPaymentProvider({ keyId: secrets.keyId || secrets.key_id || "", keySecret: secrets.keySecret || secrets.key_secret || "" });
    }
    if (config.NODE_ENV === "production") throw new AppError(503, "PAYMENT_NOT_CONFIGURED", `Payment provider ${requested} is not enabled`);
    return developmentPayments;
  };
  const resolveShippingProvider = () => {
    const integration = [...store.integrations.values()].filter((entry) => entry.kind === "SHIPPING" && entry.enabled).sort((a, b) => a.priority - b.priority)[0];
    if (integration?.provider.toLowerCase() === "shiprocket") {
      const secrets = vault.decrypt<Record<string, string>>(integration.encryptedCredentials);
      return { name: "shiprocket", provider: new ShiprocketShippingProvider({ token: secrets.token || secrets.apiKey || "", pickupPostcode: String(integration.publicConfig.pickupPostcode || "500001"), pickupLocation: String(integration.publicConfig.pickupLocation || "Primary") }) };
    }
    if (config.NODE_ENV === "production") throw new AppError(503, "SHIPPING_NOT_CONFIGURED", "No live shipping provider is enabled");
    return { name: "development", provider: developmentShipping };
  };
  if (
    config.NODE_ENV !== "production" &&
    !store.findUser("admin@asterrow.local")
  )
    store.createUser({
      name: "Store Administrator",
      email: "admin@asterrow.local",
      passwordHash: await hashPassword("ChangeMe!123"),
      role: "ADMIN",
      permissions: ["*"],
    });
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    pinoHttp({
      level: config.NODE_ENV === "test" ? "silent" : "info",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.password",
        "req.body.credentials",
        "res.headers.set-cookie",
      ],
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        const allowed = config.CORS_ORIGINS.split(",").map((x) => x.trim());
        cb(
          origin && !allowed.includes(origin)
            ? new AppError(403, "CORS_DENIED", "Origin is not allowed")
            : null,
          true,
        );
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    }),
  );
  app.post(
    "/webhooks/:provider",
    express.raw({ type: "application/json", limit: "1mb" }),
    async (req, res, next) => {
      try {
        const provider = String(req.params.provider), raw = req.body as Buffer,
          integration = [...store.integrations.values()].filter((entry) => ["PAYMENT", "SHIPPING"].includes(entry.kind) && entry.enabled && entry.provider.toLowerCase() === provider.toLowerCase()).sort((a, b) => a.priority - b.priority)[0],
          integrationSecrets = integration ? vault.decrypt<Record<string, string>>(integration.encryptedCredentials) : undefined,
          signature = String(req.headers["x-webhook-signature"] || req.headers["x-razorpay-signature"] || ""),
          secret = integrationSecrets?.webhookSecret || integrationSecrets?.webhook_secret || process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];
        if (!secret || !verifyHmac(req.body as Buffer, signature, secret))
          throw new AppError(
            401,
            "INVALID_WEBHOOK_SIGNATURE",
            "Webhook signature is invalid",
          );
        let payload: any;
        try {
          payload = JSON.parse(raw.toString("utf8"));
        } catch {
          throw new AppError(
            400,
            "INVALID_WEBHOOK_BODY",
            "Webhook body must be valid JSON",
          );
        }
        const eventType = String(payload.type || payload.event || ""),
          integrationKind = integration?.kind || (provider.toLowerCase() === "razorpay" ? "PAYMENT" : provider.toLowerCase() === "shiprocket" ? "SHIPPING" : undefined),
          paymentEvent = eventType.startsWith("payment."),
          shippingEvent = eventType.startsWith("shipment."),
          suppliedOrderId = String(payload.orderId || payload.payload?.payment?.entity?.notes?.internalOrderId || payload.payload?.order?.entity?.notes?.internalOrderId || ""),
          eventId = String(req.headers["x-event-id"] || req.headers["x-razorpay-event-id"] || payload.id || payload.payload?.payment?.entity?.id || "");
        if (!eventId) throw new AppError(400, "MISSING_EVENT_ID", "Webhook event ID is required");
        if ((paymentEvent && integrationKind !== "PAYMENT") || (shippingEvent && integrationKind !== "SHIPPING") || (!paymentEvent && !shippingEvent))
          throw new AppError(422, "WEBHOOK_EVENT_NOT_ALLOWED", "This provider is not authorized for the event type");
        if (store.webhookIds.has(`${provider}:${eventId}`)) return ok(res, { duplicate: true }, "Already processed");
        let orderId = suppliedOrderId, paymentId: string | undefined, shipmentId: string | undefined;
        if (persistence && paymentEvent) {
          const externalOrderId = String(payload.payload?.payment?.entity?.order_id || payload.payload?.order?.entity?.id || "");
          if (!externalOrderId) throw new AppError(400, "PAYMENT_REFERENCE_REQUIRED", "Provider payment order reference is required");
          const bound = await persistence.resolvePaymentWebhook(provider, externalOrderId);
          if (suppliedOrderId && suppliedOrderId !== bound.orderId) throw new AppError(422, "WEBHOOK_RESOURCE_MISMATCH", "Payment does not belong to the supplied order");
          orderId = bound.orderId; paymentId = bound.paymentId;
        }
        if (persistence && shippingEvent) {
          const awb = String(payload.awb || payload.awb_code || "");
          if (!awb) throw new AppError(400, "SHIPMENT_REFERENCE_REQUIRED", "Shipment AWB is required");
          const bound = await persistence.resolveShipmentWebhook(provider, awb);
          if (suppliedOrderId && suppliedOrderId !== bound.orderId) throw new AppError(422, "WEBHOOK_RESOURCE_MISMATCH", "Shipment does not belong to the supplied order");
          orderId = bound.orderId;
          shipmentId = bound.shipmentId;
        }
        const target = eventType === "payment.captured" ? "PAID" : eventType === "payment.failed" ? "FAILED" : eventType === "shipment.out_for_delivery" ? "OUT_FOR_DELIVERY" : eventType === "shipment.delivered" ? "DELIVERED" : undefined,
          order = orderId ? store.orders.get(orderId) : undefined;
        if (!target) throw new AppError(422, "WEBHOOK_EVENT_NOT_SUPPORTED", "Webhook event type is not supported");
        if (target && !order) throw new AppError(404, "ORDER_NOT_FOUND", "Webhook order was not found");
        if (target && order) assertOrderTransition(order.status, target);
        const persisted = await persistence?.processWebhook({ provider, eventId, payloadHash: crypto.createHash("sha256").update(raw).digest("hex"), orderId: order?.id, from: order?.status, to: target, paymentId, paymentStatus: paymentId ? (target === "PAID" ? "CAPTURED" : "FAILED") : undefined, externalPaymentId: String(payload.payload?.payment?.entity?.id || "") || undefined, shipmentId, shipmentStatus: shipmentId ? target : undefined, location: typeof payload.location === "string" ? payload.location : undefined, occurredAt: payload.current_timestamp ? new Date(payload.current_timestamp) : undefined, safePayload: { type: eventType, orderId: orderId || undefined } });
        if (persisted?.duplicate) return ok(res, { duplicate: true }, "Already processed");
        if (target && order) {
          store.transitionOrder(order.id, target, undefined, provider);
        }
        store.webhookIds.add(`${provider}:${eventId}`);
        return ok(res, { accepted: true }, "Accepted", 202);
      } catch (e) {
        next(e);
      }
    },
  );
  app.use(express.json({ limit: "1mb" }));
  const requestHostname = (req: express.Request) => normalizeHostname(String(req.headers["x-forwarded-host"] || req.headers.host || req.hostname));
  const readStorefront = async (hostname: string) => {
    const exactKey = storefrontSettingKey(hostname);
    const stored = persistence ? await persistence.getSetting<StorefrontConfig>(exactKey) : developmentStorefronts.get(exactKey);
    const fallback = persistence ? await persistence.getSetting<StorefrontConfig>(storefrontSettingKey("localhost")) : developmentStorefronts.get(storefrontSettingKey("localhost"));
    return storefrontConfigSchema.parse(stored || fallback || defaultStorefrontConfig);
  };
  app.get("/api/v1/storefront/config", async (req, res) => ok(res, await readStorefront(requestHostname(req))));
  app.get("/health", (_req, res) =>
    ok(res, { status: "healthy", time: new Date().toISOString() }),
  );
  app.post(
    "/api/v1/auth/register",
    limiter(8, 60_000),
    validate(registerSchema),
    async (req, res, next) => {
      try {
        const user = store.createUser({
          name: req.body.name,
          email: req.body.email,
          passwordHash: await hashPassword(req.body.password),
          role: "CUSTOMER",
          permissions: [],
        });
        await persistence?.saveUser(user);
        if (persistence) await persistence.queueNotification({ userId: user.id, channel: "EMAIL", template: "account.registered", destination: user.email, payload: { name: user.name } });
        return ok(
          res,
          { id: user.id, name: user.name, email: user.email },
          "Account created",
          201,
        );
      } catch (e) {
        next(e);
      }
    },
  );
  app.post(
    "/api/v1/auth/login",
    limiter(10, 60_000),
    validate(credentials),
    async (req, res, next) => {
      try {
        const user = store.findUser(req.body.email);
        if (
          !user ||
          !(await verifyPassword(user.passwordHash, req.body.password))
        )
          throw new AppError(
            401,
            "INVALID_CREDENTIALS",
            "Email or password is incorrect",
          );
        if (user.totpEnabled) {
          if (!user.totpSecretEncrypted) throw new AppError(503, "TWO_FACTOR_MISCONFIGURED", "Administrator two-factor authentication is unavailable");
          const secret = vault.decrypt<{ secret: string }>(user.totpSecretEncrypted).secret;
          if (!req.body.otp || !verifyTotp(secret, req.body.otp)) throw new AppError(401, "TWO_FACTOR_REQUIRED", "A valid authenticator code is required");
        }
        const principal: Principal = {
            sub: user.id,
            role: user.role,
            permissions: user.permissions,
          },
          accessToken = signAccessToken(principal, config.JWT_SECRET),
          sessionId = crypto.randomUUID(),
          refreshToken = jwt.sign(
            { ...principal, jti: sessionId },
            config.JWT_REFRESH_SECRET,
            {
              algorithm: "HS256",
              expiresIn: "7d",
              issuer: "aster-commerce",
              audience: "store-refresh",
            },
          );
        store.sessions.set(sessionId, {
          userId: user.id,
          expiresAt: Date.now() + 604800000,
        });
        await persistence?.saveSession(
          sessionId,
          user.id,
          Date.now() + 604800000,
        );
        res.cookie("refresh_token", refreshToken, {
          httpOnly: true,
          secure: config.NODE_ENV === "production",
          sameSite: "strict",
          path: "/api/v1/auth",
          maxAge: 604800000,
        });
        return ok(res, {
          accessToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        });
      } catch (e) {
        next(e);
      }
    },
  );
  const readRefreshToken = (req: express.Request) =>
    req.headers.cookie
      ?.split(";")
      .map((part) => part.trim().split("="))
      .find(([name]) => name === "refresh_token")?.[1];
  app.post(
    "/api/v1/auth/refresh",
    limiter(30, 60_000),
    async (req, res, next) => {
      try {
        const token = readRefreshToken(req);
        if (!token)
          throw new AppError(
            401,
            "REFRESH_REQUIRED",
            "Refresh session required",
          );
        const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET, {
          algorithms: ["HS256"],
          issuer: "aster-commerce",
          audience: "store-refresh",
        }) as Principal & { jti?: string };
        const session = decoded.jti
          ? persistence
            ? await persistence.getSession(decoded.jti)
            : store.sessions.get(decoded.jti)
          : undefined;
        if (
          !decoded.jti ||
          !session ||
          new Date(session.expiresAt).getTime() <= Date.now()
        )
          throw new AppError(
            401,
            "INVALID_REFRESH_TOKEN",
            "Session is invalid or expired",
          );
        const user = store.users.get(session.userId);
        if (!user)
          throw new AppError(
            401,
            "INVALID_REFRESH_TOKEN",
            "Session is invalid",
          );
        if (persistence) {
          if (!(await persistence.consumeSession(decoded.jti)))
            throw new AppError(401, "INVALID_REFRESH_TOKEN", "Session has already been rotated");
        } else {
          if (!store.sessions.delete(decoded.jti))
            throw new AppError(401, "INVALID_REFRESH_TOKEN", "Session has already been rotated");
        }
        const principal: Principal = {
          sub: user.id,
          role: user.role,
          permissions: user.permissions,
        };
        const nextSessionId = crypto.randomUUID();
        store.sessions.set(nextSessionId, {
          userId: user.id,
          expiresAt: Date.now() + 604800000,
        });
        await persistence?.saveSession(
          nextSessionId,
          user.id,
          Date.now() + 604800000,
        );
        const refreshToken = jwt.sign(
          { ...principal, jti: nextSessionId },
          config.JWT_REFRESH_SECRET,
          {
            algorithm: "HS256",
            expiresIn: "7d",
            issuer: "aster-commerce",
            audience: "store-refresh",
          },
        );
        res.cookie("refresh_token", refreshToken, {
          httpOnly: true,
          secure: config.NODE_ENV === "production",
          sameSite: "strict",
          path: "/api/v1/auth",
          maxAge: 604800000,
        });
        return ok(res, {
          accessToken: signAccessToken(principal, config.JWT_SECRET),
        });
      } catch (error) {
        next(
          error instanceof AppError
            ? error
            : new AppError(
                401,
                "INVALID_REFRESH_TOKEN",
                "Session is invalid or expired",
              ),
        );
      }
    },
  );
  app.post("/api/v1/auth/logout", async (req, res) => {
    const token = readRefreshToken(req);
    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET, {
          algorithms: ["HS256"],
          issuer: "aster-commerce",
          audience: "store-refresh",
        }) as { jti?: string };
        if (decoded.jti) {
          store.sessions.delete(decoded.jti);
          await persistence?.revokeSession(decoded.jti);
        }
      } catch {
        // Logout remains idempotent for expired or malformed cookies.
      }
    }
    res.clearCookie("refresh_token", { path: "/api/v1/auth" });
    return ok(res, { loggedOut: true }, "Logged out");
  });
  const auth = authenticate(config.JWT_SECRET);
  app.get("/api/v1/admin/storefront-config", auth, authorize("settings:read"), async (req, res) => ok(res, await readStorefront(requestHostname(req))));
  app.put("/api/v1/admin/storefront-config", auth, authorize("settings:update"), validate(storefrontConfigSchema), async (req, res) => {
    const value = req.body as StorefrontConfig;
    const hostname = value.primaryDomain || requestHostname(req);
    const keys = new Set([storefrontSettingKey(hostname), storefrontSettingKey("localhost")]);
    for (const key of keys) persistence ? await persistence.saveSetting(key, value) : developmentStorefronts.set(key, value);
    store.auditLogs.unshift({ id: crypto.randomUUID(), action: "storefront.settings.updated", resource: "Setting", resourceId: hostname, actorId: req.principal!.sub, createdAt: new Date().toISOString() });
    return ok(res, value, "Storefront configuration saved");
  });
  app.get("/api/v1/auth/me", auth, (req, res) => {
    const user = store.users.get(req.principal!.sub);
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");
    return ok(res, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  });
  app.post("/api/v1/auth/admin-2fa/setup", auth, async (req, res) => {
    const user = store.users.get(req.principal!.sub);
    if (!user || user.role === "CUSTOMER") throw new AppError(403, "FORBIDDEN", "Administrator access required");
    const secret = base32Encode(crypto.randomBytes(20)), encrypted = vault.encrypt({ secret });
    user.totpSecretEncrypted = encrypted; user.totpEnabled = false;
    await persistence?.saveTotp(user.id, encrypted, false);
    return ok(res, { secret, otpauthUrl: `otpauth://totp/${encodeURIComponent(`Aster & Row:${user.email}`)}?secret=${secret}&issuer=${encodeURIComponent("Aster & Row")}&algorithm=SHA1&digits=6&period=30` }, "Scan this secret once, then verify a code");
  });
  app.post("/api/v1/auth/admin-2fa/verify", auth, validate(totpVerifySchema), async (req, res) => {
    const user = store.users.get(req.principal!.sub);
    if (!user || user.role === "CUSTOMER" || !user.totpSecretEncrypted) throw new AppError(409, "TWO_FACTOR_SETUP_REQUIRED", "Start two-factor setup first");
    const secret = vault.decrypt<{ secret: string }>(user.totpSecretEncrypted).secret;
    if (!verifyTotp(secret, req.body.code)) throw new AppError(422, "INVALID_AUTHENTICATOR_CODE", "Authenticator code is invalid");
    user.totpEnabled = true; await persistence?.saveTotp(user.id, user.totpSecretEncrypted, true);
    return ok(res, { enabled: true }, "Administrator two-factor authentication enabled");
  });
  app.get("/api/v1/account/addresses", auth, async (req, res) =>
    ok(res, persistence ? await persistence.listAddresses(req.principal!.sub) : store.addresses.get(req.principal!.sub) || []),
  );
  app.post("/api/v1/account/addresses", auth, validate(addressSchema), async (req, res) => {
    if (persistence) return ok(res, await persistence.saveAddress(req.principal!.sub, req.body), "Address saved", 201);
    const addresses = store.addresses.get(req.principal!.sub) || [];
    if (req.body.isDefault) addresses.forEach(address => { address.isDefault = false; });
    const address = { id: crypto.randomUUID(), userId: req.principal!.sub, ...req.body, createdAt: new Date().toISOString() };
    addresses.push(address); store.addresses.set(req.principal!.sub, addresses);
    return ok(res, address, "Address saved", 201);
  });
  app.delete("/api/v1/account/addresses/:id", auth, async (req, res) => {
    if (persistence) await persistence.deleteAddress(req.principal!.sub, String(req.params.id));
    else { const addresses = store.addresses.get(req.principal!.sub) || [], next = addresses.filter(address => address.id !== req.params.id); if (next.length === addresses.length) throw new AppError(404, "ADDRESS_NOT_FOUND", "Address not found"); store.addresses.set(req.principal!.sub, next); }
    return ok(res, { deleted: true }, "Address removed");
  });
  app.get("/api/v1/products", (req, res) => {
    const q = String(req.query.q || "").toLowerCase(),
      category = String(req.query.category || "");
    const data = store
      .listProducts()
      .filter(
        (x) =>
          x.status === "ACTIVE" &&
          (!q ||
            `${x.name} ${x.description} ${x.category}`
              .toLowerCase()
              .includes(q)) &&
          (!category || x.category === category),
      );
    return ok(res, data);
  });
  app.get("/api/v1/products/:id", (req, res) =>
    ok(res, store.getProduct(String(req.params.id))),
  );
  app.get("/api/v1/products/:id/reviews", async (req, res) => {
    const productId = String(req.params.id); store.getProduct(productId);
    return ok(res, persistence ? await persistence.listApprovedReviews(productId) : [...store.reviews.values()].filter(review => review.productId === productId && review.status === "APPROVED"));
  });
  app.post("/api/v1/account/reviews", auth, validate(reviewSchema), async (req, res) => {
    store.getProduct(req.body.productId);
    const verified = [...store.orders.values()].some(order => order.userId === req.principal!.sub && order.status === "DELIVERED" && order.lines.some(line => { try { return store.getVariant(line.variantId).product.id === req.body.productId; } catch { return false; } }));
    if (persistence) return ok(res, await persistence.saveReview(req.principal!.sub, req.body, verified), "Review submitted for moderation", 201);
    if ([...store.reviews.values()].some(review => review.userId === req.principal!.sub && review.productId === req.body.productId)) throw new AppError(409, "REVIEW_EXISTS", "You have already reviewed this product");
    const review = { id: crypto.randomUUID(), userId: req.principal!.sub, ...req.body, verified, status: "PENDING", createdAt: new Date().toISOString() }; store.reviews.set(review.id, review);
    return ok(res, review, "Review submitted for moderation", 201);
  });
  app.post(
    "/api/v1/admin/products",
    auth,
    authorize("products:create"),
    validate(productSchema),
    async (req, res) => {
      const variants = req.body.variants.map((x: Record<string, unknown>) => ({
        ...x,
        id: crypto.randomUUID(),
      }));
      const product = store.saveProduct({ ...req.body, variants });
      await persistence?.saveProduct(product);
      return ok(res, product, "Product created", 201);
    },
  );
  app.put(
    "/api/v1/admin/products/:id",
    auth,
    authorize("products:update"),
    validate(productSchema),
    async (req, res) => {
      const existing = store.getProduct(String(req.params.id)),
        variants = req.body.variants.map(
          (x: Record<string, unknown>, i: number) => ({
            ...x,
            id: existing.variants[i]?.id || crypto.randomUUID(),
          }),
        );
      const product = store.saveProduct(
        { ...req.body, variants },
        String(req.params.id),
      );
      await persistence?.saveProduct(product);
      return ok(res, product, "Product updated");
    },
  );
  app.delete(
    "/api/v1/admin/products/:id",
    auth,
    authorize("products:delete"),
    async (req, res) => {
      const product = store.deleteProduct(String(req.params.id));
      await persistence?.archiveProduct(product.id);
      return ok(res, product, "Product archived");
    },
  );
  const cartKey = (req: express.Request, res: express.Response) => {
    if (req.principal) return `user:${req.principal.sub}`;
    const supplied = String(req.headers["x-cart-token"] || "");
    const token = /^[a-f0-9-]{36}$/.test(supplied)
      ? supplied
      : crypto.randomUUID();
    res.setHeader("x-cart-token", token);
    return `guest:${token}`;
  };
  app.get(
    "/api/v1/cart",
    optionalAuthenticate(config.JWT_SECRET),
    async (req, res) => {
      const key = cartKey(req, res),
        items = store.carts.get(key) || new Map<string, number>();
      return ok(
        res,
        [...items].map(([variantId, quantity]) => ({
          ...store.getVariant(variantId),
          variantId,
          quantity,
        })),
      );
    },
  );
  app.put(
    "/api/v1/cart/items",
    optionalAuthenticate(config.JWT_SECRET),
    validate(cartItemSchema),
    async (req, res) => {
      const key = cartKey(req, res),
        { variant } = store.getVariant(req.body.variantId),
        items = store.carts.get(key) || new Map<string, number>();
      if (req.body.quantity > variant.stock - variant.reserved)
        throw new AppError(
          409,
          "INSUFFICIENT_STOCK",
          `Insufficient stock for ${variant.sku}`,
        );
      if (req.body.quantity === 0) items.delete(req.body.variantId);
      else items.set(req.body.variantId, req.body.quantity);
      store.carts.set(key, items);
      await persistence?.saveCartItem(
        key,
        req.body.variantId,
        req.body.quantity,
      );
      return ok(
        res,
        { variantId: req.body.variantId, quantity: req.body.quantity },
        "Cart updated",
      );
    },
  );
  app.get("/api/v1/wishlist", auth, (req, res) =>
    ok(
      res,
      [...(store.wishlists.get(req.principal!.sub) || new Set())].map((id) =>
        store.getProduct(id),
      ),
    ),
  );
  app.put("/api/v1/wishlist/:productId", auth, async (req, res) => {
    const id = String(req.params.productId);
    store.getProduct(id);
    const list = store.wishlists.get(req.principal!.sub) || new Set<string>();
    list.add(id);
    store.wishlists.set(req.principal!.sub, list);
    await persistence?.saveWishlist(req.principal!.sub, id, true);
    return ok(res, { productId: id, saved: true }, "Saved to wishlist");
  });
  app.delete("/api/v1/wishlist/:productId", auth, async (req, res) => {
    const id = String(req.params.productId),
      list = store.wishlists.get(req.principal!.sub) || new Set<string>();
    list.delete(id);
    await persistence?.saveWishlist(req.principal!.sub, id, false);
    return ok(res, { productId: id, saved: false }, "Removed from wishlist");
  });
  app.post("/api/v1/coupons/validate", (req, res) => {
    const code = String(req.body?.code || "").toUpperCase(),
      subtotal = Number(req.body?.subtotal || 0),
      coupon = store.coupons.get(code),
      now = Date.now();
    if (
      !coupon ||
      !coupon.enabled ||
      coupon.startsAt > now ||
      coupon.endsAt < now ||
      subtotal < coupon.minimumSpend ||
      (coupon.usageLimit !== undefined && coupon.used >= coupon.usageLimit)
    )
      throw new AppError(
        422,
        "COUPON_NOT_APPLICABLE",
        "Coupon is invalid or not applicable",
      );
    const discount =
      coupon.type === "PERCENTAGE"
        ? Math.min(
            (subtotal * coupon.value) / 100,
            coupon.maximumDiscount ?? Infinity,
          )
        : coupon.type === "FIXED_AMOUNT"
          ? Math.min(coupon.value, subtotal)
          : 0;
    return ok(
      res,
      { code, discount, freeShipping: coupon.type === "FREE_SHIPPING" },
      "Coupon applied",
    );
  });
  app.put(
    "/api/v1/admin/coupons",
    auth,
    authorize("marketing:update"),
    validate(couponSchema),
    async (req, res) => {
      const coupon = {
        ...req.body,
        startsAt: req.body.startsAt.getTime(),
        endsAt: req.body.endsAt.getTime(),
        used: store.coupons.get(req.body.code)?.used || 0,
      };
      store.coupons.set(coupon.code, coupon);
      await persistence?.saveCoupon(coupon);
      return ok(res, coupon, "Coupon saved");
    },
  );
  app.post(
    "/api/v1/checkout",
    limiter(20, 60_000),
    optionalAuthenticate(config.JWT_SECRET),
    validate(checkoutSchema),
    async (req, res, next) => {
      let reserved = false,
        createdOrderId: string | undefined;
      try {
        const key = String(req.headers["idempotency-key"] || "");
        if (key.length < 8 || key.length > 100)
          throw new AppError(
            400,
            "IDEMPOTENCY_KEY_REQUIRED",
            "A valid Idempotency-Key header is required",
          );
        const checkoutScope = req.principal?.sub || `guest:${req.ip}:${String(req.body.contact.email || req.body.contact.phone).trim().toLowerCase()}`;
        const keyPrefix = crypto.createHash("sha256").update(`${checkoutScope}:${key}`).digest("hex");
        const requestHash = crypto.createHash("sha256").update(JSON.stringify(req.body)).digest("hex");
        const duplicate = store.findOrderByKey(keyPrefix);
        if (duplicate) {
          if (duplicate.idempotencyKey !== `${keyPrefix}.${requestHash}`)
            throw new AppError(409, "IDEMPOTENCY_CONFLICT", "This idempotency key was already used for a different checkout request");
          return ok(res, { order: duplicate, payment: duplicate.payment || null }, "Existing order returned");
        }
        let subtotal = 0,
          tax = 0,
          weight = 0;
        const lines = req.body.lines.map(
          (line: { variantId: string; quantity: number }) => {
            const { product, variant } = store.getVariant(line.variantId);
            const lineTax =
              (variant.price * line.quantity * product.taxRate) / 100;
            subtotal += variant.price * line.quantity;
            tax += lineTax;
            weight += variant.weightGrams * line.quantity;
            return {
              variantId: variant.id,
              name: product.name,
              sku: variant.sku,
              quantity: line.quantity,
              unitPrice: variant.price,
              tax: lineTax,
            };
          },
        );
        const selectedShipping = resolveShippingProvider();
        const rates = await selectedShipping.provider.rates({
            origin: "500001",
            destination: req.body.postalCode,
            weightGrams: weight,
            cod: req.body.paymentProvider === "cod",
          }),
          coupon = req.body.couponCode
            ? store.coupons.get(req.body.couponCode.toUpperCase())
            : undefined,
          now = Date.now();
        if (
          req.body.couponCode &&
          (!coupon ||
            !coupon.enabled ||
            coupon.startsAt > now ||
            coupon.endsAt < now ||
            subtotal < coupon.minimumSpend ||
            (coupon.usageLimit !== undefined &&
              coupon.used >= coupon.usageLimit))
        )
          throw new AppError(
            422,
            "COUPON_NOT_APPLICABLE",
            "Coupon is invalid or not applicable",
          );
        const discount = !coupon
            ? 0
            : coupon.type === "PERCENTAGE"
              ? Math.min(
                  (subtotal * coupon.value) / 100,
                  coupon.maximumDiscount ?? Infinity,
                )
              : coupon.type === "FIXED_AMOUNT"
                ? Math.min(coupon.value, subtotal)
                : 0,
          shippingAmount =
            coupon?.type === "FREE_SHIPPING" ? 0 : rates[0]!.amount.amount,
          total =
            Math.round((subtotal + tax + shippingAmount - discount) * 100) /
            100;
        store.reserveMany(req.body.lines);
        reserved = true;
        const isCod = req.body.paymentProvider.toLowerCase() === "cod";
        const order = store.createOrder({
          userId: req.principal?.sub,
          status: isCod ? "CONFIRMED" : "PAYMENT_PENDING",
          lines,
          subtotal,
          tax,
          shipping: shippingAmount,
          discount,
          total,
          idempotencyKey: `${keyPrefix}.${requestHash}`,
          trackingVerificationHash: crypto.createHash("sha256").update(String(req.body.contact.email || req.body.contact.phone).trim().toLowerCase()).digest("hex"),
        });
        createdOrderId = order.id;
        const payment =
          isCod
            ? null
            : await resolvePaymentProvider(req.body.paymentProvider).createOrder({
                orderId: order.id,
                amount: { amount: total, currency: "INR" },
                idempotencyKey: `pay:${key}`,
              });
        order.payment = payment;
        await persistence?.saveOrderAndReservations(
          order,
          {
            contact: req.body.contact,
            shipping: { ...req.body.shippingAddress, postalCode: req.body.postalCode },
            billing: req.body.billingAddress || { ...req.body.shippingAddress, postalCode: req.body.postalCode },
            gstin: req.body.gstin,
            deliveryInstructions: req.body.deliveryInstructions,
          },
          req.body.paymentProvider,
          req.body.couponCode,
          payment?.externalId,
        );
        if (coupon) coupon.used++;
        return ok(
          res,
          { order, payment, shipping: rates[0] },
          "Checkout created",
          201,
        );
      } catch (e) {
        if (reserved) store.releaseMany(req.body.lines);
        if (createdOrderId) store.orders.delete(createdOrderId);
        next(e);
      }
    },
  );
  app.get("/api/v1/orders/:number/track", limiter(30, 60_000), async (req, res) => {
    const order = [...store.orders.values()].find(
      (x) => x.number === String(req.params.number),
    );
    const verification = String(req.query.contact || "").trim().toLowerCase();
    const suppliedHash = crypto.createHash("sha256").update(verification).digest("hex");
    if (!order || !verification || !order.trackingVerificationHash || !crypto.timingSafeEqual(Buffer.from(suppliedHash), Buffer.from(order.trackingVerificationHash)))
      throw new AppError(404, "ORDER_NOT_FOUND", "Order not found or contact details do not match");
    const shipment = persistence ? await persistence.trackingDetails(order.id) : null;
    return ok(res, {
      number: order.number,
      status: order.status,
      history: order.history,
      shipment,
      estimatedDelivery: shipment ? new Date(Date.now() + 3 * 86_400_000).toISOString() : null,
    });
  });
  app.get("/api/v1/account/orders", auth, (req, res) =>
    ok(
      res,
      [...store.orders.values()].filter(
        (order) => order.userId === req.principal!.sub,
      ),
    ),
  );
  app.post(
    "/api/v1/account/returns",
    auth,
    validate(returnSchema),
    async (req, res) => {
      const order = store.orders.get(req.body.orderId);
      if (!order || order.userId !== req.principal!.sub)
        throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
      if (order.status !== "DELIVERED")
        throw new AppError(
          409,
          "RETURN_NOT_AVAILABLE",
          "Returns are available only after delivery",
        );
      const request = {
        id: crypto.randomUUID(),
        orderId: order.id,
        userId: req.principal!.sub,
        reason: req.body.reason,
        status: "REQUESTED",
        createdAt: new Date().toISOString(),
      };
      await persistence?.saveReturn(request);
      await persistence?.transitionOrder(
        order.id,
        order.status,
        "RETURN_REQUESTED",
        req.principal!.sub,
        "CUSTOMER",
      );
      store.returns.set(request.id, request);
      store.transitionOrder(
        order.id,
        "RETURN_REQUESTED",
        req.principal!.sub,
        "CUSTOMER",
      );
      return ok(res, request, "Return requested", 201);
    },
  );
  app.get("/api/v1/account/returns", auth, (req, res) =>
    ok(
      res,
      [...store.returns.values()].filter(
        (item) => item.userId === req.principal!.sub,
      ),
    ),
  );
  app.post("/api/v1/account/support", auth, validate(supportTicketSchema), async (req, res) => {
    if (persistence) return ok(res, await persistence.createSupportTicket(req.principal!.sub, req.body), "Support ticket created", 201);
    const createdAt = new Date().toISOString(), ticket = { id: crypto.randomUUID(), number: `SUP-${Date.now().toString(36).toUpperCase()}`, userId: req.principal!.sub, subject: req.body.subject, priority: req.body.priority, status: "OPEN", createdAt, messages: [{ id: crypto.randomUUID(), authorId: req.principal!.sub, body: req.body.message, internal: false, createdAt }] };
    store.supportTickets.set(ticket.id, ticket); return ok(res, ticket, "Support ticket created", 201);
  });
  app.get("/api/v1/account/support", auth, async (req, res) => ok(res, persistence ? await persistence.listSupportTickets(req.principal!.sub) : [...store.supportTickets.values()].filter(ticket => ticket.userId === req.principal!.sub)));
  app.post("/api/v1/account/support/:id/replies", auth, validate(supportReplySchema), async (req, res) => {
    if (persistence) return ok(res, await persistence.replySupportTicket(String(req.params.id), req.principal!.sub, req.body.message, req.body.status, req.principal!.sub), "Reply added", 201);
    const ticket = store.supportTickets.get(String(req.params.id)); if (!ticket || ticket.userId !== req.principal!.sub) throw new AppError(404, "TICKET_NOT_FOUND", "Support ticket not found");
    ticket.messages.push({ id: crypto.randomUUID(), authorId: req.principal!.sub, body: req.body.message, internal: false, createdAt: new Date().toISOString() }); ticket.status = req.body.status || "OPEN"; return ok(res, ticket, "Reply added", 201);
  });
  app.get("/api/v1/admin/orders", auth, authorize("orders:read"), (_req, res) =>
    ok(res, [...store.orders.values()]),
  );
  app.get("/api/v1/admin/customers", auth, authorize("customers:read"), (_req, res) =>
    ok(res, [...store.users.values()].filter(user => user.role === "CUSTOMER").map(user => ({ id: user.id, name: user.name, email: user.email, orders: [...store.orders.values()].filter(order => order.userId === user.id).length }))),
  );
  app.get("/api/v1/admin/inventory", auth, authorize("inventory:read"), (_req, res) =>
    ok(res, store.listProducts().flatMap(product => product.variants.map(variant => ({ productId: product.id, product: product.name, variantId: variant.id, sku: variant.sku, title: variant.title, onHand: variant.stock, reserved: variant.reserved, available: variant.stock - variant.reserved, lowStock: variant.stock - variant.reserved <= 5 })))),
  );
  app.patch("/api/v1/admin/inventory/:variantId", auth, authorize("inventory:update"), validate(inventoryAdjustmentSchema), async (req, res) => {
    const { variant } = store.getVariant(String(req.params.variantId));
    if (variant.stock + req.body.quantity < variant.reserved) throw new AppError(409, "INVENTORY_ADJUSTMENT_INVALID", "Adjustment would reduce stock below reserved quantity");
    await persistence?.adjustInventory(variant.id, req.body.quantity, req.body.reason, req.principal!.sub);
    variant.stock += req.body.quantity;
    return ok(res, { variantId: variant.id, onHand: variant.stock, reserved: variant.reserved, available: variant.stock - variant.reserved }, "Inventory adjusted");
  });
  app.get("/api/v1/admin/analytics", auth, authorize("analytics:read"), (_req, res) => {
    const orders = [...store.orders.values()], completed = orders.filter(order => !["CANCELLED", "FAILED"].includes(order.status));
    const revenue = completed.reduce((sum, order) => sum + order.total, 0);
    return ok(res, { revenue, orders: orders.length, averageOrderValue: completed.length ? Math.round(revenue / completed.length * 100) / 100 : 0, customers: [...store.users.values()].filter(user => user.role === "CUSTOMER").length, failedOrders: orders.filter(order => order.status === "FAILED").length, refunds: orders.filter(order => order.status === "REFUNDED").length });
  });
  app.get("/api/v1/admin/returns", auth, authorize("orders:read"), (_req, res) =>
    ok(res, [...store.returns.values()]),
  );
  app.get("/api/v1/admin/reviews", auth, authorize("reviews:read"), async (_req, res) => ok(res, persistence ? await persistence.listReviews() : [...store.reviews.values()]));
  app.patch("/api/v1/admin/reviews/:id", auth, authorize("reviews:update"), validate(reviewModerationSchema), async (req, res) => {
    if (persistence) return ok(res, await persistence.moderateReview(String(req.params.id), req.body.status, req.principal!.sub), "Review moderated");
    const review = store.reviews.get(String(req.params.id)); if (!review) throw new AppError(404, "REVIEW_NOT_FOUND", "Review not found"); review.status = req.body.status; return ok(res, review, "Review moderated");
  });
  app.get("/api/v1/admin/support", auth, authorize("support:read"), async (_req, res) => ok(res, persistence ? await persistence.listSupportTickets() : [...store.supportTickets.values()]));
  app.post("/api/v1/admin/support/:id/replies", auth, authorize("support:update"), validate(supportReplySchema), async (req, res) => {
    if (persistence) return ok(res, await persistence.replySupportTicket(String(req.params.id), req.principal!.sub, req.body.message, req.body.status), "Reply added", 201);
    const ticket = store.supportTickets.get(String(req.params.id)); if (!ticket) throw new AppError(404, "TICKET_NOT_FOUND", "Support ticket not found"); ticket.messages.push({ id: crypto.randomUUID(), authorId: req.principal!.sub, body: req.body.message, internal: false, createdAt: new Date().toISOString() }); ticket.status = req.body.status || "WAITING_CUSTOMER"; return ok(res, ticket, "Reply added", 201);
  });
  app.patch(
    "/api/v1/admin/returns/:id",
    auth,
    authorize("orders:update"),
    validate(returnDecisionSchema),
    async (req, res) => {
      const item = store.returns.get(String(req.params.id));
      if (!item) throw new AppError(404, "RETURN_NOT_FOUND", "Return request not found");
      if (item.status !== "REQUESTED") throw new AppError(409, "RETURN_ALREADY_DECIDED", "Return request is no longer pending");
      await persistence?.decideReturn(item.id, req.body.status, req.body.notes);
      item.status = req.body.status;
      return ok(res, item, `Return ${req.body.status.toLowerCase()}`);
    },
  );
  app.post(
    "/api/v1/admin/orders/:id/refunds",
    auth,
    authorize("orders:refund"),
    validate(refundSchema),
    async (req, res) => {
      const order = store.orders.get(String(req.params.id));
      if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
      if (req.body.amount > order.total) throw new AppError(422, "REFUND_AMOUNT_INVALID", "Refund cannot exceed the order total");
      const key = String(req.headers["idempotency-key"] || "");
      if (key.length < 8 || key.length > 100) throw new AppError(400, "IDEMPOTENCY_KEY_REQUIRED", "A valid Idempotency-Key header is required");
      const operationKey = `refund:${order.id}:${key}`;
      const reservation = persistence ? await persistence.beginRefund(order.id, req.body.amount, operationKey) : { duplicate: false, refund: { id: operationKey, status: "PENDING", externalId: null }, provider: "development", externalId: order.id };
      if (reservation.duplicate) return ok(res, reservation.refund, "Existing refund returned");
      try {
        const result = await resolvePaymentProvider(reservation.provider!).refund({ paymentId: reservation.externalId!, amount: { amount: req.body.amount, currency: "INR" }, idempotencyKey: operationKey });
        await persistence?.completeRefund(reservation.refund.id, result.refundId, req.principal!.sub);
        return ok(res, { ...result, amount: req.body.amount, status: "SUCCEEDED" }, "Refund processed", 201);
      } catch (error) {
        await persistence?.failRefund(reservation.refund.id);
        throw error;
      }
    },
  );
  app.patch(
    "/api/v1/admin/orders/:id/status",
    auth,
    authorize("orders:update"),
    validate(orderStatusSchema),
    async (req, res) => {
      const id = String(req.params.id),
        order = store.orders.get(id);
      if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
      assertOrderTransition(order.status, req.body.status);
      await persistence?.transitionOrder(
        id,
        order.status,
        req.body.status,
        req.principal!.sub,
      );
      return ok(
        res,
        store.transitionOrder(id, req.body.status, req.principal!.sub),
        "Order status updated",
      );
    },
  );
  app.post(
    "/api/v1/admin/orders/:id/shipment",
    auth,
    authorize("shipping:create"),
    async (req, res, next) => {
      try {
        const order = store.orders.get(String(req.params.id));
        if (!order)
          throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
        if (order.status !== "PACKED")
          throw new AppError(
            409,
            "ORDER_NOT_PACKED",
            "Only packed orders can be shipped",
          );
        const selectedShipping = resolveShippingProvider();
        const shipmentContext = persistence ? await persistence.shipmentContext(order.id) : {};
        const result = await selectedShipping.provider.createShipment({
          orderId: order.id,
          service: String(req.body?.service || "STANDARD"),
          idempotencyKey: `ship:${order.id}`,
          ...shipmentContext,
        });
        await persistence?.saveShipment(
          order.id,
          selectedShipping.name,
          result,
        );
        await persistence?.transitionOrder(
          order.id,
          order.status,
          "SHIPPED",
          req.principal!.sub,
          "SHIPPING",
        );
        store.transitionOrder(
          order.id,
          "SHIPPED",
          req.principal!.sub,
          "SHIPPING",
        );
        return ok(res, result, "Shipment created", 201);
      } catch (error) {
        next(error);
      }
    },
  );
  app.get(
    "/api/v1/admin/audit-logs",
    auth,
    authorize("audit:read"),
    (_req, res) => ok(res, store.auditLogs),
  );
  app.get(
    "/api/v1/admin/integrations",
    auth,
    authorize("settings:read"),
    (_req, res) =>
      ok(
        res,
        [...store.integrations.values()].map((x) => ({
          ...x,
          encryptedCredentials: undefined,
          masked: "••••••••",
        })),
      ),
  );
  app.put(
    "/api/v1/admin/integrations",
    auth,
    authorize("settings:update"),
    validate(integrationSchema),
    async (req, res) => {
      const id = `${req.body.kind}:${req.body.provider}:${req.body.environment}`,
        record = {
          id,
          ...req.body,
          encryptedCredentials: vault.encrypt(req.body.credentials),
          credentials: undefined,
          updatedAt: new Date().toISOString(),
        };
      store.integrations.set(id, record);
      await persistence?.saveIntegration(record);
      return ok(
        res,
        {
          ...record,
          encryptedCredentials: undefined,
          maskedKeys: Object.fromEntries(
            Object.entries(req.body.credentials).map(([k, v]) => [
              k,
              vault.mask(String(v)),
            ]),
          ),
        },
        "Integration saved",
      );
    },
  );
  app.use(notFound);
  app.use(errorHandler);
  return { app, store, config, persistence };
}
