import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { InvoiceStoreProvider } from "@/domain/pproviders/invoice-store/invoice-store-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export type LoadInvoicingDataResult = { ok: true } | { ok: false; error: string };

export function loadInvoicingData(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
  invoiceStore: InvoiceStoreProvider;
}) {
  return async function process(): Promise<LoadInvoicingDataResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };
    const result = await deps.backendApi.loadInvoicingData(session.token);
    if (!result.ok) return { ok: false, error: result.error };
    deps.invoiceStore.set(result.value);
    return { ok: true };
  };
}
