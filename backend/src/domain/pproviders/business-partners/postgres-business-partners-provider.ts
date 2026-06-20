import type pg from "pg";
import type { BusinessPartner, BusinessPartnerData, Channel } from "../../model.js";
import type {
  BusinessPartnersProvider,
  BusinessPartnerUpdate,
  NewBusinessPartner,
} from "./business-partners-provider.js";
import { getPool } from "../postgres/pool.js";

interface BpRow {
  id: string;
  types: string[];
  data: BusinessPartner["data"];
  created_at: Date;
  updated_at: Date;
}

function toBp(row: BpRow): BusinessPartner {
  return {
    id: row.id,
    types: stringList(row.types) ?? [],
    data: normalizeBusinessPartnerData(row.data),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = [...new Set(value.map(text).filter((item): item is string => Boolean(item)))];
  return values.length > 0 ? values : undefined;
}

function channels(value: unknown): Channel[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return { type: text(record.type) ?? "", address: text(record.address) ?? "" };
    })
    .filter((channel) => channel.type && channel.address);
}

function normalizeAddress(value: unknown): BusinessPartnerData["address"] {
  if (!value || typeof value !== "object") return undefined;
  const address = value as Record<string, unknown>;
  return {
    street: text(address.street),
    zip: text(address.zip),
    city: text(address.city),
    country: text(address.country),
  };
}

function normalizeBusinessPartnerData(raw: unknown): BusinessPartnerData {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    name: text(data.name) ?? "",
    vat_id: text(data.vat_id),
    address: normalizeAddress(data.address),
    channels: channels(data.channels),
    business_relationship: stringList(data.business_relationship),
    tags: stringList(data.tags),
    memo: text(data.memo),
    notes: text(data.notes),
  };
}

export class PostgresBusinessPartnersProvider implements BusinessPartnersProvider {
  constructor(private readonly pool: pg.Pool = getPool()) {}

  async insert(input: NewBusinessPartner): Promise<BusinessPartner> {
    const { rows } = await this.pool.query<BpRow>(
      `INSERT INTO business_partners (types, data)
       VALUES ($1, $2)
       RETURNING id, types, data, created_at, updated_at`,
      [input.types, input.data],
    );
    return toBp(rows[0]);
  }

  async listAll(): Promise<BusinessPartner[]> {
    const { rows } = await this.pool.query<BpRow>(
      `SELECT id, types, data, created_at, updated_at
       FROM business_partners
       ORDER BY created_at DESC`,
    );
    return rows.map(toBp);
  }

  async findById(id: string): Promise<BusinessPartner | null> {
    const { rows } = await this.pool.query<BpRow>(
      `SELECT id, types, data, created_at, updated_at
       FROM business_partners
       WHERE id = $1`,
      [id],
    );
    return rows[0] ? toBp(rows[0]) : null;
  }

  async update(id: string, update: BusinessPartnerUpdate): Promise<BusinessPartner | null> {
    const { rows } = await this.pool.query<BpRow>(
      `UPDATE business_partners
       SET types = $1, data = $2, updated_at = now()
       WHERE id = $3
       RETURNING id, types, data, created_at, updated_at`,
      [update.types, update.data, id],
    );
    return rows[0] ? toBp(rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM business_partners WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
