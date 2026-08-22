import { z } from "zod";
import type { StoredIntegration } from "./store.js";

export type IntegrationOutcome =
  | "CONNECTED"
  | "FAILED"
  | "UNSUPPORTED"
  | "UNCONFIGURED"
  | "DISCONNECTED"
  | "UNTESTED";

type CredentialField = {
  key: string;
  label: string;
  required: boolean;
};

type PublicField = {
  key: string;
  label: string;
  required: boolean;
};

export type IntegrationDefinition = {
  kind:
    | "PAYMENT"
    | "SHIPPING"
    | "EMAIL"
    | "SMS"
    | "WHATSAPP"
    | "STORAGE"
    | "ANALYTICS"
    | "AUTH";
  provider: string;
  name: string;
  description: string;
  credentialFields: CredentialField[];
  publicFields: PublicField[];
  publicSchema: z.ZodType<Record<string, unknown>>;
  defaults?: Record<string, unknown>;
  liveOperations: boolean;
  testConnection: boolean;
  webhooks: boolean;
};

const optionalText = (maximum = 200) => z.string().trim().min(1).max(maximum).optional();

export const integrationDefinitions: IntegrationDefinition[] = [
  {
    kind: "PAYMENT",
    provider: "razorpay",
    name: "Razorpay",
    description: "Cards, UPI, netbanking, refunds and payment webhooks.",
    credentialFields: [
      { key: "keyId", label: "Key ID", required: true },
      { key: "keySecret", label: "Key secret", required: true },
      { key: "webhookSecret", label: "Webhook secret", required: false },
    ],
    publicFields: [{ key: "currency", label: "Currency", required: false }],
    publicSchema: z
      .object({ currency: z.literal("INR").optional() })
      .strict()
      .transform((value) => value as Record<string, unknown>),
    defaults: { currency: "INR" },
    liveOperations: true,
    testConnection: true,
    webhooks: true,
  },
  {
    kind: "SHIPPING",
    provider: "shiprocket",
    name: "Shiprocket",
    description: "Courier rates, shipments, AWB assignment and tracking.",
    credentialFields: [{ key: "token", label: "API token", required: true }],
    publicFields: [
      { key: "pickupPostcode", label: "Pickup PIN", required: true },
      { key: "pickupLocation", label: "Pickup location", required: true },
    ],
    publicSchema: z
      .object({
        pickupPostcode: z.string().regex(/^\d{6}$/).optional(),
        pickupLocation: optionalText(100),
      })
      .strict()
      .transform((value) => value as Record<string, unknown>),
    liveOperations: true,
    testConnection: true,
    webhooks: true,
  },
  {
    kind: "SHIPPING",
    provider: "delhivery",
    name: "Delhivery",
    description: "Configuration storage for a future Delhivery adapter.",
    credentialFields: [{ key: "token", label: "API token", required: true }],
    publicFields: [
      { key: "pickupPostcode", label: "Pickup PIN", required: true },
    ],
    publicSchema: z
      .object({ pickupPostcode: z.string().regex(/^\d{6}$/).optional() })
      .strict()
      .transform((value) => value as Record<string, unknown>),
    liveOperations: false,
    testConnection: false,
    webhooks: false,
  },
  {
    kind: "EMAIL",
    provider: "resend",
    name: "Resend",
    description: "Transactional order and account email delivery.",
    credentialFields: [{ key: "apiKey", label: "API key", required: true }],
    publicFields: [
      { key: "fromEmail", label: "From email", required: true },
      { key: "fromName", label: "From name", required: false },
    ],
    publicSchema: z
      .object({
        fromEmail: z.string().trim().email().max(254).optional(),
        fromName: optionalText(100),
      })
      .strict()
      .transform((value) => value as Record<string, unknown>),
    liveOperations: true,
    testConnection: true,
    webhooks: false,
  },
  {
    kind: "SMS",
    provider: "twilio",
    name: "Twilio SMS",
    description: "Transactional mobile OTP and customer SMS delivery.",
    credentialFields: [
      { key: "accountSid", label: "Account SID", required: true },
      { key: "authToken", label: "Auth token", required: true },
    ],
    publicFields: [
      { key: "fromNumber", label: "Sender number", required: true },
    ],
    publicSchema: z
      .object({
        fromNumber: z.string().trim().regex(/^\+[1-9]\d{7,14}$/).optional(),
      })
      .strict()
      .transform((value) => value as Record<string, unknown>),
    liveOperations: true,
    testConnection: true,
    webhooks: false,
  },
  {
    kind: "WHATSAPP",
    provider: "whatsapp-cloud",
    name: "WhatsApp Cloud",
    description: "Configuration storage for a future WhatsApp messaging adapter.",
    credentialFields: [
      { key: "accessToken", label: "Access token", required: true },
      { key: "phoneNumberId", label: "Phone number ID", required: true },
    ],
    publicFields: [],
    publicSchema: z.object({}).strict(),
    liveOperations: false,
    testConnection: false,
    webhooks: false,
  },
  {
    kind: "AUTH",
    provider: "google",
    name: "Google Sign-In",
    description: "Customer authentication with Google Identity Services.",
    credentialFields: [],
    publicFields: [
      { key: "clientId", label: "Web client ID", required: true },
    ],
    publicSchema: z
      .object({
        clientId: z
          .string()
          .trim()
          .min(20)
          .max(255)
          .regex(
            /^[A-Za-z0-9][A-Za-z0-9._-]*\.apps\.googleusercontent\.com$/,
            "Enter a Google web client ID ending in .apps.googleusercontent.com",
          )
          .optional(),
      })
      .strict()
      .transform((value) => value as Record<string, unknown>),
    liveOperations: true,
    testConnection: false,
    webhooks: false,
  },
  {
    kind: "ANALYTICS",
    provider: "google-analytics",
    name: "Google Analytics",
    description: "Configuration storage for future server-managed GA4 events.",
    credentialFields: [{ key: "apiSecret", label: "API secret", required: true }],
    publicFields: [
      { key: "measurementId", label: "Measurement ID", required: true },
    ],
    publicSchema: z
      .object({
        measurementId: z
          .string()
          .trim()
          .regex(/^G-[A-Z0-9]+$/)
          .optional(),
      })
      .strict()
      .transform((value) => value as Record<string, unknown>),
    liveOperations: false,
    testConnection: false,
    webhooks: false,
  },
];

