import { describe, expect, it } from "vitest";
import { InMemoryUsersProvider } from "../../../pproviders/users/in-memory-users-provider.js";
import { updateUserProfile } from "../update-user-profile.js";

describe("updateUserProfile RPU", () => {
  it("updates the user's abbreviation", async () => {
    const users = new InMemoryUsersProvider();
    const user = await users.insert({ email: "rk@example.com", abbr: "RK" });
    const process = updateUserProfile({ users });

    const result = await process({ user_id: user.id, abbr: " rw " });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user.abbr).toBe("RW");
  });

  it("rejects a duplicate abbreviation", async () => {
    const users = new InMemoryUsersProvider();
    const first = await users.insert({ email: "rk@example.com", abbr: "RK" });
    await users.insert({ email: "pp@example.com", abbr: "PP" });
    const process = updateUserProfile({ users });

    const result = await process({ user_id: first.id, abbr: "PP" });

    expect(result).toEqual({
      ok: false,
      error: "Validierung fehlgeschlagen.",
      fields: { abbr: "Dieses Kürzel ist bereits vergeben." },
    });
  });

  it("requires an abbreviation", async () => {
    const users = new InMemoryUsersProvider();
    const user = await users.insert({ email: "rk@example.com", abbr: "RK" });
    const process = updateUserProfile({ users });

    const result = await process({ user_id: user.id, abbr: " " });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fields?.abbr).toBeTruthy();
  });
});
