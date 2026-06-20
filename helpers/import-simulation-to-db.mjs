import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = process.cwd();
const simulationDir = path.join(root, "helpers/import-simulation");
const migrationsDir = path.join(root, "backend/migrations");
const importedAt = new Date().toISOString();

function loadEnvFile(file) {
  const envPath = path.join(root, file);
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function parseCsv(text) {
  const records = [];
  let row = [];
  let value = "";
  let quoted = false;
  let atFieldStart = true;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        value += '"';
        i += 1;
      } else if (ch === '"' && [",", "\n", "\r", undefined].includes(next)) {
        quoted = false;
      } else {
        value += ch;
      }
    } else if (ch === '"' && atFieldStart) {
      quoted = true;
      atFieldStart = false;
    } else if (ch === ",") {
      row.push(value);
      value = "";
      atFieldStart = true;
    } else if (ch === "\n") {
      row.push(value);
      records.push(row);
      row = [];
      value = "";
      atFieldStart = true;
    } else if (ch !== "\r") {
      value += ch;
      atFieldStart = false;
    }
  }

  if (value.length || row.length) {
    row.push(value);
    records.push(row);
  }

  return records.filter((record) => record.some((cell) => cell.trim() !== ""));
}

function readCsv(file) {
  const records = parseCsv(fs.readFileSync(path.join(simulationDir, file), "utf8"));
  const headers = records[0];
  return records.slice(1).map((record) => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = record[index] || "";
    });
    return row;
  });
}

function parseJson(value, fallback = []) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => {
    if (Array.isArray(entry)) return entry.length > 0;
    if (entry && typeof entry === "object") return Object.keys(entry).length > 0;
    return entry !== "" && entry != null;
  }));
}

function contactData(row) {
  return compactObject({
    title: row.title,
    first_name: row.first_name,
    last_name: row.last_name,
    gender: row.gender,
    salutation: row.salutation,
    origin: row.origin,
    company_text: row.company_text,
    channels: parseJson(row.channels_json),
    relationship: parseJson(row.relationship_json),
    role: parseJson(row.role_json),
    work_area: parseJson(row.work_area_json),
    interests: parseJson(row.interests_json),
    tags: parseJson(row.tags_json),
    notes: row.notes,
    import: {
      source: "odoo",
      simulation_id: row.id,
      source_row_number: row.source_row_number,
      decision: row.import_decision,
      imported_at: importedAt,
    },
  });
}

function businessPartnerData(row) {
  return compactObject({
    name: row.name,
    vat_id: row.vat_id,
    address: compactObject({
      street: row.address_street,
      zip: row.address_zip,
      city: row.address_city,
      country: row.address_country,
    }),
    channels: parseJson(row.channels_json),
    business_relationship: parseJson(row.business_relationship_json),
    tags: parseJson(row.tags_json),
    memo: row.memo,
    notes: row.notes,
    import: {
      source: "odoo",
      simulation_id: row.id,
      source_row_numbers: row.source_row_numbers,
      imported_at: importedAt,
    },
  });
}

async function upsertContact(client, row) {
  const existing = await client.query(
    `SELECT id FROM contacts WHERE data->'import'->>'source' = 'odoo' AND data->'import'->>'simulation_id' = $1`,
    [row.id],
  );
  const data = contactData(row);
  if (existing.rowCount) {
    const id = existing.rows[0].id;
    await client.query(
      `UPDATE contacts SET active = $2, data = $3::jsonb, updated_at = now() WHERE id = $1`,
      [id, row.active === "true", JSON.stringify(data)],
    );
    return { id, action: "updated" };
  }

  const inserted = await client.query(
    `INSERT INTO contacts (active, data) VALUES ($1, $2::jsonb) RETURNING id`,
    [row.active === "true", JSON.stringify(data)],
  );
  return { id: inserted.rows[0].id, action: "inserted" };
}

async function upsertBusinessPartner(client, row) {
  const existing = await client.query(
    `SELECT id FROM business_partners WHERE data->'import'->>'source' = 'odoo' AND data->'import'->>'simulation_id' = $1`,
    [row.id],
  );
  const types = row.types ? row.types.split(/[;,|]/).map((item) => item.trim()).filter(Boolean) : [];
  const data = businessPartnerData(row);
  if (existing.rowCount) {
    const id = existing.rows[0].id;
    await client.query(
      `UPDATE business_partners SET types = $2::text[], data = $3::jsonb, updated_at = now() WHERE id = $1`,
      [id, types, JSON.stringify(data)],
    );
    return { id, action: "updated" };
  }

  const inserted = await client.query(
    `INSERT INTO business_partners (types, data) VALUES ($1::text[], $2::jsonb) RETURNING id`,
    [types, JSON.stringify(data)],
  );
  return { id: inserted.rows[0].id, action: "inserted" };
}

async function main() {
  loadEnvFile(".env");
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Load .env before running this script.");
  }

  const contacts = readCsv("contacts.csv");
  const businessPartners = readCsv("businesspartners.csv");
  const relationships = readCsv("relationships.csv");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const contactIds = new Map();
  const bpIds = new Map();
  const counts = {
    contactsInserted: 0,
    contactsUpdated: 0,
    businessPartnersInserted: 0,
    businessPartnersUpdated: 0,
    relationshipsUpserted: 0,
  };

  try {
    await client.query("BEGIN");

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();
    for (const file of migrationFiles) {
      await client.query(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
    }

    for (const row of businessPartners) {
      const result = await upsertBusinessPartner(client, row);
      bpIds.set(row.id, result.id);
      counts[result.action === "inserted" ? "businessPartnersInserted" : "businessPartnersUpdated"] += 1;
    }

    for (const row of contacts) {
      const result = await upsertContact(client, row);
      contactIds.set(row.id, result.id);
      counts[result.action === "inserted" ? "contactsInserted" : "contactsUpdated"] += 1;
    }

    for (const row of relationships) {
      const contactId = contactIds.get(row.contact_id);
      const gpId = bpIds.get(row.gp_id);
      if (!contactId || !gpId) {
        throw new Error(`Cannot resolve relationship ${row.contact_id} -> ${row.gp_id}`);
      }
      if (row.primary === "true") {
        await client.query(`UPDATE contact_gp SET "primary" = false WHERE contact_id = $1`, [contactId]);
      }
      await client.query(
        `INSERT INTO contact_gp (contact_id, gp_id, role, "primary")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (contact_id, gp_id)
         DO UPDATE SET role = EXCLUDED.role, "primary" = EXCLUDED."primary"`,
        [contactId, gpId, row.role || "contact_person", row.primary === "true"],
      );
      counts.relationshipsUpserted += 1;
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }

  console.log(JSON.stringify(counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
