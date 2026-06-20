import { randomUUID } from "node:crypto";
import type { Invoice, PaymentTerm } from "../../model.js";
import { devStatePath, readDevState, writeDevState } from "../dev-file-state.js";
import type {
  InvoiceDraftUpdate,
  InvoicesProvider,
  NewInvoiceDraft,
  NewPaymentTerm,
} from "./invoices-provider.js";

export class InMemoryInvoicesProvider implements InvoicesProvider {
  private readonly invoices = new Map<string, Invoice>();
  private readonly paymentTerms = new Map<string, PaymentTerm>();

  constructor() {
    this.hydrate();
  }

  private hydrate(): void {
    if (!devStatePath()) return;
    const state = readDevState();
    this.invoices.clear();
    this.paymentTerms.clear();
    for (const invoice of state.invoices ?? []) this.invoices.set(invoice.id, invoice);
    for (const term of state.payment_terms ?? []) this.paymentTerms.set(term.id, term);
  }

  private persist(): void {
    writeDevState({
      invoices: [...this.invoices.values()],
      payment_terms: [...this.paymentTerms.values()],
    });
  }

  async insertDraft(input: NewInvoiceDraft): Promise<Invoice> {
    this.hydrate();
    const now = new Date().toISOString();
    const invoice: Invoice = {
      id: randomUUID(),
      business_partner_id: input.business_partner_id,
      status: "draft",
      invoice_number: null,
      invoice_date: null,
      vat_rate: input.vat_rate,
      gp_snapshot: structuredClone(input.gp_snapshot),
      data: { lines: [] },
      created_at: now,
      updated_at: now,
    };
    this.invoices.set(invoice.id, invoice);
    this.persist();
    return structuredClone(invoice);
  }

  async listAll(): Promise<Invoice[]> {
    this.hydrate();
    return [...this.invoices.values()]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((invoice) => structuredClone(invoice));
  }

  async findById(id: string): Promise<Invoice | null> {
    this.hydrate();
    const invoice = this.invoices.get(id);
    return invoice ? structuredClone(invoice) : null;
  }

  async updateDraft(id: string, update: InvoiceDraftUpdate): Promise<Invoice | null> {
    this.hydrate();
    const existing = this.invoices.get(id);
    if (!existing) return null;
    const updated: Invoice = {
      ...existing,
      data: structuredClone(update.data),
      vat_rate: update.vat_rate,
      updated_at: new Date().toISOString(),
    };
    this.invoices.set(id, updated);
    this.persist();
    return structuredClone(updated);
  }

  async deleteUnnumberedDraft(id: string): Promise<boolean> {
    this.hydrate();
    const existing = this.invoices.get(id);
    if (!existing || existing.status !== "draft" || existing.invoice_number) return false;
    const deleted = this.invoices.delete(id);
    this.persist();
    return deleted;
  }

  async billDraft(id: string, input: { first_invoice_number: number; invoice_date: string }): Promise<Invoice | null> {
    this.hydrate();
    const existing = this.invoices.get(id);
    if (!existing || existing.status !== "draft") return null;
    const largest = [...this.invoices.values()]
      .map((invoice) => invoice.invoice_number)
      .filter((value): value is string => typeof value === "string" && /^\d{10}$/.test(value))
      .map((value) => Number(value))
      .reduce((max, value) => Math.max(max, value), 0);
    const nextNumber = Math.max(input.first_invoice_number, largest + 1);
    const updated: Invoice = {
      ...existing,
      status: "billed",
      invoice_number: String(nextNumber).padStart(10, "0"),
      invoice_date: input.invoice_date,
      updated_at: new Date().toISOString(),
    };
    this.invoices.set(id, updated);
    this.persist();
    return structuredClone(updated);
  }

  async updateStatus(id: string, status: Invoice["status"]): Promise<Invoice | null> {
    this.hydrate();
    const existing = this.invoices.get(id);
    if (!existing) return null;
    const updated: Invoice = {
      ...existing,
      status,
      updated_at: new Date().toISOString(),
    };
    this.invoices.set(id, updated);
    this.persist();
    return structuredClone(updated);
  }

  async listPaymentTerms(): Promise<PaymentTerm[]> {
    this.hydrate();
    return [...this.paymentTerms.values()]
      .sort((a, b) => a.label.localeCompare(b.label, "de"))
      .map((term) => structuredClone(term));
  }

  async upsertPaymentTerm(input: NewPaymentTerm): Promise<PaymentTerm> {
    this.hydrate();
    const existing = [...this.paymentTerms.values()].find((term) => term.label === input.label);
    const now = new Date().toISOString();
    const term: PaymentTerm = existing
      ? { ...existing, template: input.template, updated_at: now }
      : {
          id: randomUUID(),
          label: input.label,
          template: input.template,
          created_at: now,
          updated_at: now,
        };
    this.paymentTerms.set(term.id, term);
    this.persist();
    return structuredClone(term);
  }
}
