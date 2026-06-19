import { describe, it, expect, beforeEach } from "vitest";
import { authenticateUser } from "../authenticate-user.js";
import { InMemoryUsersProvider } from "../../../pproviders/users/in-memory-users-provider.js";

function setup() {
  const users = new InMemoryUsersProvider();
  return { users, process: authenticateUser({ users }) };
}

describe("authenticateUser RPU", () => {
  let env: ReturnType<typeof setup>;
  beforeEach(() => {
    env = setup();
  });

  it("creates a new user on first login and derives an abbreviation", async () => {
    const result = await env.process({ email: "Petra.Paulsen@aok.de" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user.email).toBe("petra.paulsen@aok.de");
    expect(result.user.abbr).toBe("PP");
  });

  it("returns the same user on subsequent logins (no duplicate)", async () => {
    const first = await env.process({ email: "rk@example.com" });
    const second = await env.process({ email: "RK@example.com" });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.user.id).toBe(first.user.id);
  });

  it("rejects an invalid email", async () => {
    const result = await env.process({ email: "not-an-email" });
    expect(result.ok).toBe(false);
  });
});
