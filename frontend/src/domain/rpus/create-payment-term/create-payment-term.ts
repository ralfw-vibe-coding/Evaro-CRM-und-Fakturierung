import type { PaymentTerm } from "@/domain/model";
import type { BackendApiProvider } from "@/domain/pproviders/backend-api/backend-api-provider";
import type { InvoiceStoreProvider } from "@/domain/pproviders/invoice-store/invoice-store-provider";
import type { SessionProvider } from "@/domain/pproviders/session/session-provider";

export type CreatePaymentTermResult =
  | { ok: true; payment_term: PaymentTerm }
  | { ok: false; error: string; fields?: Record<string, string> };

export function createPaymentTerm(deps: {
  backendApi: BackendApiProvider;
  session: SessionProvider;
  invoiceStore: InvoiceStoreProvider;
}) {
  return async function process(input: { label?: string; template: string }): Promise<CreatePaymentTermResult> {
    const session = deps.session.get();
    if (!session) return { ok: false, error: "Nicht angemeldet." };
    const result = await deps.backendApi.createPaymentTerm(session.token, input);
    if (!result.ok) return { ok: false, error: result.error, fields: result.fields };
    deps.invoiceStore.addPaymentTerm(result.value.payment_term);
    return { ok: true, payment_term: result.value.payment_term };
  };
}
