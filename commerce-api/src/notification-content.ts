type NotificationPayload = Record<string, unknown>;

const text = (value: unknown, fallback: string, maximum: number) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return (normalized || fallback)
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, maximum);
};

const escapeHtml = (value: string) =>
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

export function renderEmailNotification(
  template: string,
  payload: NotificationPayload,
) {
  const storeName = text(payload.storeName, "Our store", 100);
  if (template === "account.registered") {
    const name = text(payload.name, "there", 100),
      body = `Welcome ${name}. Your ${storeName} account has been created successfully.`;
    return {
      subject: `Welcome to ${storeName}`,
      text: body,
      html: `<p>${escapeHtml(body)}</p>`,
    };
  }
  const body = text(
    payload.message,
    `Your ${storeName} account has a new update.`,
    5000,
  );
  return {
    subject: text(template.replaceAll(".", " "), "Account update", 200),
    text: body,
    html: `<p>${escapeHtml(body)}</p>`,
  };
}

export function renderSmsNotification(
  template: string,
  payload: NotificationPayload,
) {
  if (template === "auth.mobile_otp") {
    const code = String(payload.code || "");
    if (!/^\d{6}$/.test(code))
      throw new Error("Mobile OTP notification has an invalid code");
    const requestedExpiry = Number(payload.expiresInMinutes),
      expiresInMinutes =
        Number.isInteger(requestedExpiry) &&
        requestedExpiry >= 1 &&
        requestedExpiry <= 30
          ? requestedExpiry
          : 5,
      storeName = text(payload.storeName, "our store", 60);
    return `${code} is your ${storeName} verification code. It expires in ${expiresInMinutes} minutes. Do not share it.`;
  }
  const body = text(payload.message, "", 1000);
  if (!body) throw new Error("SMS notification has no message");
  return body;
}
