import { snapshotFromBusinessPartner } from "../../invoice-snapshot.js";
import type { Invoice } from "../../model.js";
import type { ActivityLogProvider } from "../../pproviders/activity-log/activity-log-provider.js";
import type { BusinessPartnersProvider } from "../../pproviders/business-partners/business-partners-provider.js";
import type { InvoicesProvider } from "../../pproviders/invoices/invoices-provider.js";

export interface BillInvoiceCommand {
  user_id: string;
  id: string;
}

export type BillInvoiceResult =
  | { ok: true; invoice: Invoice }
  | { ok: false; error: string };

export interface BillInvoiceDeps {
  invoices: InvoicesProvider;
  businessPartners: BusinessPartnersProvider;
  activityLog: ActivityLogProvider;
  firstInvoiceNumber: number;
}

function text(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function billInvoice(deps: BillInvoiceDeps) {
  return async function process(command: BillInvoiceCommand): Promise<BillInvoiceResult> {
    const user_id = text(command.user_id);
    if (!user_id) return { ok: false, error: "Kein angemeldeter Benutzer." };

    const id = text(command.id);
    if (!id) return { ok: false, error: "Rechnungs-ID fehlt." };

    const existing = await deps.invoices.findById(id);
    if (!existing) return { ok: false, error: "Rechnung nicht gefunden." };
    if (existing.status !== "draft") return { ok: false, error: "Nur Entwürfe können abgerechnet werden." };

    const businessPartner = await deps.businessPartners.findById(existing.business_partner_id);
    const invoice = await deps.invoices.billDraft(id, {
      first_invoice_number: deps.firstInvoiceNumber,
      invoice_date: today(),
      gp_snapshot: businessPartner ? snapshotFromBusinessPartner(businessPartner) : undefined,
    });
    if (!invoice) return { ok: false, error: "Rechnung nicht gefunden." };

    await deps.activityLog.append({
      entity_type: "business_partner",
      entity_id: invoice.business_partner_id,
      user_id,
      type: "invoice_billed",
      payload: { invoice_id: invoice.id, invoice_number: invoice.invoice_number },
    });

    return { ok: true, invoice };
  };
}
