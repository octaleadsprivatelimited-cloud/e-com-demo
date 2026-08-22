import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import type { GoogleClaims } from "../src/google-auth.js";
import { hashPassword } from "../src/passwords.js";
import { signAccessToken } from "../src/security.js";
import { CommerceStore } from "../src/store.js";

const testConfig: AppConfig = {
  NODE_ENV: "test",
  PORT: 0,
  DATABASE_URL: "postgresql://test:test@localhost/test",
  JWT_SECRET: "test-access-secret-that-is-at-least-32-chars",
  JWT_REFRESH_SECRET: "test-refresh-secret-that-is-at-least-32-chars",
  INTEGRATION_ENCRYPTION_KEY: "test-encryption-key-that-is-at-least-32-chars",
  CORS_ORIGINS: "http://localhost:5173",
  TRUST_PROXY: "",
  USE_DATABASE: false,
  GOOGLE_CLIENT_ID: "",
  UPLOAD_DIR: process.cwd(),
  PUBLIC_UPLOAD_BASE_URL: "http://localhost:4001/uploads",
};

async function listen(
  config: AppConfig,
  options: {
    store?: CommerceStore;
    googleVerifier?: (
      idToken: string,
      clientId: string,
    ) => Promise<GoogleClaims>;
  } = {},
) {
  const store = options.store || new CommerceStore();
  const created = await createApp({
      config,
      store,
      persistence: null,
      googleVerifier: options.googleVerifier,
    }),
    server = created.app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  return { server, base: `http://127.0.0.1:${address.port}`, store };
}

async function close(server: Server) {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

async function request(base: string, path: string, body?: unknown) {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: (await response.json()) as any,
    headers: response.headers,
  };
}

function googleClaims(sub: string, email: string): GoogleClaims {
  return {
    sub,
    email,
    email_verified: true,
    name: "Google Customer",
    aud: "unused-by-test-verifier.apps.googleusercontent.com",
    iss: "https://accounts.google.com",
    exp: Math.floor(Date.now() / 1_000) + 300,
  };
}

