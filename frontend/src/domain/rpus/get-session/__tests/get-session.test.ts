import { describe, it, expect } from "vitest";
import { getSession } from "../get-session.js";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

describe("getSession RPU", () => {
  it("returns the user from an active session", () => {
    const session: SessionProvider = {
      get: () => ({ token: "t", user: { id: "u1", email: "rk@example.com", abbr: "RK" } }),
      save: () => {},
      clear: () => {},
    };
    expect(getSession({ session })()).toEqual({ id: "u1", email: "rk@example.com", abbr: "RK" });
  });

  it("returns null when there is no session", () => {
    const session: SessionProvider = { get: () => null, save: () => {}, clear: () => {} };
    expect(getSession({ session })()).toBeNull();
  });
});
