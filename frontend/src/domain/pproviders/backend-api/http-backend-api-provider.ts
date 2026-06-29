import type {
  BusinessPartner,
  Contact,
  ContactGp,
  AppSettings,
  InvoicingData,
  InvoicingAppSettings,
  IngestItem,
  IngestStatus,
  Invoice,
  InvoiceStatus,
  PaymentTerm,
  Selection,
  SessionUser,
} from "@/domain/model";
import type {
  ApiResult,
  BackendApiProvider,
  ContactGpInput,
  CreateBusinessPartnerInput,
  CreateContactInput,
  BusinessPartnerLookupResult,
  CheckEmailIngestResult,
  EmailImportAnalysis,
  IngestListResult,
  UpdateBusinessPartnerInput,
  UpdateContactInput,
  UpdateInvoiceDraftInput,
} from "./backend-api-provider";

async function request<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers });
  } catch {
    return { ok: false, error: "Server nicht erreichbar." };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    const b = (body ?? {}) as { error?: string; fields?: Record<string, string> };
    return { ok: false, error: b.error ?? `Fehler ${res.status}`, fields: b.fields };
  }
  return { ok: true, value: body as T };
}

export const httpBackendApiProvider: BackendApiProvider = {
  async requestOtp(email) {
    const result = await request<{ ok: true }>("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return result.ok ? { ok: true, value: undefined } : result;
  },

  async verifyOtp(email, otp) {
    return request<{ token: string; user: SessionUser }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  },

  async updateProfile(token, input) {
    return request<{ user: SessionUser }>("/profile", {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
  },

  async generateApiKey(token) {
    return request<{ user: SessionUser; api_key: string }>("/profile", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
  },

  async deleteApiKey(token) {
    return request<{ user: SessionUser }>("/profile", {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
  },

  async loadSelection(token, options) {
    const query = options?.includeInactive ? "?include_inactive=true" : "";
    return request<Selection>(`/selection${query}`, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
  },

  async createContact(token, input: CreateContactInput) {
    return request<{ contact: Contact }>("/contacts", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
  },

  async updateContact(token, input: UpdateContactInput) {
    return request<{ contact: Contact; conflict: boolean }>("/contacts", {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
  },

  async deleteContact(token, id: string) {
    const result = await request<{ ok: true }>("/contacts", {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    return result.ok ? { ok: true, value: undefined } : result;
  },

  async createBusinessPartner(token, input: CreateBusinessPartnerInput) {
    return request<{ business_partner: BusinessPartner }>("/business-partners", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
  },

  async updateBusinessPartner(token, input: UpdateBusinessPartnerInput) {
    return request<{ business_partner: BusinessPartner; conflict: boolean }>("/business-partners", {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
  },

  async deleteBusinessPartner(token, id: string) {
    const result = await request<{ ok: true }>("/business-partners", {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    return result.ok ? { ok: true, value: undefined } : result;
  },

  async linkContactGp(token, input: ContactGpInput) {
    return request<{ link: ContactGp }>("/contact-gps", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
  },

  async unlinkContactGp(token, input: ContactGpInput) {
    const result = await request<{ ok: true }>("/contact-gps", {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
    return result.ok ? { ok: true, value: undefined } : result;
  },

  async analyzeEmailImport(token, emailText) {
    return request<EmailImportAnalysis>("/email-import/analyze", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ email_text: emailText }),
    });
  },

  async loadIngests(token) {
    return request<IngestListResult>("/ingests", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
  },

  async createClipboardIngest(token, rawText) {
    return request<{ ingest: IngestItem; duplicate: boolean }>("/ingests", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ raw_text: rawText, source_label: "Zwischenablage" }),
    });
  },

  async checkEmailIngest(token) {
    return request<CheckEmailIngestResult>("/ingests", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "check_email" }),
    });
  },

  async updateIngestStatus(token, id: string, status: IngestStatus) {
    return request<{ ingest: IngestItem }>("/ingests", {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    });
  },

  async lookupBusinessPartner(token, data) {
    return request<BusinessPartnerLookupResult>("/business-partner-lookup", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ business_partner: data }),
    });
  },

  async loadInvoicingData(token) {
    return request<InvoicingData>("/invoices", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
  },

  async createInvoiceDraft(token, businessPartnerId) {
    return request<{ invoice: Invoice }>("/invoices", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ business_partner_id: businessPartnerId }),
    });
  },

  async updateInvoiceDraft(token, input: UpdateInvoiceDraftInput) {
    return request<{ invoice: Invoice; conflict: boolean }>("/invoices", {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
  },

  async deleteInvoiceDraft(token, id) {
    const result = await request<{ ok: true }>("/invoices", {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    return result.ok ? { ok: true, value: undefined } : result;
  },

  async billInvoice(token, id) {
    return request<{ invoice: Invoice }>("/invoices", {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, action: "bill" }),
    });
  },

  async changeInvoiceStatus(token, id: string, status: InvoiceStatus) {
    return request<{ invoice: Invoice }>("/invoices", {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, action: "status", status }),
    });
  },

  async createPaymentTerm(token, input) {
    return request<{ payment_term: PaymentTerm }>("/payment-terms", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
  },

  async loadAppSettings(token) {
    return request<{ settings: AppSettings }>("/app-settings", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
  },

  async updateAppSettings(token, input: { invoicing: InvoicingAppSettings }) {
    return request<{ settings: AppSettings }>("/app-settings", {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
  },
};
