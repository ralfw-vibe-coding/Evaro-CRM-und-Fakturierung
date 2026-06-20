// Client-side view of the domain model (mirrors backend/src/domain/model.ts).

export interface Channel {
  type: string;
  address: string;
}

export interface ContactData {
  title?: string;
  first_name?: string;
  last_name?: string;
  gender?: "m" | "f" | "d";
  salutation?: "formal" | "informal";
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

export interface Selection {
  contacts: Contact[];
  business_partners: BusinessPartner[];
  contact_gps: ContactGp[];
}

export interface SessionUser {
  id: string;
  email: string;
  abbr: string;
  api_key_created_at?: string | null;
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

export interface InvoicingData {
  invoices: Invoice[];
  payment_terms: PaymentTerm[];
  business_partners: BusinessPartner[];
}

export interface InvoicingAppSettings {
  company_name?: string;
  sender_address?: string;
  bank_details?: string;
  vat_number?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  website?: string;
}

export interface AppSettings {
  invoicing: InvoicingAppSettings;
  updated_at: string | null;
}
