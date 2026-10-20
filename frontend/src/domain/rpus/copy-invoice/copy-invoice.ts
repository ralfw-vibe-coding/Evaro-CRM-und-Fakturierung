import type { Invoice } from "@/domain/model";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { InvoiceStoreProvider } from "@/domain/pproviders/invoice-store/invoice-store-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export type CopyInvoiceResult =
  | { ok: true; invoice: Invoice }
  | { ok: false; error: string };

/**
 * RPU (Command): legt die Rechnung als neuen Entwurf noch einmal an und wählt
 * ihn aus — wie beim Anlegen eines Entwurfs, nur eben vorbefüllt.
 */
export function copyInvoice(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
  invoiceStore: InvoiceStoreProvider;
}) {
  return async function process(invoiceId: string): Promise<CopyInvoiceResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };
    const result = await deps.backendApi.copyInvoice(session.token, invoiceId);
    if (!result.ok) return { ok: false, error: result.error };
    deps.invoiceStore.addInvoice(result.value.invoice);
    deps.invoiceStore.setSelectedInvoiceId(result.value.invoice.id);
    return { ok: true, invoice: result.value.invoice };
  };
}
