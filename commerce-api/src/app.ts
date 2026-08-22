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
  checkoutQuoteSchema,
  addressSchema,
  cartItemSchema,
  couponSchema,
  credentials,
  integrationSchema,
  integrationDisconnectSchema,
  inventoryAdjustmentSchema,
  orderStatusSchema,
  productMediaOrderSchema,
  productMediaUpdateSchema,
  productSchema,
  registerSchema,
  refundSchema,
  reviewModerationSchema,
  reviewSchema,
  returnSchema,
  returnDecisionSchema,
  supportReplySchema,
  customerSupportReplySchema,
  supportTicketSchema,
  totpVerifySchema,
  storefrontConfigSchema,
  promotionConfigSchema,
  recommendationRequestSchema,
  mobileOtpRequestSchema,
  mobileOtpVerifySchema,
  googleLoginSchema,
  paymentClientEventSchema,
  paymentRetrySchema,
  paymentReconcileSchema,
  accountDeletionSchema,
  adminCustomerQuerySchema,
  adminCustomerUpdateSchema,
  adminReturnQuerySchema,
  adminReviewQuerySchema,
  adminSupportQuerySchema,
  supportInternalNoteSchema,
  supportUpdateSchema,
} from "./schemas.js";
import { validate } from "./validate.js";
import {
  CommerceStore,
  seedStore,
  type StoredIntegration,
  type StoredUser,
} from "./store.js";
import {
  DevelopmentPaymentProvider,
  DevelopmentShippingProvider,
  RazorpayPaymentProvider,
  ShiprocketShippingProvider,
} from "./providers.js";
import { hashPassword, verifyPassword } from "./passwords.js";
import { PrismaPersistence } from "./persistence.js";
import { assertOrderTransition } from "./order-state.js";
import {
  defaultStorefrontConfig,
  normalizeHostname,
  storefrontSettingKey,
  type StorefrontConfig,
} from "./storefront-config.js";
import {
  activeCampaign,
  defaultPromotionConfig,
  type PromotionConfig,
} from "./promotions.js";
import { verifyGoogleIdToken } from "./google-auth.js";
import { convertProductImage, productImageUpload } from "./image-upload.js";
import { generateInvoicePdf } from "./invoice.js";
import { adminOrderDto, adminRefundDto } from "./admin-orders.js";
import {
  adminProductDetailDto,
  listAdminInventory,
  listAdminProducts,
  paginatedMovements,
  queryInteger,
  storefrontProductDto,
} from "./admin-products.js";
import {
  integrationDefinitions,
  integrationDefinition,
  integrationConfigured,
  integrationDto,
  normalizeProvider,
  parsePublicConfig,
  providerPublicConfig,
  runtimeEnvironment,
  selectRuntimeIntegration,
  testIntegrationConnection,
  type IntegrationOutcome,
} from "./integrations.js";
import {
  adminCustomerDetail,
  adminReturnDetail,
  adminReviewDetail,
  adminSupportDetail,
  listAdminCustomers,
  listAdminReturns,
  listAdminReviews,
  listAdminSupportTickets,
  listCustomerSegments,
  normalizeCustomerTags,
} from "./admin-customer-operations.js";

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
      while (buckets.size >= 10_000)
        buckets.delete(buckets.keys().next().value!);
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
  googleVerifier?: typeof verifyGoogleIdToken;
  providerRequest?: typeof fetch;
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
  const googleVerifier = overrides?.googleVerifier || verifyGoogleIdToken,
    providerRequest = overrides?.providerRequest || fetch,
    mobileChallenges = new Map<
      string,
      { hash: string; expiresAt: number; attempts: number }
    >();
  const developmentStorefronts = new Map<string, StorefrontConfig>();
  const developmentPromotions = new Map<string, PromotionConfig>();
  if (persistence) {
    await persistence.connect();
    await persistence.hydrate(store);
  } else seedStore(store);
  const resolvePaymentProvider = (requested: string) => {
    const integration = selectRuntimeIntegration(
      store.integrations.values(),
      "PAYMENT",
      requested,
      config.NODE_ENV,
    );
    if (integration && normalizeProvider(integration.provider) === "razorpay") {
      const secrets = vault.decrypt<Record<string, string>>(
        integration.encryptedCredentials,
      );
      return new RazorpayPaymentProvider({
        keyId: secrets.keyId || secrets.key_id || "",
        keySecret: secrets.keySecret || secrets.key_secret || "",
      }, providerRequest);
    }
    if (config.NODE_ENV === "production")
      throw new AppError(
        503,
        "PAYMENT_NOT_CONFIGURED",
        `Payment provider ${requested} is not enabled`,
      );
    return developmentPayments;
  };
  const resolveShippingProvider = (requested?: string) => {
    const requestedProvider = requested
      ? normalizeProvider(requested)
      : undefined;
    const integration = selectRuntimeIntegration(
      store.integrations.values(),
      "SHIPPING",
      requestedProvider,
      config.NODE_ENV,
    );
    if (integration && normalizeProvider(integration.provider) === "shiprocket") {
      const secrets = vault.decrypt<Record<string, string>>(
        integration.encryptedCredentials,
      );
      const pickupPostcode = String(
        integration.publicConfig.pickupPostcode || "500001",
      );
      return {
        name: "shiprocket",
        origin: pickupPostcode,
        provider: new ShiprocketShippingProvider({
          token: secrets.token || secrets.apiKey || "",
          pickupPostcode,
          pickupLocation: String(
            integration.publicConfig.pickupLocation || "Primary",
          ),
        }, providerRequest),
      };
    }
    if (
      config.NODE_ENV === "production" ||
      (requestedProvider && requestedProvider !== "development")
    )
      throw new AppError(
        503,
        "SHIPPING_NOT_CONFIGURED",
        requestedProvider
          ? `Shipping provider ${requestedProvider} is not enabled`
          : "No live shipping provider is enabled",
      );
    return {
      name: "development",
      origin: "500001",
      provider: developmentShipping,
    };
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
  app.set(
    "trust proxy",
    config.TRUST_PROXY
      ? config.TRUST_PROXY.split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : false,
  );
  app.use(
    pinoHttp({
      level: config.NODE_ENV === "test" ? "silent" : "info",
      serializers: {
        req: (request) => ({
          ...request,
          url: String(request.url || "").split("?", 1)[0],
        }),
      },
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
        const provider = String(req.params.provider),
          raw = req.body as Buffer,
          integration =
            selectRuntimeIntegration(
              store.integrations.values(),
              "PAYMENT",
              provider,
              config.NODE_ENV,
            ) ||
            selectRuntimeIntegration(
              store.integrations.values(),
              "SHIPPING",
              provider,
              config.NODE_ENV,
            ),
          integrationSecrets = integration
            ? vault.decrypt<Record<string, string>>(
                integration.encryptedCredentials,
              )
            : undefined,
          signature = String(
            req.headers["x-webhook-signature"] ||
              req.headers["x-razorpay-signature"] ||
              "",
          ),
          secret =
            integrationSecrets?.webhookSecret ||
            integrationSecrets?.webhook_secret ||
            process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];
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
          integrationKind =
            integration?.kind ||
            (provider.toLowerCase() === "razorpay"
              ? "PAYMENT"
              : provider.toLowerCase() === "shiprocket"
                ? "SHIPPING"
                : undefined),
          paymentEvent = eventType.startsWith("payment."),
          shippingEvent = eventType.startsWith("shipment."),
          suppliedOrderId = String(
            payload.orderId ||
              payload.payload?.payment?.entity?.notes?.internalOrderId ||
              payload.payload?.order?.entity?.notes?.internalOrderId ||
              "",
          ),
          eventId = String(
            req.headers["x-event-id"] ||
              req.headers["x-razorpay-event-id"] ||
              payload.id ||
              payload.payload?.payment?.entity?.id ||
              "",
          );
        if (!eventId)
          throw new AppError(
            400,
            "MISSING_EVENT_ID",
            "Webhook event ID is required",
          );
        if (
          (paymentEvent && integrationKind !== "PAYMENT") ||
          (shippingEvent && integrationKind !== "SHIPPING") ||
          (!paymentEvent && !shippingEvent)
        )
          throw new AppError(
            422,
            "WEBHOOK_EVENT_NOT_ALLOWED",
            "This provider is not authorized for the event type",
          );
        if (store.webhookIds.has(`${provider}:${eventId}`))
          return ok(res, { duplicate: true }, "Already processed");
        let orderId = suppliedOrderId,
          paymentId: string | undefined,
          shipmentId: string | undefined;
        if (persistence && paymentEvent) {
          const externalOrderId = String(
            payload.payload?.payment?.entity?.order_id ||
              payload.payload?.order?.entity?.id ||
              "",
          );
          if (!externalOrderId)
            throw new AppError(
              400,
              "PAYMENT_REFERENCE_REQUIRED",
              "Provider payment order reference is required",
            );
          const bound = await persistence.resolvePaymentWebhook(
            provider,
            externalOrderId,
          );
          if (suppliedOrderId && suppliedOrderId !== bound.orderId)
            throw new AppError(
              422,
              "WEBHOOK_RESOURCE_MISMATCH",
              "Payment does not belong to the supplied order",
            );
          orderId = bound.orderId;
          paymentId = bound.paymentId;
        }
        if (persistence && shippingEvent) {
          const awb = String(payload.awb || payload.awb_code || "");
          if (!awb)
            throw new AppError(
              400,
              "SHIPMENT_REFERENCE_REQUIRED",
              "Shipment AWB is required",
            );
          const bound = await persistence.resolveShipmentWebhook(provider, awb);
          if (suppliedOrderId && suppliedOrderId !== bound.orderId)
            throw new AppError(
              422,
              "WEBHOOK_RESOURCE_MISMATCH",
              "Shipment does not belong to the supplied order",
            );
          orderId = bound.orderId;
          shipmentId = bound.shipmentId;
        }
        const target =
            eventType === "payment.captured"
              ? "PAID"
              : eventType === "payment.failed"
                ? "FAILED"
                : eventType === "payment.refunded"
                  ? "REFUNDED"
                  : eventType === "shipment.out_for_delivery"
                    ? "OUT_FOR_DELIVERY"
                    : eventType === "shipment.delivered"
                      ? "DELIVERED"
                      : undefined,
          order = orderId ? store.orders.get(orderId) : undefined;
        if (!target)
          throw new AppError(
            422,
            "WEBHOOK_EVENT_NOT_SUPPORTED",
            "Webhook event type is not supported",
          );
        if (target && !order)
          throw new AppError(
            404,
            "ORDER_NOT_FOUND",
            "Webhook order was not found",
          );
        if (target && order) assertOrderTransition(order.status, target);
        const persisted = await persistence?.processWebhook({
          provider,
          eventId,
          payloadHash: crypto.createHash("sha256").update(raw).digest("hex"),
          orderId: order?.id,
          from: order?.status,
          to: target,
          paymentId,
          paymentStatus: paymentId
            ? target === "PAID"
              ? "CAPTURED"
              : target === "REFUNDED"
                ? "REFUNDED"
                : "FAILED"
            : undefined,
          paymentAmount:
            Number(payload.payload?.payment?.entity?.amount || 0) / 100,
          paymentErrorCode:
            String(payload.payload?.payment?.entity?.error_code || "") ||
            undefined,
          paymentErrorDescription:
            String(payload.payload?.payment?.entity?.error_description || "") ||
            undefined,
          externalPaymentId:
            String(payload.payload?.payment?.entity?.id || "") || undefined,
          shipmentId,
          shipmentStatus: shipmentId ? target : undefined,
          location:
            typeof payload.location === "string" ? payload.location : undefined,
          occurredAt: payload.current_timestamp
            ? new Date(payload.current_timestamp)
            : undefined,
          safePayload: { type: eventType, orderId: orderId || undefined },
        });
        if (persisted?.duplicate)
          return ok(res, { duplicate: true }, "Already processed");
        if (target && order) {
          if (paymentEvent && order.payment) {
            order.payment.status =
              target === "PAID"
                ? "CAPTURED"
                : target === "REFUNDED"
                  ? "REFUNDED"
                  : "FAILED";
            order.payment.gatewayTransactionId =
              String(payload.payload?.payment?.entity?.id || "") ||
              order.payment.gatewayTransactionId;
            if (target === "FAILED")
              order.payment.lastError = {
                code:
                  String(payload.payload?.payment?.entity?.error_code || "") ||
                  undefined,
                description:
                  String(
                    payload.payload?.payment?.entity?.error_description || "",
                  ) || undefined,
              };
          }
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
  app.use(
    "/uploads",
    express.static(config.UPLOAD_DIR, {
      fallthrough: false,
      immutable: true,
      maxAge: "1y",
      dotfiles: "deny",
      index: false,
    }),
  );
  // Express only uses X-Forwarded-Host when the direct peer matches the
  // explicitly configured trusted proxy list. This prevents callers from
  // selecting another tenant's pricing rules with a forged header.
  const requestHostname = (req: express.Request) =>
    normalizeHostname(req.hostname);
  const readStorefront = async (hostname: string) => {
    const exactKey = storefrontSettingKey(hostname);
    const stored = persistence
      ? await persistence.getSetting<StorefrontConfig>(exactKey)
      : developmentStorefronts.get(exactKey);
    const fallback = persistence
      ? await persistence.getSetting<StorefrontConfig>(
          storefrontSettingKey("localhost"),
        )
      : developmentStorefronts.get(storefrontSettingKey("localhost"));
    return storefrontConfigSchema.parse(
      stored || fallback || defaultStorefrontConfig,
    );
  };
  app.get("/api/v1/storefront/config", async (req, res) =>
    ok(res, await readStorefront(requestHostname(req))),
  );
  const promotionKey = (hostname: string) =>
    `promotions:${normalizeHostname(hostname)}`;
  const readPromotions = async (hostname: string) =>
    persistence
      ? (await persistence.getSetting<PromotionConfig>(
          promotionKey(hostname),
        )) ||
        (await persistence.getSetting<PromotionConfig>(
          promotionKey("localhost"),
        )) ||
        defaultPromotionConfig
      : developmentPromotions.get(promotionKey(hostname)) ||
        developmentPromotions.get(promotionKey("localhost")) ||
        defaultPromotionConfig;
  app.get("/api/v1/storefront/promotions", async (req, res) => {
    const returning = req.query.returning === "true",
      settings = promotionConfigSchema.parse(
        await readPromotions(requestHostname(req)),
      );
    return ok(res, {
      announcementBars: settings.announcementBars.filter((x) =>
        activeCampaign(x, returning),
      ),
      banners: settings.banners.filter((x) => activeCampaign(x, returning)),
      popups: settings.popups.filter((x) => activeCampaign(x, returning)),
    });
  });
  app.post(
    "/api/v1/storefront/recommendations",
    validate(recommendationRequestSchema),
    async (req, res) => {
      const { viewedProductIds, cartProductIds, categories, limit } = req.body,
        products = store
          .listProducts()
          .filter((product) => product.status === "ACTIVE"),
        affinity = new Map<string, number>();
      for (const id of [...viewedProductIds, ...cartProductIds]) {
        const product = products.find((candidate) => candidate.id === id);
        if (product)
          affinity.set(
            product.category,
            (affinity.get(product.category) || 0) +
              (cartProductIds.includes(id) ? 4 : 2),
          );
      }
      for (const category of categories)
        affinity.set(category, (affinity.get(category) || 0) + 1);
      const excluded = new Set(cartProductIds),
        ranked = products
          .filter((product) => !excluded.has(product.id))
          .map((product) => ({
            product: storefrontProductDto(product),
            score:
              (affinity.get(product.category) || 0) * 10 +
              product.variants.filter((variant) => variant.active).reduce(
                (sum, variant) => sum + variant.stock - variant.reserved,
                0,
              ) /
                1000,
            reason: affinity.has(product.category)
              ? `Because you explored ${product.category}`
              : "Popular in the store",
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
      return ok(res, ranked);
    },
  );
  app.get("/health", (_req, res) =>
    ok(res, { status: "healthy", time: new Date().toISOString() }),
  );
  const assertAccountActive = async (
    user: StoredUser,
    tokenAuthVersion?: number,
  ) => {
    if (user.role !== "CUSTOMER") return user.authVersion || 0;
    const persisted = persistence
      ? await persistence.getCustomerAccountState(user.id)
      : null;
    const disabled = persisted
      ? !persisted.exists || !persisted.customer || persisted.disabled
      : Boolean(user.disabledAt);
    const authoritativeVersion = persisted?.authVersion ?? user.authVersion ?? 0;
    if (
      tokenAuthVersion !== undefined &&
      tokenAuthVersion !== authoritativeVersion
    )
      throw new AppError(401, "INVALID_TOKEN", "Session is invalid or expired");
    if (disabled)
      throw new AppError(
        403,
        "ACCOUNT_DISABLED",
        "This account is disabled. Contact store support for assistance",
      );
    user.authVersion = authoritativeVersion;
    if (persisted) {
      user.disabledAt = persisted.disabledAt?.toISOString();
      if (persisted.user) {
        user.name = persisted.user.name;
        user.email = persisted.user.email;
        user.mobile = persisted.user.mobile || undefined;
        user.passwordHash = persisted.user.passwordHash;
      }
    }
    return authoritativeVersion;
  };
  const loadCustomerForAuth = async (
    userId: string,
    permissions: string[] = [],
  ) => {
    let user = store.users.get(userId);
    if (persistence) {
      const state = await persistence.getCustomerAccountState(userId);
      if (!state.exists || !state.customer || !state.user)
        throw new AppError(
          401,
          "INVALID_TOKEN",
          "Session is invalid or expired",
        );
      if (!user) {
        user = {
          id: state.user.id,
          name: state.user.name,
          email: state.user.email,
          mobile: state.user.mobile || undefined,
          passwordHash: state.user.passwordHash,
          role: state.user.role,
          permissions,
        };
        store.users.set(user.id, user);
      }
      user.name = state.user.name;
      user.email = state.user.email;
      user.mobile = state.user.mobile || undefined;
      user.passwordHash = state.user.passwordHash;
      user.disabledAt = state.user.disabledAt?.toISOString();
      user.authVersion = state.user.authVersion;
    }
    if (!user || user.role !== "CUSTOMER")
      throw new AppError(
        401,
        "INVALID_TOKEN",
        "Session is invalid or expired",
      );
    return user;
  };
  const cachePersistedAuthUser = async (input: {
    email?: string;
    mobile?: string;
  }) => {
    if (!persistence) return undefined;
    const persistedUser = await persistence.findAuthUser(input);
    if (persistedUser) store.users.set(persistedUser.id, persistedUser);
    return persistedUser || undefined;
  };
  const persistNewUser = async (user: StoredUser) => {
    try {
      await persistence?.saveUser(user);
    } catch (error) {
      store.users.delete(user.id);
      throw error;
    }
  };
  const issueCustomerSession = async (
    user: StoredUser,
    res: express.Response,
  ) => {
    const authVersion = await assertAccountActive(user);
      const principal: Principal = {
        sub: user.id,
        role: user.role,
        permissions: user.permissions,
        authVersion,
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
    await persistence?.saveSession(sessionId, user.id, Date.now() + 604800000);
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/v1/auth",
      maxAge: 604800000,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    };
  };
  app.get("/api/v1/auth/providers", (_req, res) =>
    ok(res, {
      google: {
        enabled: Boolean(config.GOOGLE_CLIENT_ID),
        clientId: config.GOOGLE_CLIENT_ID,
      },
      mobileOtp: { enabled: true },
    }),
  );
  app.post(
    "/api/v1/auth/mobile/request",
    limiter(5, 60000),
    validate(mobileOtpRequestSchema),
    async (req, res) => {
      const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0"),
        hash = crypto
          .createHmac("sha256", config.JWT_SECRET)
          .update(`${req.body.mobile}:${code}`)
          .digest("hex");
      mobileChallenges.set(req.body.mobile, {
        hash,
        expiresAt: Date.now() + 300000,
        attempts: 0,
      });
      if (persistence)
        await persistence.queueNotification({
          channel: "SMS",
          template: "auth.mobile_otp",
          destination: req.body.mobile,
          payload: { code, expiresInMinutes: 5 },
        });
      return ok(
        res,
        {
          expiresInSeconds: 300,
          ...(config.NODE_ENV !== "production"
            ? { developmentCode: code }
            : {}),
        },
        "If the number can receive messages, a code has been sent",
      );
    },
  );
  app.post(
    "/api/v1/auth/mobile/verify",
    limiter(10, 60000),
    validate(mobileOtpVerifySchema),
    async (req, res) => {
      const challenge = mobileChallenges.get(req.body.mobile),
        submitted = crypto
          .createHmac("sha256", config.JWT_SECRET)
          .update(`${req.body.mobile}:${req.body.code}`)
          .digest("hex");
      if (
        !challenge ||
        challenge.expiresAt < Date.now() ||
        challenge.attempts >= 5 ||
        !crypto.timingSafeEqual(
          Buffer.from(challenge.hash),
          Buffer.from(submitted),
        )
      ) {
        if (challenge) challenge.attempts++;
        throw new AppError(
          401,
          "INVALID_OTP",
          "The code is invalid or expired",
        );
      }
      mobileChallenges.delete(req.body.mobile);
      let user =
        store.findUserByMobile(req.body.mobile) ||
        (await cachePersistedAuthUser({ mobile: req.body.mobile }));
      if (user && user.role !== "CUSTOMER")
        throw new AppError(
          403,
          "CUSTOMER_LOGIN_ONLY",
          "Use staff sign-in for this account",
        );
      if (!user) {
        user = store.createUser({
          name: req.body.name || `Customer ${req.body.mobile.slice(-4)}`,
          email: `mobile-${crypto.createHash("sha256").update(req.body.mobile).digest("hex").slice(0, 20)}@account.local`,
          mobile: req.body.mobile,
          passwordHash: await hashPassword(
            crypto.randomBytes(32).toString("hex"),
          ),
          role: "CUSTOMER",
          permissions: [],
        });
        await persistNewUser(user);
      }
      return ok(
        res,
        await issueCustomerSession(user, res),
        "Mobile number verified",
      );
    },
  );
  app.post(
    "/api/v1/auth/google",
    limiter(10, 60000),
    validate(googleLoginSchema),
    async (req, res) => {
      if (!config.GOOGLE_CLIENT_ID)
        throw new AppError(
          503,
          "GOOGLE_AUTH_NOT_CONFIGURED",
          "Google sign-in is not configured",
        );
      const claims = await googleVerifier(
        req.body.credential,
        config.GOOGLE_CLIENT_ID,
      );
      let user =
        store.findUser(claims.email) ||
        (await cachePersistedAuthUser({ email: claims.email }));
      if (user && user.role !== "CUSTOMER")
        throw new AppError(
          403,
          "CUSTOMER_LOGIN_ONLY",
          "Use staff sign-in for this account",
        );
      if (!user) {
        user = store.createUser({
          name: claims.name || claims.email.split("@")[0] || "Google customer",
          email: claims.email,
          passwordHash: await hashPassword(
            crypto.randomBytes(32).toString("hex"),
          ),
          role: "CUSTOMER",
          permissions: [],
        });
        await persistNewUser(user);
      }
      return ok(
        res,
        await issueCustomerSession(user, res),
        "Google account verified",
      );
    },
  );
  app.post(
    "/api/v1/auth/register",
    limiter(8, 60_000),
    validate(registerSchema),
    async (req, res, next) => {
      try {
        if (
          !store.findUser(req.body.email) &&
          (await cachePersistedAuthUser({ email: req.body.email }))
        )
          throw new AppError(
            409,
            "EMAIL_EXISTS",
            "An account already exists for this email",
          );
        const user = store.createUser({
          name: req.body.name,
          email: req.body.email,
          passwordHash: await hashPassword(req.body.password),
          role: "CUSTOMER",
          permissions: [],
        });
        await persistNewUser(user);
        if (persistence)
          await persistence.queueNotification({
            userId: user.id,
            channel: "EMAIL",
            template: "account.registered",
            destination: user.email,
            payload: { name: user.name },
          });
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
        const user =
          store.findUser(req.body.email) ||
          (await cachePersistedAuthUser({ email: req.body.email }));
        if (
          !user ||
          !(await verifyPassword(user.passwordHash, req.body.password))
        )
          throw new AppError(
            401,
            "INVALID_CREDENTIALS",
            "Email or password is incorrect",
          );
        const authVersion = await assertAccountActive(user);
        if (user.totpEnabled) {
          if (!user.totpSecretEncrypted)
            throw new AppError(
              503,
              "TWO_FACTOR_MISCONFIGURED",
              "Administrator two-factor authentication is unavailable",
            );
          const secret = vault.decrypt<{ secret: string }>(
            user.totpSecretEncrypted,
          ).secret;
          if (!req.body.otp || !verifyTotp(secret, req.body.otp))
            throw new AppError(
              401,
              "TWO_FACTOR_REQUIRED",
              "A valid authenticator code is required",
            );
        }
        const principal: Principal = {
            sub: user.id,
            role: user.role,
            permissions: user.permissions,
            authVersion,
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
        const user =
          decoded.role === "CUSTOMER"
            ? await loadCustomerForAuth(session.userId, decoded.permissions)
            : store.users.get(session.userId);
        if (!user)
          throw new AppError(
            401,
            "INVALID_REFRESH_TOKEN",
            "Session is invalid",
          );
        await assertAccountActive(user, decoded.authVersion || 0);
        if (persistence) {
          if (!(await persistence.consumeSession(decoded.jti)))
            throw new AppError(
              401,
              "INVALID_REFRESH_TOKEN",
              "Session has already been rotated",
            );
        } else {
          if (!store.sessions.delete(decoded.jti))
            throw new AppError(
              401,
              "INVALID_REFRESH_TOKEN",
              "Session has already been rotated",
            );
        }
        const principal: Principal = {
          sub: user.id,
          role: user.role,
          permissions: user.permissions,
          authVersion: user.authVersion || 0,
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
  const tokenAuth = authenticate(config.JWT_SECRET);
  const auth: express.RequestHandler = (req, res, next) =>
    tokenAuth(req, res, (error) => {
      if (error) return next(error);
      if (req.principal?.role !== "CUSTOMER") return next();
      const check = async () => {
        const user = await loadCustomerForAuth(
          req.principal!.sub,
          req.principal!.permissions,
        );
        await assertAccountActive(user, req.principal!.authVersion || 0);
      };
      void check().then(() => next(), next);
    });
  app.get(
    "/api/v1/admin/storefront-config",
    auth,
    authorize("settings:read"),
    async (req, res) => ok(res, await readStorefront(requestHostname(req))),
  );
  app.put(
    "/api/v1/admin/storefront-config",
    auth,
    authorize("settings:update"),
    validate(storefrontConfigSchema),
    async (req, res) => {
      const value = req.body as StorefrontConfig;
      const hostname = value.primaryDomain || requestHostname(req);
      const keys = new Set([
        storefrontSettingKey(hostname),
        storefrontSettingKey("localhost"),
      ]);
      for (const key of keys)
        persistence
          ? await persistence.saveSetting(key, value)
          : developmentStorefronts.set(key, value);
      store.auditLogs.unshift({
        id: crypto.randomUUID(),
        action: "storefront.settings.updated",
        resource: "Setting",
        resourceId: hostname,
        actorId: req.principal!.sub,
        createdAt: new Date().toISOString(),
      });
      return ok(res, value, "Storefront configuration saved");
    },
  );
  app.get(
    "/api/v1/admin/promotions",
    auth,
    authorize("marketing:update"),
    async (req, res) =>
      ok(
        res,
        promotionConfigSchema.parse(await readPromotions(requestHostname(req))),
      ),
  );
  app.put(
    "/api/v1/admin/promotions",
    auth,
    authorize("marketing:update"),
    validate(promotionConfigSchema),
    async (req, res) => {
      const hostname = requestHostname(req),
        value = req.body as PromotionConfig;
      persistence
        ? await persistence.saveSetting(promotionKey(hostname), value)
        : developmentPromotions.set(promotionKey(hostname), value);
      store.auditLogs.unshift({
        id: crypto.randomUUID(),
        action: "promotions.updated",
        resource: "Setting",
        resourceId: hostname,
        actorId: req.principal!.sub,
        createdAt: new Date().toISOString(),
      });
      return ok(res, value, "Promotions published");
    },
  );
  app.get(
    "/api/v1/admin/coupons",
    auth,
    authorize("marketing:update"),
    (_req, res) => ok(res, [...store.coupons.values()]),
  );
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
  app.delete(
    "/api/v1/account",
    auth,
    validate(accountDeletionSchema),
    async (req, res) => {
      const userId = req.principal!.sub,
        user = store.users.get(userId);
      if (!user)
        throw new AppError(404, "ACCOUNT_NOT_FOUND", "Account not found");
      if (user.role !== "CUSTOMER")
        throw new AppError(
          403,
          "CUSTOMER_ACCOUNT_REQUIRED",
          "Staff accounts cannot be deleted here",
        );
      let reauthenticated = false;
      if (req.body.password)
        reauthenticated = await verifyPassword(
          user.passwordHash,
          req.body.password,
        );
      else if (req.body.mobileOtp && user.mobile) {
        const challenge = mobileChallenges.get(user.mobile);
        const submitted = crypto
          .createHmac("sha256", config.JWT_SECRET)
          .update(`${user.mobile}:${req.body.mobileOtp}`)
          .digest("hex");
        reauthenticated = Boolean(
          challenge &&
            challenge.expiresAt >= Date.now() &&
            challenge.attempts < 5 &&
            crypto.timingSafeEqual(
              Buffer.from(challenge.hash),
              Buffer.from(submitted),
            ),
        );
        if (challenge) {
          if (reauthenticated) mobileChallenges.delete(user.mobile);
          else challenge.attempts++;
        }
      } else if (req.body.googleCredential && config.GOOGLE_CLIENT_ID) {
        const claims = await googleVerifier(
          req.body.googleCredential,
          config.GOOGLE_CLIENT_ID,
        );
        reauthenticated =
          claims.email_verified === true &&
          claims.email.toLowerCase() === user.email.toLowerCase();
      }
      if (!reauthenticated)
        throw new AppError(
          401,
          "REAUTHENTICATION_REQUIRED",
          "Confirm your identity again before deleting the account",
        );
      const retainedOrders = persistence
        ? (await persistence.deleteCustomerAccount(userId)).retainedOrders
        : [...store.orders.values()].filter((order) => order.userId === userId)
            .length;
      for (const order of store.orders.values())
        if (order.userId === userId) {
          order.userId = undefined;
          order.invoiceSnapshot = {};
        }
      for (const [id, session] of store.sessions)
        if (session.userId === userId) store.sessions.delete(id);
      for (const [id, review] of store.reviews)
        if (review.userId === userId) store.reviews.delete(id);
      for (const request of store.returns.values())
        if (request.userId === userId) {
          request.userId = undefined;
          request.reason = "Personal details removed";
          request.notes = undefined;
        }
      for (const [id, ticket] of store.supportTickets)
        if (ticket.userId === userId) store.supportTickets.delete(id);
      store.addresses.delete(userId);
      store.wishlists.delete(userId);
      store.carts.delete(`user:${userId}`);
      if (user.mobile) mobileChallenges.delete(user.mobile);
      store.users.delete(userId);
      store.auditLogs.unshift({
        id: crypto.randomUUID(),
        action: "customer.account_deleted",
        resource: "user",
        resourceId: userId,
        retainedOrders,
        personalDataRedacted: true,
        createdAt: new Date().toISOString(),
      });
      res.clearCookie("refresh_token", { path: "/api/v1/auth" });
      return ok(
        res,
        { deleted: true, retainedOrders },
        "Your account and personal data were deleted. Anonymized transaction records remain with the store owner.",
      );
    },
  );
  app.post("/api/v1/auth/admin-2fa/setup", auth, async (req, res) => {
    const user = store.users.get(req.principal!.sub);
    if (!user || user.role === "CUSTOMER")
      throw new AppError(403, "FORBIDDEN", "Administrator access required");
    const secret = base32Encode(crypto.randomBytes(20)),
      encrypted = vault.encrypt({ secret });
    user.totpSecretEncrypted = encrypted;
    user.totpEnabled = false;
    await persistence?.saveTotp(user.id, encrypted, false);
    return ok(
      res,
      {
        secret,
        otpauthUrl: `otpauth://totp/${encodeURIComponent(`Aster & Row:${user.email}`)}?secret=${secret}&issuer=${encodeURIComponent("Aster & Row")}&algorithm=SHA1&digits=6&period=30`,
      },
      "Scan this secret once, then verify a code",
    );
  });
  app.post(
    "/api/v1/auth/admin-2fa/verify",
    auth,
    validate(totpVerifySchema),
    async (req, res) => {
      const user = store.users.get(req.principal!.sub);
      if (!user || user.role === "CUSTOMER" || !user.totpSecretEncrypted)
        throw new AppError(
          409,
          "TWO_FACTOR_SETUP_REQUIRED",
          "Start two-factor setup first",
        );
      const secret = vault.decrypt<{ secret: string }>(
        user.totpSecretEncrypted,
      ).secret;
      if (!verifyTotp(secret, req.body.code))
        throw new AppError(
          422,
          "INVALID_AUTHENTICATOR_CODE",
          "Authenticator code is invalid",
        );
      user.totpEnabled = true;
      await persistence?.saveTotp(user.id, user.totpSecretEncrypted, true);
      return ok(
        res,
        { enabled: true },
        "Administrator two-factor authentication enabled",
      );
    },
  );
  app.get("/api/v1/account/addresses", auth, async (req, res) =>
    ok(
      res,
      persistence
        ? await persistence.listAddresses(req.principal!.sub)
        : store.addresses.get(req.principal!.sub) || [],
    ),
  );
  app.post(
    "/api/v1/account/addresses",
    auth,
    validate(addressSchema),
    async (req, res) => {
      if (persistence)
        return ok(
          res,
          await persistence.saveAddress(req.principal!.sub, req.body),
          "Address saved",
          201,
        );
      const addresses = store.addresses.get(req.principal!.sub) || [];
      if (req.body.isDefault)
        addresses.forEach((address) => {
          address.isDefault = false;
        });
      const address = {
        id: crypto.randomUUID(),
        userId: req.principal!.sub,
        ...req.body,
        createdAt: new Date().toISOString(),
      };
      addresses.push(address);
      store.addresses.set(req.principal!.sub, addresses);
      return ok(res, address, "Address saved", 201);
    },
  );
  app.delete("/api/v1/account/addresses/:id", auth, async (req, res) => {
    if (persistence)
      await persistence.deleteAddress(
        req.principal!.sub,
        String(req.params.id),
      );
    else {
      const addresses = store.addresses.get(req.principal!.sub) || [],
        next = addresses.filter((address) => address.id !== req.params.id);
      if (next.length === addresses.length)
        throw new AppError(404, "ADDRESS_NOT_FOUND", "Address not found");
      store.addresses.set(req.principal!.sub, next);
    }
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
      )
      .map(storefrontProductDto);
    return ok(res, data);
  });
  app.get("/api/v1/products/:id", (req, res) => {
    const product = store.getProduct(String(req.params.id));
    if (product.status !== "ACTIVE")
      throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found");
    return ok(res, storefrontProductDto(product));
  });
  app.get("/api/v1/products/:id/reviews", async (req, res) => {
    const productId = String(req.params.id);
    store.getProduct(productId);
    return ok(
      res,
      persistence
        ? await persistence.listApprovedReviews(productId)
        : [...store.reviews.values()]
            .filter(
              (review) =>
                review.productId === productId && review.status === "APPROVED",
            )
            .map((review) => ({
              id: review.id,
              rating: review.rating,
              title: review.title || null,
              body: review.body,
              verified: review.verified,
              createdAt: review.createdAt,
              user: {
                name: review.verified ? "Verified customer" : "Customer",
              },
            })),
    );
  });
  app.get("/api/v1/account/reviews", auth, async (req, res) => {
    if (persistence)
      return ok(res, await persistence.listCustomerReviews(req.principal!.sub));
    const reviews = [...store.reviews.values()]
      .filter((review) => review.userId === req.principal!.sub)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((review) => {
        const product = store.products.get(review.productId);
        return {
          ...review,
          product: product
            ? {
                id: product.id,
                name: product.name,
                slug: product.slug,
                media: product.media
                  .filter(
                    (item) =>
                      item.type === "IMAGE" &&
                      (!item.variantId ||
                        product.variants.some(
                          (variant) =>
                            variant.active && variant.id === item.variantId,
                        )),
                  )
                  .sort((left, right) => left.position - right.position)
                  .slice(0, 1)
                  .map(({ url, alt }) => ({ url, alt })),
              }
            : { id: review.productId, name: "Unavailable product", media: [] },
        };
      });
    return ok(res, reviews);
  });
  app.post(
    "/api/v1/account/reviews",
    auth,
    validate(reviewSchema),
    async (req, res) => {
      if (persistence)
        return ok(
          res,
          await persistence.saveReview(req.principal!.sub, req.body),
          "Review submitted for moderation",
          201,
        );
      store.getProduct(req.body.productId);
      const verified = [...store.orders.values()].some(
        (order) =>
          order.userId === req.principal!.sub &&
          order.status === "DELIVERED" &&
          order.lines.some((line) => {
            try {
              return (
                store.getVariant(line.variantId).product.id ===
                req.body.productId
              );
            } catch {
              return false;
            }
          }),
      );
      if (
        [...store.reviews.values()].some(
          (review) =>
            review.userId === req.principal!.sub &&
            review.productId === req.body.productId,
        )
      )
        throw new AppError(
          409,
          "REVIEW_EXISTS",
          "You have already reviewed this product",
        );
      const review = {
        id: crypto.randomUUID(),
        userId: req.principal!.sub,
        ...req.body,
        verified,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };
      store.reviews.set(review.id, review);
      return ok(res, review, "Review submitted for moderation", 201);
    },
  );
  app.get(
    "/api/v1/admin/products",
    auth,
    authorize("products:read"),
    (req, res) => {
      const status = String(req.query.status || "ALL").toUpperCase();
      if (!["ALL", "DRAFT", "ACTIVE", "ARCHIVED"].includes(status))
        throw new AppError(400, "INVALID_QUERY", "Unknown product status");
      const sortBy = String(req.query.sortBy || "updatedAt");
      if (!["updatedAt", "name", "inventory"].includes(sortBy))
        throw new AppError(400, "INVALID_QUERY", "Unknown product sort field");
      const sortOrder = String(req.query.sortOrder || "desc").toLowerCase();
      if (!["asc", "desc"].includes(sortOrder))
        throw new AppError(400, "INVALID_QUERY", "Unknown product sort order");
      return ok(
        res,
        listAdminProducts(store.listProducts(), {
          search: String(req.query.search || "").slice(0, 200),
          status: status as "ALL" | "DRAFT" | "ACTIVE" | "ARCHIVED",
          category: String(req.query.category || "").slice(0, 100),
          sortBy: sortBy as "updatedAt" | "name" | "inventory",
          sortOrder: sortOrder as "asc" | "desc",
          page: queryInteger(req.query.page, 1, 1, 1000),
          limit: queryInteger(req.query.limit, 25, 1, 100),
        }),
      );
    },
  );
  app.get(
    "/api/v1/admin/categories",
    auth,
    authorize("products:read"),
    (req, res) => {
      const search = String(req.query.search || "").trim().toLowerCase();
      const categories = new Map<
        string,
        { name: string; slug: string; productCount: number; activeProductCount: number }
      >();
      for (const product of store.listProducts()) {
        const key = product.category.toLowerCase();
        const current = categories.get(key) || {
          name: product.category,
          slug: product.category
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          productCount: 0,
          activeProductCount: 0,
        };
        current.productCount++;
        if (product.status === "ACTIVE") current.activeProductCount++;
        categories.set(key, current);
      }
      return ok(res, {
        items: [...categories.values()]
          .filter(
            (category) =>
              !search ||
              `${category.name} ${category.slug}`.toLowerCase().includes(search),
          )
          .sort((left, right) => left.name.localeCompare(right.name)),
      });
    },
  );
  app.get(
    "/api/v1/admin/products/:id",
    auth,
    authorize("products:read"),
    (req, res) =>
      ok(
        res,
        adminProductDetailDto(store.getProduct(String(req.params.id))),
      ),
  );
  const customerReturnDto = (item: {
    id: string;
    orderId: string;
    reason: string;
    notes?: string | null;
    status: string;
    createdAt: string | Date;
    updatedAt?: string | Date;
    items?: Array<{
      id: string;
      variantId: string;
      name: string;
      sku: string;
      quantity: number;
      condition?: string | null;
    }>;
  }) => ({
    id: item.id,
    orderId: item.orderId,
    reason: item.reason,
    notes: item.notes || null,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt || item.createdAt,
    items: (item.items || []).map((entry) => ({
      id: entry.id,
      variantId: entry.variantId,
      name: entry.name,
      sku: entry.sku,
      quantity: entry.quantity,
      condition: entry.condition || null,
    })),
  });
  app.post(
    "/api/v1/admin/products",
    auth,
    authorize("products:create"),
    validate(productSchema),
    async (req, res) => {
      const variants = req.body.variants.map(
        (entry: Record<string, unknown>) => ({
          ...entry,
          id: String(entry.id || crypto.randomUUID()),
          active: entry.active !== false,
          reserved: 0,
        }),
      );
      if (
        req.body.status === "ACTIVE" &&
        !variants.some((variant: { active: boolean }) => variant.active)
      )
        throw new AppError(
          409,
          "ACTIVE_VARIANT_REQUIRED",
          "An active product must have at least one active variant",
        );
      const variantIds = new Set(variants.map((variant: { id: string }) => variant.id));
      const media = (req.body.media || [])
        .slice()
        .sort(
          (left: { position: number }, right: { position: number }) =>
            left.position - right.position,
        )
        .map((entry: Record<string, unknown>, position: number) => {
          if (entry.variantId && !variantIds.has(String(entry.variantId)))
            throw new AppError(
              400,
              "MEDIA_VARIANT_INVALID",
              "Product media can only be assigned to a variant in this product",
            );
          return {
            ...entry,
            id: String(entry.id || crypto.randomUUID()),
            position,
          };
        });
      const product = store.saveProduct({ ...req.body, media, variants });
      try {
        await persistence?.saveProduct(product);
      } catch (error) {
        store.products.delete(product.id);
        throw error;
      }
      return ok(res, adminProductDetailDto(product), "Product created", 201);
    },
  );
  app.post(
    "/api/v1/admin/products/:id/media/upload",
    auth,
    authorize("products:update"),
    productImageUpload,
    async (req, res) => {
      const product = store.getProduct(String(req.params.id));
      if (!req.file)
        throw new AppError(400, "IMAGE_REQUIRED", "Choose an image to upload");
      const variantId = String(req.body.variantId || "");
      if (
        variantId &&
        !product.variants.some((variant) => variant.id === variantId)
      )
        throw new AppError(
          400,
          "MEDIA_VARIANT_INVALID",
          "Product media can only be assigned to a variant in this product",
        );
      const converted = await convertProductImage(
          req.file.buffer,
          config.UPLOAD_DIR,
          config.PUBLIC_UPLOAD_BASE_URL,
        ),
        media = {
          id: crypto.randomUUID(),
          url: converted.url,
          alt:
            String(req.body.alt || product.name)
              .trim()
              .slice(0, 200) || product.name,
          type: "IMAGE" as const,
          position: Number.isFinite(Number(req.body.position))
            ? Math.max(
                0,
                Math.min(product.media.length, Math.trunc(Number(req.body.position))),
              )
            : product.media.length,
          ...(variantId ? { variantId } : {}),
        };
      const orderedIds = product.media.map((item) => item.id);
      orderedIds.splice(media.position, 0, media.id);
      await persistence?.addProductMedia({
        id: media.id,
        productId: product.id,
        url: media.url,
        alt: media.alt,
        position: media.position,
        variantId: media.variantId,
      }, orderedIds);
      product.media.splice(media.position, 0, media);
      product.media.forEach((item, position) => (item.position = position));
      product.updatedAt = new Date().toISOString();
      return ok(
        res,
        { media, ...converted },
        "Image converted to WebP and attached",
        201,
      );
    },
  );
  app.put(
    "/api/v1/admin/products/:id/media/order",
    auth,
    authorize("products:update"),
    validate(productMediaOrderSchema),
    async (req, res) => {
      const product = store.getProduct(String(req.params.id));
      const requested = req.body.mediaIds as string[];
      if (
        new Set(requested).size !== requested.length ||
        requested.length !== product.media.length ||
        requested.some(
          (id) => !product.media.some((candidate) => candidate.id === id),
        )
      )
        throw new AppError(
          400,
          "MEDIA_ORDER_INVALID",
          "Media ordering must contain every current media id exactly once",
        );
      await persistence?.reorderProductMedia(product.id, requested);
      const positions = new Map(requested.map((id, position) => [id, position]));
      product.media.sort(
        (left, right) => positions.get(left.id)! - positions.get(right.id)!,
      );
      product.media.forEach((item, position) => (item.position = position));
      product.updatedAt = new Date().toISOString();
      return ok(res, adminProductDetailDto(product).media, "Media reordered");
    },
  );
  app.patch(
    "/api/v1/admin/products/:id/media/:mediaId",
    auth,
    authorize("products:update"),
    validate(productMediaUpdateSchema),
    async (req, res) => {
      const product = store.getProduct(String(req.params.id));
      const media = product.media.find(
        (candidate) => candidate.id === String(req.params.mediaId),
      );
      if (!media)
        throw new AppError(404, "MEDIA_NOT_FOUND", "Product media not found");
      if (
        req.body.variantId &&
        !product.variants.some(
          (variant) => variant.id === String(req.body.variantId),
        )
      )
        throw new AppError(
          400,
          "MEDIA_VARIANT_INVALID",
          "Product media can only be assigned to a variant in this product",
        );
      await persistence?.updateProductMedia(product.id, media.id, req.body);
      if (req.body.alt !== undefined) media.alt = req.body.alt;
      if (req.body.variantId === null) delete media.variantId;
      else if (req.body.variantId !== undefined)
        media.variantId = req.body.variantId;
      product.updatedAt = new Date().toISOString();
      return ok(res, media, "Media updated");
    },
  );
  app.delete(
    "/api/v1/admin/products/:id/media/:mediaId",
    auth,
    authorize("products:update"),
    async (req, res) => {
      const product = store.getProduct(String(req.params.id));
      const index = product.media.findIndex(
        (candidate) => candidate.id === String(req.params.mediaId),
      );
      if (index < 0)
        throw new AppError(404, "MEDIA_NOT_FOUND", "Product media not found");
      const media = product.media[index]!;
      await persistence?.deleteProductMedia(product.id, media.id);
      product.media.splice(index, 1);
      product.media.forEach((item, position) => (item.position = position));
      product.updatedAt = new Date().toISOString();
      await persistence?.reorderProductMedia(
        product.id,
        product.media.map((item) => item.id),
      );
      return ok(res, { id: media.id, deleted: true }, "Media removed");
    },
  );
  app.put(
    "/api/v1/admin/products/:id",
    auth,
    authorize("products:update"),
    validate(productSchema),
    async (req, res) => {
      const existing = store.getProduct(String(req.params.id));
      const usedVariantIds = new Set<string>();
      const variants = req.body.variants.map(
        (entry: Record<string, unknown>) => {
          const requestedId = entry.id ? String(entry.id) : undefined;
          const current = requestedId
            ? existing.variants.find((variant) => variant.id === requestedId)
            : existing.variants.find(
                (variant) =>
                  !usedVariantIds.has(variant.id) &&
                  variant.sku.toLowerCase() === String(entry.sku).toLowerCase(),
              );
          if (requestedId && !current)
            throw new AppError(
              400,
              "VARIANT_ID_INVALID",
              "A submitted variant id does not belong to this product",
            );
          const id = current?.id || crypto.randomUUID();
          if (usedVariantIds.has(id))
            throw new AppError(
              409,
              "DUPLICATE_VARIANT",
              "Each product variant can only be submitted once",
            );
          usedVariantIds.add(id);
          return {
            ...entry,
            id,
            active: entry.active !== false,
            stock: current?.stock ?? Number(entry.stock),
            reserved: current?.reserved ?? 0,
          };
        },
      );
      for (const variant of existing.variants) {
        if (!usedVariantIds.has(variant.id))
          variants.push({ ...variant, active: false });
      }
      if (
        req.body.status === "ACTIVE" &&
        !variants.some((variant: { active: boolean }) => variant.active)
      )
        throw new AppError(
          409,
          "ACTIVE_VARIANT_REQUIRED",
          "An active product must have at least one active variant",
        );
      const variantIds = new Set(
        variants.map((variant: { id: string }) => variant.id),
      );
      const media =
        req.body.media === undefined
          ? existing.media
          : req.body.media
              .slice()
              .sort(
                (left: { position: number }, right: { position: number }) =>
                  left.position - right.position,
              )
              .map((entry: Record<string, unknown>, position: number) => {
                if (
                  entry.id &&
                  !existing.media.some((candidate) => candidate.id === entry.id)
                )
                  throw new AppError(
                    400,
                    "MEDIA_ID_INVALID",
                    "A submitted media id does not belong to this product",
                  );
                if (entry.variantId && !variantIds.has(String(entry.variantId)))
                  throw new AppError(
                    400,
                    "MEDIA_VARIANT_INVALID",
                    "Product media can only be assigned to a variant in this product",
                  );
                return {
                  ...entry,
                  id: String(entry.id || crypto.randomUUID()),
                  position,
                };
              });
      const product = store.saveProduct(
        { ...req.body, media, variants },
        String(req.params.id),
      );
      try {
        await persistence?.saveProduct(product);
      } catch (error) {
        store.products.set(existing.id, existing);
        throw error;
      }
      return ok(res, adminProductDetailDto(product), "Product updated");
    },
  );
  app.delete(
    "/api/v1/admin/products/:id",
    auth,
    authorize("products:delete"),
    async (req, res) => {
      const existing = store.getProduct(String(req.params.id));
      const product = store.deleteProduct(existing.id);
      try {
        await persistence?.archiveProduct(product.id);
      } catch (error) {
        store.products.set(existing.id, existing);
        throw error;
      }
      return ok(res, adminProductDetailDto(product), "Product archived");
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
        [...items].map(([variantId, quantity]) => {
          const { product, variant } = store.getVariant(variantId);
          return {
            product: storefrontProductDto(product),
            variant,
            variantId,
            quantity,
          };
        }),
      );
    },
  );
  app.put(
    "/api/v1/cart/items",
    optionalAuthenticate(config.JWT_SECRET),
    validate(cartItemSchema),
    async (req, res) => {
      const key = cartKey(req, res),
        { product, variant } = store.getVariant(req.body.variantId),
        items = store.carts.get(key) || new Map<string, number>();
      if (
        req.body.quantity > 0 &&
        (product.status !== "ACTIVE" || !variant.active)
      )
        throw new AppError(
          409,
          "PRODUCT_UNAVAILABLE",
          `${product.name} is no longer available`,
        );
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
        storefrontProductDto(store.getProduct(id)),
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
  const calculateCheckoutQuote = async (
    input: {
      lines: Array<{ variantId: string; quantity: number }>;
      postalCode: string;
      couponCode?: string;
      paymentProvider: string;
      shippingService?: string;
    },
    freeShippingThreshold: number,
  ) => {
    const quantities = new Map<string, number>();
    for (const line of input.lines)
      quantities.set(
        line.variantId,
        (quantities.get(line.variantId) || 0) + line.quantity,
      );
    if ([...quantities.values()].some((quantity) => quantity > 20))
      throw new AppError(
        422,
        "VARIANT_QUANTITY_LIMIT",
        "A single product option cannot exceed 20 units",
      );

    let subtotal = 0,
      tax = 0,
      weight = 0;
    const lines = input.lines.map((line) => {
      const { product, variant } = store.getVariant(line.variantId);
      if (product.status !== "ACTIVE" || !variant.active)
        throw new AppError(
          409,
          "PRODUCT_UNAVAILABLE",
          `${product.name} is no longer available`,
        );
      if (
        variant.stock - variant.reserved <
        (quantities.get(variant.id) || line.quantity)
      )
        throw new AppError(
          409,
          "INSUFFICIENT_STOCK",
          `Insufficient stock for ${variant.sku}`,
        );
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
    });

    const shippingProvider = resolveShippingProvider();
    const providerRates = await shippingProvider.provider.rates({
      origin: shippingProvider.origin,
      destination: input.postalCode,
      weightGrams: weight,
      cod: input.paymentProvider.toLowerCase() === "cod",
    });
    if (!providerRates.length)
      throw new AppError(
        422,
        "PINCODE_NOT_SERVICEABLE",
        "No delivery service is available for this PIN code",
      );
    const selectedRate = input.shippingService
      ? providerRates.find((rate) => rate.service === input.shippingService)
      : providerRates[0];
    if (!selectedRate)
      throw new AppError(
        422,
        "SHIPPING_SERVICE_UNAVAILABLE",
        "The selected delivery service is no longer available",
      );

    const coupon = input.couponCode
        ? store.coupons.get(input.couponCode.toUpperCase())
        : undefined,
      now = Date.now();
    if (
      input.couponCode &&
      (!coupon ||
        !coupon.enabled ||
        coupon.startsAt > now ||
        coupon.endsAt < now ||
        subtotal < coupon.minimumSpend ||
        (coupon.usageLimit !== undefined && coupon.used >= coupon.usageLimit))
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
      freeShipping =
        coupon?.type === "FREE_SHIPPING" ||
        (freeShippingThreshold > 0 && subtotal >= freeShippingThreshold),
      shippingAmount = freeShipping ? 0 : selectedRate.amount.amount,
      roundedTax = Math.round(tax * 100) / 100,
      total =
        Math.round(
          (subtotal + roundedTax + shippingAmount - discount) * 100,
        ) / 100,
      rates = providerRates.map((rate) => {
        const shipping = freeShipping ? 0 : rate.amount.amount;
        return {
          service: rate.service,
          label: rate.label,
          etaDays: rate.etaDays,
          baseAmount: rate.amount.amount,
          shipping,
          currency: rate.amount.currency,
          total:
            Math.round((subtotal + roundedTax + shipping - discount) * 100) /
            100,
        };
      });
    return {
      lines,
      coupon,
      provider: shippingProvider.name,
      rates,
      selectedShipping: {
        service: selectedRate.service,
        label: selectedRate.label,
        etaDays: selectedRate.etaDays,
        quotedAmount: selectedRate.amount.amount,
        chargedAmount: shippingAmount,
        currency: selectedRate.amount.currency,
      },
      subtotal,
      tax: roundedTax,
      discount,
      shipping: shippingAmount,
      total,
      currency: selectedRate.amount.currency,
      freeShipping,
    };
  };
  app.post(
    "/api/v1/checkout/quote",
    limiter(30, 60_000),
    validate(checkoutQuoteSchema),
    async (req, res) => {
      const storefront = await readStorefront(requestHostname(req));
      const { lines: _lines, coupon: _coupon, ...quote } =
        await calculateCheckoutQuote(
          req.body,
          storefront.freeShippingThreshold,
        );
      return ok(res, quote, "Checkout quote calculated");
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
        const checkoutScope =
          req.principal?.sub ||
          `guest:${req.ip}:${String(
            req.body.contact.email || req.body.contact.phone,
          )
            .trim()
            .toLowerCase()}`;
        const keyPrefix = crypto
          .createHash("sha256")
          .update(`${checkoutScope}:${key}`)
          .digest("hex");
        const requestHash = crypto
          .createHash("sha256")
          .update(JSON.stringify(req.body))
          .digest("hex");
        const duplicate = store.findOrderByKey(keyPrefix);
        if (duplicate) {
          if (duplicate.idempotencyKey !== `${keyPrefix}.${requestHash}`)
            throw new AppError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This idempotency key was already used for a different checkout request",
            );
          return ok(
            res,
            { order: duplicate, payment: duplicate.payment || null },
            "Existing order returned",
          );
        }
        const storefront = await readStorefront(requestHostname(req));
        const quote = await calculateCheckoutQuote(
          req.body,
          storefront.freeShippingThreshold,
        );
        const {
          lines,
          coupon,
          provider: shippingProviderName,
          rates,
          selectedShipping,
          subtotal,
          tax,
          discount,
          shipping: shippingAmount,
          total,
        } = quote;
        const shippingSelection = {
          provider: shippingProviderName,
          ...selectedShipping,
          quotedAt: new Date().toISOString(),
        };
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
          shippingSelection,
          trackingVerificationHash: crypto
            .createHash("sha256")
            .update(
              String(req.body.contact.email || req.body.contact.phone)
                .trim()
                .toLowerCase(),
            )
            .digest("hex"),
          invoiceSnapshot: {
            contact: req.body.contact,
            shipping: {
              ...req.body.shippingAddress,
              postalCode: req.body.postalCode,
            },
            gstin: req.body.gstin,
            paymentMethod: req.body.paymentProvider.toLowerCase(),
            shippingSelection,
          },
        });
        createdOrderId = order.id;
        let payment: null | { externalId: string; clientToken?: string } = null,
          paymentFailure:
            | {
                code: string;
                message: string;
                retryable: boolean;
                fallbackOptions: string[];
              }
            | undefined;
        if (!isCod)
          try {
            payment = await resolvePaymentProvider(
              req.body.paymentProvider,
            ).createOrder({
              orderId: order.id,
              amount: { amount: total, currency: "INR" },
              idempotencyKey: `pay:${key}`,
            });
          } catch (error) {
            if (
              !(error instanceof AppError) ||
              error.code !== "PAYMENT_PROVIDER_ERROR"
            )
              throw error;
            const details = (error.details || {}) as Record<string, unknown>;
            paymentFailure = {
              code: String(details.category || error.code),
              message:
                "The selected payment gateway is temporarily unavailable. Your order is saved; retry the secure payment when the provider is available.",
              retryable: Boolean(details.retryable),
              fallbackOptions: ["retry"],
            };
            order.payment = {
              externalId: `unavailable:${order.id}`,
              provider: req.body.paymentProvider,
              status: "FAILED",
              amount: order.total,
              currency: "INR",
              refundedAmount: 0,
              refunds: [],
              lastError: {
                code: paymentFailure.code,
                description: paymentFailure.message,
              },
            };
          }
        if (payment)
          order.payment = {
            ...payment,
            provider: req.body.paymentProvider,
            status: "CREATED",
            amount: order.total,
            currency: "INR",
            refundedAmount: 0,
            refunds: [],
          };
        else if (isCod) order.payment = null;
        await persistence?.saveOrderAndReservations(
          order,
          {
            contact: req.body.contact,
            shipping: {
              ...req.body.shippingAddress,
              postalCode: req.body.postalCode,
            },
            billing: req.body.billingAddress || {
              ...req.body.shippingAddress,
              postalCode: req.body.postalCode,
            },
            gstin: req.body.gstin,
            deliveryInstructions: req.body.deliveryInstructions,
            paymentMethod: req.body.paymentProvider.toLowerCase(),
            shippingSelection: order.shippingSelection,
          },
          req.body.paymentProvider,
          req.body.couponCode,
          payment?.externalId,
        );
        if (coupon) coupon.used++;
        return ok(
          res,
          {
            order,
            payment,
            paymentFailure,
            fallbackOptions: paymentFailure?.fallbackOptions || [],
            shipping: selectedShipping,
            rates,
            price: {
              subtotal,
              tax,
              discount,
              shipping: shippingAmount,
              total,
              currency: quote.currency,
              freeShipping: quote.freeShipping,
            },
          },
          paymentFailure
            ? "Order saved; payment requires another attempt"
            : "Checkout created",
          paymentFailure ? 202 : 201,
        );
      } catch (e) {
        if (reserved) store.releaseMany(req.body.lines);
        if (createdOrderId) store.orders.delete(createdOrderId);
        next(e);
      }
    },
  );
  app.post(
    "/api/v1/payments/client-events",
    limiter(20, 60000),
    validate(paymentClientEventSchema),
    async (req, res) => {
      if (persistence)
        return ok(
          res,
          await persistence.recordPaymentClientEvent(req.body),
          "Payment attempt recorded",
        );
      const order = [...store.orders.values()].find(
        (item) =>
          item.number === req.body.orderNumber &&
          item.payment?.externalId === req.body.providerOrderId,
      );
      if (!order || !order.payment)
        throw new AppError(
          404,
          "PAYMENT_NOT_FOUND",
          "Payment attempt was not found",
        );
      order.payment.status = req.body.type;
      order.payment.gatewayTransactionId = req.body.gatewayPaymentId;
      order.payment.lastError = {
        code: req.body.errorCode,
        description: req.body.errorDescription,
      };
      store.auditLogs.unshift({
        id: crypto.randomUUID(),
        action: `payment.${req.body.type.toLowerCase()}`,
        resource: "payment",
        resourceId: order.payment.externalId,
        after: {
          gatewayTransactionId: req.body.gatewayPaymentId,
          errorCode: req.body.errorCode,
        },
        createdAt: new Date().toISOString(),
      });
      return ok(res, order.payment, "Payment attempt recorded");
    },
  );
  app.post(
    "/api/v1/payments/retry",
    limiter(5, 60000),
    validate(paymentRetrySchema),
    async (req, res) => {
      const order = [...store.orders.values()].find(
          (item) => item.number === req.body.orderNumber,
        ),
        supplied = crypto
          .createHash("sha256")
          .update(req.body.contact.trim().toLowerCase())
          .digest("hex");
      if (
        !order ||
        order.status !== "PAYMENT_PENDING" ||
        !order.trackingVerificationHash ||
        !crypto.timingSafeEqual(
          Buffer.from(supplied),
          Buffer.from(order.trackingVerificationHash),
        )
      )
        throw new AppError(
          404,
          "ORDER_NOT_FOUND",
          "Pending order was not found",
        );
      const provider = resolvePaymentProvider(req.body.provider),
        attemptKey = `retry:${order.id}:${crypto.randomUUID()}`,
        payment = await provider.createOrder({
          orderId: order.id,
          amount: { amount: order.total, currency: "INR" },
          idempotencyKey: attemptKey,
        }),
        attempt = {
          ...payment,
          provider: req.body.provider,
          status: "CREATED",
          amount: order.total,
          currency: "INR",
          refundedAmount: order.payment?.refundedAmount || 0,
          refunds: order.payment?.refunds || [],
        };
      order.payment = attempt;
      await persistence?.createPaymentAttempt(
        order.id,
        req.body.provider,
        payment.externalId,
        order.total,
        attemptKey,
      );
      return ok(
        res,
        {
          order: { number: order.number, status: order.status },
          payment: attempt,
        },
        "New payment attempt created",
        201,
      );
    },
  );
  app.get(
    "/api/v1/orders/:number/track",
    limiter(30, 60_000),
    async (req, res) => {
      const order = [...store.orders.values()].find(
        (x) => x.number === String(req.params.number),
      );
      const verification = String(req.query.contact || "")
        .trim()
        .toLowerCase();
      const suppliedHash = crypto
        .createHash("sha256")
        .update(verification)
        .digest("hex");
      if (
        !order ||
        !verification ||
        !order.trackingVerificationHash ||
        !crypto.timingSafeEqual(
          Buffer.from(suppliedHash),
          Buffer.from(order.trackingVerificationHash),
        )
      )
        throw new AppError(
          404,
          "ORDER_NOT_FOUND",
          "Order not found or contact details do not match",
        );
      const shipment = persistence
        ? await persistence.trackingDetails(order.id)
        : null;
      return ok(res, {
        number: order.number,
        status: order.status,
        history: order.history,
        shipment,
        estimatedDelivery: shipment
          ? new Date(Date.now() + 3 * 86_400_000).toISOString()
          : null,
      });
    },
  );
  app.get("/api/v1/account/orders", auth, (req, res) =>
    ok(
      res,
      [...store.orders.values()].filter(
        (order) => order.userId === req.principal!.sub,
      ),
    ),
  );
  app.get("/api/v1/account/payments", auth, async (req, res) => {
    if (persistence)
      return ok(
        res,
        await persistence.listCustomerPayments(req.principal!.sub),
      );
    const payments = [...store.orders.values()]
      .filter(
        (order) =>
          order.userId === req.principal!.sub && Boolean(order.payment),
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((order) => {
        const payment = order.payment!;
        const refundedAmount =
          payment.refundedAmount ||
          (payment.status === "REFUNDED" ? order.total : 0);
        return {
          id: `payment:${order.id}`,
          orderId: order.id,
          orderNumber: order.number,
          orderStatus: order.status,
          provider: payment.provider || "Payment provider",
          status: payment.status || "CREATED",
          amount: order.total,
          currency: "INR",
          providerReference: payment.externalId,
          transactionId: payment.gatewayTransactionId || null,
          refundedAmount,
          refunds: (payment.refunds || []).map(adminRefundDto),
          events: payment.lastError
            ? [
                {
                  id: `event:${order.id}`,
                  type: payment.status || "FAILED",
                  amount: 0,
                  errorCode: payment.lastError.code,
                  errorDescription: payment.lastError.description,
                  createdAt: order.createdAt,
                },
              ]
            : [],
          createdAt: order.createdAt,
          verifiedAt: null,
        };
      });
    return ok(res, payments);
  });
  app.get("/api/v1/orders/:id/invoice", auth, async (req, res) => {
    const order = store.orders.get(String(req.params.id));
    if (
      !order ||
      (order.userId !== req.principal!.sub &&
        !req.principal!.permissions.includes("orders:read"))
    )
      throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
    const storefront = await readStorefront(requestHostname(req)),
      pdf = await generateInvoicePdf({
        store: {
          name: storefront.storeName,
          legalName: storefront.legalName,
          gstin: storefront.businessGstin,
          address: storefront.businessAddress,
          email: storefront.supportEmail,
          phone: storefront.supportPhone,
        },
        order: {
          number: order.number,
          createdAt: order.createdAt,
          status: order.status,
          subtotal: order.subtotal,
          tax: order.tax,
          shipping: order.shipping,
          discount: order.discount,
          total: order.total,
          paymentStatus:
            order.payment?.status ||
            (order.payment ? "PENDING" : "CASH_ON_DELIVERY"),
          lines: order.lines,
          snapshot: order.invoiceSnapshot,
        },
      });
    res.setHeader("content-type", "application/pdf");
    res.setHeader(
      "content-disposition",
      `attachment; filename="invoice-${order.number.replace(/[^A-Za-z0-9_-]/g, "")}.pdf"`,
    );
    res.setHeader("cache-control", "private, no-store");
    return res.status(200).send(pdf);
  });
  app.post(
    "/api/v1/account/returns",
    auth,
    validate(returnSchema),
    async (req, res) => {
      if (persistence) {
        const created = await persistence.createReturnRequest(
          req.principal!.sub,
          req.body,
        );
        await persistence.refreshOrder(store, req.body.orderId);
        const request = {
          id: created.id,
          orderId: created.orderId,
          userId: created.userId || undefined,
          reason: created.reason,
          notes: created.notes || undefined,
          status: created.status,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
          items: created.items.map((item) => ({
            id: item.id,
            orderItemId: item.orderItemId,
            variantId: item.orderItem.variantId,
            name: item.orderItem.name,
            sku: item.orderItem.sku,
            quantity: item.quantity,
            condition: item.condition || undefined,
          })),
        };
        store.returns.set(request.id, request);
        return ok(res, customerReturnDto(request), "Return requested", 201);
      }
      const order = store.orders.get(req.body.orderId);
      if (!order || order.userId !== req.principal!.sub)
        throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
      if (order.status !== "DELIVERED")
        throw new AppError(
          409,
          "RETURN_NOT_AVAILABLE",
          "Returns are available only after delivery",
        );
      const selections = req.body.items || order.lines.map((line) => ({
        variantId: line.variantId,
        quantity: line.quantity,
      }));
      const seen = new Set<string>();
      const items = selections.map(
        (selection: { variantId: string; quantity: number }) => {
          if (seen.has(selection.variantId))
            throw new AppError(
              400,
              "DUPLICATE_RETURN_ITEM",
              "Each product variant can be selected only once",
            );
          seen.add(selection.variantId);
          const line = order.lines.find(
            (candidate) => candidate.variantId === selection.variantId,
          );
          if (!line || selection.quantity > line.quantity)
            throw new AppError(
              422,
              "INVALID_RETURN_QUANTITY",
              "Return quantity exceeds the purchased quantity",
            );
          return {
            id: crypto.randomUUID(),
            orderItemId: selection.variantId,
            variantId: selection.variantId,
            name: line.name,
            sku: line.sku,
            quantity: selection.quantity,
          };
        },
      );
      if (
        [...store.returns.values()].some(
          (item) => item.orderId === order.id && item.status !== "REJECTED",
        )
      )
        throw new AppError(
          409,
          "RETURN_ALREADY_EXISTS",
          "A return is already active for this order",
        );
      const createdAt = new Date().toISOString();
      const request = {
        id: crypto.randomUUID(),
        orderId: order.id,
        userId: req.principal!.sub,
        reason: req.body.reason,
        status: "REQUESTED",
        createdAt,
        updatedAt: createdAt,
        items,
      };
      store.transitionOrder(
        order.id,
        "RETURN_REQUESTED",
        req.principal!.sub,
        "CUSTOMER",
      );
      store.returns.set(request.id, request);
      return ok(res, customerReturnDto(request), "Return requested", 201);
    },
  );
  app.get("/api/v1/account/returns", auth, async (req, res) => {
    if (persistence) {
      const items = await persistence.listCustomerReturns(req.principal!.sub);
      return ok(
        res,
        items.map((item) => customerReturnDto({
          id: item.id,
          orderId: item.orderId,
          reason: item.reason,
          notes: item.notes || null,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          items: item.items.map((entry) => ({
            id: entry.id,
            variantId: entry.orderItem.variantId,
            name: entry.orderItem.name,
            sku: entry.orderItem.sku,
            quantity: entry.quantity,
            condition: entry.condition || null,
          })),
        })),
      );
    }
    return ok(
      res,
      [...store.returns.values()]
        .filter((item) => item.userId === req.principal!.sub)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, 100)
        .map(customerReturnDto),
    );
  });
  const customerSupportDto = (ticket: {
    id: string;
    number: string;
    subject: string;
    priority: string;
    status: string;
    createdAt: string | Date;
    updatedAt?: string | Date;
    messages: Array<{
      id: string;
      body: string;
      internal: boolean;
      createdAt: string | Date;
    }>;
  }) => ({
    id: ticket.id,
    number: ticket.number,
    subject: ticket.subject,
    priority: ticket.priority,
    status: ticket.status,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt || ticket.createdAt,
    messages: ticket.messages
      .filter((message) => !message.internal)
      .slice(-200)
      .sort(
        (left, right) =>
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      )
      .map((message) => ({
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
      })),
  });
  app.post(
    "/api/v1/account/support",
    auth,
    validate(supportTicketSchema),
    async (req, res) => {
      if (persistence)
        return ok(
          res,
          customerSupportDto(
            await persistence.createSupportTicket(req.principal!.sub, req.body),
          ),
          "Support ticket created",
          201,
        );
      const createdAt = new Date().toISOString(),
        ticket = {
          id: crypto.randomUUID(),
          number: `SUP-${Date.now().toString(36).toUpperCase()}-${crypto
            .randomBytes(3)
            .toString("hex")
            .toUpperCase()}`,
          userId: req.principal!.sub,
          subject: req.body.subject,
          priority: req.body.priority,
          status: "OPEN",
          createdAt,
          messages: [
            {
              id: crypto.randomUUID(),
              authorId: req.principal!.sub,
              body: req.body.message,
              internal: false,
              createdAt,
            },
          ],
        };
      store.supportTickets.set(ticket.id, ticket);
      return ok(res, customerSupportDto(ticket), "Support ticket created", 201);
    },
  );
  app.get("/api/v1/account/support", auth, async (req, res) =>
    ok(
      res,
      persistence
        ? (await persistence.listSupportTickets(req.principal!.sub)).map(
            customerSupportDto,
          )
        : [...store.supportTickets.values()]
            .filter((ticket) => ticket.userId === req.principal!.sub)
            .sort((left, right) =>
              String(right.updatedAt || right.createdAt).localeCompare(
                String(left.updatedAt || left.createdAt),
              ),
            )
            .slice(0, 50)
            .map(customerSupportDto),
    ),
  );
  app.post(
    "/api/v1/account/support/:id/replies",
    auth,
    validate(customerSupportReplySchema),
    async (req, res) => {
      if (persistence)
        return ok(
          res,
          customerSupportDto(
            await persistence.replySupportTicket(
              String(req.params.id),
              req.principal!.sub,
              req.body.message,
              undefined,
              req.principal!.sub,
            ),
          ),
          "Reply added",
          201,
        );
      const ticket = store.supportTickets.get(String(req.params.id));
      if (!ticket || ticket.userId !== req.principal!.sub)
        throw new AppError(404, "TICKET_NOT_FOUND", "Support ticket not found");
      const repliedAt = new Date().toISOString();
      ticket.messages.push({
        id: crypto.randomUUID(),
        authorId: req.principal!.sub,
        body: req.body.message,
        internal: false,
        createdAt: repliedAt,
      });
      ticket.status = "OPEN";
      ticket.updatedAt = repliedAt;
      return ok(res, customerSupportDto(ticket), "Reply added", 201);
    },
  );
  app.get(
    "/api/v1/admin/orders",
    auth,
    authorize("orders:read"),
    async (req, res) => {
      const parsePositiveInteger = (
        value: unknown,
        fallback: number,
        maximum: number,
        name: string,
      ) => {
        if (value === undefined) return fallback;
        const raw = String(value);
        if (!/^\d+$/.test(raw))
          throw new AppError(400, "INVALID_PAGINATION", `${name} must be a positive integer`);
        const parsed = Number(raw);
        if (parsed < 1 || parsed > maximum)
          throw new AppError(400, "INVALID_PAGINATION", `${name} must be between 1 and ${maximum}`);
        return parsed;
      };
      const page = parsePositiveInteger(req.query.page, 1, 1_000, "page");
      const pageSize = parsePositiveInteger(req.query.pageSize, 20, 100, "pageSize");
      const search = String(req.query.search || "").trim();
      if (search.length > 120)
        throw new AppError(400, "INVALID_SEARCH", "Order search cannot exceed 120 characters");
      const requestedStatus = String(req.query.status || "").trim().toUpperCase();
      const allowedStatuses = new Set([
        "PENDING",
        "PAYMENT_PENDING",
        "PAID",
        "CONFIRMED",
        "PROCESSING",
        "PACKED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
        "RETURN_REQUESTED",
        "RETURN_APPROVED",
        "RETURNED",
        "REFUND_PENDING",
        "REFUNDED",
        "FAILED",
      ]);
      if (requestedStatus && !allowedStatuses.has(requestedStatus))
        throw new AppError(400, "INVALID_ORDER_STATUS", "Unknown order status filter");

      const allOrders = persistence ? [] : [...store.orders.values()];
      const matches = (order: (typeof allOrders)[number]) => {
        if (requestedStatus && order.status !== requestedStatus) return false;
        if (!search) return true;
        const query = search.toLowerCase();
        const customer = order.userId ? store.users.get(order.userId) : undefined;
        const contact = order.invoiceSnapshot?.contact;
        return [
          order.number,
          customer?.name,
          customer?.email,
          customer?.mobile,
          contact?.name,
          contact?.email,
          contact?.phone,
          ...order.lines.flatMap((line) => [line.name, line.sku]),
        ].some((value) => String(value || "").toLowerCase().includes(query));
      };
      const memoryFiltered = persistence
        ? []
        : allOrders
            .filter(matches)
            .sort(
              (left, right) =>
                right.createdAt.localeCompare(left.createdAt) ||
                right.id.localeCompare(left.id),
            );
      const persisted = persistence
        ? await persistence.listAdminOrdersPage({
            page,
            pageSize,
            search: search || undefined,
            status: requestedStatus
              ? (requestedStatus as Parameters<PrismaPersistence["listAdminOrdersPage"]>[0]["status"])
              : undefined,
          })
        : null;
      const selectedOrders = persisted
        ? persisted.orders
        : memoryFiltered.slice((page - 1) * pageSize, page * pageSize);
      for (const order of selectedOrders) store.orders.set(order.id, order);
      const filteredTotal = persisted?.filteredTotal ?? memoryFiltered.length;
      const terminalStatuses = new Set(["CANCELLED", "FAILED", "REFUNDED"]);
      const summary =
        persisted?.summary ||
        {
          totalOrders: allOrders.length,
          activeCount: allOrders.filter((order) => !terminalStatuses.has(order.status)).length,
          readyToShip: allOrders.filter((order) => order.status === "PACKED").length,
          orderValue: allOrders
            .filter((order) => !["CANCELLED", "FAILED"].includes(order.status))
            .reduce((total, order) => total + order.total, 0),
          currency: "INR",
        };
      return ok(
        res,
        {
          items: selectedOrders.map((order) =>
            adminOrderDto(
              order,
              order.userId ? store.users.get(order.userId) : undefined,
            ),
          ),
          pagination: {
            page,
            pageSize,
            total: filteredTotal,
            totalPages: Math.max(1, Math.ceil(filteredTotal / pageSize)),
          },
          summary,
        },
      );
    },
  );
  app.get(
    "/api/v1/admin/payments",
    auth,
    authorize("payments:read"),
    async (_req, res) =>
      ok(
        res,
        persistence
          ? await persistence.listPayments()
          : [...store.orders.values()]
              .filter((order) => order.payment)
              .map((order) => ({
                orderNumber: order.number,
                amount: order.total,
                currency: "INR",
                ...order.payment,
              })),
      ),
  );
  app.post(
    "/api/v1/admin/payments/reconcile",
    auth,
    authorize("payments:read"),
    validate(paymentReconcileSchema),
    async (req, res) => {
      if (!persistence)
        throw new AppError(
          503,
          "DATABASE_REQUIRED",
          "Payment reconciliation requires persistent payment records",
        );
      const payments = await persistence.listPayments(),
        payment = payments.find((item) => item.id === req.body.paymentId);
      if (!payment?.externalId)
        throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment was not found");
      const gateway = await resolvePaymentProvider(payment.provider),
        status = await gateway.lookup(payment.externalId),
        result = await persistence.reconcilePayment(payment.id, status);
      const order = [...store.orders.values()].find(
        (item) => item.number === result.orderNumber,
      );
      if (
        order &&
        status.status === "CAPTURED" &&
        order.status === "PAYMENT_PENDING"
      )
        store.transitionOrder(
          order.id,
          "PAID",
          req.principal!.sub,
          "RECONCILIATION",
        );
      return ok(res, result, "Payment reconciled");
    },
  );
  app.get(
    "/api/v1/admin/customers",
    auth,
    authorize("customers:read"),
    validate(adminCustomerQuerySchema, "query"),
    async (req, res) =>
      ok(
        res,
        persistence
          ? await persistence.listAdminCustomersPage(req.query as never)
          : listAdminCustomers(
              [...store.users.values()],
              [...store.orders.values()],
              req.query as never,
            ),
      ),
  );
  app.get(
    "/api/v1/admin/customer-segments",
    auth,
    authorize("customers:read"),
    async (_req, res) =>
      ok(
        res,
        persistence
          ? await persistence.listAdminCustomerSegments()
          : listCustomerSegments(
              [...store.users.values()],
              [...store.orders.values()],
            ),
      ),
  );
  app.get(
    "/api/v1/admin/customers/:id",
    auth,
    authorize("customers:read"),
    async (req, res) =>
      ok(
        res,
        persistence
          ? await persistence.getAdminCustomerDetail(String(req.params.id))
          : adminCustomerDetail(store, String(req.params.id)),
      ),
  );
  app.patch(
    "/api/v1/admin/customers/:id",
    auth,
    authorize("customers:update"),
    validate(adminCustomerUpdateSchema),
    async (req, res) => {
      const id = String(req.params.id);
      if (persistence) {
        const updated = await persistence.updateAdminCustomer(
          id,
          req.body,
          req.principal!.sub,
        );
        const mirror = store.users.get(id);
        if (mirror?.role === "CUSTOMER") {
          mirror.tags = updated.tags;
          mirror.note = updated.note || undefined;
          mirror.marketingConsent = updated.marketingConsent;
          mirror.marketingConsentUpdatedAt =
            updated.marketingConsentUpdatedAt?.toISOString();
          mirror.disabledAt = updated.disabledAt?.toISOString();
          mirror.authVersion = updated.authVersion;
          mirror.updatedAt = updated.updatedAt.toISOString();
        }
        if (req.body.accountStatus === "DISABLED")
          for (const [sessionId, session] of store.sessions)
            if (session.userId === id) store.sessions.delete(sessionId);
        return ok(
          res,
          await persistence.getAdminCustomerDetail(id),
          "Customer updated",
        );
      }
      const user = store.users.get(id);
      if (!user || user.role !== "CUSTOMER")
        throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
      const before = {
        tags: [...(user.tags || [])],
        notePresent: Boolean(user.note),
        marketingConsent: Boolean(user.marketingConsent),
        accountStatus: user.disabledAt ? "DISABLED" : "ACTIVE",
      };
      const now = new Date().toISOString();
      if (req.body.tags !== undefined)
        user.tags = normalizeCustomerTags(req.body.tags);
      if (req.body.note !== undefined)
        user.note = req.body.note || undefined;
      if (req.body.marketingConsent !== undefined) {
        const changed = user.marketingConsent !== req.body.marketingConsent;
        user.marketingConsent = req.body.marketingConsent;
        if (changed)
          user.marketingConsentUpdatedAt =
            now;
      }
      if (req.body.accountStatus !== undefined)
        user.disabledAt = req.body.accountStatus === "DISABLED" ? now : undefined;
      if (
        req.body.accountStatus === "DISABLED" &&
        before.accountStatus === "ACTIVE"
      )
        user.authVersion = (user.authVersion || 0) + 1;
      user.updatedAt = now;
      if (req.body.accountStatus === "DISABLED")
        for (const [sessionId, session] of store.sessions)
          if (session.userId === id) store.sessions.delete(sessionId);
      store.auditLogs.push({
          id: crypto.randomUUID(),
          actor: req.principal!.sub,
          action: "customer.updated",
          resource: "customer",
          resourceId: id,
          before,
          after: {
            tags: user.tags || [],
            notePresent: Boolean(user.note),
            marketingConsent: Boolean(user.marketingConsent),
            accountStatus: user.disabledAt ? "DISABLED" : "ACTIVE",
          },
          createdAt: now,
        });
      return ok(
        res,
        adminCustomerDetail(store, id),
        "Customer updated",
      );
    },
  );
  app.get(
    "/api/v1/admin/inventory",
    auth,
    authorize("inventory:read"),
    (req, res) => {
      const lowStockValue = String(req.query.lowStock || "").toLowerCase();
      if (lowStockValue && !["true", "false"].includes(lowStockValue))
        throw new AppError(400, "INVALID_QUERY", "lowStock must be true or false");
      return ok(
        res,
        listAdminInventory(store.listProducts(), {
          search: String(req.query.search || "").slice(0, 200),
          productId: String(req.query.productId || "").slice(0, 100),
          lowStock: lowStockValue === "true",
          page: queryInteger(req.query.page, 1, 1, 1000),
          limit: queryInteger(req.query.limit, 25, 1, 100),
        }),
      );
    },
  );
  app.get(
    "/api/v1/admin/inventory/:variantId/movements",
    auth,
    authorize("inventory:read"),
    async (req, res) => {
      const variantId = String(req.params.variantId);
      store.getVariant(variantId);
      const page = queryInteger(req.query.page, 1, 1, 1000);
      const limit = queryInteger(req.query.limit, 25, 1, 100);
      const movements = persistence
        ? (await persistence.listInventoryMovements(variantId)).map(
            (movement) => ({
              id: movement.id,
              quantity: movement.quantity,
              reason: movement.reason,
              referenceId: movement.referenceId || undefined,
              createdAt: movement.createdAt.toISOString(),
            }),
          )
        : (store.inventoryMovements.get(variantId) || []).map((movement) => ({
            id: movement.id,
            quantity: movement.quantity,
            reason: movement.reason,
            referenceId: movement.referenceId,
            createdAt: movement.createdAt,
          }));
      return ok(res, {
        variantId,
        ...paginatedMovements(movements, page, limit),
      });
    },
  );
  app.patch(
    "/api/v1/admin/inventory/:variantId",
    auth,
    authorize("inventory:update"),
    validate(inventoryAdjustmentSchema),
    async (req, res) => {
      const variantId = String(req.params.variantId);
      const { variant } = store.getVariant(variantId);
      const key = String(req.headers["idempotency-key"] || "");
      if (key.length < 8 || key.length > 100)
        throw new AppError(
          400,
          "IDEMPOTENCY_KEY_REQUIRED",
          "A valid Idempotency-Key header is required",
        );
      const operationKey = `inventory:${key}`;
      let movement:
        | {
            id: string;
            quantity: number;
            reason: string;
            referenceId?: string | null;
            createdAt: Date | string;
          }
        | undefined;
      let replayed = false;
      if (persistence) {
        const result = await persistence.adjustInventory(
            variant.id,
            req.body.quantity,
            req.body.reason,
            req.principal!.sub,
            operationKey,
          );
        variant.stock = result.inventory.onHand;
        movement = result.movement;
        replayed = result.replayed;
      } else {
        const result = store.adjustInventory(
            variant.id,
            req.body.quantity,
            req.body.reason,
            operationKey,
            req.principal!.sub,
          );
        movement = result.movement;
        replayed = result.replayed;
      }
      return ok(
        res,
        {
          inventory: {
            variantId: variant.id,
            onHand: variant.stock,
            reserved: variant.reserved,
            available: variant.stock - variant.reserved,
            lowStockAt: 5,
            lowStock: variant.stock - variant.reserved <= 5,
          },
          movement: {
            id: movement.id,
            quantity: movement.quantity,
            reason: movement.reason,
            referenceId: movement.referenceId || undefined,
            createdAt:
              movement.createdAt instanceof Date
                ? movement.createdAt.toISOString()
                : movement.createdAt,
          },
          replayed,
        },
        replayed ? "Inventory adjustment replayed" : "Inventory adjusted",
      );
    },
  );
  app.get(
    "/api/v1/admin/analytics",
    auth,
    authorize("analytics:read"),
    (_req, res) => {
      const orders = [...store.orders.values()],
        completed = orders.filter(
          (order) => !["CANCELLED", "FAILED"].includes(order.status),
        );
      const revenue = completed.reduce((sum, order) => sum + order.total, 0);
      return ok(res, {
        revenue,
        orders: orders.length,
        averageOrderValue: completed.length
          ? Math.round((revenue / completed.length) * 100) / 100
          : 0,
        customers: [...store.users.values()].filter(
          (user) => user.role === "CUSTOMER",
        ).length,
        failedOrders: orders.filter((order) => order.status === "FAILED")
          .length,
        refunds: orders.filter((order) => order.status === "REFUNDED").length,
      });
    },
  );
  app.get(
    "/api/v1/admin/returns",
    auth,
    authorize("returns:read"),
    validate(adminReturnQuerySchema, "query"),
    async (req, res) =>
      ok(
        res,
        persistence
          ? await persistence.listAdminReturnsPage(req.query as never)
          : listAdminReturns(store, req.query as never),
      ),
  );
  app.get(
    "/api/v1/admin/returns/:id",
    auth,
    authorize("returns:read"),
    async (req, res) =>
      ok(
        res,
        persistence
          ? await persistence.getAdminReturnDetail(String(req.params.id))
          : adminReturnDetail(store, String(req.params.id)),
      ),
  );
  app.patch(
    "/api/v1/admin/returns/:id",
    auth,
    authorize("returns:update"),
    validate(returnDecisionSchema),
    async (req, res) => {
      const id = String(req.params.id);
      if (persistence) {
        const decided = await persistence.decideReturn(
          id,
          req.body.status,
          req.body.notes,
          req.principal!.sub,
        );
        if (decided) {
          await persistence.refreshOrder(store, decided.orderId);
          const mirror = store.returns.get(id);
          if (mirror) {
            mirror.status = decided.status;
            mirror.notes = decided.notes || undefined;
            mirror.updatedAt = decided.updatedAt.toISOString();
          }
        }
        return ok(
          res,
          await persistence.getAdminReturnDetail(id),
          `Return ${req.body.status.toLowerCase()}`,
        );
      }
      const item = store.returns.get(id);
      if (!item)
        throw new AppError(404, "RETURN_NOT_FOUND", "Return request not found");
      const receiving = req.body.status === "RECEIVED";
      const expectedReturnStatus = receiving ? "APPROVED" : "REQUESTED";
      if (item.status !== expectedReturnStatus)
        throw new AppError(
          409,
          receiving ? "RETURN_NOT_APPROVED" : "RETURN_ALREADY_DECIDED",
          receiving
            ? "Only an approved return can be marked received"
            : "Return request is no longer pending",
        );
      const before = item.status;
      const order = store.orders.get(item.orderId);
      if (!order)
        throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
      store.transitionOrder(
        order.id,
        receiving
          ? "RETURNED"
          : req.body.status === "APPROVED"
            ? "RETURN_APPROVED"
            : "DELIVERED",
        req.principal!.sub,
        "ADMIN",
      );
      item.status = req.body.status;
      item.notes = req.body.notes;
      item.updatedAt = new Date().toISOString();
      store.auditLogs.push({
          id: crypto.randomUUID(),
          actor: req.principal!.sub,
          action: "return.decided",
          resource: "return_request",
          resourceId: id,
          before: { status: before },
          after: { status: item.status, notesPresent: Boolean(item.notes) },
          createdAt: item.updatedAt,
        });
      return ok(
        res,
        adminReturnDetail(store, id),
        `Return ${req.body.status.toLowerCase()}`,
      );
    },
  );
  app.get(
    "/api/v1/admin/reviews",
    auth,
    authorize("reviews:read"),
    validate(adminReviewQuerySchema, "query"),
    async (req, res) =>
      ok(
        res,
        persistence
          ? await persistence.listAdminReviewsPage(req.query as never)
          : listAdminReviews(store, req.query as never),
      ),
  );
  app.get(
    "/api/v1/admin/reviews/:id",
    auth,
    authorize("reviews:read"),
    async (req, res) =>
      ok(
        res,
        persistence
          ? await persistence.getAdminReviewDetail(String(req.params.id))
          : adminReviewDetail(store, String(req.params.id)),
      ),
  );
  app.patch(
    "/api/v1/admin/reviews/:id",
    auth,
    authorize("reviews:update"),
    validate(reviewModerationSchema),
    async (req, res) => {
      const id = String(req.params.id);
      if (persistence) {
        await persistence.moderateReview(
          id,
          req.body.status,
          req.principal!.sub,
        );
        return ok(
          res,
          await persistence.getAdminReviewDetail(id),
          "Review moderated",
        );
      }
      const review = store.reviews.get(id);
      if (!review)
        throw new AppError(404, "REVIEW_NOT_FOUND", "Review not found");
      const before = review.status;
      review.status = req.body.status;
      store.auditLogs.push({
        id: crypto.randomUUID(),
        actor: req.principal!.sub,
        action: "review.moderated",
        resource: "review",
        resourceId: id,
        before: { status: before },
        after: { status: review.status },
        createdAt: new Date().toISOString(),
      });
      return ok(res, adminReviewDetail(store, id), "Review moderated");
    },
  );
  app.get(
    "/api/v1/admin/support",
    auth,
    authorize("support:read"),
    validate(adminSupportQuerySchema, "query"),
    async (req, res) =>
      ok(
        res,
        persistence
          ? await persistence.listAdminSupportPage(req.query as never)
          : listAdminSupportTickets(store, req.query as never),
      ),
  );
  app.get(
    "/api/v1/admin/support/:id",
    auth,
    authorize("support:read"),
    async (req, res) =>
      ok(
        res,
        persistence
          ? await persistence.getAdminSupportDetail(String(req.params.id))
          : adminSupportDetail(store, String(req.params.id)),
      ),
  );
  app.post(
    "/api/v1/admin/support/:id/replies",
    auth,
    authorize("support:update"),
    validate(supportReplySchema),
    async (req, res) => {
      const id = String(req.params.id);
      if (persistence) {
        await persistence.replySupportTicket(
          id,
          req.principal!.sub,
          req.body.message,
          req.body.status,
        );
        return ok(
          res,
          await persistence.getAdminSupportDetail(id),
          "Reply added",
          201,
        );
      }
      const ticket = store.supportTickets.get(id);
      if (!ticket)
        throw new AppError(404, "TICKET_NOT_FOUND", "Support ticket not found");
      const now = new Date().toISOString();
      ticket.messages.push({
        id: crypto.randomUUID(),
        authorId: req.principal!.sub,
        body: req.body.message,
        internal: false,
        createdAt: now,
      });
      ticket.status = req.body.status || "WAITING_CUSTOMER";
      ticket.updatedAt = now;
      store.auditLogs.push({
        id: crypto.randomUUID(),
        actor: req.principal!.sub,
        action: "support.replied",
        resource: "support_ticket",
        resourceId: id,
        after: { status: ticket.status, internal: false },
        createdAt: now,
      });
      return ok(res, adminSupportDetail(store, id), "Reply added", 201);
    },
  );
  app.post(
    "/api/v1/admin/support/:id/internal-notes",
    auth,
    authorize("support:update"),
    validate(supportInternalNoteSchema),
    async (req, res) => {
      const id = String(req.params.id);
      if (persistence) {
        await persistence.replySupportTicket(
          id,
          req.principal!.sub,
          req.body.message,
          undefined,
          undefined,
          true,
        );
        return ok(
          res,
          await persistence.getAdminSupportDetail(id),
          "Internal note added",
          201,
        );
      }
      const ticket = store.supportTickets.get(id);
      if (!ticket)
        throw new AppError(404, "TICKET_NOT_FOUND", "Support ticket not found");
      const now = new Date().toISOString();
      ticket.messages.push({
        id: crypto.randomUUID(),
        authorId: req.principal!.sub,
        body: req.body.message,
        internal: true,
        createdAt: now,
      });
      ticket.updatedAt = now;
      store.auditLogs.push({
        id: crypto.randomUUID(),
        actor: req.principal!.sub,
        action: "support.internal_note_added",
        resource: "support_ticket",
        resourceId: id,
        after: { status: ticket.status, internal: true },
        createdAt: now,
      });
      return ok(res, adminSupportDetail(store, id), "Internal note added", 201);
    },
  );
  app.patch(
    "/api/v1/admin/support/:id",
    auth,
    authorize("support:update"),
    validate(supportUpdateSchema),
    async (req, res) => {
      const id = String(req.params.id);
      if (persistence) {
        await persistence.updateSupportTicket(id, req.body, req.principal!.sub);
        return ok(
          res,
          await persistence.getAdminSupportDetail(id),
          "Support ticket updated",
        );
      }
      const ticket = store.supportTickets.get(id);
      if (!ticket)
        throw new AppError(404, "TICKET_NOT_FOUND", "Support ticket not found");
      const before = { status: ticket.status, priority: ticket.priority };
      if (req.body.status) ticket.status = req.body.status;
      if (req.body.priority) ticket.priority = req.body.priority;
      ticket.updatedAt = new Date().toISOString();
      store.auditLogs.push({
        id: crypto.randomUUID(),
        actor: req.principal!.sub,
        action: "support.updated",
        resource: "support_ticket",
        resourceId: id,
        before,
        after: { status: ticket.status, priority: ticket.priority },
        createdAt: ticket.updatedAt,
      });
      return ok(res, adminSupportDetail(store, id), "Support ticket updated");
    },
  );
  app.post(
    "/api/v1/admin/orders/:id/refunds",
    auth,
    authorize("orders:refund"),
    validate(refundSchema),
    async (req, res) => {
      const orderId = String(req.params.id);
      const order = store.orders.get(orderId);
      if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
      const key = String(req.headers["idempotency-key"] || "");
      if (key.length < 8 || key.length > 100)
        throw new AppError(
          400,
          "IDEMPOTENCY_KEY_REQUIRED",
          "A valid Idempotency-Key header is required",
        );
      const operationKey = `refund:${order.id}:${key}`;
      const reservation = persistence
          ? await persistence.beginRefund(
            order.id,
            req.body.amount,
            operationKey,
            req.body.reason,
            req.principal!.sub,
            req.body.returnRequestId,
          )
        : store.beginRefund(
            order.id,
            req.body.amount,
            operationKey,
            req.body.reason,
            req.principal!.sub,
            req.body.returnRequestId,
          );
      const operationResponse = async () => {
        await persistence?.refreshOrder(store, orderId);
        const current = store.orders.get(orderId);
        if (!current)
          throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
        const dto = adminOrderDto(
          current,
          current.userId ? store.users.get(current.userId) : undefined,
        );
        const refund = dto.payment.refunds.find(
          (item) => item.id === reservation.refund.id,
        );
        if (!refund)
          throw new AppError(404, "REFUND_NOT_FOUND", "Refund was not found");
        return {
          refund,
          payment: {
            status: dto.payment.status,
            refundedAmount: dto.payment.refundedAmount,
            refundableAmount: dto.payment.refundableAmount,
          },
        };
      };
      if (!reservation.process)
        return ok(res, await operationResponse(), "Existing refund returned");
      let result: { refundId: string };
      try {
        result = await resolvePaymentProvider(
          reservation.provider!,
        ).refund({
          paymentId: reservation.externalId!,
          amount: {
            amount: req.body.amount,
            currency: order.payment?.currency || "INR",
          },
          idempotencyKey: operationKey,
        });
      } catch (error) {
        const details =
          error instanceof AppError && error.details
            ? (error.details as Record<string, unknown>)
            : {};
        const definitiveRejection =
          error instanceof AppError &&
          (error.code === "PAYMENT_NOT_CONFIGURED" ||
            (error.code === "PAYMENT_PROVIDER_ERROR" &&
              details.retryable === false));
        if (definitiveRejection) {
          try {
            if (persistence) await persistence.failRefund(reservation.refund.id);
            else store.failRefund(order.id, reservation.refund.id);
          } catch {
            // Leaving the refund PENDING is safer than releasing its reserved
            // capacity when failure-state persistence is unavailable.
          }
        }
        // Timeouts, 5xx responses and malformed success responses are
        // ambiguous: the provider may already have accepted the refund. Keep
        // the reservation PENDING and retry only with this same operation key.
        throw error;
      }
      if (persistence)
        await persistence.completeRefund(
          reservation.refund.id,
          result.refundId,
          req.principal!.sub,
        );
      else
        store.completeRefund(
          order.id,
          reservation.refund.id,
          result.refundId,
          req.principal!.sub,
        );
      return ok(
        res,
        await operationResponse(),
        reservation.duplicate ? "Refund retry processed" : "Refund processed",
        reservation.duplicate ? 200 : 201,
      );
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
      if (["PAID", "REFUND_PENDING", "REFUNDED"].includes(req.body.status))
        throw new AppError(
          409,
          "PAYMENT_STATE_MANAGED_EXTERNALLY",
          "Payment and refund states can only be changed by verified payment workflows",
        );
      assertOrderTransition(order.status, req.body.status);
      await persistence?.transitionOrder(
        id,
        order.status,
        req.body.status,
        req.principal!.sub,
      );
      const updated = store.transitionOrder(
        id,
        req.body.status,
        req.principal!.sub,
      );
      return ok(
        res,
        adminOrderDto(
          updated,
          updated.userId ? store.users.get(updated.userId) : undefined,
        ),
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
        const selectedShipping = resolveShippingProvider(
          order.shippingSelection?.provider,
        );
        const shipmentContext = persistence
          ? await persistence.shipmentContext(order.id)
          : {};
        const result = await selectedShipping.provider.createShipment({
          orderId: order.id,
          service:
            order.shippingSelection?.service ||
            String(req.body?.service || "STANDARD"),
          idempotencyKey: `ship:${order.id}`,
          ...shipmentContext,
        });
        const persistedShipment = await persistence?.saveShipment(
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
        order.shipment = {
          id: persistedShipment?.id || result.shipmentId,
          provider: selectedShipping.name,
          externalId: result.shipmentId,
          awb: result.awb,
          trackingUrl:
            "trackingUrl" in result &&
            typeof result.trackingUrl === "string"
              ? result.trackingUrl
              : undefined,
          status: "SHIPPED",
          createdAt:
            persistedShipment?.createdAt.toISOString() ||
            new Date().toISOString(),
          events: [],
        };
        const updated = store.transitionOrder(
          order.id,
          "SHIPPED",
          req.principal!.sub,
          "SHIPPING",
        );
        const dto = adminOrderDto(
          updated,
          updated.userId ? store.users.get(updated.userId) : undefined,
        );
        return ok(
          res,
          { shipment: dto.shipping.shipment, order: dto },
          "Shipment created",
          201,
        );
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
  const integrationMatches = (
    kind: string,
    provider: string,
    environment: "TEST" | "LIVE",
  ) => {
    const normalized = normalizeProvider(provider);
    return [...store.integrations.values()]
      .filter(
        (entry) =>
          entry.kind === kind &&
          entry.environment === environment &&
          normalizeProvider(entry.provider) === normalized,
      )
      .sort(
        (left, right) =>
          Number(right.provider === normalized) -
            Number(left.provider === normalized) ||
          right.updatedAt.localeCompare(left.updatedAt) ||
          left.id.localeCompare(right.id),
      );
  };
  const decryptIntegration = (record?: StoredIntegration) => {
    if (!record) return { credentials: {} as Record<string, string> };
    try {
      const value = vault.decrypt<unknown>(record.encryptedCredentials);
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("Credentials are not an object");
      return {
        credentials: Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .filter(([, secret]) => typeof secret === "string")
            .map(([key, secret]) => [key, secret as string]),
        ),
      };
    } catch {
      return {
        credentials: {} as Record<string, string>,
        unreadable: true,
      };
    }
  };
  const integrationAuditSnapshot = (
    record: StoredIntegration,
    credentialKeys: string[],
  ) => {
    const definition = integrationDefinition(record.kind, record.provider);
    return {
      kind: record.kind,
      provider: record.provider,
      enabled: record.enabled,
      priority: record.priority,
      environment: record.environment,
      publicConfig: definition
        ? providerPublicConfig(definition, record.publicConfig)
        : {},
      configuredCredentialKeys: credentialKeys.sort(),
    };
  };
  const pushIntegrationAudit = (
    action: string,
    record: StoredIntegration,
    actorId: string,
    before: Record<string, unknown> | undefined,
    after: Record<string, unknown>,
  ) =>
    store.auditLogs.unshift({
      id: crypto.randomUUID(),
      action,
      resource: "integration",
      resourceId: record.id,
      actorId,
      before,
      after,
      createdAt: new Date().toISOString(),
    });
  app.get(
    "/api/v1/admin/integrations",
    auth,
    authorize("settings:read"),
    (req, res) => {
      const requestedEnvironment = String(
        req.query.environment || runtimeEnvironment(config.NODE_ENV),
      ).toUpperCase();
      if (!(["TEST", "LIVE"] as const).includes(requestedEnvironment as never))
        throw new AppError(
          400,
          "INTEGRATION_ENVIRONMENT_INVALID",
          "Integration environment must be TEST or LIVE",
        );
      const environment = requestedEnvironment as "TEST" | "LIVE";
      const requestedKind = req.query.kind
        ? String(req.query.kind).toUpperCase()
        : undefined;
      if (
        requestedKind &&
        !integrationDefinitions.some(
          (definition) => definition.kind === requestedKind,
        )
      )
        throw new AppError(
          400,
          "INTEGRATION_KIND_INVALID",
          "Unknown integration kind",
        );
      const items = integrationDefinitions
        .filter(
          (definition) => !requestedKind || definition.kind === requestedKind,
        )
        .map((definition) => {
          const record = integrationMatches(
            definition.kind,
            definition.provider,
            environment,
          )[0];
          const { credentials } = decryptIntegration(record);
          return integrationDto({
            definition,
            environment,
            record,
            credentials,
            mask: (value) => vault.mask(value),
          });
        });
      return ok(res, { items, environment });
    },
  );
  app.put(
    "/api/v1/admin/integrations",
    auth,
    authorize("settings:update"),
    validate(integrationSchema),
    async (req, res) => {
      const provider = normalizeProvider(req.body.provider);
      const definition = integrationDefinition(req.body.kind, provider);
      if (!definition)
        throw new AppError(
          422,
          "INTEGRATION_PROVIDER_UNSUPPORTED",
          "This provider is not supported for the selected integration kind",
        );
      const environment = req.body.environment as "TEST" | "LIVE";
      const matches = integrationMatches(
        definition.kind,
        provider,
        environment,
      );
      const existing = matches[0];
      const existingState = decryptIntegration(existing);
      const suppliedCredentials = (req.body.credentials || {}) as Record<
        string,
        string
      >;
      const allowedCredentialKeys = new Set(
        definition.credentialFields.map((field) => field.key),
      );
      const unknownCredentialKeys = Object.keys(suppliedCredentials).filter(
        (key) => !allowedCredentialKeys.has(key),
      );
      if (unknownCredentialKeys.length)
        throw new AppError(
          400,
          "INTEGRATION_CREDENTIAL_FIELD_INVALID",
          "Unknown credential fields were supplied",
          { fields: unknownCredentialKeys.sort() },
        );
      const usableSuppliedCredentials = Object.fromEntries(
        Object.entries(suppliedCredentials).filter(([, value]) =>
          Boolean(value.trim()),
        ),
      );
      const suppliedRequiredCredentials = definition.credentialFields
        .filter((field) => field.required)
        .every((field) => Boolean(usableSuppliedCredentials[field.key]));
      if (
        existingState.unreadable &&
        !suppliedRequiredCredentials
      )
        throw new AppError(
          409,
          "INTEGRATION_CREDENTIALS_UNREADABLE",
          "Stored credentials cannot be preserved; disconnect or replace all required credentials",
        );
      const credentials = {
        ...(existingState.unreadable ? {} : existingState.credentials),
        ...usableSuppliedCredentials,
      };
      const suppliedPublicConfig = (req.body.publicConfig || {}) as Record<
        string,
        unknown
      >;
      const publicFields = new Map(
        definition.publicFields.map((field) => [field.key, field]),
      );
      const unknownPublicFields = Object.keys(suppliedPublicConfig).filter(
        (key) => !publicFields.has(key),
      );
      if (unknownPublicFields.length)
        throw new AppError(
          400,
          "INTEGRATION_PUBLIC_FIELD_INVALID",
          "Unknown public configuration fields were supplied",
          { fields: unknownPublicFields.sort() },
        );
      const publicConfigCandidate: Record<string, unknown> = {
        ...(definition.defaults || {}),
        ...providerPublicConfig(definition, existing?.publicConfig || {}),
      };
      for (const [key, value] of Object.entries(suppliedPublicConfig)) {
        if (typeof value === "string" && !value.trim())
          delete publicConfigCandidate[key];
        else publicConfigCandidate[key] = value;
      }
      let publicConfig: Record<string, unknown>;
      try {
        publicConfig = parsePublicConfig(definition, publicConfigCandidate);
      } catch (error) {
        throw new AppError(
          400,
          "INTEGRATION_CONFIG_INVALID",
          "Provider configuration is invalid",
          typeof (error as { flatten?: unknown }).flatten === "function"
            ? (error as { flatten: () => unknown }).flatten()
            : undefined,
        );
      }
      if (req.body.enabled && !definition.liveOperations)
        throw new AppError(
          422,
          "INTEGRATION_PROVIDER_UNAVAILABLE",
          "This provider does not have a live server adapter yet",
        );
      if (
        req.body.enabled &&
        !integrationConfigured(definition, credentials, publicConfig)
      )
        throw new AppError(
          422,
          "INTEGRATION_CONFIGURATION_INCOMPLETE",
          "All required credentials and public settings are needed before enabling",
        );
      const credentialsChanged = Object.entries(
        usableSuppliedCredentials,
      ).some(([key, value]) => existingState.credentials[key] !== value);
      const publicConfigChanged =
        JSON.stringify(
          providerPublicConfig(definition, existing?.publicConfig || {}),
        ) !==
        JSON.stringify(publicConfig);
      const connection =
        existing && !credentialsChanged && !publicConfigChanged
          ? existing.publicConfig._connection
          : {
              outcome: "UNTESTED" satisfies IntegrationOutcome,
              message: "Connection has not been tested with this configuration.",
            };
      const record: StoredIntegration = {
        id: `${definition.kind}:${provider}:${environment}`,
        kind: definition.kind,
        provider,
        enabled: req.body.enabled,
        priority: req.body.priority,
        environment,
        encryptedCredentials: vault.encrypt(credentials),
        publicConfig: {
          ...publicConfig,
          ...(connection ? { _connection: connection } : {}),
        },
        updatedAt: new Date().toISOString(),
      };
      const before = existing
        ? integrationAuditSnapshot(
            existing,
            Object.keys(existingState.credentials),
          )
        : undefined;
      const after = integrationAuditSnapshot(record, Object.keys(credentials));
      await persistence?.saveIntegration(record, {
        actorId: req.principal!.sub,
        action: "integration.saved",
        before,
        after,
        removeIds: matches.map((entry) => entry.id),
      });
      for (const item of matches) store.integrations.delete(item.id);
      store.integrations.set(record.id, record);
      pushIntegrationAudit(
        "integration.saved",
        record,
        req.principal!.sub,
        before,
        after,
      );
      return ok(
        res,
        integrationDto({
          definition,
          environment,
          record,
          credentials,
          mask: (value) => vault.mask(value),
        }),
        "Integration saved",
      );
    },
  );
  app.post(
    "/api/v1/admin/integrations/:id/test",
    auth,
    authorize("settings:update"),
    limiter(10, 60_000),
    async (req, res) => {
      const existing = store.integrations.get(String(req.params.id));
      if (!existing)
        throw new AppError(
          404,
          "INTEGRATION_NOT_FOUND",
          "Integration configuration was not found",
        );
      const definition = integrationDefinition(
        existing.kind,
        existing.provider,
      );
      if (!definition)
        throw new AppError(
          422,
          "INTEGRATION_PROVIDER_UNSUPPORTED",
          "This provider is not supported for a connection test",
        );
      const { credentials } = decryptIntegration(existing);
      const result = await testIntegrationConnection({
        definition,
        credentials,
        publicConfig: providerPublicConfig(
          definition,
          existing.publicConfig,
        ),
        request: providerRequest,
      });
      const record: StoredIntegration = {
        ...existing,
        publicConfig: {
          ...providerPublicConfig(definition, existing.publicConfig),
          _connection: result,
        },
        updatedAt: new Date().toISOString(),
      };
      const before = integrationAuditSnapshot(
        existing,
        Object.keys(credentials),
      );
      const after = {
        ...integrationAuditSnapshot(record, Object.keys(credentials)),
        testOutcome: result.outcome,
      };
      await persistence?.saveIntegration(record, {
        actorId: req.principal!.sub,
        action: "integration.connection_tested",
        before,
        after,
      });
      store.integrations.set(record.id, record);
      pushIntegrationAudit(
        "integration.connection_tested",
        record,
        req.principal!.sub,
        before,
        after,
      );
      return ok(
        res,
        {
          ...integrationDto({
            definition,
            environment: record.environment as "TEST" | "LIVE",
            record,
            credentials,
            mask: (value) => vault.mask(value),
          }),
          test: result,
        },
        "Connection test completed",
      );
    },
  );
  app.post(
    "/api/v1/admin/integrations/:id/disconnect",
    auth,
    authorize("settings:update"),
    validate(integrationDisconnectSchema),
    async (req, res) => {
      const existing = store.integrations.get(String(req.params.id));
      if (!existing)
        throw new AppError(
          404,
          "INTEGRATION_NOT_FOUND",
          "Integration configuration was not found",
        );
      const definition = integrationDefinition(
        existing.kind,
        existing.provider,
      );
      if (!definition)
        throw new AppError(
          422,
          "INTEGRATION_PROVIDER_UNSUPPORTED",
          "This provider is not supported",
        );
      const testedAt = new Date().toISOString();
      const record: StoredIntegration = {
        ...existing,
        enabled: false,
        encryptedCredentials: vault.encrypt({}),
        publicConfig: {
          ...providerPublicConfig(definition, existing.publicConfig),
          _connection: {
            outcome: "DISCONNECTED" satisfies IntegrationOutcome,
            testedAt,
            message: "Credentials were deliberately removed.",
          },
        },
        updatedAt: testedAt,
      };
      const previousState = decryptIntegration(existing);
      const before = integrationAuditSnapshot(
        existing,
        Object.keys(previousState.credentials),
      );
      const after = integrationAuditSnapshot(record, []);
      await persistence?.saveIntegration(record, {
        actorId: req.principal!.sub,
        action: "integration.disconnected",
        before,
        after,
      });
      store.integrations.set(record.id, record);
      pushIntegrationAudit(
        "integration.disconnected",
        record,
        req.principal!.sub,
        before,
        after,
      );
      return ok(
        res,
        integrationDto({
          definition,
          environment: record.environment as "TEST" | "LIVE",
          record,
          credentials: {},
          mask: (value) => vault.mask(value),
        }),
        "Integration disconnected",
      );
    },
  );
  app.use(notFound);
  app.use(errorHandler);
  return { app, store, config, persistence };
}
