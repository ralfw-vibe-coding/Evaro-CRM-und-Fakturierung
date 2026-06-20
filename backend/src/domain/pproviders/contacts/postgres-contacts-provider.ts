import type pg from "pg";
import type { Contact } from "../../model.js";
import type { ContactsProvider, ContactUpdate, NewContact } from "./contacts-provider.js";
import { getPool } from "../postgres/pool.js";

interface ContactRow {
  id: string;
  active: boolean;
  data: Contact["data"];
  created_at: Date;
  updated_at: Date;
}

function toContact(row: ContactRow): Contact {
  return {
    id: row.id,
    active: row.active,
    data: row.data,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export class PostgresContactsProvider implements ContactsProvider {
  constructor(private readonly pool: pg.Pool = getPool()) {}

  async insert(input: NewContact): Promise<Contact> {
    const { rows } = await this.pool.query<ContactRow>(
      `INSERT INTO contacts (active, data)
       VALUES ($1, $2)
       RETURNING id, active, data, created_at, updated_at`,
      [input.active, input.data],
    );
    return toContact(rows[0]);
  }

  async listActive(): Promise<Contact[]> {
    const { rows } = await this.pool.query<ContactRow>(
      `SELECT id, active, data, created_at, updated_at
       FROM contacts
       WHERE active = true
       ORDER BY created_at DESC`,
    );
    return rows.map(toContact);
  }

  async findById(id: string): Promise<Contact | null> {
    const { rows } = await this.pool.query<ContactRow>(
      `SELECT id, active, data, created_at, updated_at FROM contacts WHERE id = $1`,
      [id],
    );
    return rows[0] ? toContact(rows[0]) : null;
  }

  async update(id: string, update: ContactUpdate): Promise<Contact | null> {
    const { rows } = await this.pool.query<ContactRow>(
      `UPDATE contacts
       SET data = $1, active = COALESCE($2, active), updated_at = now()
       WHERE id = $3
       RETURNING id, active, data, created_at, updated_at`,
      [update.data, update.active ?? null, id],
    );
    return rows[0] ? toContact(rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM contacts WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
