import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(process.cwd());
const baseDir = path.join(root, "requirements/ressourcen/Import 29.06.2026");
const csvPath = path.join(baseDir, "newsletter.csv");
const importBatch = "newsletter-2026-06-29";
const useProduction = process.argv.includes("--production");

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
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ";") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...dataRows] = rows;
  if (!header) return [];
  return dataRows
    .filter((dataRow) => dataRow.some((value) => value.trim()))
    .map((dataRow) => Object.fromEntries(header.map((key, index) => [key, dataRow[index] ?? ""])));
}

function clean(value) {
  return String(value ?? "").trim();
}

function maybe(value) {
  const cleaned = clean(value);
  return cleaned ? cleaned : undefined;
}

function list(value) {
  const cleaned = maybe(value);
  return cleaned ? [cleaned] : undefined;
}

function addChannel(channels, type, address) {
  const cleaned = maybe(address);
  if (!cleaned) return;
  const channel = { type, address: cleaned };
  if (!channels.some((item) => item.type === channel.type && item.address === channel.address)) {
    channels.push(channel);
  }
}

function gender(value) {
  const cleaned = clean(value).toLowerCase();
  if (cleaned === "m") return "m";
  if (cleaned === "w" || cleaned === "f") return "f";
  if (cleaned === "d") return "d";
  return undefined;
}

function compact(value) {
  if (Array.isArray(value)) {
    const items = value.map(compact).filter((item) => item !== undefined);
    return items.length ? items : undefined;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, compact(item)])
      .filter(([, item]) => item !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return maybe(value);
}

function contactData(row, sourceRow) {
  const channels = [];
  addChannel(channels, "email", row["E-Mail"]);
  addChannel(channels, "phone", row.Telefon);
  addChannel(channels, "website", row.Website);

  return compact({
    first_name: row.Vorname,
    last_name: row.Nachname,
    gender: gender(row.Geschlecht),
    salutation: clean(row.Anrede) === "f" ? "formal" : undefined,
    origin: row["Kontakt Quelle"],
    company_text: row.Firma,
    channels,
    relationship: list(row["Kontakt Beziehung"]),
    tags: list(row["Kontakt Tag"]),
    notes: row["Kontakt Notizen"],
    import: {
      batch: importBatch,
      source_file: row.Datei,
      source_row: sourceRow,
    },
  });
}

function businessPartnerData(row, sourceRow, includeNewsletterTag) {
  const channels = [];
  addChannel(channels, "website", row.Website);
  if (includeNewsletterTag) {
    addChannel(channels, "email", row["E-Mail"]);
    addChannel(channels, "phone", row.Telefon);
  }

  return compact({
    name: row.Firma,
    address: {
      street: row["Straße"],
      zip: row.PLZ,
      city: row.Ort,
      country: row.Land,
    },
    channels,
    tags: includeNewsletterTag ? list(row["Kontakt Tag"]) : undefined,
    notes: row["GP Notizen"],
    import: {
      batch: importBatch,
      source_file: row.Datei,
      source_row: sourceRow,
    },
  });
}

async function main() {
  loadEnvFile(".env");
  const databaseUrl = useProduction ? process.env.DATABASE_URL_PRODUCTION : process.env.DATABASE_URL;
  const databaseUrlName = useProduction ? "DATABASE_URL_PRODUCTION" : "DATABASE_URL";
  if (!databaseUrl) throw new Error(`${databaseUrlName} is not set.`);
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found: ${csvPath}`);

  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  const counts = {
    readRows: rows.length,
    insertedContacts: 0,
    insertedBusinessPartners: 0,
    insertedRelationships: 0,
    skippedRows: 0,
    contactOnlyRows: 0,
    gpOnlyRows: 0,
    contactAndGpRows: 0,
  };

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `
        SELECT
          (SELECT count(*)::int FROM contacts WHERE data->'import'->>'batch' = $1) AS contacts,
          (SELECT count(*)::int FROM business_partners WHERE data->'import'->>'batch' = $1) AS business_partners
      `,
      [importBatch],
    );
    if (existing.rows[0].contacts > 0 || existing.rows[0].business_partners > 0) {
      throw new Error(
        `Import batch ${importBatch} already exists (${existing.rows[0].contacts} contacts, ${existing.rows[0].business_partners} business partners).`,
      );
    }

    for (const [index, row] of rows.entries()) {
      const sourceRow = index + 2;
      const hasContact = Boolean(maybe(row.Nachname));
      const hasBusinessPartner = Boolean(maybe(row.Ort));

      if (!hasContact && !hasBusinessPartner) {
        counts.skippedRows += 1;
        continue;
      }

      let contactId = null;
      let businessPartnerId = null;

      if (hasContact) {
        const contact = contactData(row, sourceRow);
        const result = await client.query(
          `INSERT INTO contacts (active, data) VALUES (false, $1::jsonb) RETURNING id`,
          [JSON.stringify(contact)],
        );
        contactId = result.rows[0].id;
        counts.insertedContacts += 1;
      }

      if (hasBusinessPartner) {
        const gp = businessPartnerData(row, sourceRow, !hasContact);
        const types = list(row["GP Typen"]) ?? [];
        const result = await client.query(
          `INSERT INTO business_partners (active, types, data) VALUES (false, $1::text[], $2::jsonb) RETURNING id`,
          [types, JSON.stringify(gp)],
        );
        businessPartnerId = result.rows[0].id;
        counts.insertedBusinessPartners += 1;
      }

      if (contactId && businessPartnerId) {
        await client.query(
          `INSERT INTO contact_gp (contact_id, gp_id, role, "primary") VALUES ($1, $2, $3, true)`,
          [contactId, businessPartnerId, clean(row["Kontakt Beziehung"])],
        );
        counts.insertedRelationships += 1;
        counts.contactAndGpRows += 1;
      } else if (contactId) {
        counts.contactOnlyRows += 1;
      } else if (businessPartnerId) {
        counts.gpOnlyRows += 1;
      }
    }

    await client.query("COMMIT");
    console.log(JSON.stringify({ target: databaseUrlName, ...counts }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
