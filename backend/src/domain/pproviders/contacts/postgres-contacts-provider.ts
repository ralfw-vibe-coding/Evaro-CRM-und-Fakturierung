import type pg from "pg";
import type { Contact } from "../../model.js";
import type { ContactsProvider, NewContact } from "./contacts-provider.js";
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
}
