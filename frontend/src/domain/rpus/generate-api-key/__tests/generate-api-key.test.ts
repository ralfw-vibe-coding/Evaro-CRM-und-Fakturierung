import { describe, expect, it } from "vitest";
import { generateApiKey } from "../generate-api-key.js";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { Session, SessionProvider } from "@/domain/pproviders/session/session-provider";

function fakeBackendApi(overrides: Partial<BackendApiProvider> = {}): BackendApiProvider {
  return {
    requestOtp: async () => ({ ok: false, error: "not used" }),
    verifyOtp: async () => ({ ok: false, error: "not used" }),
    updateProfile: async () => ({ ok: false, error: "not used" }),
    generateApiKey: async () => ({
      ok: true,
      value: {
        api_key: "00000000-0000-4000-8000-000000000000",
        user: { id: "u1", email: "rk@example.com", abbr: "RK", api_key_created_at: "2026-01-01T00:00:00.000Z" },
      },
    }),
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

describe("generateApiKey RPU", () => {
  it("returns the one-time key and updates the session user", async () => {
    const session = fakeSession({ token: "tok", user: { id: "u1", email: "rk@example.com", abbr: "RK" } });
    const process = generateApiKey({ backendApi: fakeBackendApi(), session });

    const result = await process();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.api_key).toBe("00000000-0000-4000-8000-000000000000");
    expect(session.saved[0].user.api_key_created_at).toBe("2026-01-01T00:00:00.000Z");
  });
});
