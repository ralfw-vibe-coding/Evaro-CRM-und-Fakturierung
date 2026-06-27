import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const csvPath = path.join(root, "requirements/ressourcen/odoo export.csv");
const mappingPath = path.join(root, "requirements/ressourcen/odoo-evaro-mapping.json");
const outDir = path.join(root, "helpers/import-simulation");

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

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function writeCsv(file, headers, rows) {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ];
  fs.writeFileSync(path.join(outDir, file), `${lines.join("\n")}\n`);
}

function clean(value) {
  return String(value || "").trim();
}

function cleanHtml(value) {
  return clean(value)
    .replaceAll(/<\s*br\s*\/?\s*>/gi, "\n")
    .replaceAll(/<\/p\s*>/gi, "\n")
    .replaceAll(/<li[^>]*>/gi, "- ")
    .replaceAll(/<\/li\s*>/gi, "\n")
    .replaceAll(/<[^>]+>/g, "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();
}

function splitList(value) {
  return clean(value)
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeKey(value) {
  return clean(value).toLowerCase().replaceAll(/\s+/g, " ");
}

function normalizePhone(value) {
  return clean(value).replace(/^'+/, "");
}

function boolish(value) {
  return ["true", "wahr", "ja", "yes", "1"].includes(clean(value).toLowerCase());
}

function salutation(value) {
  const v = clean(value).toLowerCase();
  if (v === "du") return "informal";
  if (v === "sie") return "formal";
  return "";
}

function gender(value) {
  const v = clean(value).toLowerCase();
  if (v.includes("herr")) return "m";
  if (v.includes("frau")) return "f";
  if (v === "hallo") return "d";
  return "";
}

function makeId(prefix, index) {
  return `${prefix}-${String(index + 1).padStart(4, "0")}`;
}

const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
const parsed = parseCsv(fs.readFileSync(csvPath, "utf8"));
const header = parsed[0];
const rows = parsed.slice(1);
const columns = header.map((name, index) => {
  const sameBefore = header.slice(0, index + 1).filter((item) => item === name).length;
  const displayName = sameBefore > 1 ? `${name} #${sameBefore}` : name;
  return { id: `odoo.${index}.${name}`, index, name, displayName };
});
const byDisplay = new Map(columns.map((column) => [column.displayName, column.id]));

function rowObject(record) {
  const obj = {};
  columns.forEach((column, index) => {
    obj[column.id] = record[index] || "";
    obj[column.displayName] = record[index] || "";
  });
  return obj;
}

function v(row, displayName) {
  return clean(row[displayName]);
}

function extractPersonName(row) {
  const first = v(row, "Vorname");
  const last = v(row, "Nachname");
  if (first || last) return { first, last };

  const name = v(row, "Name");
  const full = v(row, "Vollständiger Name");
  const display = v(row, "Anzeigename");
  const parent = v(row, "Übergeordneter Name");
  const raw = name || full || display;
  if (!raw) return { first: "", last: "" };

  const candidate = raw.includes(",") ? raw.split(",").slice(1).join(",").trim() : raw;
  if (parent && normalizeKey(candidate) !== normalizeKey(parent)) {
    const parts = candidate.split(/\s+/).filter(Boolean);
    return { first: parts.slice(0, -1).join(" "), last: parts.at(-1) || "" };
  }

  return { first: "", last: "" };
}

function companyName(row, person) {
  const candidates = [
    v(row, "Unternehmensname"),
    v(row, "Name des Unternehmens"),
    v(row, "Übergeordneter Name"),
    v(row, "Anzeigename"),
    v(row, "Vollständiger Name"),
    v(row, "Name"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate);
    const personName = normalizeKey(`${person.first} ${person.last}`);
    if (personName && normalized === personName) continue;
    if (candidate.includes(",") && personName) return candidate.split(",")[0].trim();
    return candidate;
  }
  return "";
}

function classify(row) {
  const person = extractPersonName(row);
  const hasPerson = Boolean(person.first || person.last || gender(v(row, "Ansprache")));
  const companyMarker = boolish(v(row, "Ist ein Unternehmen"));
  const hasCompanyData = Boolean(
    companyMarker ||
      v(row, "USt-IdNr.") ||
      v(row, "Website-Link") ||
      v(row, "Übergeordneter Name") ||
      v(row, "Unternehmensname") ||
      v(row, "Name des Unternehmens")
  );

  if (hasCompanyData && hasPerson) return { kind: "hybrid", person };
  if (hasCompanyData) return { kind: "business_partner", person };
  if (hasPerson) return { kind: "contact", person };
  return { kind: "business_partner", person };
}

function addChannel(channels, type, value) {
  const address = type === "phone" ? normalizePhone(value) : clean(value);
  if (!address) return;
  if (channels.some((channel) => channel.type === type && channel.address === address)) return;
  channels.push({ type, address });
}

function compactJson(value) {
  return JSON.stringify(value);
}

const contacts = [];
const businessPartners = [];
const relationships = [];
const partnerByKey = new Map();
const reviewRows = [];

rows.forEach((record, index) => {
  const row = rowObject(record);
  const classification = classify(row);
  const decisionNotes = [];
  const needsContact = classification.kind === "contact" || classification.kind === "hybrid";
  const needsPartner = classification.kind === "business_partner" || classification.kind === "hybrid";
  const ambiguousToContact = classification.kind === "hybrid";

  if (classification.kind === "hybrid") decisionNotes.push("Firma/GP mit Persondaten: uneindeutige Kommunikationsdaten gehen zum Kontakt.");
  if (classification.kind === "contact") decisionNotes.push("Klare Person ohne starke GP-Signale.");
  if (classification.kind === "business_partner") decisionNotes.push("Keine klare Person oder starke GP-Signale: Datensatz wird als GP simuliert.");

  let contactId = "";
  let partnerId = "";

  const person = classification.person;
  const sourceEmail = v(row, "Normalisierte E-Mail") || v(row, "E-Mail");
  const sourcePhone = v(row, "Telefon") || v(row, "Telefon/Mobil");
  const sourceMobile = v(row, "Mobil");

  if (needsPartner) {
    const name = companyName(row, person) || `Unbenannter GP ${index + 1}`;
    const key = normalizeKey(`${v(row, "USt-IdNr.") || name}|${v(row, "PLZ")}|${v(row, "Stadt")}`);
    let partner = partnerByKey.get(key);
    if (!partner) {
      partner = {
        id: makeId("bp", businessPartners.length),
        source_row_numbers: [],
        name,
        types: boolish(v(row, "Ist ein Unternehmen")) ? "company" : "",
        vat_id: v(row, "USt-IdNr."),
        address_street: v(row, "Straße"),
        address_zip: v(row, "PLZ"),
        address_city: v(row, "Stadt"),
        address_country: v(row, "Ländercode") || v(row, "Land"),
        channels_json: [],
        business_relationship_json: [],
        tags_json: [],
        memo: cleanHtml(v(row, "Notizen")),
        notes: "",
      };
      if (v(row, "Website-Link")) addChannel(partner.channels_json, "website", v(row, "Website-Link"));
      if (!ambiguousToContact) {
        addChannel(partner.channels_json, "email", sourceEmail);
        addChannel(partner.channels_json, "phone", sourcePhone);
        addChannel(partner.channels_json, "phone", sourceMobile);
      }
      businessPartners.push(partner);
      partnerByKey.set(key, partner);
    }
    partner.source_row_numbers.push(index + 2);
    partnerId = partner.id;
  }

  if (needsContact) {
    const contactChannels = [];
    addChannel(contactChannels, "email", sourceEmail);
    addChannel(contactChannels, "phone", sourcePhone);
    addChannel(contactChannels, "phone", sourceMobile);

    const interests = [
      ...splitList(v(row, "Interessen")),
      ...splitList(v(row, "Produkte")).map((item) => `Produkt: ${item}`),
    ];
    for (const productField of ["MS365", "KI im Office", "KanBo", "Digitales Büro", "Zeitmanagement", "Teambuilding", "Trello"]) {
      if (boolish(v(row, productField))) interests.push(`Produkt: ${productField}`);
    }

    const notes = [
      v(row, "Empfehlung von") ? `Empfohlen durch: ${v(row, "Empfehlung von")}` : "",
      cleanHtml(v(row, "Notizen #3")),
      v(row, "Stichwörter") ? `Stichwoerter: ${v(row, "Stichwörter")}` : "",
      v(row, "Zusätzliche Infos") ? `Zusatzinfo: ${cleanHtml(v(row, "Zusätzliche Infos"))}` : "",
    ].filter(Boolean).join("\n\n");

    contactId = makeId("contact", contacts.length);
    contacts.push({
      id: contactId,
      source_row_number: index + 2,
      active: "true",
      title: "",
      first_name: person.first,
      last_name: person.last,
      gender: gender(v(row, "Ansprache")),
      salutation: salutation(v(row, "Du/Sie")),
      origin: v(row, "Quelle"),
      company_text: partnerId ? "" : v(row, "Unternehmensname") || v(row, "Name des Unternehmens") || v(row, "Übergeordneter Name"),
      channels_json: compactJson(contactChannels),
      relationship_json: compactJson([]),
      role_json: compactJson(splitList(v(row, "Rolle"))),
      work_area_json: compactJson([]),
      interests_json: compactJson([...new Set(interests)]),
      tags_json: compactJson(boolish(v(row, "Newsletter")) ? ["newsletter"] : []),
      notes,
      import_decision: classification.kind,
    });
  }

  if (contactId && partnerId) {
    relationships.push({
      contact_id: contactId,
      gp_id: partnerId,
      role: v(row, "Rolle") || "contact_person",
      primary: "true",
      source_row_number: index + 2,
    });
  }

  reviewRows.push({
    source_row_number: index + 2,
    kind: classification.kind,
    contact_id: contactId,
    business_partner_id: partnerId,
    relationship: contactId && partnerId ? `${contactId} -> ${partnerId}` : "",
    source_name: v(row, "Vollständiger Name") || v(row, "Anzeigename") || v(row, "Name"),
    source_company: v(row, "Unternehmensname") || v(row, "Name des Unternehmens") || v(row, "Übergeordneter Name"),
    source_email: sourceEmail,
    source_phone: sourcePhone || sourceMobile,
    decision_notes: decisionNotes.join(" "),
  });
});

fs.mkdirSync(outDir, { recursive: true });

businessPartners.forEach((partner) => {
  partner.source_row_numbers = partner.source_row_numbers.join(";");
  partner.channels_json = compactJson(partner.channels_json);
  partner.business_relationship_json = compactJson(partner.business_relationship_json);
  partner.tags_json = compactJson(partner.tags_json);
});

writeCsv("contacts.csv", [
  "id", "source_row_number", "active", "title", "first_name", "last_name", "gender", "salutation",
  "origin", "company_text", "channels_json", "relationship_json", "role_json", "work_area_json",
  "interests_json", "tags_json", "notes", "import_decision",
], contacts);

writeCsv("businesspartners.csv", [
  "id", "source_row_numbers", "name", "types", "vat_id", "address_street", "address_zip",
  "address_city", "address_country", "channels_json", "business_relationship_json", "tags_json",
  "memo", "notes",
], businessPartners);

writeCsv("relationships.csv", ["contact_id", "gp_id", "role", "primary", "source_row_number"], relationships);

writeCsv("review.csv", [
  "source_row_number", "kind", "contact_id", "business_partner_id", "relationship", "source_name",
  "source_company", "source_email", "source_phone", "decision_notes",
], reviewRows);

const mappingSummary = mapping.mappings.map((item) => `${item.sourceName} -> ${item.targetId}`).join("<br>");
const reviewJson = JSON.stringify({ contacts, businessPartners, relationships, reviewRows });
fs.writeFileSync(path.join(outDir, "review.html"), `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Odoo Import Simulation</title>
  <style>
    :root { --bg:#f6f7f9; --panel:#fff; --line:#d8dee8; --text:#17202a; --muted:#647084; --blue:#2563eb; --green:#0f766e; --orange:#b45309; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--text); }
    header { padding:14px 18px; background:var(--panel); border-bottom:1px solid var(--line); display:grid; grid-template-columns:1fr auto; gap:12px; align-items:center; position:sticky; top:0; z-index:3; }
    h1 { margin:0; font-size:18px; }
    .meta { color:var(--muted); font-size:13px; margin-top:4px; }
    .toolbar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    input { border:1px solid var(--line); border-radius:7px; padding:8px 9px; min-width:260px; }
    button { border:1px solid var(--line); border-radius:7px; padding:8px 10px; background:white; cursor:pointer; }
    button.active { background:var(--blue); color:white; border-color:var(--blue); }
    main { display:grid; grid-template-columns:minmax(360px,1fr) minmax(360px,1fr); gap:12px; padding:12px; }
    section { background:var(--panel); border:1px solid var(--line); border-radius:8px; min-height:calc(100vh - 92px); overflow:hidden; display:grid; grid-template-rows:auto 1fr; }
    h2 { margin:0; padding:12px; border-bottom:1px solid var(--line); font-size:15px; }
    .list { overflow:auto; padding:10px; display:grid; gap:8px; align-content:start; }
    .card { border:1px solid var(--line); border-radius:8px; padding:10px; display:grid; gap:7px; background:white; }
    .card.selected { border-color:var(--orange); box-shadow:0 0 0 2px rgba(180,83,9,.16); }
    .name { font-weight:750; display:flex; justify-content:space-between; gap:8px; }
    .pill { border-radius:999px; padding:2px 7px; font-size:11px; background:#edf2ff; color:#1d4ed8; white-space:nowrap; }
    .pill.green { background:#e6f7f4; color:var(--green); }
    .pill.orange { background:#fff4df; color:var(--orange); }
    .kv { display:grid; grid-template-columns:120px 1fr; gap:8px; font-size:12px; }
    .k { color:var(--muted); }
    .v { white-space:pre-wrap; overflow-wrap:anywhere; }
    .rel { border-top:1px solid var(--line); padding-top:7px; font-size:12px; }
    .empty { padding:14px; border:1px dashed var(--line); border-radius:8px; color:var(--muted); }
    details { margin:12px; color:var(--muted); font-size:12px; }
    summary { cursor:pointer; color:var(--text); font-weight:700; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Odoo Import Simulation</h1>
      <div class="meta">${contacts.length} Kontakte, ${businessPartners.length} Geschaeftspartner, ${relationships.length} Beziehungen aus ${rows.length} Odoo-Datensaetzen</div>
    </div>
    <div class="toolbar">
      <input id="search" type="search" placeholder="Name, Firma, E-Mail, Telefon suchen">
      <button id="all" class="active">Alle</button>
      <button id="hybrid">Hybrid</button>
      <button id="contact">Nur Kontakt</button>
      <button id="bp">Nur GP</button>
    </div>
  </header>
  <details>
    <summary>Verwendetes Mapping</summary>
    <p>${mappingSummary}</p>
  </details>
  <main>
    <section>
      <h2>Kontakte</h2>
      <div class="list" id="contacts"></div>
    </section>
    <section>
      <h2>Geschaeftspartner</h2>
      <div class="list" id="partners"></div>
    </section>
  </main>
  <script>
    const data = ${reviewJson};
    let filter = "all";
    let selectedContact = "";
    let selectedPartner = "";
    const byContact = new Map(data.relationships.map((rel) => [rel.contact_id, rel]));
    const partnersById = new Map(data.businessPartners.map((item) => [item.id, item]));
    const contactsById = new Map(data.contacts.map((item) => [item.id, item]));
    const contactsEl = document.getElementById("contacts");
    const partnersEl = document.getElementById("partners");
    const searchEl = document.getElementById("search");

    function esc(value) {
      return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    }
    function parseJson(value) {
      try { return JSON.parse(value || "[]"); } catch { return []; }
    }
    function textForContact(contact) {
      return [contact.first_name, contact.last_name, contact.company_text, contact.channels_json, contact.notes].join(" ").toLowerCase();
    }
    function textForPartner(partner) {
      return [partner.name, partner.vat_id, partner.address_city, partner.channels_json, partner.memo].join(" ").toLowerCase();
    }
    function passesKindContact(contact) {
      if (filter === "all") return true;
      if (filter === "hybrid") return contact.import_decision === "hybrid";
      if (filter === "contact") return contact.import_decision === "contact";
      if (filter === "bp") return false;
      return true;
    }
    function passesKindPartner(partner) {
      if (filter === "all") return true;
      if (filter === "hybrid") return data.relationships.some((rel) => rel.gp_id === partner.id);
      if (filter === "contact") return false;
      if (filter === "bp") return !data.relationships.some((rel) => rel.gp_id === partner.id);
      return true;
    }
    function channels(value) {
      return parseJson(value).map((item) => item.type + ": " + item.address).join("\\n");
    }
    function render() {
      const q = searchEl.value.trim().toLowerCase();
      const visibleContacts = data.contacts.filter((contact) => passesKindContact(contact) && (!q || textForContact(contact).includes(q)));
      const visiblePartners = data.businessPartners.filter((partner) => passesKindPartner(partner) && (!q || textForPartner(partner).includes(q)));
      contactsEl.innerHTML = visibleContacts.length ? visibleContacts.map(contactCard).join("") : '<div class="empty">Keine Kontakte fuer diese Auswahl.</div>';
      partnersEl.innerHTML = visiblePartners.length ? visiblePartners.map(partnerCard).join("") : '<div class="empty">Keine Geschaeftspartner fuer diese Auswahl.</div>';
      document.querySelectorAll("[data-contact]").forEach((node) => node.addEventListener("click", () => selectContact(node.dataset.contact)));
      document.querySelectorAll("[data-partner]").forEach((node) => node.addEventListener("click", () => selectPartner(node.dataset.partner)));
    }
    function contactCard(contact) {
      const rel = byContact.get(contact.id);
      const partner = rel ? partnersById.get(rel.gp_id) : null;
      return '<article class="card ' + (selectedContact === contact.id ? "selected" : "") + '" data-contact="' + esc(contact.id) + '">' +
        '<div class="name"><span>' + esc([contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.id) + '</span><span class="pill ' + (contact.import_decision === "hybrid" ? "orange" : "") + '">' + esc(contact.import_decision) + '</span></div>' +
        '<div class="kv"><div class="k">Quelle</div><div class="v">Zeile ' + esc(contact.source_row_number) + '</div></div>' +
        '<div class="kv"><div class="k">Firma Freitext</div><div class="v">' + esc(contact.company_text) + '</div></div>' +
        '<div class="kv"><div class="k">Kanaele</div><div class="v">' + esc(channels(contact.channels_json)) + '</div></div>' +
        '<div class="kv"><div class="k">Interessen</div><div class="v">' + esc(parseJson(contact.interests_json).join(", ")) + '</div></div>' +
        '<div class="kv"><div class="k">Notizen</div><div class="v">' + esc(contact.notes) + '</div></div>' +
        (partner ? '<div class="rel"><span class="pill green">Beziehung</span> ' + esc(rel.role) + ' -> ' + esc(partner.name) + '</div>' : '') +
      '</article>';
    }
    function partnerCard(partner) {
      const rels = data.relationships.filter((rel) => rel.gp_id === partner.id);
      return '<article class="card ' + (selectedPartner === partner.id ? "selected" : "") + '" data-partner="' + esc(partner.id) + '">' +
        '<div class="name"><span>' + esc(partner.name) + '</span><span class="pill green">' + esc(partner.id) + '</span></div>' +
        '<div class="kv"><div class="k">Quellzeilen</div><div class="v">' + esc(partner.source_row_numbers) + '</div></div>' +
        '<div class="kv"><div class="k">USt-ID</div><div class="v">' + esc(partner.vat_id) + '</div></div>' +
        '<div class="kv"><div class="k">Adresse</div><div class="v">' + esc([partner.address_street, partner.address_zip, partner.address_city, partner.address_country].filter(Boolean).join("\\n")) + '</div></div>' +
        '<div class="kv"><div class="k">Kanaele</div><div class="v">' + esc(channels(partner.channels_json)) + '</div></div>' +
        '<div class="kv"><div class="k">Memo</div><div class="v">' + esc(partner.memo) + '</div></div>' +
        (rels.length ? '<div class="rel"><span class="pill orange">Kontakte</span> ' + esc(rels.map((rel) => { const c = contactsById.get(rel.contact_id); return c ? [c.first_name, c.last_name].filter(Boolean).join(" ") : rel.contact_id; }).join(", ")) + '</div>' : '') +
      '</article>';
    }
    function selectContact(id) {
      selectedContact = id;
      const rel = byContact.get(id);
      selectedPartner = rel ? rel.gp_id : "";
      render();
      if (selectedPartner) document.querySelector('[data-partner="' + selectedPartner + '"]')?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    function selectPartner(id) {
      selectedPartner = id;
      const rel = data.relationships.find((item) => item.gp_id === id);
      selectedContact = rel ? rel.contact_id : "";
      render();
      if (selectedContact) document.querySelector('[data-contact="' + selectedContact + '"]')?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    document.querySelectorAll("button[id]").forEach((button) => {
      if (!["all", "hybrid", "contact", "bp"].includes(button.id)) return;
      button.addEventListener("click", () => {
        filter = button.id;
        document.querySelectorAll("button[id]").forEach((node) => node.classList.toggle("active", node.id === filter));
        render();
      });
    });
    searchEl.addEventListener("input", render);
    render();
  </script>
</body>
</html>
`);

console.log(`Wrote ${contacts.length} contacts, ${businessPartners.length} business partners, ${relationships.length} relationships to ${outDir}`);
