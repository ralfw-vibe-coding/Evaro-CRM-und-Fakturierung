import { describe, it, expect, beforeEach } from "vitest";
import { verifyOtp } from "../verify-otp.js";
import { authenticateUser } from "../../../domain/rpus/authenticate-user/authenticate-user.js";
import { InMemoryUsersProvider } from "../../../domain/pproviders/users/in-memory-users-provider.js";
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

function setup() {
  const users = new InMemoryUsersProvider();
  const tokens = new FakeTokensProvider();
  const process = verifyOtp({
    acceptedOtp: OTP,
    authenticateUser: authenticateUser({ users }),
    tokens,
  });
  return { users, tokens, process };
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
