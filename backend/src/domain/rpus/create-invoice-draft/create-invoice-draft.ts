import type { BusinessPartner, Invoice, InvoiceGpSnapshot } from "../../model.js";
import { determineInvoiceVatRule } from "../../invoice-tax.js";
import type { ActivityLogProvider } from "../../pproviders/activity-log/activity-log-provider.js";
import type { BusinessPartnersProvider } from "../../pproviders/business-partners/business-partners-provider.js";
import type { InvoicesProvider } from "../../pproviders/invoices/invoices-provider.js";

export interface CreateInvoiceDraftCommand {
  user_id: string;
  business_partner_id: string;
}

export type CreateInvoiceDraftResult =
  | { ok: true; invoice: Invoice }
  | { ok: false; error: string };

export interface CreateInvoiceDraftDeps {
  invoices: InvoicesProvider;
  businessPartners: BusinessPartnersProvider;
  activityLog: ActivityLogProvider;
}

function text(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function snapshotFromBusinessPartner(bp: BusinessPartner): InvoiceGpSnapshot {
  const email = bp.data.channels.find((channel) => channel.type.toLowerCase() === "email")?.address;
  return {
    name: bp.data.name,
    vat_id: text(bp.data.vat_id),
    address: bp.data.address,
    email: text(email),
  };
}

export function createInvoiceDraft(deps: CreateInvoiceDraftDeps) {
  return async function process(
    command: CreateInvoiceDraftCommand,
  ): Promise<CreateInvoiceDraftResult> {
    const user_id = text(command.user_id);
    if (!user_id) return { ok: false, error: "Kein angemeldeter Benutzer." };

    const business_partner_id = text(command.business_partner_id);
    if (!business_partner_id) return { ok: false, error: "Geschäftspartner fehlt." };

    const businessPartner = await deps.businessPartners.findById(business_partner_id);
    if (!businessPartner) return { ok: false, error: "Geschäftspartner nicht gefunden." };

    const gp_snapshot = snapshotFromBusinessPartner(businessPartner);
    const invoice = await deps.invoices.insertDraft({
      business_partner_id,
      gp_snapshot,
      vat_rate: determineInvoiceVatRule(gp_snapshot).vat_rate,
    });

    await deps.activityLog.append({
      entity_type: "business_partner",
      entity_id: business_partner_id,
      user_id,
      type: "invoice_draft_created",
      payload: { invoice_id: invoice.id },
    });

    return { ok: true, invoice };
  };
}
