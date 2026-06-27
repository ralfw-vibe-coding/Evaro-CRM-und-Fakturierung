import { describe, it, expect } from "vitest";
import { updateContact } from "../update-contact.js";
import { InMemorySelectionStoreProvider } from "@/domain/pproviders/selection-store/in-memory-selection-store-provider";
import type { BackendApiProvider, UpdateContactInput } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";
import type { Contact } from "@/domain/model";

const EXISTING: Contact = {
  id: "c1",
  active: true,
  data: { first_name: "Petra", last_name: "Paulsen", channels: [] },
  created_at: "",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function fakeBackendApi(overrides: Partial<BackendApiProvider> = {}): BackendApiProvider {
  return {
    requestOtp: async () => ({ ok: true, value: undefined }),
    verifyOtp: async () => ({ ok: false, error: "not used" }),
    updateProfile: async () => ({ ok: false, error: "not used" }),
    generateApiKey: async () => ({ ok: false, error: "not used" }),
    deleteApiKey: async () => ({ ok: false, error: "not used" }),
    loadSelection: async () => ({ ok: false, error: "not used" }),
    createContact: async () => ({ ok: false, error: "not used" }),
    updateContact: async (_token, input: UpdateContactInput) => ({
      ok: true,
      value: { contact: { ...EXISTING, data: input.data, updated_at: "2026-01-02T00:00:00.000Z" }, conflict: false },
    }),
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

function sessionWith(token: string | null): SessionProvider {
  return {
    get: () => (token ? { token, user: { id: "u1", email: "rk@example.com", abbr: "RK" } } : null),
    save: () => {},
    clear: () => {},
  };
}

function storeWithExisting() {
  const store = new InMemorySelectionStoreProvider();
  store.set({ contacts: [EXISTING], business_partners: [], contact_gps: [] });
  return store;
}

describe("updateContact RPU", () => {
  it("sends the contact's known updated_at for conflict detection", async () => {
    let seenExpected: string | undefined;
    const backendApi = fakeBackendApi({
      updateContact: async (_token, input: UpdateContactInput) => {
        seenExpected = input.expected_updated_at;
        return { ok: true, value: { contact: { ...EXISTING, data: input.data }, conflict: false } };
      },
    });
    const process = updateContact({ backendApi, session: sessionWith("tok"), selectionStore: storeWithExisting() });

    await process({ id: "c1", data: { first_name: "Petra", last_name: "Neu", channels: [] } });

    expect(seenExpected).toBe(EXISTING.updated_at);
  });

  it("merges the updated contact back into the selection store", async () => {
    const selectionStore = storeWithExisting();
    const process = updateContact({ backendApi: fakeBackendApi(), session: sessionWith("tok"), selectionStore });

    const result = await process({ id: "c1", data: { first_name: "Petra", last_name: "Neu", channels: [] } });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.contact.data.last_name).toBe("Neu");
    expect(selectionStore.get()?.contacts[0].data.last_name).toBe("Neu");
  });

  it("fails without a session and does not call the backend", async () => {
    let called = false;
    const backendApi = fakeBackendApi({
      updateContact: async (_t, input: UpdateContactInput) => {
        called = true;
        return { ok: true, value: { contact: { ...EXISTING, data: input.data }, conflict: false } };
      },
    });
    const process = updateContact({ backendApi, session: sessionWith(null), selectionStore: storeWithExisting() });

    const result = await process({ id: "c1", data: { first_name: "Petra", channels: [] } });

    expect(result.ok).toBe(false);
    expect(called).toBe(false);
  });

  it("forwards a validation error with fields", async () => {
    const backendApi = fakeBackendApi({
      updateContact: async () => ({
        ok: false,
        error: "Validierung fehlgeschlagen.",
        fields: { channels: "Bitte mindestens einen Kontaktkanal angeben." },
      }),
    });
    const process = updateContact({ backendApi, session: sessionWith("tok"), selectionStore: storeWithExisting() });

    const result = await process({ id: "c1", data: { first_name: "Petra", channels: [] } });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fields?.channels).toBeTruthy();
  });
});
