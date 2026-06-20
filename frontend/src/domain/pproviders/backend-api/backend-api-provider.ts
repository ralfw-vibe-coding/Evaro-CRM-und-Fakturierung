import type {
  BusinessPartner,
  BusinessPartnerData,
  Contact,
  ContactData,
  ContactGp,
  Selection,
  SessionUser,
} from "@/domain/model";

export type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; fields?: Record<string, string> };

export interface UpdateContactInput {
  id: string;
  active?: boolean;
  data: ContactData;
  expected_updated_at?: string;
}

export interface CreateContactInput {
  active?: boolean;
  data: ContactData;
}

export interface CreateBusinessPartnerInput {
  types: string[];
  data: BusinessPartnerData;
}

export interface UpdateBusinessPartnerInput {
  id: string;
  types: string[];
  data: BusinessPartnerData;
  expected_updated_at?: string;
}

export interface ContactGpInput {
  contact_id: string;
  gp_id: string;
  role?: string;
  primary?: boolean;
}

/**
 * pProvider: encapsulates the parts of the backend API that hold application
 * state — the OTP login flow, the selection, and writes to contacts/business
 * partners. This plays the same role here as a database client plays in the
 * backend: it is the technology (HTTP) behind the frontend's own domain
 * state. Endpoints that are NOT about app state (e.g. future AI helper calls)
 * belong behind an xProvider instead.
 */
export interface BackendApiProvider {
  requestOtp(email: string): Promise<ApiResult<void>>;
  verifyOtp(email: string, otp: string): Promise<ApiResult<{ token: string; user: SessionUser }>>;
  updateProfile(token: string, input: { abbr: string }): Promise<ApiResult<{ user: SessionUser }>>;
  loadSelection(token: string): Promise<ApiResult<Selection>>;
  createContact(token: string, input: CreateContactInput): Promise<ApiResult<{ contact: Contact }>>;
  updateContact(
    token: string,
    input: UpdateContactInput,
  ): Promise<ApiResult<{ contact: Contact; conflict: boolean }>>;
  deleteContact(token: string, id: string): Promise<ApiResult<void>>;
  createBusinessPartner(
    token: string,
    input: CreateBusinessPartnerInput,
  ): Promise<ApiResult<{ business_partner: BusinessPartner }>>;
  updateBusinessPartner(
    token: string,
    input: UpdateBusinessPartnerInput,
  ): Promise<ApiResult<{ business_partner: BusinessPartner; conflict: boolean }>>;
  deleteBusinessPartner(token: string, id: string): Promise<ApiResult<void>>;
  linkContactGp(token: string, input: ContactGpInput): Promise<ApiResult<{ link: ContactGp }>>;
  unlinkContactGp(token: string, input: ContactGpInput): Promise<ApiResult<void>>;
}
