import { describe, it, expect } from "vitest";
import { logout } from "../logout.js";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

describe("logout RPU", () => {
  it("clears the session", () => {
    let cleared = false;
    const session: SessionProvider = {
      get: () => null,
      save: () => {},
      clear: () => {
        cleared = true;
      },
    };
    logout({ session })();
    expect(cleared).toBe(true);
  });
});
