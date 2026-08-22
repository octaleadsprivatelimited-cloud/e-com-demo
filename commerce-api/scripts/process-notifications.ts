import { PrismaClient, type ProviderKind } from "@prisma/client";
import { loadConfig } from "../src/config.js";
import {
  renderEmailNotification,
  renderSmsNotification,
} from "../src/notification-content.js";
import { SecretVault } from "../src/security.js";

const db = new PrismaClient();
const vault = new SecretVault(loadConfig().INTEGRATION_ENCRYPTION_KEY);
const environment = process.env.NODE_ENV === "production" ? "LIVE" : "TEST";

const publicRecord = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

async function configuredIntegration(kind: ProviderKind, provider: string) {
  const integration = await db.integrationConfig.findFirst({
    where: {
      kind,
      provider: { equals: provider, mode: "insensitive" },
      enabled: true,
      environment,
    },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
  });
  if (!integration)
    throw new Error(
      `No enabled ${provider} ${kind.toLowerCase()} integration is configured`,
    );
  return {
    credentials: vault.decrypt<Record<string, string>>(
      Buffer.from(integration.encryptedCredentials).toString("base64"),
    ),
    publicConfig: publicRecord(integration.publicConfig),
  };
}

async function sendEmail(notification: {
  id: string;
  template: string;
  destination: string;
  payload: unknown;
}) {
  const { credentials, publicConfig } = await configuredIntegration(
      "EMAIL",
      "resend",
    ),
    fromEmail = String(publicConfig.fromEmail || "").trim();
  if (
    fromEmail.length > 254 ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(fromEmail)
  )
    throw new Error("Resend requires a valid publicConfig.fromEmail");
  if (!credentials.apiKey)
    throw new Error("Resend requires an apiKey credential");
  const fromName = String(publicConfig.fromName || "")
      .replace(/[\r\n]/g, " ")
      .replace(/["\\]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100),
    from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
    content = renderEmailNotification(
      notification.template,
      publicRecord(notification.payload),
    ),
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${credentials.apiKey}`,
        "content-type": "application/json",
        "idempotency-key": notification.id,
      },
      body: JSON.stringify({
        from,
        to: notification.destination,
        subject: content.subject,
        html: content.html,
        text: content.text,
      }),
      signal: AbortSignal.timeout(10_000),
    }),
    body = (await response.json().catch(() => ({}))) as { id?: string };
  if (!response.ok)
    throw new Error(
      `Resend rejected notification with status ${response.status}`,
    );
  return body.id;
}

async function sendSms(notification: {
  template: string;
  destination: string;
  payload: unknown;
}) {
  const { credentials, publicConfig } = await configuredIntegration(
      "SMS",
      "twilio",
    ),
    accountSid = String(credentials.accountSid || "").trim(),
    authToken = String(credentials.authToken || "").trim(),
    fromNumber = String(publicConfig.fromNumber || "").trim();
  if (!accountSid || !authToken)
    throw new Error("Twilio requires accountSid and authToken credentials");
  if (!/^\+[1-9]\d{7,14}$/.test(fromNumber))
    throw new Error("Twilio requires a valid publicConfig.fromNumber");
  const message = renderSmsNotification(
      notification.template,
      publicRecord(notification.payload),
    ),
    form = new URLSearchParams({
      To: notification.destination,
      From: fromNumber,
      Body: message,
    }),
    response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: form,
        signal: AbortSignal.timeout(10_000),
      },
    ),
    body = (await response.json().catch(() => ({}))) as { sid?: string };
  if (!response.ok)
    throw new Error(
      `Twilio rejected notification with status ${response.status}`,
    );
  return body.sid;
}

try {
  const batch = await db.notification.findMany({
    where: { status: "QUEUED", channel: { in: ["EMAIL", "SMS"] } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  for (const notification of batch) {
    try {
      const providerMessageId =
        notification.channel === "SMS"
          ? await sendSms(notification)
          : await sendEmail(notification);
      await db.notification.update({
        where: { id: notification.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          providerMessageId,
          error: null,
        },
      });
    } catch (error) {
      await db.notification.update({
        where: { id: notification.id },
        data: {
          status: "FAILED",
          error:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Delivery failed",
        },
      });
    }
  }
  console.log(JSON.stringify({ processed: batch.length }));
} finally {
  await db.$disconnect();
}
