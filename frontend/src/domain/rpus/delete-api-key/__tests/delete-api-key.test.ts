import { describe, expect, it } from "vitest";
import { deleteApiKey } from "../delete-api-key.js";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { Session, SessionProvider } from "@/domain/pproviders/session/session-provider";

function fakeBackendApi(overrides: Partial<BackendApiProvider> = {}): BackendApiProvider {
  return {
    requestOtp: async () => ({ ok: false, error: "not used" }),
    verifyOtp: async () => ({ ok: false, error: "not used" }),
    updateProfile: async () => ({ ok: false, error: "not used" }),
    generateApiKey: async () => ({ ok: false, error: "not used" }),
    deleteApiKey: async () => ({
      ok: true,
      value: { user: { id: "u1", email: "rk@example.com", abbr: "RK", api_key_created_at: null } },
    }),
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

function fakeSession(initial: Session | null): SessionProvider & { saved: Session[] } {
  const saved: Session[] = [];
  return {
    saved,
    get: () => saved[saved.length - 1] ?? initial,
    save: (session) => saved.push(session),
    clear: () => saved.splice(0, saved.length),
  };
}

describe("deleteApiKey RPU", () => {
  it("deletes the key marker and updates the session user", async () => {
    const session = fakeSession({
      token: "tok",
      user: { id: "u1", email: "rk@example.com", abbr: "RK", api_key_created_at: "2026-01-01T00:00:00.000Z" },
    });
    const process = deleteApiKey({ backendApi: fakeBackendApi(), session });

    const result = await process();

    expect(result).toEqual({ ok: true, user: { id: "u1", email: "rk@example.com", abbr: "RK", api_key_created_at: null } });
    expect(session.saved[0].user.api_key_created_at).toBeNull();
  });
});
