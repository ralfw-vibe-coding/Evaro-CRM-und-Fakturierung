import { describe, it, expect } from "vitest";
import { loadSelection } from "../load-selection.js";
import { InMemorySelectionStoreProvider } from "@/domain/pproviders/selection-store/in-memory-selection-store-provider";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

const SAMPLE = {
  contacts: [{ id: "c1", active: true, data: { channels: [] }, created_at: "", updated_at: "" }],
  business_partners: [],
  contact_gps: [],
};

function fakeBackendApi(overrides: Partial<BackendApiProvider> = {}): BackendApiProvider {
  return {
    requestOtp: async () => ({ ok: true, value: undefined }),
    verifyOtp: async () => ({ ok: false, error: "not used" }),
    updateProfile: async () => ({ ok: false, error: "not used" }),
    generateApiKey: async () => ({ ok: false, error: "not used" }),
    deleteApiKey: async () => ({ ok: false, error: "not used" }),
    loadSelection: async () => ({ ok: true, value: SAMPLE }),
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

function sessionWith(token: string | null): SessionProvider {
  return {
    get: () => (token ? { token, user: { id: "u1", email: "rk@example.com", abbr: "RK" } } : null),
    save: () => {},
    clear: () => {},
  };
}

describe("loadSelection RPU", () => {
  it("fetches the selection and stores it", async () => {
    const selectionStore = new InMemorySelectionStoreProvider();
    const process = loadSelection({
      backendApi: fakeBackendApi(),
      session: sessionWith("tok"),
      selectionStore,
    });

    const result = await process();

    expect(result).toEqual({ ok: true });
    expect(selectionStore.get()).toEqual(SAMPLE);
  });

  it("fails without a session and does not call the backend", async () => {
    let called = false;
    const process = loadSelection({
      backendApi: fakeBackendApi({
        loadSelection: async () => {
          called = true;
          return { ok: true, value: SAMPLE };
        },
      }),
      session: sessionWith(null),
      selectionStore: new InMemorySelectionStoreProvider(),
    });

    const result = await process();

    expect(result.ok).toBe(false);
    expect(called).toBe(false);
  });

  it("forwards a backend error without storing anything", async () => {
    const selectionStore = new InMemorySelectionStoreProvider();
    const process = loadSelection({
      backendApi: fakeBackendApi({ loadSelection: async () => ({ ok: false, error: "401" }) }),
      session: sessionWith("tok"),
      selectionStore,
    });

    const result = await process();

    expect(result).toEqual({ ok: false, error: "401" });
    expect(selectionStore.get()).toBeNull();
  });
});
