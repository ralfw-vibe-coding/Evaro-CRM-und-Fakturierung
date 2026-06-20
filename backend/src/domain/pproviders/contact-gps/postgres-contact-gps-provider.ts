import type pg from "pg";
import type { ContactGp } from "../../model.js";
import { getPool } from "../postgres/pool.js";
import type { ContactGpInput, ContactGpsProvider } from "./contact-gps-provider.js";

interface ContactGpRow {
  contact_id: string;
  gp_id: string;
  role: string;
  primary: boolean;
  created_at: Date;
}

function toContactGp(row: ContactGpRow): ContactGp {
  return {
    contact_id: row.contact_id,
    gp_id: row.gp_id,
    role: row.role,
    primary: row.primary,
    created_at: row.created_at.toISOString(),
  };
}

export class PostgresContactGpsProvider implements ContactGpsProvider {
  constructor(private readonly pool: pg.Pool = getPool()) {}

  async listAll(): Promise<ContactGp[]> {
    const { rows } = await this.pool.query<ContactGpRow>(
      `SELECT contact_id, gp_id, role, "primary", created_at
       FROM contact_gp
       ORDER BY created_at DESC`,
    );
    return rows.map(toContactGp);
  }

  async upsert(input: ContactGpInput): Promise<ContactGp> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      if (input.primary) {
        await client.query(`UPDATE contact_gp SET "primary" = false WHERE contact_id = $1`, [
          input.contact_id,
        ]);
      }
      const { rows } = await client.query<ContactGpRow>(
        `INSERT INTO contact_gp (contact_id, gp_id, role, "primary")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (contact_id, gp_id)
         DO UPDATE SET role = EXCLUDED.role, "primary" = EXCLUDED."primary"
         RETURNING contact_id, gp_id, role, "primary", created_at`,
        [input.contact_id, input.gp_id, input.role, input.primary ?? false],
      );
      await client.query("COMMIT");
      return toContactGp(rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(contact_id: string, gp_id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM contact_gp WHERE contact_id = $1 AND gp_id = $2`, [
      contact_id,
      gp_id,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  async deleteForContact(contact_id: string): Promise<number> {
    const result = await this.pool.query(`DELETE FROM contact_gp WHERE contact_id = $1`, [contact_id]);
    return result.rowCount ?? 0;
  }

  async deleteForBusinessPartner(gp_id: string): Promise<number> {
    const result = await this.pool.query(`DELETE FROM contact_gp WHERE gp_id = $1`, [gp_id]);
    return result.rowCount ?? 0;
  }
}
