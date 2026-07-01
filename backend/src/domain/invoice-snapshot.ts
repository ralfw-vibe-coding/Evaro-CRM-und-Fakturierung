import type { BusinessPartner, Invoice, InvoiceGpSnapshot } from "./model.js";

function text(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function snapshotFromBusinessPartner(bp: BusinessPartner): InvoiceGpSnapshot {
  const email = bp.data.channels.find((channel) => channel.type.toLowerCase() === "email")?.address;
  return {
    name: bp.data.name,
    vat_id: text(bp.data.vat_id),
    address: bp.data.address,
    email: text(email),
    invoice_language: bp.data.invoice_language ?? "de",
  };
}

export function withCurrentDraftSnapshot(
  invoice: Invoice,
  businessPartner: BusinessPartner | undefined,
): Invoice {
  if (invoice.status !== "draft" || !businessPartner) return invoice;
  return {
    ...invoice,
    gp_snapshot: snapshotFromBusinessPartner(businessPartner),
  };
}
