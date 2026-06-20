// Domain model types shared across the backend service.
// See requirements/crm-briefing.md for the conceptual model.

export type Gender = "m" | "f" | "d";
export type Salutation = "formal" | "informal";

/**
 * A communication channel. `type` is intentionally a free string (combobox
 * pattern); common values are "email", "phone", "mobile", "whatsapp",
 * "website". Multiple channels of the same type are allowed.
 */
export interface Channel {
  type: string;
  address: string;
}

export interface ContactData {
  title?: string;
  first_name?: string;
  last_name?: string;
  gender?: Gender;
  salutation?: Salutation;
  origin?: string;
  company_text?: string;
  channels: Channel[];
  relationship?: string[];
  role?: string[];
  work_area?: string[];
  interests?: string[];
  tags?: string[];
  notes?: string;
}

export interface Contact {
  id: string;
  active: boolean;
  data: ContactData;
  created_at: string;
  updated_at: string;
}

export interface Address {
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
}

/** A BP type as used in server-side selection (table-level `types` column). */
export type BusinessPartnerType = "customer" | "supplier" | "partner" | "authority";

export interface BusinessPartnerData {
  name: string;
  vat_id?: string;
  address?: Address;
  channels: Channel[];
  business_relationship?: string[];
  tags?: string[];
  memo?: string;
  notes?: string;
}

export interface BusinessPartner {
  id: string;
  types: string[];
  data: BusinessPartnerData;
  created_at: string;
  updated_at: string;
}

export interface ContactGp {
  contact_id: string;
  gp_id: string;
  role: string;
  primary: boolean;
  created_at: string;
}

export type EntityType = "contact" | "business_partner";

export interface ActivityLogEntry {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  follow_up_at: string | null;
  created_at: string;
}

export type InvoiceStatus = "draft" | "billed" | "paid";

export interface InvoiceGpSnapshot {
  name: string;
  vat_id?: string;
  address?: Address;
  email?: string;
}

export interface InvoiceLine {
  id: string;
  service_date?: string;
  product_form?: string;
  product_topic?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  text?: string;
}

export interface InvoiceData {
  reference?: string;
  comment?: string;
  payment_terms?: string;
  lines: InvoiceLine[];
}

export interface Invoice {
  id: string;
  business_partner_id: string;
  status: InvoiceStatus;
  invoice_number: string | null;
  invoice_date: string | null;
  vat_rate: number;
  gp_snapshot: InvoiceGpSnapshot;
  data: InvoiceData;
  created_at: string;
  updated_at: string;
}

export interface PaymentTerm {
  id: string;
  label: string;
  template: string;
  created_at: string;
  updated_at: string;
}
