import { z } from "zod";
export const credentials = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  otp: z.string().regex(/^\d{6}$/).optional(),
});
export const registerSchema = credentials.extend({
  name: z.string().trim().min(2).max(100),
});
export const mobileOtpRequestSchema=z.object({mobile:z.string().regex(/^\+[1-9]\d{7,14}$/)});
export const mobileOtpVerifySchema=mobileOtpRequestSchema.extend({code:z.string().regex(/^\d{6}$/),name:z.string().trim().min(2).max(100).optional()});
export const googleLoginSchema=z.object({credential:z.string().min(100).max(10000)});
const variant = z
  .object({
    id: z.string().uuid().optional(),
    sku: z.string().trim().min(3).max(80),
    title: z.string().trim().min(1).max(120),
    active: z.boolean().default(true),
    price: z.number().positive().max(100000000),
    mrp: z.number().positive().max(100000000),
    stock: z.number().int().min(0).max(1000000),
    reserved: z.number().int().min(0).default(0),
    attributes: z.record(z.string().max(100)),
    weightGrams: z.number().int().positive().max(100000),
  })
  .refine((x) => x.mrp >= x.price, {
    message: "MRP must be greater than or equal to price",
    path: ["mrp"],
  });
export const productSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().min(10).max(20000),
  category: z.string().min(2).max(100),
  brand: z.string().max(100).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  taxRate: z.number().min(0).max(100),
  hsnCode: z
    .string()
    .regex(/^\d{4,8}$/)
    .optional(),
  specifications: z.record(z.string().max(500)).default({}),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
  media: z.array(z.object({
    id: z.string().uuid().optional(),
    url: z.string().url().max(2000),
    alt: z.string().trim().min(1).max(200),
    type: z.enum(["IMAGE", "VIDEO"]).default("IMAGE"),
    position: z.number().int().min(0).max(1000).default(0),
    variantId: z.string().uuid().optional(),
  })).max(30).optional(),
  variants: z.array(variant).min(1).max(200),
});
export const productMediaOrderSchema = z.object({
  mediaIds: z.array(z.string().uuid()).max(30),
});
export const productMediaUpdateSchema = z
  .object({
    alt: z.string().trim().min(1).max(200).optional(),
    variantId: z.string().uuid().nullable().optional(),
  })
  .refine((value) => value.alt !== undefined || value.variantId !== undefined, {
    message: "Provide an alt value or variant assignment",
  });
const checkoutLinesSchema = z
  .array(
    z.object({
      variantId: z.string().uuid(),
      quantity: z.number().int().min(1).max(20),
    }),
  )
  .min(1)
  .max(100);
export const checkoutSchema = z.object({
  lines: checkoutLinesSchema,
  postalCode: z.string().regex(/^\d{6}$/),
  contact: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(254),
    phone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  }),
  shippingAddress: z.object({
    line1: z.string().trim().min(3).max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    country: z.string().trim().length(2).default("IN"),
  }),
  billingAddress: z.object({
    line1: z.string().trim().min(3).max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    postalCode: z.string().regex(/^\d{6}$/),
    country: z.string().trim().length(2).default("IN"),
  }).optional(),
  gstin: z.string().trim().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/).optional(),
  deliveryInstructions: z.string().trim().max(500).optional(),
  couponCode: z.string().max(40).optional(),
  paymentProvider: z.string().min(2).max(40),
  shippingService: z.string().trim().min(1).max(120).optional(),
});
export const checkoutQuoteSchema = checkoutSchema.pick({
  lines: true,
  postalCode: true,
  couponCode: true,
  paymentProvider: true,
  shippingService: true,
});
export const integrationSchema = z.object({
  kind: z.enum([
    "PAYMENT",
    "SHIPPING",
    "EMAIL",
    "SMS",
    "WHATSAPP",
    "STORAGE",
    "ANALYTICS",
  ]),
  provider: z.string().trim().min(2).max(80),
  enabled: z.boolean(),
  priority: z.number().int().min(1).max(1000),
  environment: z.enum(["TEST", "LIVE"]),
  credentials: z
    .record(z.string().max(2000))
    .refine((value) => Object.keys(value).length <= 20, {
      message: "Too many credential fields",
    })
    .optional(),
  publicConfig: z
    .record(z.unknown())
    .refine((value) => Object.keys(value).length <= 50, {
      message: "Too many public configuration fields",
    })
    .optional(),
});
export const integrationDisconnectSchema = z.object({
  confirmation: z.literal("DISCONNECT"),
});
export const orderStatusSchema = z.object({
  status: z.enum([
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
  ]),
});
export const cartItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(0).max(20),
});
export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,40}$/),
    type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]),
    value: z.number().min(0).max(10000000),
    minimumSpend: z.number().min(0).default(0),
    maximumDiscount: z.number().positive().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    enabled: z.boolean().default(true),
    usageLimit: z.number().int().positive().optional(),
  })
  .refine((value) => value.endsAt > value.startsAt, {
    message: "Coupon end date must be after start date",
    path: ["endsAt"],
  })
  .refine((value) => value.type !== "PERCENTAGE" || value.value <= 100, {
    message: "Percentage cannot exceed 100",
    path: ["value"],
  });
export const returnSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(5).max(1000),
});
export const returnDecisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().trim().max(1000).optional(),
});
export const refundSchema = z.object({
  amount: z.number().positive().max(100000000).multipleOf(0.01),
  reason: z.string().trim().min(3).max(500),
});
export const inventoryAdjustmentSchema = z.object({
  quantity: z.number().int().min(-1000000).max(1000000).refine(value => value !== 0),
  reason: z.string().trim().min(3).max(200),
});
export const addressSchema = z.object({
  label: z.string().trim().min(2).max(40), line1: z.string().trim().min(3).max(200), line2: z.string().trim().max(200).optional(), city: z.string().trim().min(2).max(100), state: z.string().trim().min(2).max(100), postalCode: z.string().regex(/^\d{6}$/), country: z.string().length(2).default("IN"), isDefault: z.boolean().default(false),
});
export const reviewSchema = z.object({
  productId: z.string().uuid(), rating: z.number().int().min(1).max(5), title: z.string().trim().max(120).optional(), body: z.string().trim().min(5).max(5000),
});
export const reviewModerationSchema = z.object({ status: z.enum(["APPROVED", "REJECTED"]) });
export const supportTicketSchema = z.object({ subject: z.string().trim().min(3).max(160), message: z.string().trim().min(5).max(5000), priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL") });
export const supportReplySchema = z.object({ message: z.string().trim().min(1).max(5000), status: z.enum(["OPEN", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"]).optional() });
export const totpVerifySchema = z.object({ code: z.string().regex(/^\d{6}$/) });
export const accountDeletionSchema = z.object({ confirmation: z.literal("DELETE") });
export { storefrontConfigSchema } from "./storefront-config.js";
export { promotionConfigSchema, recommendationRequestSchema } from "./promotions.js";
export { paymentClientEventSchema, paymentRetrySchema, paymentReconcileSchema } from "./payment-lifecycle.js";
