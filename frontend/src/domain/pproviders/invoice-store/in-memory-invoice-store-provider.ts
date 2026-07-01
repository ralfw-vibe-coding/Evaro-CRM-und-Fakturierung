import type { BusinessPartner, Invoice, InvoicingData, PaymentTerm } from "@/domain/model";
import { withCurrentDraftSnapshot } from "@/domain/invoice-snapshot";
import type { InvoiceStoreProvider } from "./invoice-store-provider";

export class InMemoryInvoiceStoreProvider implements InvoiceStoreProvider {
  private data: InvoicingData | null = null;
  private searchTerm = "";
  private selectedInvoiceId: string | null = null;

  get(): InvoicingData | null {
    return this.data ? structuredClone(this.data) : null;
  }

  set(data: InvoicingData): void {
    this.data = structuredClone(data);
  }

  replaceInvoice(invoice: Invoice): void {
    if (!this.data) return;
    this.data = {
      ...this.data,
      invoices: this.data.invoices.map((item) => (item.id === invoice.id ? structuredClone(invoice) : item)),
    };
  }

  syncDraftSnapshotsForBusinessPartner(businessPartner: BusinessPartner): void {
    if (!this.data) return;
    this.data = {
      ...this.data,
      business_partners: this.data.business_partners.map((item) =>
        item.id === businessPartner.id ? structuredClone(businessPartner) : item,
      ),
      invoices: this.data.invoices.map((invoice) => withCurrentDraftSnapshot(invoice, businessPartner)),
    };
  }

  addInvoice(invoice: Invoice): void {
    if (!this.data) {
      this.data = { invoices: [structuredClone(invoice)], payment_terms: [], business_partners: [] };
      return;
    }
    this.data = {
      ...this.data,
      invoices: [structuredClone(invoice), ...this.data.invoices.filter((item) => item.id !== invoice.id)],
    };
  }

  removeInvoice(id: string): void {
    if (!this.data) return;
    this.data = {
      ...this.data,
      invoices: this.data.invoices.filter((item) => item.id !== id),
    };
    if (this.selectedInvoiceId === id) this.selectedInvoiceId = null;
  }

  addPaymentTerm(paymentTerm: PaymentTerm): void {
    if (!this.data) return;
    this.data = {
      ...this.data,
      payment_terms: [
        structuredClone(paymentTerm),
        ...this.data.payment_terms.filter((item) => item.id !== paymentTerm.id),
      ].sort((a, b) => a.label.localeCompare(b.label, "de")),
    };
  }

  getSearchTerm(): string {
    return this.searchTerm;
  }

  setSearchTerm(term: string): void {
    this.searchTerm = term;
  }

  getSelectedInvoiceId(): string | null {
    return this.selectedInvoiceId;
  }

  setSelectedInvoiceId(id: string | null): void {
    this.selectedInvoiceId = id;
  }

  getBusinessPartners(): BusinessPartner[] {
    return this.data ? structuredClone(this.data.business_partners) : [];
  }
}
