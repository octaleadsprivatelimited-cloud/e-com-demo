import jwt from "jsonwebtoken";
import { AppError } from "./errors.js";

const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v1/certs";
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_CACHE_SECONDS = 300;
const MIN_CACHE_SECONDS = 30;
const MAX_CACHE_SECONDS = 86_400;
const UNKNOWN_KEY_REFRESH_COOLDOWN_MS = 30_000;

export type GoogleClaims = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  hd?: string;
  aud: string | string[];
  iss: string;
  exp: number;
  iat?: number;
};

type GoogleVerifierOptions = {
  request?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
};

function unavailable() {
  return new AppError(
    503,
    "GOOGLE_AUTH_UNAVAILABLE",
    "Google sign-in is temporarily unavailable",
  );
}

function cacheLifetime(headers: Headers) {
  const supplied = Number(
    headers.get("cache-control")?.match(/(?:^|,)\s*max-age=(\d+)/i)?.[1] ||
      DEFAULT_CACHE_SECONDS,
  );
  if (!Number.isFinite(supplied)) return DEFAULT_CACHE_SECONDS;
  return Math.min(MAX_CACHE_SECONDS, Math.max(MIN_CACHE_SECONDS, supplied));
}

export function createGoogleIdTokenVerifier(
  options: GoogleVerifierOptions = {},
) {
  const request = options.request || fetch;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const now = options.now || Date.now;
  let cached:
    | { expiresAt: number; keys: Record<string, string> }
    | undefined;
  let loading: Promise<Record<string, string>> | undefined;
  let lastUnknownKeyRefreshAt: number | undefined;

  const fetchKeys = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await request(GOOGLE_CERTS_URL, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw unavailable();
      const payload = (await response.json()) as unknown;
      if (!payload || typeof payload !== "object" || Array.isArray(payload))
        throw unavailable();
      const keys = Object.fromEntries(
        Object.entries(payload).filter(
          (entry): entry is [string, string] =>
            Boolean(entry[0]) &&
            typeof entry[1] === "string" &&
            entry[1].includes("BEGIN"),
        ),
      );
      if (!Object.keys(keys).length) throw unavailable();
      cached = {
        keys,
        expiresAt: now() + cacheLifetime(response.headers) * 1_000,
      };
      return keys;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw unavailable();
    } finally {
      clearTimeout(timeout);
    }
  };

  const googleKeys = async (forceRefresh = false) => {
    if (!forceRefresh && cached && cached.expiresAt > now()) return cached.keys;
    if (loading) return loading;
    loading = fetchKeys();
    try {
      return await loading;
    } finally {
      loading = undefined;
    }
  };

  return async function verifyGoogleIdToken(
    idToken: string,
    clientId: string,
  ): Promise<GoogleClaims> {
    if (!clientId.trim())
      throw new AppError(
        503,
        "GOOGLE_AUTH_NOT_CONFIGURED",
        "Google sign-in is not configured",
      );

    const decoded = jwt.decode(idToken, { complete: true });
    const kid =
      decoded && typeof decoded === "object" && "header" in decoded
        ? decoded.header.kid
        : undefined;
    const algorithm =
      decoded && typeof decoded === "object" && "header" in decoded
        ? decoded.header.alg
        : undefined;
    if (!kid || algorithm !== "RS256")
      throw new AppError(
        401,
        "INVALID_GOOGLE_TOKEN",
        "Google credential is invalid",
      );

    let certificate = (await googleKeys())[kid];
    if (!certificate) {
      const current = now();
      if (
        lastUnknownKeyRefreshAt === undefined ||
        current - lastUnknownKeyRefreshAt >= UNKNOWN_KEY_REFRESH_COOLDOWN_MS
      ) {
        lastUnknownKeyRefreshAt = current;
        try {
          certificate = (await googleKeys(true))[kid];
        } catch (error) {
          lastUnknownKeyRefreshAt = undefined;
          throw error;
        }
      }
    }
    if (!certificate)
      throw new AppError(
        401,
        "INVALID_GOOGLE_TOKEN",
        "Google credential uses an unknown signing key",
      );

    try {
      const claims = jwt.verify(idToken, certificate, {
        algorithms: ["RS256"],
        audience: clientId,
        issuer: ["accounts.google.com", "https://accounts.google.com"],
        clockTolerance: 5,
      }) as GoogleClaims;
      const subject =
          typeof claims.sub === "string" ? claims.sub.trim() : "",
        email =
          typeof claims.email === "string"
            ? claims.email.trim().toLowerCase()
            : "";
      if (
        !subject ||
        !email ||
        claims.email_verified !== true
      )
        throw new Error("Google identity claims are incomplete");
      return {
        ...claims,
        sub: subject,
        email,
      };
    } catch {
      throw new AppError(
        401,
        "INVALID_GOOGLE_TOKEN",
        "Google credential could not be verified",
      );
    }
  };
}

export const verifyGoogleIdToken = createGoogleIdTokenVerifier();
