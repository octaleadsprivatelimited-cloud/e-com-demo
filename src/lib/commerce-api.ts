const API_URL = (
  import.meta.env.VITE_COMMERCE_API_URL || "http://localhost:4000"
).replace(/\/$/, "");

type ApiEnvelope<T> = { success: true; data: T; message: string };

let refreshInFlight: Promise<string | null> | null = null;

export class CommerceApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

function accessToken() {
  return typeof window !== "undefined"
    ? sessionStorage.getItem("commerce_access_token")
    : null;
}

async function refreshAccessToken() {
  if (typeof window === "undefined") return null;
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          sessionStorage.removeItem("commerce_access_token");
          return null;
        }
        const body = (await response.json()) as ApiEnvelope<{
          accessToken: string;
        }>;
        sessionStorage.setItem("commerce_access_token", body.data.accessToken);
        return body.data.accessToken;
      })
      .catch(() => {
        sessionStorage.removeItem("commerce_access_token");
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function commerceFetch(
  path: string,
  init: RequestInit = {},
  retryAfterRefresh = true,
) {
  const token = accessToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(!(typeof FormData !== "undefined" && init.body instanceof FormData)
        ? { "content-type": "application/json" }
        : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const publicAuthRequest = [
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/refresh",
    "/api/v1/auth/mobile/request",
    "/api/v1/auth/mobile/verify",
    "/api/v1/auth/google",
  ].includes(path);
  if (
    response.status === 401 &&
    retryAfterRefresh &&
    !publicAuthRequest &&
    (await refreshAccessToken())
  )
    return commerceFetch(path, init, false);
  return response;
}

export async function commerceApi<T>(path: string, init: RequestInit = {}) {
  const response = await commerceFetch(path, init);
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new CommerceApiError(
      response.status,
      body?.error?.code || "REQUEST_FAILED",
      body?.error?.message || "The request could not be completed",
    );
  return (body as ApiEnvelope<T>).data;
}

export async function commerceDownload(path: string) {
  const response = await commerceFetch(path);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new CommerceApiError(
      response.status,
      body?.error?.code || "DOWNLOAD_FAILED",
      body?.error?.message || "The file could not be downloaded",
    );
  }
  return response.blob();
}

export type ApiProduct = {
  id: string;
  name: string;
  variants: Array<{
    id: string;
    title: string;
    attributes: Record<string, string>;
  }>;
};

export function saveAccessToken(token: string) {
  sessionStorage.setItem("commerce_access_token", token);
}
