#!/usr/bin/env node
/**
 * Exportiert alle Kontakte und Geschäftspartner aus Evaro als Markdown-Dateien.
 *
 * Gelesen wird über GET /api/selection?include_inactive=true — dieser eine
 * Endpunkt liefert Kontakte, Geschäftspartner und ihre Verknüpfungen zusammen.
 * Es wird ausschliesslich gelesen; nichts wird zurückgeschrieben.
 *
 * Aufruf:
 *   EVARO_URL=https://… EVARO_API_KEY=… node scripts/export-markdown.mjs
 *
 * Optional:
 *   EVARO_EXPORT_DIR   Zielverzeichnis (Vorgabe: "Evaro Export")
 */

import { mkdir, writeFile, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";

const BASE_URL = process.env.EVARO_URL;
const API_KEY = process.env.EVARO_API_KEY;
const OUT_DIR = process.env.EVARO_EXPORT_DIR ?? "Evaro Export";

if (!BASE_URL || !API_KEY) {
  console.error(
    "Fehlende Konfiguration.\n" +
      "  EVARO_URL      = Basis-URL der Instanz, z.B. https://evaro.example.com\n" +
      "  EVARO_API_KEY  = API-Key (in Evaro unter Einstellungen erzeugen)\n\n" +
      'Beispiel:\n  EVARO_URL="https://…" EVARO_API_KEY="…" node scripts/export-markdown.mjs',
  );
  process.exit(1);
}

// ── Abruf ────────────────────────────────────────────────────────────────────

async function fetchSelection() {
  const url = new URL("/api/selection", BASE_URL);
  url.searchParams.set("include_inactive", "true");

  const res = await fetch(url, { headers: { "x-api-key": API_KEY } });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `${res.status} ${res.statusText} von ${url.pathname}` +
        (res.status === 401 ? " — API-Key ungültig oder abgelaufen." : "") +
        (detail ? `\n${detail.slice(0, 400)}` : ""),
    );
  }
  return res.json();
}

// ── Dateinamen ───────────────────────────────────────────────────────────────

