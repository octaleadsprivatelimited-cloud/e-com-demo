import { describe, expect, it } from "vitest";
import {
  integrationDefinition,
  integrationDto,
  selectRuntimeIntegration,
  testIntegrationConnection,
} from "../src/integrations.js";
import type { StoredIntegration } from "../src/store.js";

const record = (
  id: string,
  environment: "TEST" | "LIVE",
  priority = 1,
): StoredIntegration => ({
  id,
  kind: "PAYMENT",
  provider: "razorpay",
  enabled: true,
  priority,
  environment,
  encryptedCredentials: "not-used",
  publicConfig: {},
  updatedAt: "2026-08-21T12:00:00.000Z",
});

describe("integration runtime safety", () => {
  it("selects LIVE only in production and never falls back to TEST", () => {
    const test = record("test", "TEST");
    const live = record("live", "LIVE");
    expect(
      selectRuntimeIntegration(
        [test, live],
        "PAYMENT",
        "RazorPay",
        "production",
      )?.id,
    ).toBe("live");
    expect(
      selectRuntimeIntegration(
        [test],
        "PAYMENT",
        "razorpay",
        "production",
      ),
    ).toBeUndefined();
  });

  it("selects TEST only outside production and never falls back to LIVE", () => {
    const test = record("test", "TEST");
    const live = record("live", "LIVE");
    expect(
      selectRuntimeIntegration(
        [live, test],
        "PAYMENT",
        "razorpay",
        "development",
      )?.id,
    ).toBe("test");
    expect(
      selectRuntimeIntegration(
        [live],
        "PAYMENT",
        "razorpay",
        "test",
      ),
    ).toBeUndefined();
  });

  it("reports unsupported adapters honestly without making a request", async () => {
    const definition = integrationDefinition("SHIPPING", "Delhivery")!;
    let requested = false;
    const result = await testIntegrationConnection({
      definition,
      credentials: { token: "configured" },
      publicConfig: { pickupPostcode: "500001" },
      request: async () => {
        requested = true;
        return new Response(null, { status: 200 });
      },
    });
    expect(result.outcome).toBe("UNSUPPORTED");
    expect(requested).toBe(false);
  });

  it("never returns undeclared legacy public fields", () => {
    const definition = integrationDefinition("PAYMENT", "razorpay")!;
    const dto = integrationDto({
      definition,
      environment: "TEST",
      record: {
        ...record("PAYMENT:razorpay:TEST", "TEST"),
        publicConfig: {
          currency: "INR",
          accidentallyPublicSecret: "must-never-leak",
          _connection: { outcome: "CONNECTED" },
        },
      },
      credentials: { keyId: "public", keySecret: "private-secret" },
      mask: () => "masked",
    });
    expect(dto.publicConfig).toEqual({ currency: "INR" });
    expect(JSON.stringify(dto)).not.toContain("must-never-leak");
    expect(JSON.stringify(dto)).not.toContain("private-secret");
  });
});
