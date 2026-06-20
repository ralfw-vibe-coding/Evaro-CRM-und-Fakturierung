import type { Invoice, InvoiceData } from "@/domain/model";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { InvoiceStoreProvider } from "@/domain/pproviders/invoice-store/invoice-store-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export type UpdateInvoiceDraftResult =
  | { ok: true; invoice: Invoice; conflict: boolean }
  | { ok: false; error: string; fields?: Record<string, string> };

export function updateInvoiceDraft(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
  invoiceStore: InvoiceStoreProvider;
}) {
  return async function process(input: {
    id: string;
    data: InvoiceData;
    vat_rate: number;
    expected_updated_at?: string;
  }): Promise<UpdateInvoiceDraftResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };
    const result = await deps.backendApi.updateInvoiceDraft(session.token, input);
    if (!result.ok) return { ok: false, error: result.error, fields: result.fields };
    deps.invoiceStore.replaceInvoice(result.value.invoice);
    return { ok: true, invoice: result.value.invoice, conflict: result.value.conflict };
  };
}
