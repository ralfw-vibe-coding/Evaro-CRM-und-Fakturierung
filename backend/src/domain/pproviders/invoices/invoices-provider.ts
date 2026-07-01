import type { Invoice, InvoiceData, InvoiceGpSnapshot, InvoiceStatus, PaymentTerm } from "../../model.js";

export interface NewInvoiceDraft {
  business_partner_id: string;
  gp_snapshot: InvoiceGpSnapshot;
  vat_rate: number;
  reverse_charge?: boolean;
  payment_due_days?: number;
}

export interface InvoiceDraftUpdate {
  data: InvoiceData;
  vat_rate: number;
  gp_snapshot?: InvoiceGpSnapshot;
}

export interface BillInvoiceInput {
  first_invoice_number: number;
  invoice_date: string;
  gp_snapshot?: InvoiceGpSnapshot;
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
  deleteUnnumberedDraft(id: string): Promise<boolean>;
  billDraft(id: string, input: BillInvoiceInput): Promise<Invoice | null>;
  updateStatus(id: string, status: InvoiceStatus): Promise<Invoice | null>;
  listPaymentTerms(): Promise<PaymentTerm[]>;
  upsertPaymentTerm(input: NewPaymentTerm): Promise<PaymentTerm>;
}
