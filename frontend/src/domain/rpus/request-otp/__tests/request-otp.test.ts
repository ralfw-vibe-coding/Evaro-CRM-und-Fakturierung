import { describe, it, expect } from "vitest";
import { requestOtp } from "../request-otp.js";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";

/** Fake pProvider for RPU tests (see tech-stack.md). */
function fakeBackendApi(overrides: Partial<BackendApiProvider> = {}): BackendApiProvider {
  return {
    requestOtp: async () => ({ ok: true, value: undefined }),
    verifyOtp: async () => ({ ok: false, error: "not used" }),
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

describe("requestOtp RPU", () => {
  it("delegates to the backend api and reports success", async () => {
    const process = requestOtp({ backendApi: fakeBackendApi() });
    const result = await process({ email: "rk@example.com" });
    expect(result).toEqual({ ok: true });
  });

  it("rejects an empty email without calling the backend", async () => {
    let called = false;
    const process = requestOtp({
      backendApi: fakeBackendApi({
        requestOtp: async () => {
          called = true;
          return { ok: true, value: undefined };
        },
      }),
    });
    const result = await process({ email: "   " });
    expect(result.ok).toBe(false);
    expect(called).toBe(false);
  });

  it("forwards a backend error", async () => {
    const process = requestOtp({
      backendApi: fakeBackendApi({
        requestOtp: async () => ({ ok: false, error: "Server nicht erreichbar." }),
      }),
    });
    const result = await process({ email: "rk@example.com" });
    expect(result).toEqual({ ok: false, error: "Server nicht erreichbar." });
  });
});