const aliases: Record<string, string> = {
  "whatsapp-cloud-api": "whatsapp-cloud",
  whatsapp: "whatsapp-cloud",
  ga4: "google-analytics",
  "google-analytics-4": "google-analytics",
};

export function normalizeProvider(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return aliases[slug] || slug;
}

export function integrationDefinition(kind: string, provider: string) {
  const normalized = normalizeProvider(provider);
  return integrationDefinitions.find(
    (definition) =>
      definition.kind === kind.toUpperCase() &&
      definition.provider === normalized,
  );
}

export function parsePublicConfig(
  definition: IntegrationDefinition,
  value: Record<string, unknown>,
) {
  return definition.publicSchema.parse(value);
}

export function safePublicConfig(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !key.startsWith("_")),
  );
}

export function providerPublicConfig(
  definition: IntegrationDefinition,
  value: Record<string, unknown>,
) {
  const allowed = new Set(definition.publicFields.map((field) => field.key));
  return Object.fromEntries(
    Object.entries(safePublicConfig(value)).filter(([key]) => allowed.has(key)),
  );
}

function connectionState(value: Record<string, unknown>) {
  const raw = value._connection;
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return { outcome: "UNTESTED" as IntegrationOutcome };
  const item = raw as Record<string, unknown>;
  const outcome = String(item.outcome || "UNTESTED") as IntegrationOutcome;
  return {
    outcome: [
      "CONNECTED",
      "FAILED",
      "UNSUPPORTED",
      "UNCONFIGURED",
      "DISCONNECTED",
      "UNTESTED",
    ].includes(outcome)
      ? outcome
      : ("UNTESTED" as IntegrationOutcome),
    testedAt: typeof item.testedAt === "string" ? item.testedAt : undefined,
    message: typeof item.message === "string" ? item.message : undefined,
  };
}

export function integrationConfigured(
  definition: IntegrationDefinition,
  credentials: Record<string, string>,
  publicConfig: Record<string, unknown>,
) {
  return (
    definition.credentialFields
      .filter((field) => field.required)
      .every((field) => Boolean(credentials[field.key]?.trim())) &&
    definition.publicFields
      .filter((field) => field.required)
      .every((field) => {
        const value = publicConfig[field.key];
        return typeof value === "string"
          ? Boolean(value.trim())
          : value !== undefined && value !== null;
      }) &&
    definition.publicSchema.safeParse(
      providerPublicConfig(definition, publicConfig),
    ).success
  );
}

