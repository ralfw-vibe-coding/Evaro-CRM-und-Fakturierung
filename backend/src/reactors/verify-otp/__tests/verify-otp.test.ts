import { describe, it, expect, beforeEach } from "vitest";
import { verifyOtp } from "../verify-otp.js";
import { authenticateUser } from "../../../domain/rpus/authenticate-user/authenticate-user.js";
import { InMemoryUsersProvider } from "../../../domain/pproviders/users/in-memory-users-provider.js";
import { hashOtp } from "../../request-otp/request-otp.js";
import type { OtpChallenge, OtpProvider } from "../../../shell/xproviders/otp/otp-provider.js";
import type { TokensProvider, TokenPayload } from "../../../shell/xproviders/tokens/tokens-provider.js";

/** Lightweight fake token provider for reactor tests (see tech-stack.md). */
class FakeTokensProvider implements TokensProvider {
  async sign(payload: TokenPayload): Promise<string> {
    return `fake.${payload.user_id}`;
  }
  async verify(token: string): Promise<TokenPayload | null> {
    const id = token.startsWith("fake.") ? token.slice(5) : null;
    return id ? { user_id: id, email: "", abbr: "" } : null;
  }
}

const OTP = "hibiskus";

class FakeOtpProvider implements OtpProvider {
  challenge: OtpChallenge | null = null;

  constructor(email: string, code: string) {
    this.challenge = {
      email,
      code_hash: hashOtp(email, code),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
  }

  async store(challenge: OtpChallenge): Promise<void> {
    this.challenge = challenge;
  }

  async consume(email: string, code_hash: string, now: Date): Promise<boolean> {
    if (!this.challenge) return false;
    if (this.challenge.email !== email) return false;
    if (this.challenge.code_hash !== code_hash) return false;
    if (Date.parse(this.challenge.expires_at) <= now.getTime()) return false;
    this.challenge = null;
    return true;
  }
}

function setup() {
  const users = new InMemoryUsersProvider();
  const tokens = new FakeTokensProvider();
  const otps = new FakeOtpProvider("rk@example.com", OTP);
  const process = verifyOtp({
    otps,
    authenticateUser: authenticateUser({ users }),
    tokens,
  });
  return { users, tokens, otps, process };
}

describe("verifyOtp reactor", () => {
  let env: ReturnType<typeof setup>;
  beforeEach(() => {
    env = setup();
  });

  it("issues a token for a correct OTP and creates the user on first login", async () => {
    const result = await env.process({ email: "rk@example.com", otp: OTP });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.token).toBe(`fake.${result.user.id}`);
    expect(result.user.email).toBe("rk@example.com");
    expect(await env.users.findByEmail("rk@example.com")).not.toBeNull();
  });

  it("rejects a wrong OTP without creating a user", async () => {
    const result = await env.process({ email: "rk@example.com", otp: "wrong" });
    expect(result.ok).toBe(false);
    expect(await env.users.findByEmail("rk@example.com")).toBeNull();
  });

  it("rejects an invalid email even with the correct OTP", async () => {
    const result = await env.process({ email: "nope", otp: OTP });
    expect(result.ok).toBe(false);
  });
});
