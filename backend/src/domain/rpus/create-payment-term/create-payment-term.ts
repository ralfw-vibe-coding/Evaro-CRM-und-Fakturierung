import type { PaymentTerm } from "../../model.js";
import type { InvoicesProvider } from "../../pproviders/invoices/invoices-provider.js";

export interface CreatePaymentTermCommand {
  label?: string;
  template?: string;
}

export type CreatePaymentTermResult =
  | { ok: true; payment_term: PaymentTerm }
  | { ok: false; error: string; fields?: Record<string, string> };

export interface CreatePaymentTermDeps {
  invoices: InvoicesProvider;
}

function clean(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function createPaymentTerm(deps: CreatePaymentTermDeps) {
  return async function process(
    command: CreatePaymentTermCommand,
  ): Promise<CreatePaymentTermResult> {
    const template = clean(command.template);
    const label = clean(command.label) || template.slice(0, 80);
    const fields: Record<string, string> = {};
    if (!template) fields.template = "Zahlungsbedingung fehlt.";
    if (!label) fields.label = "Bezeichnung fehlt.";
    if (Object.keys(fields).length > 0) {
      return { ok: false, error: "Validierung fehlgeschlagen.", fields };
    }
    const payment_term = await deps.invoices.upsertPaymentTerm({ label, template });
    return { ok: true, payment_term };
  };
}
