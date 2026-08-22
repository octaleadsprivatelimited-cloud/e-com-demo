import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";
import { createGoogleIdTokenVerifier } from "../src/google-auth.js";

const clientId = "google-auth-test.apps.googleusercontent.com";

function signingKeys() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  return {
    privateKey,
    publicKey: publicKey
      .export({ type: "spki", format: "pem" })
      .toString(),
  };
}

function token(
  privateKey: crypto.KeyObject,
  claims: Record<string, unknown> = {},
  kid = "google-key-1",
) {
  const now = Math.floor(Date.now() / 1_000);
  return jwt.sign(
    {
      sub: "stable-google-subject",
      email: "  Customer@Example.COM ",
      email_verified: true,
      name: "Google Customer",
      aud: clientId,
      iss: "https://accounts.google.com",
      iat: now,
      exp: now + 300,
      ...claims,
    },
    privateKey,
    { algorithm: "RS256", keyid: kid },
  );
}

function certificateResponse(keys: Record<string, string>) {
  return new Response(JSON.stringify(keys), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=300",
    },
  });
}

describe("Google ID token verification", () => {
  it("verifies Google claims, normalizes email and caches signing keys", async () => {
    const keys = signingKeys();
    const request = vi.fn(async () =>
      certificateResponse({ "google-key-1": keys.publicKey }),
    );
    const verify = createGoogleIdTokenVerifier({ request });

    await expect(verify(token(keys.privateKey), clientId)).resolves.toMatchObject(
      {
        sub: "stable-google-subject",
        email: "customer@example.com",
        email_verified: true,
      },
    );
    await expect(verify(token(keys.privateKey), clientId)).resolves.toBeDefined();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("refreshes cached certificates once when Google rotates to an unknown key", async () => {
    const oldKeys = signingKeys(),
      currentKeys = signingKeys();
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        certificateResponse({ "old-key": oldKeys.publicKey }),
      )
      .mockResolvedValueOnce(
        certificateResponse({ "current-key": currentKeys.publicKey }),
      );
    const verify = createGoogleIdTokenVerifier({ request });

    await expect(
      verify(token(currentKeys.privateKey, {}, "current-key"), clientId),
    ).resolves.toMatchObject({ sub: "stable-google-subject" });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("maps certificate network failures and timeouts to a safe 503", async () => {
    const keys = signingKeys();
    const unavailable = createGoogleIdTokenVerifier({
      request: async () => {
        throw new TypeError("network failed");
      },
    });
    await expect(
      unavailable(token(keys.privateKey), clientId),
    ).rejects.toMatchObject({
      status: 503,
      code: "GOOGLE_AUTH_UNAVAILABLE",
    });

    const timedOut = createGoogleIdTokenVerifier({
      timeoutMs: 5,
      request: async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            { once: true },
          );
        }),
    });
    await expect(timedOut(token(keys.privateKey), clientId)).rejects.toMatchObject(
      {
        status: 503,
        code: "GOOGLE_AUTH_UNAVAILABLE",
      },
    );
  });

  it("rejects invalid audience, issuer, expiry and unverified email claims", async () => {
    const keys = signingKeys();
    const verify = createGoogleIdTokenVerifier({
      request: async () =>
        certificateResponse({ "google-key-1": keys.publicKey }),
    });
    const now = Math.floor(Date.now() / 1_000);
    for (const claims of [
      { aud: "another-client.apps.googleusercontent.com" },
      { iss: "https://attacker.example" },
      { exp: now - 60 },
      { email_verified: false },
      { sub: "   " },
    ])
      await expect(
        verify(token(keys.privateKey, claims), clientId),
      ).rejects.toMatchObject({
        status: 401,
        code: "INVALID_GOOGLE_TOKEN",
      });
  });
});
