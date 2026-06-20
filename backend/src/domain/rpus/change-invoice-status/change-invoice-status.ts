import type { Invoice, InvoiceStatus } from "../../model.js";
import type { ActivityLogProvider } from "../../pproviders/activity-log/activity-log-provider.js";
import type { InvoicesProvider } from "../../pproviders/invoices/invoices-provider.js";

export interface ChangeInvoiceStatusCommand {
  user_id: string;
  id: string;
  status: InvoiceStatus;
}

export type ChangeInvoiceStatusResult =
  | { ok: true; invoice: Invoice }
  | { ok: false; error: string };

export interface ChangeInvoiceStatusDeps {
  invoices: InvoicesProvider;
  activityLog: ActivityLogProvider;
}

function text(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function changeInvoiceStatus(deps: ChangeInvoiceStatusDeps) {
  return async function process(command: ChangeInvoiceStatusCommand): Promise<ChangeInvoiceStatusResult> {
    const user_id = text(command.user_id);
    if (!user_id) return { ok: false, error: "Kein angemeldeter Benutzer." };

    const id = text(command.id);
    if (!id) return { ok: false, error: "Rechnungs-ID fehlt." };

    const existing = await deps.invoices.findById(id);
    if (!existing) return { ok: false, error: "Rechnung nicht gefunden." };
    if (existing.status === command.status) return { ok: true, invoice: existing };

    const allowed =
      (existing.status === "billed" && command.status === "paid") ||
      (existing.status === "billed" && command.status === "draft");
    if (!allowed) return { ok: false, error: "Dieser Statuswechsel ist nicht erlaubt." };

    const invoice = await deps.invoices.updateStatus(id, command.status);
    if (!invoice) return { ok: false, error: "Rechnung nicht gefunden." };

    await deps.activityLog.append({
      entity_type: "business_partner",
      entity_id: invoice.business_partner_id,
      user_id,
      type: "invoice_status_changed",
      payload: { invoice_id: invoice.id, from: existing.status, to: invoice.status },
    });

    return { ok: true, invoice };
  };
}
