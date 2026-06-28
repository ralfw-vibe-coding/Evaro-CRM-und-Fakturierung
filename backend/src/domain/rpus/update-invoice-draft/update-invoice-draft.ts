import { randomUUID } from "node:crypto";
import type { Invoice, InvoiceData, InvoiceLine } from "../../model.js";
import type { InvoicesProvider } from "../../pproviders/invoices/invoices-provider.js";

export interface UpdateInvoiceDraftCommand {
  id: string;
  data: unknown;
  vat_rate?: unknown;
  expected_updated_at?: string;
}

export type UpdateInvoiceDraftResult =
  | { ok: true; invoice: Invoice; conflict: boolean }
  | { ok: false; error: string; fields?: Record<string, string> };

export interface UpdateInvoiceDraftDeps {
  invoices: InvoicesProvider;
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function number(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNonNegativeInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return undefined;
  return parsed;
}

function normalizeLine(value: unknown, index: number, fields: Record<string, string>): InvoiceLine {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const quantity = Math.max(0, number(data.quantity, 1));
  const unit_price = Math.max(0, number(data.unit_price, 0));
  if (quantity === 0) fields[`lines.${index}.quantity`] = "Menge muss größer als 0 sein.";
  return {
    id: text(data.id) ?? randomUUID(),
    service_date: text(data.service_date),
    product_form: text(data.product_form),
    product_topic: text(data.product_topic),
    quantity,
    unit: text(data.unit),
    unit_price,
    text: text(data.text),
  };
}

function normalizeData(raw: unknown): { data: InvoiceData; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawLines = Array.isArray(data.lines) ? data.lines : [];
  return {
    data: {
      reference: text(data.reference),
      comment: text(data.comment),
      payment_due_days: optionalNonNegativeInt(data.payment_due_days),
      payment_free_text: text(data.payment_free_text),
      payment_terms: text(data.payment_terms),
      reverse_charge: data.reverse_charge === true,
      lines: rawLines.map((line, index) => normalizeLine(line, index, fields)),
    },
    fields,
  };
}

export function updateInvoiceDraft(deps: UpdateInvoiceDraftDeps) {
  return async function process(
    command: UpdateInvoiceDraftCommand,
  ): Promise<UpdateInvoiceDraftResult> {
    const id = text(command.id);
    if (!id) return { ok: false, error: "Rechnungs-ID fehlt." };

    const existing = await deps.invoices.findById(id);
    if (!existing) return { ok: false, error: "Rechnung nicht gefunden." };
    if (existing.status !== "draft") {
      return { ok: false, error: "Nur Entwürfe können geändert werden." };
    }

    const { data, fields } = normalizeData(command.data);
    let vat_rate = Math.max(0, number(command.vat_rate, 0));
    if (data.reverse_charge) vat_rate = 0;
    if (vat_rate > 100) fields.vat_rate = "USt.-Satz darf höchstens 100% sein.";
    if (Object.keys(fields).length > 0) {
      return { ok: false, error: "Validierung fehlgeschlagen.", fields };
    }

    const invoice = await deps.invoices.updateDraft(id, { data, vat_rate });
    if (!invoice) return { ok: false, error: "Rechnung nicht gefunden." };

    return {
      ok: true,
      invoice,
      conflict: Boolean(command.expected_updated_at && command.expected_updated_at !== existing.updated_at),
    };
  };
}
