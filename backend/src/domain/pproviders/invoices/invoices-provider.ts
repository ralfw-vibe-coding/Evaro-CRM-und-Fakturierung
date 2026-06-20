import type { Invoice, InvoiceData, InvoiceGpSnapshot, PaymentTerm } from "../../model.js";

export interface NewInvoiceDraft {
  business_partner_id: string;
  gp_snapshot: InvoiceGpSnapshot;
  vat_rate: number;
}

export interface InvoiceDraftUpdate {
  data: InvoiceData;
  vat_rate: number;
}

export interface NewPaymentTerm {
  label: string;
  template: string;
}

export interface InvoicesProvider {
  insertDraft(input: NewInvoiceDraft): Promise<Invoice>;
  listAll(): Promise<Invoice[]>;
  findById(id: string): Promise<Invoice | null>;
  updateDraft(id: string, update: InvoiceDraftUpdate): Promise<Invoice | null>;
  listPaymentTerms(): Promise<PaymentTerm[]>;
  upsertPaymentTerm(input: NewPaymentTerm): Promise<PaymentTerm>;
}
