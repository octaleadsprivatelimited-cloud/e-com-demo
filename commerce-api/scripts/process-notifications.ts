import { PrismaClient } from "@prisma/client";
import { loadConfig } from "../src/config.js";
import { SecretVault } from "../src/security.js";

const db = new PrismaClient();
const vault = new SecretVault(loadConfig().INTEGRATION_ENCRYPTION_KEY);
const environment = process.env.NODE_ENV === "production" ? "LIVE" : "TEST";
const html = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
try {
  const integration = await db.integrationConfig.findFirst({
    where: {
      kind: "EMAIL",
      provider: { equals: "resend", mode: "insensitive" },
      enabled: true,
      environment,
    },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
  });
  if (!integration) throw new Error("No enabled Resend email integration is configured");
  const credentials = vault.decrypt<Record<string, string>>(Buffer.from(integration.encryptedCredentials).toString("base64"));
  const publicConfig = integration.publicConfig;
  if (!publicConfig || typeof publicConfig !== "object" || Array.isArray(publicConfig))
    throw new Error("Resend public configuration is invalid");
  const fromEmail = String(publicConfig.fromEmail || "").trim();
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
    .slice(0, 100);
  const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
  const batch = await db.notification.findMany({ where: { status: "QUEUED", channel: "EMAIL" }, orderBy: { createdAt: "asc" }, take: 50 });
  for (const notification of batch) {
    try {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${credentials.apiKey}`, "content-type": "application/json", "idempotency-key": notification.id }, body: JSON.stringify({ from, to: notification.destination, subject: notification.template.replaceAll(".", " "), html: `<p>${html(String((notification.payload as Record<string, unknown>).message || "Your Aster & Row account has a new update."))}</p>` }) });
      const body = await response.json().catch(() => ({})) as { id?: string };
      if (!response.ok) throw new Error(`Provider rejected notification with status ${response.status}`);
      await db.notification.update({ where: { id: notification.id }, data: { status: "SENT", sentAt: new Date(), providerMessageId: body.id } });
    } catch (error) {
      await db.notification.update({ where: { id: notification.id }, data: { status: "FAILED", error: error instanceof Error ? error.message.slice(0, 500) : "Delivery failed" } });
    }
  }
  console.log(JSON.stringify({ processed: batch.length }));
} finally { await db.$disconnect(); }