export function integrationDto(input: {
  definition: IntegrationDefinition;
  environment: "TEST" | "LIVE";
  record?: StoredIntegration;
  credentials: Record<string, string>;
  mask: (value: string) => string;
}) {
  const { definition, record, credentials, environment, mask } = input;
  const publicConfig = {
    ...(definition.defaults || {}),
    ...providerPublicConfig(definition, record?.publicConfig || {}),
  };
  const configured = integrationConfigured(
    definition,
    credentials,
    publicConfig,
  );
  const lastTest = connectionState(record?.publicConfig || {});
  // Public-only runtime integrations such as Google Sign-In have no secret
  // credential to probe. Once enabled and valid, they are active without a
  // misleading connection test that could not validate the OAuth client ID.
  const connected = Boolean(
    record?.enabled &&
      configured &&
      (lastTest.outcome === "CONNECTED" ||
        (definition.liveOperations && !definition.testConnection)),
  );
  const status = !configured
    ? "NOT_CONFIGURED"
    : !definition.liveOperations
      ? "UNSUPPORTED"
      : !record?.enabled
        ? "DISABLED"
        : connected
          ? "CONNECTED"
          : lastTest.outcome === "FAILED"
            ? "CONNECTION_FAILED"
            : "ENABLED_UNTESTED";
  const maskedCredentials = Object.fromEntries(
    definition.credentialFields
      .filter((field) => Boolean(credentials[field.key]))
      .map((field) => [field.key, mask(credentials[field.key]!)]),
  );
  return {
    id: record?.id || `${definition.kind}:${definition.provider}:${environment}`,
    kind: definition.kind,
    provider: definition.provider,
    name: definition.name,
    description: definition.description,
    enabled: record?.enabled || false,
    priority: record?.priority || 100,
    environment,
    publicConfig,
    updatedAt: record?.updatedAt,
    configured,
    connected,
    status,
    maskedCredentials,
    // Kept as a response-only alias for existing admin clients. Neither field
    // ever contains decryptable credential material.
    maskedKeys: maskedCredentials,
    credentialFields: definition.credentialFields.map((field) => ({
      ...field,
      configured: Boolean(credentials[field.key]),
      masked: credentials[field.key] ? mask(credentials[field.key]!) : undefined,
    })),
    requiredPublicConfig: definition.publicFields,
    capabilities: {
      liveOperations: definition.liveOperations,
      testConnection: definition.testConnection,
      webhooks: definition.webhooks,
      disconnect: true,
    },
    lastTest,
  };
}

export function runtimeEnvironment(nodeEnvironment: string): "TEST" | "LIVE" {
  return nodeEnvironment === "production" ? "LIVE" : "TEST";
}

export function selectRuntimeIntegration(
  records: Iterable<StoredIntegration>,
  kind: string,
  provider: string | undefined,
  nodeEnvironment: string,
) {
  const expectedEnvironment = runtimeEnvironment(nodeEnvironment);
  const normalizedProvider = provider ? normalizeProvider(provider) : undefined;
  return [...records]
    .filter(
      (entry) =>
        entry.kind === kind &&
        entry.enabled &&
        entry.environment === expectedEnvironment &&
        (!normalizedProvider ||
          normalizeProvider(entry.provider) === normalizedProvider),
    )
    .sort(
      (left, right) =>
        left.priority - right.priority ||
        right.updatedAt.localeCompare(left.updatedAt) ||
        left.id.localeCompare(right.id),
    )[0];
}

export async function testIntegrationConnection(input: {
  definition: IntegrationDefinition;
  credentials: Record<string, string>;
  publicConfig: Record<string, unknown>;
  request?: typeof fetch;
}) {
  const testedAt = new Date().toISOString();
  if (
    !integrationConfigured(
      input.definition,
      input.credentials,
      input.publicConfig,
    )
  )
    return {
      outcome: "UNCONFIGURED" as const,
      testedAt,
      message: "Required credentials or settings are missing.",
    };
  if (!input.definition.testConnection)
    return {
      outcome: "UNSUPPORTED" as const,
      testedAt,
      message: "This provider does not have a live connection adapter yet.",
    };

  const request = input.request || fetch;
  let url = "";
  let headers: Record<string, string> = {};
  if (input.definition.provider === "razorpay") {
    url = "https://api.razorpay.com/v1/orders?count=1";
    headers.authorization = `Basic ${Buffer.from(
      `${input.credentials.keyId}:${input.credentials.keySecret}`,
    ).toString("base64")}`;
  } else if (input.definition.provider === "shiprocket") {
    const postcode = String(input.publicConfig.pickupPostcode);
    const query = new URLSearchParams({
      pickup_postcode: postcode,
      delivery_postcode: postcode,
      weight: "0.5",
      cod: "0",
    });
    url = `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?${query}`;
    headers.authorization = `Bearer ${input.credentials.token}`;
  } else if (input.definition.provider === "resend") {
    url = "https://api.resend.com/domains";
    headers.authorization = `Bearer ${input.credentials.apiKey}`;
  } else if (input.definition.provider === "twilio") {
    const accountSid = input.credentials.accountSid || "",
      authToken = input.credentials.authToken || "";
    url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}.json`;
    headers.authorization = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
  } else {
    return {
      outcome: "UNSUPPORTED" as const,
      testedAt,
      message: "This provider does not have a live connection adapter yet.",
    };
  }

  try {
    const response = await request(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(8_000),
    });
    if (response.ok)
      return {
        outcome: "CONNECTED" as const,
        testedAt,
        message: "Provider accepted the stored credentials.",
      };
    const message =
      response.status === 401 || response.status === 403
        ? "Provider rejected the stored credentials."
        : response.status === 429
          ? "Provider rate-limited the connection test."
          : response.status >= 500
            ? "Provider is temporarily unavailable."
            : "Provider rejected the connection test.";
    return { outcome: "FAILED" as const, testedAt, message };
  } catch {
    return {
      outcome: "FAILED" as const,
      testedAt,
      message: "The provider could not be reached safely.",
    };
  }
}