/** Entfernt alles, was im Dateisystem oder in Wiki-Links Ärger macht. */
function sanitizeName(value) {
  return String(value)
    .replace(/[\\/:*?"<>|#^[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
}

/** "Nachname Vorname 1a2b" bzw. "Firmenname 1a2b" — die ID-Endung trennt Namensgleiche. */
function buildFileName(entry, taken) {
  const d = entry.data ?? {};
  const name =
    entry.__typ === "person"
      ? [d.last_name, d.first_name].filter(Boolean).join(" ")
      : d.name;

  const base = sanitizeName(name || "Ohne Namen");
  let suffix = 4;
  let candidate = `${base} ${entry.id.slice(0, suffix)}`;
  // Nur nötig, wenn Name *und* ID-Anfang kollidieren — dann Suffix verlängern.
  while (taken.has(candidate.toLowerCase()) && suffix < entry.id.length) {
    suffix += 4;
    candidate = `${base} ${entry.id.slice(0, suffix)}`;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

// ── YAML ─────────────────────────────────────────────────────────────────────

/** Schlüssel auf eine unproblematische Form bringen (Kanaltypen sind frei wählbar). */
function yamlKey(value) {
  const k = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9äöüß_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return k || "feld";
}

/** Immer quoten: umgeht Doppelpunkte, Wiki-Links, führende Sonderzeichen usw. */
function yamlString(value) {
  const flat = String(value).replace(/\s*\r?\n\s*/g, " ").trim();
  return `"${flat.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function yamlValue(value) {
  if (typeof value === "boolean") return String(value);
  return yamlString(value);
}

function renderFrontmatter(fields) {
  const lines = ["---"];
  for (const [key, value] of fields) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      const items = value.filter((v) => v !== undefined && v !== null && v !== "");
      if (items.length === 0) continue;
      lines.push(`${key}:`);
      for (const item of items) lines.push(`  - ${yamlValue(item)}`);
    } else {
      lines.push(`${key}: ${yamlValue(value)}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

// ── Feld-Abbildungen ─────────────────────────────────────────────────────────

const GESCHLECHT = { m: "männlich", f: "weiblich", d: "divers" };
const ANREDE = { formal: "förmlich", informal: "persönlich" };
const KANAL_LABEL = { email: "email", phone: "telefon", website: "website" };

/** Kanäle nach Typ bündeln: email: [...], telefon: [...], … */
function channelFields(channels) {
  const grouped = new Map();
  for (const ch of channels ?? []) {
    if (!ch?.address) continue;
    const key = yamlKey(KANAL_LABEL[ch.type] ?? ch.type ?? "kanal");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(ch.address);
  }
  return [...grouped.entries()];
}

const link = (fileName) => `[[${fileName}]]`;

// ── Markdown ─────────────────────────────────────────────────────────────────

/** Nur die Notizfelder werden zu H1-Abschnitten; alles andere ist Frontmatter. */
function renderBody(sections) {
  const out = [];
  for (const [heading, text] of sections) {
    const value = (text ?? "").trim();
    if (!value) continue;
    out.push(`# ${heading}`, "", value, "");
  }
  return out.join("\n");
}

function renderContact(entry, links) {
  const d = entry.data ?? {};
  const fields = [
    ["typ", "person"],
    ["aktiv", entry.active === true],
    ["nachname", d.last_name],
    ["vorname", d.first_name],
    ["titel", d.title],
    ["geschlecht", GESCHLECHT[d.gender] ?? d.gender],
    ["anrede", ANREDE[d.salutation] ?? d.salutation],
    ["firma", d.company_text],
    ["herkunft", d.origin],
    ...channelFields(d.channels),
    ["beziehung", d.relationship],
    ["rolle", d.role],
    ["arbeitsbereich", d.work_area],
    ["interessen", d.interests],
    ["tags", d.tags],
    ["geschäftspartner", links.gps],
    ["hauptgeschäftspartner", links.primaryGp],
    ["rollen_bei_geschäftspartner", links.gpRoles],
    ["id", entry.id],
    ["erstellt", entry.created_at],
    ["geändert", entry.updated_at],
  ];
  return `${renderFrontmatter(fields)}\n\n${renderBody([["Notizen", d.notes]])}`;
}

function renderBusinessPartner(entry, links) {
  const d = entry.data ?? {};
  const a = d.address ?? {};
  const fields = [
    ["typ", "geschäftspartner"],
    ["aktiv", entry.active === true],
    ["name", d.name],
    ["art", entry.types],
    ["ust_id", d.vat_id],
    ["strasse", a.street],
    ["plz", a.zip],
    ["ort", a.city],
    ["land", a.country],
    ["rechnungssprache", d.invoice_language],
    ...channelFields(d.channels),
    ["geschäftsbeziehung", d.business_relationship],
    ["tags", d.tags],
    ["personen", links.contacts],
    ["hauptkontakte", links.primaryContacts],
    ["rollen_der_personen", links.contactRoles],
    ["id", entry.id],
    ["erstellt", entry.created_at],
    ["geändert", entry.updated_at],
  ];
  return `${renderFrontmatter(fields)}\n\n${renderBody([
    ["Notizen", d.notes],
    ["Memo", d.memo],
  ])}`;
}

// ── Hauptlauf ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Lade Daten von ${new URL("/api/selection", BASE_URL).origin} …`);
  const selection = await fetchSelection();

  const contacts = selection.contacts ?? [];
  const partners = selection.business_partners ?? [];
  const relations = selection.contact_gps ?? [];
  console.log(
    `  ${contacts.length} Kontakte, ${partners.length} Geschäftspartner, ${relations.length} Verknüpfungen`,
  );

  // Erst alle Dateinamen festlegen, damit Verweise aufgelöst werden können.
  const taken = new Set();
  const entries = [
    ...contacts.map((c) => ({ ...c, __typ: "person" })),
    ...partners.map((p) => ({ ...p, __typ: "geschäftspartner" })),
  ];
  const fileNameById = new Map();
  for (const entry of entries) fileNameById.set(entry.id, buildFileName(entry, taken));

  // Verknüpfungen von beiden Seiten her aufbereiten.
  const byContact = new Map();
  const byGp = new Map();
  for (const rel of relations) {
    const gpFile = fileNameById.get(rel.gp_id);
    const contactFile = fileNameById.get(rel.contact_id);
    if (gpFile) {
      if (!byContact.has(rel.contact_id)) byContact.set(rel.contact_id, []);
      byContact.get(rel.contact_id).push({ file: gpFile, role: rel.role, primary: rel.primary });
    }
    if (contactFile) {
      if (!byGp.has(rel.gp_id)) byGp.set(rel.gp_id, []);
      byGp.get(rel.gp_id).push({ file: contactFile, role: rel.role, primary: rel.primary });
    }
  }

  const roleLabel = (r) => (r.role ? `${r.role} @ ${r.file}` : null);

  await mkdir(OUT_DIR, { recursive: true });

  // Frühere Ausgabe entfernen, damit gelöschte Einträge nicht liegen bleiben.
  const stale = (await readdir(OUT_DIR).catch(() => [])).filter((f) => f.endsWith(".md"));
  await Promise.all(stale.map((f) => unlink(join(OUT_DIR, f))));

  let written = 0;
  for (const entry of entries) {
    const fileName = fileNameById.get(entry.id);
    const rels = (entry.__typ === "person" ? byContact : byGp).get(entry.id) ?? [];

    const markdown =
      entry.__typ === "person"
        ? renderContact(entry, {
            gps: rels.map((r) => link(r.file)),
            primaryGp: rels.find((r) => r.primary)?.file
              ? link(rels.find((r) => r.primary).file)
              : undefined,
            gpRoles: rels.map(roleLabel).filter(Boolean),
          })
        : renderBusinessPartner(entry, {
            contacts: rels.map((r) => link(r.file)),
            primaryContacts: rels.filter((r) => r.primary).map((r) => link(r.file)),
            contactRoles: rels.map(roleLabel).filter(Boolean),
          });

    await writeFile(join(OUT_DIR, `${fileName}.md`), markdown, "utf8");
    written += 1;
  }

  const inaktiv = entries.filter((e) => e.active !== true).length;
  console.log(
    `\n${written} Dateien geschrieben nach "${OUT_DIR}"\n` +
      `  davon ${inaktiv} inaktiv, ${written - inaktiv} aktiv`,
  );
}

main().catch((err) => {
  console.error(`\nExport fehlgeschlagen: ${err.message}`);
  process.exit(1);
});
