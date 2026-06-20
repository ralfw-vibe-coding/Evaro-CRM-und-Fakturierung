import { describe, expect, it } from "vitest";
import { updateProfile } from "../update-profile.js";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { Session, SessionProvider } from "@/domain/pproviders/session/session-provider";

function fakeBackendApi(overrides: Partial<BackendApiProvider> = {}): BackendApiProvider {
  return {
    requestOtp: async () => ({ ok: false, error: "not used" }),
    verifyOtp: async () => ({ ok: false, error: "not used" }),
    updateProfile: async () => ({
      ok: true,
      value: { user: { id: "u1", email: "rk@example.com", abbr: "RW" } },
    }),
    generateApiKey: async () => ({ ok: false, error: "not used" }),
    deleteApiKey: async () => ({ ok: false, error: "not used" }),
    loadSelection: async () => ({ ok: false, error: "not used" }),
    createContact: async () => ({ ok: false, error: "not used" }),
    updateContact: async () => ({ ok: false, error: "not used" }),
    deleteContact: async () => ({ ok: false, error: "not used" }),
    createBusinessPartner: async () => ({ ok: false, error: "not used" }),
    updateBusinessPartner: async () => ({ ok: false, error: "not used" }),
    deleteBusinessPartner: async () => ({ ok: false, error: "not used" }),
    linkContactGp: async () => ({ ok: false, error: "not used" }),
    unlinkContactGp: async () => ({ ok: false, error: "not used" }),
    loadInvoicingData: async () => ({ ok: false, error: "not used" }),
    createInvoiceDraft: async () => ({ ok: false, error: "not used" }),
    updateInvoiceDraft: async () => ({ ok: false, error: "not used" }),
    billInvoice: async () => ({ ok: false, error: "not used" }),
    changeInvoiceStatus: async () => ({ ok: false, error: "not used" }),
    deleteInvoiceDraft: async () => ({ ok: false, error: "not used" }),
    createPaymentTerm: async () => ({ ok: false, error: "not used" }),
    ...overrides,
  };
}

function fakeSession(initial: Session | null): SessionProvider & { saved: Session[] } {
  const saved: Session[] = [];
  return {
    saved,
    get: () => saved[saved.length - 1] ?? initial,
    save: (session) => saved.push(session),
    clear: () => saved.splice(0, saved.length),
  };
}

describe("updateProfile RPU", () => {
  it("updates the profile and keeps the session token", async () => {
    const session = fakeSession({ token: "tok-1", user: { id: "u1", email: "rk@example.com", abbr: "RK" } });
    const process = updateProfile({ backendApi: fakeBackendApi(), session });

    const result = await process({ abbr: "RW" });

    expect(result).toEqual({ ok: true, user: { id: "u1", email: "rk@example.com", abbr: "RW" } });
    expect(session.saved).toEqual([{ token: "tok-1", user: { id: "u1", email: "rk@example.com", abbr: "RW" } }]);
  });

  it("fails without a session and does not call the backend", async () => {
    let called = false;
    const process = updateProfile({
      backendApi: fakeBackendApi({
        updateProfile: async () => {
          called = true;
          return { ok: true, value: { user: { id: "u1", email: "rk@example.com", abbr: "RW" } } };
        },
      }),
      session: fakeSession(null),
    });

    const result = await process({ abbr: "RW" });

    expect(result.ok).toBe(false);
    expect(called).toBe(false);
  });
});
