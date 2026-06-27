import type pg from "pg";
import type { Channel, Contact, ContactData, Gender, Salutation } from "../../model.js";
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
    data: normalizeContactData(row.data),
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

function normalizeContactData(raw: unknown): ContactData {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const gender = text(data.gender);
  const salutation = text(data.salutation);
  return {
    title: text(data.title),
    first_name: text(data.first_name),
    last_name: text(data.last_name),
    gender: gender === "m" || gender === "f" || gender === "d" ? (gender as Gender) : undefined,
    salutation:
      salutation === "formal" || salutation === "informal" ? (salutation as Salutation) : undefined,
    origin: text(data.origin),
    company_text: text(data.company_text),
    channels: channels(data.channels),
    relationship: stringList(data.relationship),
    role: stringList(data.role),
    work_area: stringList(data.work_area),
    interests: stringList(data.interests),
    tags: stringList(data.tags),
    notes: text(data.notes),
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

  async listAll(): Promise<Contact[]> {
    const { rows } = await this.pool.query<ContactRow>(
      `SELECT id, active, data, created_at, updated_at
       FROM contacts
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
