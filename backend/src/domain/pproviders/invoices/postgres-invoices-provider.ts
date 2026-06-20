import { randomUUID } from "node:crypto";
import type pg from "pg";
import type {
  Address,
  Invoice,
  InvoiceData,
  InvoiceGpSnapshot,
  InvoiceLine,
  InvoiceStatus,
  PaymentTerm,
} from "../../model.js";
import { getPool } from "../postgres/pool.js";
import type {
  InvoiceDraftUpdate,
  InvoicesProvider,
  NewInvoiceDraft,
  NewPaymentTerm,
} from "./invoices-provider.js";

interface InvoiceRow {
  id: string;
  business_partner_id: string;
  status: string;
  invoice_number: string | null;
  invoice_date: Date | string | null;
  vat_rate: string | number;
  gp_snapshot: unknown;
  data: unknown;
  created_at: Date;
  updated_at: Date;
}

interface PaymentTermRow {
  id: string;
  label: string;
  template: string;
  created_at: Date;
  updated_at: Date;
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function number(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateOnly(value: Date | string | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function normalizeAddress(value: unknown): Address | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as Record<string, unknown>;
  return {
    street: text(data.street),
    zip: text(data.zip),
    city: text(data.city),
    country: text(data.country),
  };
}

function normalizeSnapshot(value: unknown): InvoiceGpSnapshot {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    name: text(data.name) ?? "",
    vat_id: text(data.vat_id),
    address: normalizeAddress(data.address),
    email: text(data.email),
  };
}

function normalizeLine(value: unknown): InvoiceLine {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    id: text(data.id) ?? randomUUID(),
    service_date: text(data.service_date),
    product_form: text(data.product_form),
    product_topic: text(data.product_topic),
    quantity: number(data.quantity, 1),
    unit: text(data.unit),
    unit_price: number(data.unit_price),
    text: text(data.text),
  };
}

function normalizeData(value: unknown): InvoiceData {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawLines = Array.isArray(data.lines) ? data.lines : [];
  return {
    reference: text(data.reference),
    comment: text(data.comment),
    payment_terms: text(data.payment_terms),
    lines: rawLines.map(normalizeLine),
  };
}

function normalizeStatus(value: string): InvoiceStatus {
  return value === "billed" || value === "paid" ? value : "draft";
}

function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    business_partner_id: row.business_partner_id,
    status: normalizeStatus(row.status),
    invoice_number: row.invoice_number,
    invoice_date: dateOnly(row.invoice_date),
    vat_rate: number(row.vat_rate),
    gp_snapshot: normalizeSnapshot(row.gp_snapshot),
    data: normalizeData(row.data),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function toPaymentTerm(row: PaymentTermRow): PaymentTerm {
  return {
    id: row.id,
    label: row.label,
    template: row.template,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export class PostgresInvoicesProvider implements InvoicesProvider {
  constructor(private readonly pool: pg.Pool = getPool()) {}

  async insertDraft(input: NewInvoiceDraft): Promise<Invoice> {
    const { rows } = await this.pool.query<InvoiceRow>(
      `INSERT INTO invoices (business_partner_id, gp_snapshot, data, vat_rate)
       VALUES ($1, $2, $3, 0)
       RETURNING id, business_partner_id, status, invoice_number, invoice_date, vat_rate,
                 gp_snapshot, data, created_at, updated_at`,
      [input.business_partner_id, input.gp_snapshot, { lines: [] }],
    );
    return toInvoice(rows[0]);
  }

  async listAll(): Promise<Invoice[]> {
    const { rows } = await this.pool.query<InvoiceRow>(
      `SELECT id, business_partner_id, status, invoice_number, invoice_date, vat_rate,
              gp_snapshot, data, created_at, updated_at
       FROM invoices
       ORDER BY created_at DESC`,
    );
    return rows.map(toInvoice);
  }

  async findById(id: string): Promise<Invoice | null> {
    const { rows } = await this.pool.query<InvoiceRow>(
      `SELECT id, business_partner_id, status, invoice_number, invoice_date, vat_rate,
              gp_snapshot, data, created_at, updated_at
       FROM invoices
       WHERE id = $1`,
      [id],
    );
    return rows[0] ? toInvoice(rows[0]) : null;
  }

  async updateDraft(id: string, update: InvoiceDraftUpdate): Promise<Invoice | null> {
    const { rows } = await this.pool.query<InvoiceRow>(
      `UPDATE invoices
       SET data = $1, vat_rate = $2, updated_at = now()
       WHERE id = $3
       RETURNING id, business_partner_id, status, invoice_number, invoice_date, vat_rate,
                 gp_snapshot, data, created_at, updated_at`,
      [update.data, update.vat_rate, id],
    );
    return rows[0] ? toInvoice(rows[0]) : null;
  }

  async listPaymentTerms(): Promise<PaymentTerm[]> {
    const { rows } = await this.pool.query<PaymentTermRow>(
      `SELECT id, label, template, created_at, updated_at
       FROM payment_terms
       ORDER BY label ASC`,
    );
    return rows.map(toPaymentTerm);
  }

  async upsertPaymentTerm(input: NewPaymentTerm): Promise<PaymentTerm> {
    const { rows } = await this.pool.query<PaymentTermRow>(
      `INSERT INTO payment_terms (label, template)
       VALUES ($1, $2)
       ON CONFLICT (label) DO UPDATE
       SET template = EXCLUDED.template, updated_at = now()
       RETURNING id, label, template, created_at, updated_at`,
      [input.label, input.template],
    );
    return toPaymentTerm(rows[0]);
  }
}