describe("customer authentication errors", () => {
  let server: Server;
  let base: string;
  let store: CommerceStore;

  beforeAll(async () => {
    ({ server, base, store } = await listen(testConfig));
  });

  afterAll(async () => close(server));

  it("returns useful email and password validation errors and normalizes email", async () => {
    const invalid = await request(base, "/api/v1/auth/register", {
      name: "A",
      email: "not-an-email",
      password: "weak",
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      details: {
        fieldErrors: {
          email: expect.arrayContaining(["Enter a valid email address"]),
          password: expect.arrayContaining([
            "Password must be at least 8 characters",
            "Password must include an uppercase letter",
            "Password must include a number",
            "Password must include a special character",
          ]),
        },
      },
    });

    const registered = await request(base, "/api/v1/auth/register", {
      name: "Authentication Customer",
      email: "  AUTH.Customer@Example.COM ",
      password: "StrongPass!77",
    });
    expect(registered.status).toBe(201);
    expect(registered.body.data.email).toBe("auth.customer@example.com");

    const duplicate = await request(base, "/api/v1/auth/register", {
      name: "Authentication Customer",
      email: "AUTH.CUSTOMER@EXAMPLE.COM",
      password: "StrongPass!77",
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("EMAIL_EXISTS");
  });

  it("uses the same safe error for an unknown email and a wrong password", async () => {
    const unknownEmail = await request(base, "/api/v1/auth/login", {
        email: "missing@example.com",
        password: "WrongPass!1",
      }),
      wrongPassword = await request(base, "/api/v1/auth/login", {
        email: "auth.customer@example.com",
        password: "x",
      });
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.body.error).toEqual(wrongPassword.body.error);
    expect(wrongPassword.body.error).toEqual({
      code: "INVALID_CREDENTIALS",
      message: "Email or password is incorrect",
    });
  });

  it("distinguishes OTP retry, incorrect, expired and exhausted cases", async () => {
    const mobile = "+919811111111",
      requested = await request(base, "/api/v1/auth/mobile/request", {
        mobile,
      }),
      code = requested.body.data.developmentCode as string,
      wrongCode = code === "000000" ? "000001" : "000000";
    expect(requested.status).toBe(200);
    expect(requested.body.data).toMatchObject({
      expiresInSeconds: 300,
      resendAfterSeconds: 30,
    });

    const resend = await request(base, "/api/v1/auth/mobile/request", {
      mobile,
    });
    expect(resend.status).toBe(429);
    expect(resend.body.error.code).toBe("OTP_RESEND_TOO_SOON");
    expect(Number(resend.headers.get("retry-after"))).toBeGreaterThan(0);

    const incorrect = await request(base, "/api/v1/auth/mobile/verify", {
      mobile,
      code: wrongCode,
    });
    expect(incorrect.status).toBe(401);
    expect(incorrect.body.error).toMatchObject({
      code: "INVALID_OTP",
      details: { attemptsRemaining: 4 },
    });
    const verified = await request(base, "/api/v1/auth/mobile/verify", {
      mobile,
      code,
      name: "Mobile Customer",
    });
    expect(verified.status).toBe(200);
    const consumed = await request(base, "/api/v1/auth/mobile/verify", {
      mobile,
      code,
    });
    expect(consumed.status).toBe(400);
    expect(consumed.body.error.code).toBe("OTP_NOT_REQUESTED");

    const authMethodsResponse = await fetch(
      `${base}/api/v1/account/auth-methods`,
      {
        headers: {
          authorization: `Bearer ${verified.body.data.accessToken}`,
        },
      },
    );
    const authMethods = (await authMethodsResponse.json()) as any;
    expect(authMethods.data).toMatchObject({
      password: false,
      mobileOtp: { available: true },
    });
    const mobileUser = verified.body.data.user;
    const storedMobileUser = mobileUser
      ? store.users.get(mobileUser.id)
      : undefined;
    expect(storedMobileUser?.passwordEnabled).toBe(false);
    if (!storedMobileUser)
      throw new Error("Verified mobile customer was not stored");
    storedMobileUser.passwordHash = await hashPassword("KnownPass!92");
    const passwordLogin = await request(base, "/api/v1/auth/login", {
      email: storedMobileUser.email,
      password: "KnownPass!92",
    });
    expect(passwordLogin.status).toBe(401);
    expect(passwordLogin.body.error.code).toBe("INVALID_CREDENTIALS");
    const accountCodeResponse = await fetch(
      `${base}/api/v1/account/auth/mobile/request`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${verified.body.data.accessToken}`,
        },
      },
    );
    const accountCode = (await accountCodeResponse.json()) as any;
    expect(accountCodeResponse.status).toBe(200);
    expect(accountCode.data).toMatchObject({
      expiresInSeconds: 300,
      resendAfterSeconds: 30,
      developmentCode: expect.stringMatching(/^\d{6}$/),
    });

    const expiredMobile = "+919822222222",
      expiryRequest = await request(base, "/api/v1/auth/mobile/request", {
        mobile: expiredMobile,
      }),
      realNow = Date.now();
    expect(expiryRequest.status).toBe(200);
    vi.spyOn(Date, "now").mockReturnValue(realNow + 301_000);
    try {
      const expired = await request(base, "/api/v1/auth/mobile/verify", {
        mobile: expiredMobile,
        code: expiryRequest.body.data.developmentCode,
      });
      expect(expired.status).toBe(410);
      expect(expired.body.error.code).toBe("OTP_EXPIRED");
    } finally {
      vi.restoreAllMocks();
    }

    const lockedMobile = "+919833333333",
      lockedRequest = await request(base, "/api/v1/auth/mobile/request", {
        mobile: lockedMobile,
      }),
      lockedCode = lockedRequest.body.data.developmentCode as string,
      invalidCode = lockedCode === "111111" ? "111112" : "111111";
    for (let attempt = 1; attempt <= 5; attempt++) {
      const result = await request(base, "/api/v1/auth/mobile/verify", {
        mobile: lockedMobile,
        code: invalidCode,
      });
      if (attempt < 5) {
        expect(result.status).toBe(401);
        expect(result.body.error.details.attemptsRemaining).toBe(5 - attempt);
      } else {
        expect(result.status).toBe(429);
        expect(result.body.error).toMatchObject({
          code: "OTP_ATTEMPTS_EXCEEDED",
          details: { action: "REQUEST_NEW_CODE" },
        });
      }
    }
  });

  it("returns retry metadata when the auth request rate limit is exceeded", async () => {
    const isolated = await listen(testConfig);
    try {
      let limited: Awaited<ReturnType<typeof request>> | undefined;
      for (let index = 0; index < 6; index++)
        limited = await request(
          isolated.base,
          "/api/v1/auth/mobile/request",
          { mobile: `+91990000000${index}` },
        );
      expect(limited!.status).toBe(429);
      expect(limited!.body.error).toMatchObject({
        code: "RATE_LIMITED",
        details: { retryAfterSeconds: expect.any(Number) },
      });
      expect(Number(limited!.headers.get("retry-after"))).toBeGreaterThan(0);
    } finally {
      await close(isolated.server);
    }
  });
});

describe("Google customer authentication", () => {
  it("prefers a valid AUTH integration and lets an explicit disable suppress the env fallback", async () => {
    const environmentConfig = {
      ...testConfig,
      GOOGLE_CLIENT_ID: "environment-client.apps.googleusercontent.com",
    };
    const disabledStore = new CommerceStore();
    disabledStore.integrations.set("auth-google-disabled", {
      id: "auth-google-disabled",
      kind: "AUTH",
      provider: "google",
      enabled: false,
      priority: 1,
      environment: "TEST",
      encryptedCredentials: "",
      publicConfig: {
        clientId: "disabled-client.apps.googleusercontent.com",
      },
      updatedAt: new Date().toISOString(),
    });
    const disabled = await listen(environmentConfig, { store: disabledStore });
    try {
      const providers = await request(
        disabled.base,
        "/api/v1/auth/providers",
      );
      expect(providers.body.data.google).toEqual({
        enabled: false,
        clientId: "",
      });
    } finally {
      await close(disabled.server);
    }

    const configuredStore = new CommerceStore();
    configuredStore.integrations.set("auth-google-enabled", {
      id: "auth-google-enabled",
      kind: "AUTH",
      provider: "google",
      enabled: true,
      priority: 1,
      environment: "TEST",
      encryptedCredentials: "",
      publicConfig: {
        clientId: "integration-client.apps.googleusercontent.com",
      },
      updatedAt: new Date().toISOString(),
    });
    let verifiedAudience = "";
    const configured = await listen(environmentConfig, {
      store: configuredStore,
      googleVerifier: async (_credential, audience) => {
        verifiedAudience = audience;
        return googleClaims("integration-subject", "integration@example.com");
      },
    });
    try {
      const providers = await request(
        configured.base,
        "/api/v1/auth/providers",
      );
      expect(providers.body.data.google).toEqual({
        enabled: true,
        clientId: "integration-client.apps.googleusercontent.com",
      });
      const login = await request(configured.base, "/api/v1/auth/google", {
        credential: "integration".padEnd(120, "x"),
      });
      expect(login.status).toBe(200);
      expect(verifiedAudience).toBe(
        "integration-client.apps.googleusercontent.com",
      );
    } finally {
      await close(configured.server);
    }
  });

  it("fails closed for malformed integration and environment client IDs", async () => {
    const store = new CommerceStore();
    store.integrations.set("auth-google-invalid", {
      id: "auth-google-invalid",
      kind: "AUTH",
      provider: "google",
      enabled: true,
      priority: 1,
      environment: "TEST",
      encryptedCredentials: "",
      publicConfig: { clientId: "not-a-google-client-id" },
      updatedAt: new Date().toISOString(),
    });
    const isolated = await listen(
      {
        ...testConfig,
        GOOGLE_CLIENT_ID: "environment-client.apps.googleusercontent.com",
      },
      { store },
    );
    try {
      const providers = await request(
        isolated.base,
        "/api/v1/auth/providers",
      );
      expect(providers.body.data.google).toEqual({
        enabled: false,
        clientId: "",
      });
    } finally {
      await close(isolated.server);
    }

    const malformedEnvironment = await listen({
      ...testConfig,
      GOOGLE_CLIENT_ID: "not-a-google-client-id",
    });
    try {
      const providers = await request(
        malformedEnvironment.base,
        "/api/v1/auth/providers",
      );
      expect(providers.body.data.google).toEqual({
        enabled: false,
        clientId: "",
      });
    } finally {
      await close(malformedEnvironment.server);
    }
  });

  it("keys returning users by Google subject and rejects email-only collisions", async () => {
    const initialCredential = "initial-google".padEnd(120, "x"),
      changedCredential = "changed-google".padEnd(120, "x"),
      collisionCredential = "collision-google".padEnd(120, "x"),
      blankSubjectCredential = "blank-google".padEnd(120, "x");
    const verifier = async (credential: string) => {
      if (credential === changedCredential)
        return googleClaims("stable-subject", "renamed@example.com");
      if (credential === collisionCredential)
        return googleClaims("different-subject", "existing@example.com");
      if (credential === blankSubjectCredential)
        return googleClaims("   ", "blank-subject@example.com");
      return googleClaims("stable-subject", "original@example.com");
    };
    const isolated = await listen(
      {
        ...testConfig,
        GOOGLE_CLIENT_ID: "environment-client.apps.googleusercontent.com",
      },
      { googleVerifier: verifier },
    );
    try {
      const initial = await request(isolated.base, "/api/v1/auth/google", {
        credential: initialCredential,
      });
      expect(initial.status).toBe(200);
      const returning = await request(isolated.base, "/api/v1/auth/google", {
        credential: changedCredential,
      });
      expect(returning.status).toBe(200);
      expect(returning.body.data.user.id).toBe(initial.body.data.user.id);
      expect(returning.body.data.user.email).toBe("original@example.com");

      const registered = await request(isolated.base, "/api/v1/auth/register", {
        name: "Existing Customer",
        email: "existing@example.com",
        password: "StrongPass!88",
      });
      expect(registered.status).toBe(201);
      const collision = await request(isolated.base, "/api/v1/auth/google", {
        credential: collisionCredential,
      });
      expect(collision.status).toBe(409);
      expect(collision.body.error).toMatchObject({
        code: "GOOGLE_ACCOUNT_LINK_REQUIRED",
        message: expect.stringContaining("existing method"),
      });

      const blankSubject = await request(
        isolated.base,
        "/api/v1/auth/google",
        { credential: blankSubjectCredential },
      );
      expect(blankSubject.status).toBe(401);
      expect(blankSubject.body.error.code).toBe("INVALID_GOOGLE_TOKEN");
    } finally {
      await close(isolated.server);
    }
  });

  it("links Google only after password and email reauthentication", async () => {
    const linkedCredential = "link-google".padEnd(120, "x"),
      mismatchCredential = "link-mismatch".padEnd(120, "x"),
      otherCredential = "link-other".padEnd(120, "x");
    const isolated = await listen(
      {
        ...testConfig,
        GOOGLE_CLIENT_ID: "environment-client.apps.googleusercontent.com",
      },
      {
        googleVerifier: async (credential) => {
          if (credential === mismatchCredential)
            return googleClaims("mismatch-subject", "other@example.com");
          if (credential === otherCredential)
            return googleClaims("other-subject", "link@example.com");
          return googleClaims("linked-subject", "link@example.com");
        },
      },
    );
    try {
      expect(
        (
          await request(isolated.base, "/api/v1/auth/register", {
            name: "Link Customer",
            email: "link@example.com",
            password: "StrongPass!90",
          })
        ).status,
      ).toBe(201);
      const login = await request(isolated.base, "/api/v1/auth/login", {
        email: "link@example.com",
        password: "StrongPass!90",
      });
      expect(login.status).toBe(200);
      const authorized = async (
        method: "GET" | "POST" | "DELETE",
        path: string,
        body?: unknown,
      ) => {
        const response = await fetch(`${isolated.base}${path}`, {
          method,
          headers: {
            authorization: `Bearer ${login.body.data.accessToken}`,
            ...(body === undefined
              ? {}
              : { "content-type": "application/json" }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return {
          status: response.status,
          headers: response.headers,
          body: (await response.json()) as any,
        };
      };
      const methods = await authorized("GET", "/api/v1/account/auth-methods");
      expect(methods.body.data.password).toBe(true);
      expect(methods.body.data.google).toEqual({
        linked: false,
        enabled: true,
        clientId: "environment-client.apps.googleusercontent.com",
      });

      const wrongDeletionPassword = await authorized(
        "DELETE",
        "/api/v1/account",
        { confirmation: "DELETE", password: "WrongPass!1" },
      );
      expect(wrongDeletionPassword.status).toBe(401);
      expect(wrongDeletionPassword.body.error.code).toBe(
        "INVALID_CURRENT_PASSWORD",
      );
      const unlinkedGoogleDeletion = await authorized(
        "DELETE",
        "/api/v1/account",
        {
          confirmation: "DELETE",
          googleCredential: linkedCredential,
        },
      );
      expect(unlinkedGoogleDeletion.status).toBe(409);
      expect(unlinkedGoogleDeletion.body.error.code).toBe(
        "GOOGLE_ACCOUNT_NOT_LINKED",
      );

      const wrongPassword = await authorized(
        "POST",
        "/api/v1/account/auth/google/link",
        {
          currentPassword: "WrongPass!1",
          googleCredential: linkedCredential,
        },
      );
      expect(wrongPassword.status).toBe(401);
      expect(wrongPassword.body.error.code).toBe("INVALID_CURRENT_PASSWORD");

      const mismatch = await authorized(
        "POST",
        "/api/v1/account/auth/google/link",
        {
          currentPassword: "StrongPass!90",
          googleCredential: mismatchCredential,
        },
      );
      expect(mismatch.status).toBe(409);
      expect(mismatch.body.error.code).toBe("GOOGLE_EMAIL_MISMATCH");

      const linked = await authorized(
        "POST",
        "/api/v1/account/auth/google/link",
        {
          currentPassword: "StrongPass!90",
          googleCredential: linkedCredential,
        },
      );
      expect(linked.status).toBe(200);
      expect(linked.body.data.google).toEqual({
        linked: true,
        enabled: true,
        clientId: "environment-client.apps.googleusercontent.com",
      });
      expect(
        (
          await authorized("POST", "/api/v1/account/auth/google/link", {
            currentPassword: "StrongPass!90",
            googleCredential: linkedCredential,
          })
        ).status,
      ).toBe(200);

      const differentGoogleAccount = await authorized(
        "POST",
        "/api/v1/account/auth/google/link",
        {
          currentPassword: "StrongPass!90",
          googleCredential: otherCredential,
        },
      );
      expect(differentGoogleAccount.status).toBe(409);
      expect(differentGoogleAccount.body.error.code).toBe(
        "GOOGLE_ACCOUNT_ALREADY_LINKED",
      );
      const limitedLink = await authorized(
        "POST",
        "/api/v1/account/auth/google/link",
        {
          currentPassword: "StrongPass!90",
          googleCredential: linkedCredential,
        },
      );
      expect(limitedLink.status).toBe(429);
      expect(limitedLink.body.error.code).toBe("RATE_LIMITED");
      expect(Number(limitedLink.headers.get("retry-after"))).toBeGreaterThan(0);
    } finally {
      await close(isolated.server);
    }
  });

  it("uses the linked audience and subject for deletion even when Google login is disabled", async () => {
    const loginCredential = "delete-login".padEnd(120, "x"),
      wrongCredential = "delete-wrong".padEnd(120, "x"),
      linkedCredential = "delete-linked".padEnd(120, "x");
    const verifiedAudiences: string[] = [];
    const isolated = await listen(
      {
        ...testConfig,
        GOOGLE_CLIENT_ID: "environment-client.apps.googleusercontent.com",
      },
      {
        googleVerifier: async (credential, audience) => {
          verifiedAudiences.push(audience);
          if (credential === wrongCredential)
            return googleClaims("attacker-subject", "delete@example.com");
          if (credential === linkedCredential)
            return googleClaims("delete-subject", "changed@example.com");
          return googleClaims("delete-subject", "delete@example.com");
        },
      },
    );
    try {
      const login = await request(isolated.base, "/api/v1/auth/google", {
        credential: loginCredential,
      });
      expect(login.status).toBe(200);
      isolated.store.integrations.set("auth-google-disabled-after-link", {
        id: "auth-google-disabled-after-link",
        kind: "AUTH",
        provider: "google",
        enabled: false,
        priority: 1,
        environment: "TEST",
        encryptedCredentials: "",
        publicConfig: {
          clientId: "replacement-client.apps.googleusercontent.com",
        },
        updatedAt: new Date().toISOString(),
      });
      const authMethodsResponse = await fetch(
        `${isolated.base}/api/v1/account/auth-methods`,
        {
          headers: {
            authorization: `Bearer ${login.body.data.accessToken}`,
          },
        },
      );
      const authMethods = (await authMethodsResponse.json()) as any;
      expect(authMethods.data.password).toBe(false);
      expect(authMethods.data.google).toEqual({
        linked: true,
        enabled: false,
        clientId: "environment-client.apps.googleusercontent.com",
      });
      const storedGoogleUser = isolated.store.users.get(
        login.body.data.user.id,
      );
      expect(storedGoogleUser?.passwordEnabled).toBe(false);
      if (!storedGoogleUser)
        throw new Error("Google customer was not stored");
      storedGoogleUser.passwordHash = await hashPassword("KnownPass!93");
      const passwordLogin = await request(
        isolated.base,
        "/api/v1/auth/login",
        {
          email: storedGoogleUser.email,
          password: "KnownPass!93",
        },
      );
      expect(passwordLogin.status).toBe(401);
      expect(passwordLogin.body.error.code).toBe("INVALID_CREDENTIALS");
      const remove = async (credential: string) => {
        const response = await fetch(`${isolated.base}/api/v1/account`, {
          method: "DELETE",
          headers: {
            authorization: `Bearer ${login.body.data.accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            confirmation: "DELETE",
            googleCredential: credential,
          }),
        });
        return {
          status: response.status,
          body: (await response.json()) as any,
        };
      };
      const wrong = await remove(wrongCredential);
      expect(wrong.status).toBe(401);
      expect(wrong.body.error.code).toBe("REAUTHENTICATION_REQUIRED");

      const linked = await remove(linkedCredential);
      expect(linked.status).toBe(200);
      expect(linked.body.data.deleted).toBe(true);
      expect(verifiedAudiences).toEqual([
        "environment-client.apps.googleusercontent.com",
        "environment-client.apps.googleusercontent.com",
        "environment-client.apps.googleusercontent.com",
      ]);
    } finally {
      await close(isolated.server);
    }
  });
});

