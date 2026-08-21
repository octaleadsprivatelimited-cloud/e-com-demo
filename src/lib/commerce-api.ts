const API_URL = (
  import.meta.env.VITE_COMMERCE_API_URL || "http://localhost:4000"
).replace(/\/$/, "");

type ApiEnvelope<T> = { success: true; data: T; message: string };

export class CommerceApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function commerceApi<T>(path: string, init: RequestInit = {}) {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("commerce_access_token")
      : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(!(typeof FormData !== "undefined" && init.body instanceof FormData) ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new CommerceApiError(
      response.status,
      body?.error?.code || "REQUEST_FAILED",
      body?.error?.message || "The request could not be completed",
    );
  return (body as ApiEnvelope<T>).data;
}

export async function commerceDownload(path:string){const token=typeof window!=="undefined"?sessionStorage.getItem("commerce_access_token"):null,response=await fetch(`${API_URL}${path}`,{credentials:"include",headers:token?{authorization:`Bearer ${token}`}:{}});if(!response.ok){const body=await response.json().catch(()=>null);throw new CommerceApiError(response.status,body?.error?.code||"DOWNLOAD_FAILED",body?.error?.message||"The file could not be downloaded")}return response.blob()}

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
