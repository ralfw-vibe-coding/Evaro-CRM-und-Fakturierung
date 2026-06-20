import type { ActivityLogProvider } from "../../pproviders/activity-log/activity-log-provider.js";
import type { InvoicesProvider } from "../../pproviders/invoices/invoices-provider.js";

export interface DeleteInvoiceDraftCommand {
  user_id: string;
  id: string;
}

export type DeleteInvoiceDraftResult = { ok: true } | { ok: false; error: string };

export interface DeleteInvoiceDraftDeps {
  invoices: InvoicesProvider;
  activityLog: ActivityLogProvider;
}

function text(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function deleteInvoiceDraft(deps: DeleteInvoiceDraftDeps) {
  return async function process(command: DeleteInvoiceDraftCommand): Promise<DeleteInvoiceDraftResult> {
    const user_id = text(command.user_id);
    if (!user_id) return { ok: false, error: "Kein angemeldeter Benutzer." };

    const id = text(command.id);
    if (!id) return { ok: false, error: "Rechnungs-ID fehlt." };

    const existing = await deps.invoices.findById(id);
    if (!existing) return { ok: false, error: "Rechnung nicht gefunden." };
    if (existing.status !== "draft" || existing.invoice_number) {
      return { ok: false, error: "Diese Rechnung kann nicht mehr gelöscht werden." };
    }

    const deleted = await deps.invoices.deleteUnnumberedDraft(id);
    if (!deleted) return { ok: false, error: "Rechnung nicht gefunden." };

    await deps.activityLog.append({
      entity_type: "business_partner",
      entity_id: existing.business_partner_id,
      user_id,
      type: "invoice_draft_deleted",
      payload: { invoice_id: existing.id, data: existing.data },
    });

    return { ok: true };
  };
}