describe("account deletion throttling", () => {
  it("limits repeated reauthentication attempts per customer account", async () => {
    const isolated = await listen(testConfig);
    try {
      const registerAndLogin = async (email: string) => {
        const registered = await request(
          isolated.base,
          "/api/v1/auth/register",
          {
            name: "Deletion limiter customer",
            email,
            password: "StrongPass!94",
          },
        );
        expect(registered.status).toBe(201);
        const login = await request(isolated.base, "/api/v1/auth/login", {
          email,
          password: "StrongPass!94",
        });
        expect(login.status).toBe(200);
        return login.body.data.accessToken as string;
      };
      const firstToken = await registerAndLogin("delete-limit-1@example.com"),
        secondToken = await registerAndLogin("delete-limit-2@example.com"),
        removeWithWrongPassword = async (accessToken: string) => {
          const response = await fetch(`${isolated.base}/api/v1/account`, {
            method: "DELETE",
            headers: {
              authorization: `Bearer ${accessToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              confirmation: "DELETE",
              password: "WrongPass!1",
            }),
          });
          return {
            status: response.status,
            headers: response.headers,
            body: (await response.json()) as any,
          };
        };

      for (let attempt = 0; attempt < 8; attempt++) {
        const result = await removeWithWrongPassword(firstToken);
        expect(result.status).toBe(401);
        expect(result.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
      }
      const limited = await removeWithWrongPassword(firstToken);
      expect(limited.status).toBe(429);
      expect(limited.body.error).toMatchObject({
        code: "RATE_LIMITED",
        details: { retryAfterSeconds: expect.any(Number) },
      });
      expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
      expect(isolated.store.findUser("delete-limit-1@example.com")).toBeTruthy();

      const otherAccount = await removeWithWrongPassword(secondToken);
      expect(otherAccount.status).toBe(401);
      expect(otherAccount.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
    } finally {
      await close(isolated.server);
    }
  });
});

describe("persisted account-deletion reauthentication", () => {
  it("consumes the database OTP challenge and preserves each OTP outcome", async () => {
    const store = new CommerceStore(),
      user = store.createUser({
        name: "Persisted OTP Customer",
        email: "persisted-otp@example.com",
        mobile: "+919855555555",
        passwordHash: "unused-password-hash",
        role: "CUSTOMER",
        permissions: [],
      }),
      accountState = {
        exists: true,
        customer: true,
        disabled: false,
        disabledAt: null,
        authVersion: 0,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          passwordHash: user.passwordHash,
          role: "CUSTOMER",
          disabledAt: null,
          authVersion: 0,
        },
      },
      retryAt = Date.now() + 30_000,
      consumeMobileOtpChallenge = vi
        .fn()
        .mockResolvedValueOnce({ outcome: "NOT_FOUND" })
        .mockResolvedValueOnce({ outcome: "EXPIRED" })
        .mockResolvedValueOnce({
          outcome: "INVALID",
          attemptsRemaining: 3,
          resendAt: retryAt,
        })
        .mockResolvedValueOnce({
          outcome: "ATTEMPTS_EXCEEDED",
          attemptsRemaining: 0,
          resendAt: retryAt,
        })
        .mockResolvedValueOnce({ outcome: "VERIFIED" }),
      persistence = {
        connect: vi.fn(async () => undefined),
        hydrate: vi.fn(async () => undefined),
        getCustomerAccountState: vi.fn(async () => accountState),
        consumeMobileOtpChallenge,
        deleteCustomerAccount: vi.fn(async () => ({
          deleted: true,
          retainedOrders: 0,
        })),
      };
    const created = await createApp({
        config: testConfig,
        store,
        persistence: persistence as never,
      }),
      server = created.app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test port");
    const base = `http://127.0.0.1:${address.port}`,
      accessToken = signAccessToken(
        {
          sub: user.id,
          role: user.role,
          permissions: [],
          authVersion: 0,
        },
        testConfig.JWT_SECRET,
      ),
      remove = async () => {
        const response = await fetch(`${base}/api/v1/account`, {
          method: "DELETE",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            confirmation: "DELETE",
            mobileOtp: "123456",
          }),
        });
        return {
          status: response.status,
          headers: response.headers,
          body: (await response.json()) as any,
        };
      };
    try {
      const notRequested = await remove();
      expect(notRequested.status).toBe(400);
      expect(notRequested.body.error.code).toBe("OTP_NOT_REQUESTED");

      const expired = await remove();
      expect(expired.status).toBe(410);
      expect(expired.body.error.code).toBe("OTP_EXPIRED");

      const invalid = await remove();
      expect(invalid.status).toBe(401);
      expect(invalid.body.error).toMatchObject({
        code: "INVALID_OTP",
        details: { attemptsRemaining: 3 },
      });

      const exhausted = await remove();
      expect(exhausted.status).toBe(429);
      expect(exhausted.body.error).toMatchObject({
        code: "OTP_ATTEMPTS_EXCEEDED",
        details: { action: "REQUEST_NEW_CODE" },
      });
      expect(Number(exhausted.headers.get("retry-after"))).toBeGreaterThan(0);

      const verified = await remove();
      expect(verified.status).toBe(200);
      expect(verified.body.data.deleted).toBe(true);
      expect(consumeMobileOtpChallenge).toHaveBeenLastCalledWith(
        expect.objectContaining({
          mobile: user.mobile,
          submittedHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          maxAttempts: 5,
        }),
      );
    } finally {
      await close(server);
    }
  });
});

describe("production mobile OTP availability", () => {
  it("does not advertise or accept OTP when no live SMS delivery is configured", async () => {
    const { server, base } = await listen({
      ...testConfig,
      NODE_ENV: "production",
    });
    try {
      const providers = await request(base, "/api/v1/auth/providers"),
        otp = await request(base, "/api/v1/auth/mobile/request", {
          mobile: "+919866666666",
        });
      expect(providers.body.data.mobileOtp.enabled).toBe(false);
      expect(otp.status).toBe(503);
      expect(otp.body.error.code).toBe("MOBILE_OTP_UNAVAILABLE");
    } finally {
      await close(server);
    }
  });
});
