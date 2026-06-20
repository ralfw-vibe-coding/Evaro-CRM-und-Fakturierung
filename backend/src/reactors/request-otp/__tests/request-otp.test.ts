import { describe, expect, it } from "vitest";
import { requestOtp, hashOtp } from "../request-otp.js";
import type { OtpChallenge, OtpProvider } from "../../../shell/xproviders/otp/otp-provider.js";

class FakeOtpProvider implements OtpProvider {
  stored: OtpChallenge | null = null;

  async store(challenge: OtpChallenge): Promise<void> {
    this.stored = challenge;
  }

  async consume(): Promise<boolean> {
    return false;
  }
}

describe("requestOtp reactor", () => {
  it("stores a hashed OTP and sends it by email", async () => {
    const otps = new FakeOtpProvider();
    const sent: { to: string; code: string; expiresInMinutes: number }[] = [];
    const process = requestOtp({
      otps,
      email: {
        sendOtpEmail: async (email) => {
          sent.push(email);
        },
      },
    });

    const result = await process({ email: " RK@Example.com " });

    expect(result).toEqual({ ok: true });
    expect(sent[0]?.to).toBe("rk@example.com");
    expect(sent[0]?.code).toMatch(/^\d{6}$/);
    expect(otps.stored?.email).toBe("rk@example.com");
    expect(otps.stored?.code_hash).toBe(hashOtp("rk@example.com", sent[0]?.code ?? ""));
    expect(otps.stored?.code_hash).not.toBe(sent[0]?.code);
  });

  it("rejects an invalid email", async () => {
    const process = requestOtp({
      otps: new FakeOtpProvider(),
      email: { sendOtpEmail: async () => {} },
    });

    const result = await process({ email: "nope" });

    expect(result.ok).toBe(false);
  });
});
