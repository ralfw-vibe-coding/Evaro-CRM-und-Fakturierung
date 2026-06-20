import { describe, expect, it } from "vitest";
import { InMemoryUsersProvider } from "../../../pproviders/users/in-memory-users-provider.js";
import { authenticateApiKey } from "../../authenticate-api-key/authenticate-api-key.js";
import { deleteUserApiKey } from "../../delete-user-api-key/delete-user-api-key.js";
import { generateUserApiKey } from "../generate-user-api-key.js";

describe("user API key RPUs", () => {
  it("generates a one-time API key that authenticates the user", async () => {
    const users = new InMemoryUsersProvider();
    const user = await users.insert({ email: "rk@example.com", abbr: "RK" });

    const generated = await generateUserApiKey({ users })({ user_id: user.id });

    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    expect(generated.api_key).toMatch(/^[0-9a-f-]{36}$/);
    expect(generated.user.api_key_created_at).toBeTruthy();

    const authenticated = await authenticateApiKey({ users })({ api_key: generated.api_key });
    expect(authenticated.ok).toBe(true);
    if (!authenticated.ok) return;
    expect(authenticated.user.id).toBe(user.id);
  });

  it("rejects a deleted API key", async () => {
    const users = new InMemoryUsersProvider();
    const user = await users.insert({ email: "rk@example.com", abbr: "RK" });
    const generated = await generateUserApiKey({ users })({ user_id: user.id });
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    const deleted = await deleteUserApiKey({ users })({ user_id: user.id });
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) return;
    expect(deleted.user.api_key_created_at).toBeNull();

    const authenticated = await authenticateApiKey({ users })({ api_key: generated.api_key });
    expect(authenticated.ok).toBe(false);
  });
});
