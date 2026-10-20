import { randomUUID } from "node:crypto";
import { snapshotFromBusinessPartner } from "../../invoice-snapshot.js";
import type { Invoice, InvoiceData } from "../../model.js";
import type { ActivityLogProvider } from "../../pproviders/activity-log/activity-log-provider.js";
import type { BusinessPartnersProvider } from "../../pproviders/business-partners/business-partners-provider.js";
import type { InvoicesProvider } from "../../pproviders/invoices/invoices-provider.js";

export interface CopyInvoiceCommand {
  user_id: string;
  /** Die Rechnung, von der kopiert wird — gleich welchen Status sie hat. */
  id: string;
}

export type CopyInvoiceResult =
  | { ok: true; invoice: Invoice }
  | { ok: false; error: string };

export interface CopyInvoiceDeps {
  invoices: InvoicesProvider;
  businessPartners: BusinessPartnersProvider;
  activityLog: ActivityLogProvider;
}

function text(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Positionen bekommen frische IDs. Innerhalb einer Rechnung müssen sie
 * eindeutig sein; geteilte IDs über zwei Rechnungen hinweg wären zwar heute
 * folgenlos, aber verwirrend, sobald jemand danach sucht.
 */
function copyData(data: InvoiceData): InvoiceData {
  return {
    ...structuredClone(data),
    lines: data.lines.map((line) => ({ ...structuredClone(line), id: randomUUID() })),
  };
}

/**
 * RPU (Command): legt eine Rechnung als neuen Entwurf noch einmal an.
 *
 * Übernommen werden Kunde, Steuersatz und sämtliche Rechnungsdaten. Nicht
 * übernommen wird, was zur abgerechneten Rechnung gehört: Nummer, Datum und
 * Status. Der Kundenschnappschuss wird frisch gezogen statt kopiert — bei
 * Entwürfen zeigt die App ohnehin immer den aktuellen Stand des
 * Geschäftspartners (siehe withCurrentDraftSnapshot).
 */
export function copyInvoice(deps: CopyInvoiceDeps) {
  return async function process(command: CopyInvoiceCommand): Promise<CopyInvoiceResult> {
    const user_id = text(command.user_id);
    if (!user_id) return { ok: false, error: "Kein angemeldeter Benutzer." };

    const id = text(command.id);
    if (!id) return { ok: false, error: "Rechnungs-ID fehlt." };

    const source = await deps.invoices.findById(id);
    if (!source) return { ok: false, error: "Rechnung nicht gefunden." };

    const businessPartner = await deps.businessPartners.findById(source.business_partner_id);
    if (!businessPartner) return { ok: false, error: "Geschäftspartner nicht gefunden." };

    const invoice = await deps.invoices.insertDraft({
      business_partner_id: source.business_partner_id,
      gp_snapshot: snapshotFromBusinessPartner(businessPartner),
      vat_rate: source.vat_rate,
      data: copyData(source.data),
    });

    await deps.activityLog.append({
      entity_type: "business_partner",
      entity_id: source.business_partner_id,
      user_id,
      type: "invoice_copied",
      payload: {
        invoice_id: invoice.id,
        source_invoice_id: source.id,
        source_invoice_number: source.invoice_number,
      },
    });

    return { ok: true, invoice };
  };
}
