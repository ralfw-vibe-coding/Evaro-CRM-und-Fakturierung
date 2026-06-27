import { describe, it, expect } from "vitest";
import { verifyOtp } from "../verify-otp.js";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { Session, SessionProvider } from "@/domain/pproviders/session/session-provider";

function fakeBackendApi(overrides: Partial<BackendApiProvider> = {}): BackendApiProvider {
  return {
    requestOtp: async () => ({ ok: true, value: undefined }),
    verifyOtp: async () => ({
      ok: true,
      value: { token: "tok-1", user: { id: "u1", email: "rk@example.com", abbr: "RK" } },
    }),
    updateProfile: async () => ({ ok: false, error: "not used" }),
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
    analyzeEmailImport: async () => ({ ok: false, error: "not used" }),
    loadInvoicingData: async () => ({ ok: false, error: "not used" }),
    createInvoiceDraft: async () => ({ ok: false, error: "not used" }),
    updateInvoiceDraft: async () => ({ ok: false, error: "not used" }),
    billInvoice: async () => ({ ok: false, error: "not used" }),
    changeInvoiceStatus: async () => ({ ok: false, error: "not used" }),
    deleteInvoiceDraft: async () => ({ ok: false, error: "not used" }),
    createPaymentTerm: async () => ({ ok: false, error: "not used" }),
    loadAppSettings: async () => ({ ok: false, error: "not used" }),
    updateAppSettings: async () => ({ ok: false, error: "not used" }),
    ...overrides,
  };
}

function fakeSession(): SessionProvider & { saved: Session[] } {
  const saved: Session[] = [];
  return {
    saved,
    get: () => saved[saved.length - 1] ?? null,
    save: (s) => saved.push(s),
    clear: () => saved.splice(0, saved.length),
  };
}

describe("verifyOtp RPU", () => {
  it("saves the session and returns the user on success", async () => {
    const session = fakeSession();
    const process = verifyOtp({ backendApi: fakeBackendApi(), session });

    const result = await process({ email: "rk@example.com", otp: "hibiskus" });

    expect(result).toEqual({ ok: true, user: { id: "u1", email: "rk@example.com", abbr: "RK" } });
    expect(session.saved).toEqual([{ token: "tok-1", user: { id: "u1", email: "rk@example.com", abbr: "RK" } }]);
  });

  it("does not save a session on a wrong OTP", async () => {
    const session = fakeSession();
    const process = verifyOtp({
      backendApi: fakeBackendApi({
        verifyOtp: async () => ({ ok: false, error: "Falscher oder abgelaufener Code." }),
      }),
      session,
    });

    const result = await process({ email: "rk@example.com", otp: "falsch" });

    expect(result.ok).toBe(false);
    expect(session.saved).toHaveLength(0);
  });
});
