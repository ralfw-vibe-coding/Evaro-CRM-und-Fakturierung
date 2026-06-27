import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = process.cwd();
const baseDir = path.join(root, "requirements/ressourcen/odoo export 2");
const dataPath = path.join(baseDir, "import-simulation-data.json");
const migrationsDir = path.join(root, "backend/migrations");

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

function uniqueById(values) {
  const byId = new Map();
  for (const value of values) {
    if (value?.id && !byId.has(value.id)) byId.set(value.id, value);
  }
  return [...byId.values()];
}

function collectBusinessPartners(payload) {
  return uniqueById(payload.groups.map((group) => group.bp).filter(Boolean));
}

function collectContacts(payload) {
  return uniqueById(payload.groups.flatMap((group) => group.contacts ?? []));
}

function collectRelationships(payload) {
  return uniqueById(payload.groups.flatMap((group) => group.relationships ?? []));
}

async function runMigrations(client) {
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await client.query(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
  }
}

async function main() {
  loadEnvFile(".env");
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Import data not found: ${dataPath}. Run build-import-simulation.py first.`);
  }

  const payload = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const businessPartners = collectBusinessPartners(payload);
  const contacts = collectContacts(payload);
  const relationships = collectRelationships(payload);

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const counts = {
    deleted: {},
    insertedBusinessPartners: 0,
    insertedContacts: 0,
    insertedRelationships: 0,
    preservedUsers: 0,
  };

  try {
    await client.query("BEGIN");
    await runMigrations(client);

    const userCount = await client.query("SELECT count(*)::int AS count FROM users");
    counts.preservedUsers = userCount.rows[0].count;

    const cleared = await client.query(`
      WITH
        deleted_contact_gp AS (DELETE FROM contact_gp RETURNING 1),
        deleted_invoices AS (DELETE FROM invoices RETURNING 1),
        deleted_activity_log AS (DELETE FROM activity_log RETURNING 1),
        deleted_contacts AS (DELETE FROM contacts RETURNING 1),
        deleted_business_partners AS (DELETE FROM business_partners RETURNING 1),
        deleted_payment_terms AS (DELETE FROM payment_terms RETURNING 1),
        deleted_auth_otps AS (DELETE FROM auth_otps RETURNING 1)
      SELECT
        (SELECT count(*) FROM deleted_contact_gp)::int AS contact_gp,
        (SELECT count(*) FROM deleted_invoices)::int AS invoices,
        (SELECT count(*) FROM deleted_activity_log)::int AS activity_log,
        (SELECT count(*) FROM deleted_contacts)::int AS contacts,
        (SELECT count(*) FROM deleted_business_partners)::int AS business_partners,
        (SELECT count(*) FROM deleted_payment_terms)::int AS payment_terms,
        (SELECT count(*) FROM deleted_auth_otps)::int AS auth_otps
    `);
    counts.deleted = cleared.rows[0];

    const bpIds = new Map();
    for (const bp of businessPartners) {
      const inserted = await client.query(
        `INSERT INTO business_partners (types, data) VALUES ($1::text[], $2::jsonb) RETURNING id`,
        [bp.types ?? [], JSON.stringify({ ...bp.data, import: { ...bp.data.import, simulation_id: bp.id } })],
      );
      bpIds.set(bp.id, inserted.rows[0].id);
      counts.insertedBusinessPartners += 1;
    }

    const contactIds = new Map();
    for (const contact of contacts) {
      const inserted = await client.query(
        `INSERT INTO contacts (active, data) VALUES ($1, $2::jsonb) RETURNING id`,
        [
          contact.active !== false,
          JSON.stringify({ ...contact.data, import: { ...contact.data.import, simulation_id: contact.id } }),
        ],
      );
      contactIds.set(contact.id, inserted.rows[0].id);
      counts.insertedContacts += 1;
    }

    for (const relationship of relationships) {
      const contactId = contactIds.get(relationship.contact_id);
      const gpId = bpIds.get(relationship.gp_id);
      if (!contactId || !gpId) {
        throw new Error(`Cannot resolve relationship ${relationship.contact_id} -> ${relationship.gp_id}`);
      }
      await client.query(
        `INSERT INTO contact_gp (contact_id, gp_id, role, "primary") VALUES ($1, $2, $3, $4)`,
        [contactId, gpId, "", false],
      );
      counts.insertedRelationships += 1;
    }

    await client.query("COMMIT");
    console.log(JSON.stringify(counts, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
