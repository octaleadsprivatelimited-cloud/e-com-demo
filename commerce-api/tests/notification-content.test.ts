import { describe, expect, it } from "vitest";
import {
  renderEmailNotification,
  renderSmsNotification,
} from "../src/notification-content.js";

describe("authentication notification content", () => {
  it("renders a branded welcome email and escapes customer-controlled text", () => {
    const content = renderEmailNotification("account.registered", {
      name: '<Admin & "Owner">',
      storeName: "Example <Store>",
    });
    expect(content.subject).toBe("Welcome to Example <Store>");
    expect(content.text).toContain('Welcome <Admin & "Owner">');
    expect(content.html).toContain(
      "Welcome &lt;Admin &amp; &quot;Owner&quot;&gt;",
    );
    expect(content.html).toContain("Example &lt;Store&gt;");
    expect(content.html).not.toContain("<Admin");
  });

  it("renders a useful branded OTP SMS without accepting malformed codes", () => {
    expect(
      renderSmsNotification("auth.mobile_otp", {
        code: "123456",
        expiresInMinutes: 5,
        storeName: "Customer Store",
      }),
    ).toBe(
      "123456 is your Customer Store verification code. It expires in 5 minutes. Do not share it.",
    );
    expect(() =>
      renderSmsNotification("auth.mobile_otp", {
        code: "12<script>",
        expiresInMinutes: 5,
      }),
    ).toThrow("invalid code");
  });
});
