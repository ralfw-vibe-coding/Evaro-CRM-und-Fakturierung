import type { BusinessPartner, Invoice, PaymentTerm } from "../../model.js";
import { withCurrentDraftSnapshot } from "../../invoice-snapshot.js";
import type { BusinessPartnersProvider } from "../../pproviders/business-partners/business-partners-provider.js";
import type { InvoicesProvider } from "../../pproviders/invoices/invoices-provider.js";

export interface ListInvoicingDataResult {
  invoices: Invoice[];
  payment_terms: PaymentTerm[];
  business_partners: BusinessPartner[];
}

export interface ListInvoicingDataDeps {
  invoices: InvoicesProvider;
  businessPartners: BusinessPartnersProvider;
}

export function listInvoicingData(deps: ListInvoicingDataDeps) {
  return async function process(): Promise<ListInvoicingDataResult> {
    const [invoices, payment_terms, business_partners] = await Promise.all([
      deps.invoices.listAll(),
      deps.invoices.listPaymentTerms(),
      deps.businessPartners.listAll(),
    ]);
    const businessPartnersById = new Map(business_partners.map((bp) => [bp.id, bp]));
    return {
      invoices: invoices.map((invoice) => withCurrentDraftSnapshot(invoice, businessPartnersById.get(invoice.business_partner_id))),
      payment_terms,
      business_partners,
    };
  };
}
