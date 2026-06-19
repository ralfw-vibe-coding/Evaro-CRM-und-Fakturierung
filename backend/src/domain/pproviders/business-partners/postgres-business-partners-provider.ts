import type pg from "pg";
import type { BusinessPartner } from "../../model.js";
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
    types: row.types,
    data: row.data,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
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
}
