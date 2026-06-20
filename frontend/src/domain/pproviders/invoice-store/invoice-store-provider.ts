import type { BusinessPartner, Invoice, InvoicingData, PaymentTerm } from "@/domain/model";

export interface InvoiceStoreProvider {
  get(): InvoicingData | null;
  set(data: InvoicingData): void;
  replaceInvoice(invoice: Invoice): void;
  addInvoice(invoice: Invoice): void;
  addPaymentTerm(paymentTerm: PaymentTerm): void;
  getSearchTerm(): string;
  setSearchTerm(term: string): void;
  getSelectedInvoiceId(): string | null;
  setSelectedInvoiceId(id: string | null): void;
  getBusinessPartners(): BusinessPartner[];
}
