import type { Invoice, InvoiceStatus } from "@/domain/model";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { InvoiceStoreProvider } from "@/domain/pproviders/invoice-store/invoice-store-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export type ChangeInvoiceStatusResult =
  | { ok: true; invoice: Invoice }
  | { ok: false; error: string };

export function changeInvoiceStatus(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
  invoiceStore: InvoiceStoreProvider;
}) {
  return async function process(id: string, status: InvoiceStatus): Promise<ChangeInvoiceStatusResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };
    const result = await deps.backendApi.changeInvoiceStatus(session.token, id, status);
    if (!result.ok) return { ok: false, error: result.error };
    deps.invoiceStore.replaceInvoice(result.value.invoice);
    return { ok: true, invoice: result.value.invoice };
  };
}
