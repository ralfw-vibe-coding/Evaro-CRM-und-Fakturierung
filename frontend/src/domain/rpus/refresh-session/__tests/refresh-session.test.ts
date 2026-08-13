import { describe, expect, it } from "vitest";
import { refreshSession } from "../refresh-session.js";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { Session, SessionProvider } from "@/domain/pproviders/session/session-provider";

/** Fake pProvider for RPU tests (see tech-stack.md). */
function fakeBackendApi(overrides: Partial<BackendApiProvider> = {}): BackendApiProvider {
  return {
    requestOtp: async () => ({ ok: false, error: "not used" }),
    verifyOtp: async () => ({ ok: false, error: "not used" }),
    refreshToken: async () => ({ ok: true, value: { token: "tok-2" } }),
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
    loadIngests: async () => ({ ok: false, error: "not used" }),
    createClipboardIngest: async () => ({ ok: false, error: "not used" }),
    checkEmailIngest: async () => ({ ok: false, error: "not used" }),
    updateIngestStatus: async () => ({ ok: false, error: "not used" }),
    lookupBusinessPartner: async () => ({ ok: false, error: "not used" }),
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

function fakeSession(initial: Session | null): SessionProvider & { saved: Session[]; cleared: number } {
  const saved: Session[] = [];
  const state = {
    saved,
    cleared: 0,
    get: () => saved[saved.length - 1] ?? initial,
    save: (session: Session) => {
      saved.push(session);
    },
    clear: () => {
      state.cleared += 1;
    },
  };
  return state;
}

const USER = { id: "u1", email: "rk@example.com", abbr: "RK" };

describe("refreshSession RPU", () => {
  it("replaces the token and keeps the user profile", async () => {
    const session = fakeSession({ token: "tok-1", user: USER });
    const process = refreshSession({ backendApi: fakeBackendApi(), session });

    const result = await process();

    expect(result).toEqual({ ok: true });
    expect(session.saved).toEqual([{ token: "tok-2", user: USER }]);
  });

  it("does nothing without a session and does not call the backend", async () => {
    let called = false;
    const process = refreshSession({
      backendApi: fakeBackendApi({
        refreshToken: async () => {
          called = true;
          return { ok: true, value: { token: "tok-2" } };
        },
      }),
      session: fakeSession(null),
    });

    const result = await process();

    expect(result).toEqual({ ok: false });
    expect(called).toBe(false);
  });

  it("keeps the existing session when refreshing fails", async () => {
    // Ein Netzausfall darf niemanden aus der Sitzung werfen.
    const session = fakeSession({ token: "tok-1", user: USER });
    const process = refreshSession({
      backendApi: fakeBackendApi({
        refreshToken: async () => ({ ok: false, error: "Server nicht erreichbar." }),
      }),
      session,
    });

    const result = await process();

    expect(result).toEqual({ ok: false });
    expect(session.saved).toEqual([]);
    expect(session.cleared).toBe(0);
    expect(session.get()).toEqual({ token: "tok-1", user: USER });
  });
});
