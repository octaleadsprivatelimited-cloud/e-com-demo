import { z } from "zod";

const optionalUrl = z.union([z.string().url().max(1000), z.literal("")]);

export const storefrontConfigSchema = z.object({
  storeName: z.string().trim().min(2).max(100),
  legalName: z.string().trim().max(160).default(""),
  businessGstin: z.union([z.string().trim().toUpperCase().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/),z.literal("")]).default(""),
  businessAddress: z.string().trim().max(500).default(""),
  logoUrl: optionalUrl.default(""),
  faviconUrl: optionalUrl.default(""),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  currency: z.string().regex(/^[A-Z]{3}$/),
  locale: z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),
  supportEmail: z.union([z.string().email().max(254), z.literal("")]).default(""),
  supportPhone: z.string().trim().max(30).default(""),
  announcement: z.string().trim().max(180).default(""),
  footerTagline: z.string().trim().max(240).default(""),
  seoTitle: z.string().trim().max(70).default(""),
  seoDescription: z.string().trim().max(170).default(""),
  primaryDomain: z.string().trim().toLowerCase().max(253).refine(value => !value || /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value), "Enter a valid hostname").default(""),
});

export type StorefrontConfig = z.infer<typeof storefrontConfigSchema>;

export const defaultStorefrontConfig: StorefrontConfig = {
  storeName: "Aster & Row", legalName: "Aster & Row", businessGstin:"", businessAddress:"", logoUrl: "", faviconUrl: "",
  primaryColor: "#18201d", accentColor: "#a85132", backgroundColor: "#f5f2eb",
  currency: "INR", locale: "en-IN", supportEmail: "support@asterandrow.example",
  supportPhone: "", announcement: "Complimentary shipping above ₹5,000",
  footerTagline: "Considered goods for everyday living.", seoTitle: "Aster & Row",
  seoDescription: "Considered goods for everyday living.", primaryDomain: "",
};

export function normalizeHostname(value: string | undefined) {
  const hostname = ((value || "localhost").split(",")[0] || "localhost").trim().toLowerCase().replace(/:\d+$/, "");
  return /^(?:[a-z0-9-]+\.)*[a-z0-9-]+$/.test(hostname) ? hostname : "localhost";
}

export function storefrontSettingKey(hostname: string) {
  return `storefront:${normalizeHostname(hostname)}`;
}
