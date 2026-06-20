import type { Invoice } from "@/domain/model";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { InvoiceStoreProvider } from "@/domain/pproviders/invoice-store/invoice-store-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export type BillInvoiceResult =
  | { ok: true; invoice: Invoice }
  | { ok: false; error: string };

export function billInvoice(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
  invoiceStore: InvoiceStoreProvider;
}) {
  return async function process(id: string): Promise<BillInvoiceResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };
    const result = await deps.backendApi.billInvoice(session.token, id);
    if (!result.ok) return { ok: false, error: result.error };
    deps.invoiceStore.replaceInvoice(result.value.invoice);
    return { ok: true, invoice: result.value.invoice };
  };
}
