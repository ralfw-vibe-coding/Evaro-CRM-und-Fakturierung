import html
import json
import re
import unicodedata
from pathlib import Path

import pandas as pd


BASE = Path(__file__).parent
OUT = BASE / "import-simulation-review.html"
JSON_OUT = BASE / "import-simulation-data.json"


def clean(value):
    return str(value or "").strip()


def clean_html(value):
    text = clean(value)
    if not text:
        return ""
    text = re.sub(r"<\s*br\s*/?\s*>", "\n", text, flags=re.I)
    text = re.sub(r"</p\s*>", "\n", text, flags=re.I)
    text = re.sub(r"<li[^>]*>", "- ", text, flags=re.I)
    text = re.sub(r"</li\s*>", "\n", text, flags=re.I)
    text = re.sub(r"</div\s*>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    replacements = {
        "&nbsp;": " ",
        "&amp;": "&",
        "&quot;": '"',
        "&#39;": "'",
        "&auml;": "ä",
        "&ouml;": "ö",
        "&uuml;": "ü",
        "&Auml;": "Ä",
        "&Ouml;": "Ö",
        "&Uuml;": "Ü",
        "&szlig;": "ß",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_list(value):
    return [item.strip() for item in re.split(r"[;,|]", clean(value)) if item.strip()]


def hashtag(value):
    return "#" + re.sub(r"\s+", "_", clean(value))


def norm_key(value):
    text = clean(value).lower().replace("&", " und ")
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"[^\wäöüß]+", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


def normalize_phone(value):
    return clean(value).replace("\u202d", "").replace("\u202c", "").replace("'", "").strip()


def boolish(value):
    return clean(value).lower() in {"true", "wahr", "ja", "yes", "1"}


COUNTRIES = {
    "DE": "Deutschland",
    "AT": "Österreich",
    "US": "Vereinigte Staaten von Amerika",
    "CA": "Kanada",
    "BG": "Bulgarien",
}


def country_name(country, code):
    if clean(country):
        return clean(country)
    return COUNTRIES.get(clean(code).upper(), clean(code))


def add_channel(channels, ctype, value):
    address = normalize_phone(value) if ctype in {"phone", "mobile"} else clean(value)
    if not address:
        return
    item = {"type": ctype, "address": address}
    if item not in channels:
        channels.append(item)


def compact(value):
    if isinstance(value, dict):
        return {k: compact(v) for k, v in value.items() if compact(v) not in ("", [], {}, None)}
    if isinstance(value, list):
        return [compact(v) for v in value if compact(v) not in ("", [], {}, None)]
    return value


def raw_nonempty(row):
    return {str(k): clean(v) for k, v in row.items() if clean(v)}


def bp_name(row):
    for col in ["Name des Unternehmens", "Name", "Vollständiger Name", "Anzeigename"]:
        value = clean(row.get(col))
        if value:
            return value
    return ""


def note_lines_from_company(row):
    lines = []
    interests = [hashtag(x) for x in split_list(row.get("Interessen"))]
    products = [hashtag(x) for x in split_list(row.get("Produkte"))]
    keywords = split_list(row.get("Stichwörter"))
    source = clean(row.get("Quelle"))
    referral = clean(row.get("Empfehlung von"))
    if interests:
        lines.append(f"Interessen: {', '.join(interests)}")
    if products:
        lines.append(f"Produkte: {', '.join(products)}")
    if keywords:
        lines.append(f"Stichwörter: {', '.join(keywords)}")
    if source:
        lines.append(f"Quelle: {source}")
    if referral:
        lines.append(f"Empfehlung von: {referral}")
    return lines


def note_lines_from_contact(row):
    lines = []
    keywords = split_list(row.get("Stichwörter"))
    referral = clean(row.get("Empfehlung von"))
    if keywords:
        lines.append(f"Stichwörter: {', '.join(keywords)}")
    if referral:
        lines.append(f"Empfehlung von: {referral}")
    return lines


def derive_salutation(value):
    text = clean(value).lower()
    if text.startswith("liebe") or text.startswith("hallo"):
        return "informal"
    if text.startswith("guten tag") or text.startswith("sehr geehrte"):
        return "formal"
    return ""


def derive_gender(value):
    text = clean(value).lower()
    if "frau" in text:
        return "f"
    if "herr" in text:
        return "m"
    return ""


def split_name(row):
    first = clean(row.get("Vorname"))
    last = clean(row.get("Nachname"))
    if first or last:
        return first, last
    name = clean(row.get("Name"))
    if not name:
        return "", ""
    if "," in name:
        name = name.split(",")[-1].strip()
    parts = name.split()
    if len(parts) == 1:
        return "", parts[0]
    return " ".join(parts[:-1]), parts[-1]


def contact_company(row):
    # Prefer the explicit company field; row 38 has a person in "Übergeordneter Name"
    # and the correct organization in "Name des Unternehmens".
    for col in ["Name des Unternehmens", "Unternehmensname", "Übergeordneter Name"]:
        value = clean(row.get(col))
        if value:
            return value
    full = clean(row.get("Vollständiger Name"))
    if "," in full:
        return full.split(",")[0].strip()
    return ""


def merge_text(*parts):
    cleaned = [part for part in parts if clean(part)]
    return "\n\n".join(cleaned)


def display_value(value):
    if isinstance(value, list):
        if all(isinstance(item, dict) for item in value):
            return "; ".join(f"{item.get('type')}: {item.get('address')}" for item in value)
        return ", ".join(str(item) for item in value)
    if isinstance(value, dict):
        return ", ".join(f"{k}: {v}" for k, v in value.items() if clean(v))
    return clean(value)


def card_fields(prefix, data, extras=None):
    fields = []
    for key, value in (extras or {}).items():
        fields.append({"label": key, "value": display_value(value)})
    for key, value in data.items():
        if key == "import":
            continue
        fields.append({"label": f"{prefix}.{key}", "value": display_value(value)})
    return fields


unternehmen = pd.read_excel(BASE / "unternehmen.xlsx", dtype=str, keep_default_na=False).fillna("")
kontakte = pd.read_excel(BASE / "kontakte.xlsx", dtype=str, keep_default_na=False).fillna("")

bp_by_key = {}
bp_order = []
review_items = []

for index, row in unternehmen.iterrows():
    source_row = int(index) + 2
    name = bp_name(row)
    if not name:
        if any(clean(v) for v in row.values):
            review_items.append({
                "kind": "business_partner_skipped",
                "source_row": source_row,
                "reason": "Unternehmenszeile ohne Namen wird nicht importiert.",
                "raw": raw_nonempty(row),
            })
        continue
    key = norm_key(name)
    email = clean(row.get("Normalisierte E-Mail")) or clean(row.get("E-Mail"))
    channels = []
    add_channel(channels, "email", email)
    add_channel(channels, "phone", row.get("Telefon"))
    add_channel(channels, "mobile", row.get("Mobil"))
    add_channel(channels, "website", row.get("Website-Link"))
    notes = merge_text(clean_html(row.get("Notizen.2")), "\n".join(note_lines_from_company(row)))
    data = compact({
        "name": name,
        "vat_id": clean(row.get("USt-IdNr.")),
        "address": {
            "street": clean(row.get("Straße")),
            "zip": clean(row.get("PLZ")),
            "city": clean(row.get("Stadt")),
            "country": country_name(row.get("Land"), row.get("Ländercode")),
        },
        "channels": channels,
        "memo": clean_html(row.get("Notizen")),
        "notes": notes,
        "import": {
            "source": "odoo-export-2",
            "source_file": "unternehmen.xlsx",
            "source_row_numbers": [source_row],
            "raw": raw_nonempty(row),
        },
    })
    if key in bp_by_key:
        existing = bp_by_key[key]
        existing["source_rows"].append(source_row)
        existing["data"]["import"]["source_row_numbers"].append(source_row)
        existing["data"]["import"]["raw"][f"row_{source_row}"] = raw_nonempty(row)
        for channel in channels:
            if channel not in existing["data"].setdefault("channels", []):
                existing["data"]["channels"].append(channel)
        existing["data"]["memo"] = merge_text(existing["data"].get("memo", ""), data.get("memo", ""))
        existing["data"]["notes"] = merge_text(existing["data"].get("notes", ""), data.get("notes", ""))
        for path in [("vat_id",), ("address", "street"), ("address", "zip"), ("address", "city"), ("address", "country")]:
            target = existing["data"]
            source = data
            for segment in path[:-1]:
                target = target.setdefault(segment, {})
                source = source.get(segment, {})
            if not clean(target.get(path[-1])) and clean(source.get(path[-1])):
                target[path[-1]] = source[path[-1]]
    else:
        bp = {
            "id": f"bp-{len(bp_order) + 1:04d}",
            "source_rows": [source_row],
            "types": ["customer"],
            "data": data,
            "fields": [],
            "feedback_key": f"bp:{key}",
        }
        bp_by_key[key] = bp
        bp_order.append(bp)

for bp in bp_order:
    bp["fields"] = card_fields("data", bp["data"], {
        "id": bp["id"],
        "source_rows": ", ".join(str(x) for x in bp["source_rows"]),
        "types": ", ".join(bp["types"]),
    })

contacts_by_key = {}
contact_order = []

for index, row in kontakte.iterrows():
    source_row = int(index) + 2
    first, last = split_name(row)
    if not first and not last:
        if any(clean(v) for v in row.values):
            review_items.append({
                "kind": "contact_skipped",
                "source_row": source_row,
                "reason": "Kontaktzeile ohne Namen wird nicht importiert.",
                "raw": raw_nonempty(row),
            })
        continue

    email = clean(row.get("Normalisierte E-Mail")) or clean(row.get("E-Mail"))
    company = contact_company(row)
    contact_key = norm_key(email) if email else norm_key(f"{first} {last}|{company}")
    channels = []
    add_channel(channels, "email", email)
    add_channel(channels, "phone", row.get("Telefon"))
    add_channel(channels, "mobile", row.get("Mobil"))
    add_channel(channels, "website", row.get("Website-Link"))
    interests = split_list(row.get("Interessen"))
    role = split_list(row.get("Rolle"))
    tags = ["newsletter"] if boolish(row.get("Newsletter")) else []
    notes = merge_text(clean_html(row.get("Notizen")), clean_html(row.get("Notizen.2")), "\n".join(note_lines_from_contact(row)))
    data = compact({
        "first_name": first,
        "last_name": last,
        "gender": derive_gender(row.get("Ansprache")),
        "salutation": derive_salutation(row.get("Ansprache")),
        "origin": clean(row.get("Quelle")),
        "company_text": company,
        "channels": channels,
        "role": role,
        "interests": interests,
        "tags": tags,
        "notes": notes,
        "import": {
            "source": "odoo-export-2",
            "source_file": "kontakte.xlsx",
            "source_row_numbers": [source_row],
            "raw": raw_nonempty(row),
        },
    })
    if contact_key in contacts_by_key:
        existing = contacts_by_key[contact_key]
        existing["source_rows"].append(source_row)
        existing["data"]["import"]["source_row_numbers"].append(source_row)
        existing["data"]["import"]["raw"][f"row_{source_row}"] = raw_nonempty(row)
        for channel in channels:
            if channel not in existing["data"].setdefault("channels", []):
                existing["data"]["channels"].append(channel)
        for list_key in ["role", "interests", "tags"]:
            for item in data.get(list_key, []):
                if item not in existing["data"].setdefault(list_key, []):
                    existing["data"][list_key].append(item)
        existing["data"]["notes"] = merge_text(existing["data"].get("notes", ""), data.get("notes", ""))
        if not clean(existing["data"].get("company_text")) and company:
            existing["data"]["company_text"] = company
    else:
        contact = {
            "id": f"contact-{len(contact_order) + 1:04d}",
            "source_rows": [source_row],
            "active": True,
            "data": data,
            "company_key": norm_key(company),
            "company_text": company,
            "fields": [],
            "feedback_key": f"contact:{contact_key}",
        }
        contacts_by_key[contact_key] = contact
        contact_order.append(contact)

for contact in contact_order:
    contact["fields"] = card_fields("data", contact["data"], {
        "id": contact["id"],
        "source_rows": ", ".join(str(x) for x in contact["source_rows"]),
        "active": "true",
    })

groups_by_bp = {bp["id"]: {"bp": bp, "contacts": [], "relationships": []} for bp in bp_order}
unmatched = {"bp": None, "contacts": [], "relationships": []}

for contact in contact_order:
    bp = bp_by_key.get(contact["company_key"]) if contact["company_key"] else None
    if bp:
        relationship = {
            "id": f"rel:{contact['id']}:{bp['id']}",
            "contact_id": contact["id"],
            "gp_id": bp["id"],
            "fields": [
                {"label": "contact_id", "value": contact["id"]},
                {"label": "gp_id", "value": bp["id"]},
            ],
        }
        groups_by_bp[bp["id"]]["contacts"].append(contact)
        groups_by_bp[bp["id"]]["relationships"].append(relationship)
    else:
        unmatched["contacts"].append(contact)
        review_items.append({
            "kind": "unmatched_contact",
            "source_rows": contact["source_rows"],
            "reason": "Kein Geschäftspartner anhand von company_text gefunden.",
            "company_text": contact["company_text"],
            "contact": display_value({"first_name": contact["data"].get("first_name", ""), "last_name": contact["data"].get("last_name", "")}),
        })

groups = [group for group in groups_by_bp.values() if group["contacts"]]
groups.sort(key=lambda group: group["bp"]["data"]["name"].lower())
if unmatched["contacts"]:
    groups.append(unmatched)
linked_bp_ids = {group["bp"]["id"] for group in groups if group["bp"]}
unlinked_bp_groups = [
    {"bp": bp, "contacts": [], "relationships": [], "unlinked": True}
    for bp in bp_order
    if bp["id"] not in linked_bp_ids
]
unlinked_bp_groups.sort(key=lambda group: group["bp"]["data"]["name"].lower())
groups.extend(unlinked_bp_groups)

payload = {
    "summary": {
        "business_partners": len(bp_order),
        "contacts": len(contact_order),
        "relationships": sum(len(group["relationships"]) for group in groups),
        "review_items": len(review_items),
    },
    "groups": groups,
    "review_items": review_items,
}

payload_json = json.dumps(payload, ensure_ascii=False)

html_text = f"""<!doctype html>
<html lang=\"de\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>Import-Simulation Odoo Export 2</title>
    <style>
      :root {{
        --bg: #f6f6f1;
        --panel: #ffffff;
        --text: #222222;
        --muted: #666666;
        --border: #d8d8cf;
        --contact: #006f6a;
        --bp: #8b4c00;
        --line: #9b9b91;
        --soft-contact: #e5f3f1;
        --soft-bp: #fff1df;
        --danger: #a23030;
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif;
      }}
      header {{
        position: sticky;
        top: 0;
        z-index: 5;
        background: rgba(246, 246, 241, 0.96);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--border);
      }}
      .bar {{
        max-width: 1500px;
        margin: 0 auto;
        padding: 14px 18px;
        display: flex;
        gap: 16px;
        justify-content: space-between;
        align-items: center;
      }}
      h1 {{ margin: 0; font-size: 20px; }}
      .subtitle {{ color: var(--muted); font-size: 13px; margin-top: 2px; }}
      .stats {{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }}
      .stat {{ border: 1px solid var(--border); background: var(--panel); border-radius: 6px; padding: 4px 8px; font-size: 12px; }}
      .actions {{ display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }}
      button {{
        border: 1px solid var(--contact);
        background: var(--contact);
        color: #fff;
        border-radius: 6px;
        padding: 8px 10px;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
      }}
      button.secondary {{ background: #fff; color: var(--contact); }}
      main {{ max-width: 1500px; margin: 0 auto; padding: 18px; }}
      .group {{
        display: grid;
        grid-template-columns: minmax(360px, 1fr) 90px minmax(360px, 1fr);
        gap: 14px;
        align-items: stretch;
        margin-bottom: 18px;
      }}
      .contacts {{ display: grid; gap: 10px; }}
      .connector {{
        display: grid;
        gap: 10px;
      }}
      .connector-line {{
        min-height: 190px;
        position: relative;
      }}
      .connector-line::before {{
        content: \"\";
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--line);
      }}
      .connector-line::after {{
        content: \"\";
        position: absolute;
        top: calc(50% - 4px);
        right: -1px;
        width: 10px;
        height: 10px;
        border-top: 2px solid var(--line);
        border-right: 2px solid var(--line);
        transform: rotate(45deg);
        background: var(--bg);
      }}
      .bp-wrap {{ display: flex; align-items: center; }}
      .card {{
        width: 100%;
        border: 1px solid var(--border);
        background: var(--panel);
        border-radius: 8px;
        overflow: hidden;
      }}
      .card h2 {{
        margin: 0;
        padding: 9px 10px;
        font-size: 15px;
        border-bottom: 1px solid var(--border);
        display: flex;
        gap: 8px;
        align-items: center;
      }}
      .contact h2 {{ background: var(--soft-contact); color: var(--contact); }}
      .bp h2 {{ background: var(--soft-bp); color: var(--bp); }}
      .unmatched h2 {{ background: #f8e8e8; color: var(--danger); }}
      .badge {{ font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }}
      .fields {{ padding: 8px 10px; }}
      .field {{
        display: grid;
        grid-template-columns: 150px minmax(0, 1fr);
        gap: 8px;
        min-height: 22px;
        align-items: center;
        border-bottom: 1px solid #eeeeea;
      }}
      .field:last-child {{ border-bottom: 0; }}
      .label {{ color: var(--muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
      .value {{ font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
      .notes .value {{ max-width: 100%; }}
      textarea {{
        width: calc(100% - 20px);
        margin: 8px 10px 10px;
        min-height: 54px;
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 7px;
        font: inherit;
        font-size: 12px;
        resize: vertical;
      }}
      .relation-feedback {{
        margin-top: 4px;
        font-size: 11px;
        color: var(--muted);
      }}
      .review {{
        margin-top: 26px;
        border: 1px solid var(--border);
        background: var(--panel);
        border-radius: 8px;
        padding: 12px;
      }}
      .review h2 {{ margin: 0 0 8px; font-size: 17px; }}
      .review-item {{ border-top: 1px solid var(--border); padding: 8px 0; font-size: 13px; }}
      .review-item:first-of-type {{ border-top: 0; }}
      @media (max-width: 1000px) {{
        .bar {{ display: block; }}
        .actions {{ justify-content: flex-start; margin-top: 12px; }}
        .group {{ grid-template-columns: 1fr; }}
        .connector {{ display: none; }}
        .bp-wrap {{ display: block; }}
      }}
    </style>
  </head>
  <body>
    <header>
      <div class=\"bar\">
        <div>
          <h1>Import-Simulation: Odoo Export 2</h1>
          <div class=\"subtitle\">Kontakte links, Geschäftspartner rechts, gruppiert nach Beziehung</div>
          <div class=\"stats\" id=\"stats\"></div>
        </div>
        <div class=\"actions\">
          <button class=\"secondary\" id=\"clear\">Feedback leeren</button>
          <button id=\"download-md\">Feedback Markdown</button>
          <button id=\"download-json\">Feedback JSON</button>
        </div>
      </div>
    </header>
    <main id=\"app\"></main>
    <script>
      const payload = {payload_json};
      const storageKey = \"evaro-odoo-export-2-import-simulation-feedback\";
      const saved = JSON.parse(localStorage.getItem(storageKey) || \"{{}}\");
      const app = document.querySelector(\"#app\");
      const stats = document.querySelector(\"#stats\");

      function esc(value) {{
        return String(value ?? \"\").replace(/[&<>\"]/g, ch => ({{\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",\"\\\"\":\"&quot;\"}}[ch]));
      }}

      function entityName(entity) {{
        if (!entity) return \"Kein Geschäftspartner zugeordnet\";
        return entity.data.name || entity.id;
      }}

      function contactName(contact) {{
        return [contact.data.first_name, contact.data.last_name].filter(Boolean).join(\" \") || contact.id;
      }}

      function feedbackBox(key, placeholder) {{
        return `<textarea data-feedback-key=\"${{esc(key)}}\" placeholder=\"${{esc(placeholder)}}\">${{esc(saved[key] || \"\")}}</textarea>`;
      }}

      function renderFields(fields) {{
        return fields.map(field => {{
          const cls = String(field.label).includes(\"notes\") || String(field.label).includes(\"memo\") ? \"field notes\" : \"field\";
          return `<div class=\"${{cls}}\" title=\"${{esc(field.value)}}\"><div class=\"label\">${{esc(field.label)}}</div><div class=\"value\">${{esc(field.value)}}</div></div>`;
        }}).join(\"\");
      }}

      function renderContact(contact) {{
        return `<article class=\"card contact\">
          <h2><span class=\"badge\">Kontakt</span><span>${{esc(contactName(contact))}}</span></h2>
          <div class=\"fields\">${{renderFields(contact.fields)}}</div>
          ${{feedbackBox(contact.feedback_key, \"Feedback/Korrektur zum Kontakt\")}}
        </article>`;
      }}

      function renderBp(bp) {{
        if (!bp) {{
          return `<article class=\"card bp unmatched\">
            <h2><span class=\"badge\">Review</span><span>Kein Geschäftspartner</span></h2>
            <div class=\"fields\"><div class=\"field\"><div class=\"label\">status</div><div class=\"value\">Kontakte ohne Zuordnung</div></div></div>
            ${{feedbackBox(\"bp:unmatched\", \"Feedback zu nicht zugeordneten Kontakten\")}}
          </article>`;
        }}
        return `<article class=\"card bp\">
          <h2><span class=\"badge\">Geschäftspartner</span><span>${{esc(entityName(bp))}}</span></h2>
          <div class=\"fields\">${{renderFields(bp.fields)}}</div>
          ${{feedbackBox(bp.feedback_key, \"Feedback/Korrektur zum Geschäftspartner\")}}
        </article>`;
      }}

      function renderGroup(group, index) {{
        const contacts = group.contacts.length
          ? group.contacts.map(renderContact).join(\"\")
          : `<article class=\"card contact unmatched\">
              <h2><span class=\"badge\">Kein Kontakt</span><span>Keine Beziehung simuliert</span></h2>
              <div class=\"fields\"><div class=\"field\"><div class=\"label\">status</div><div class=\"value\">Geschäftspartner ohne zugeordneten Kontakt</div></div></div>
              ${{feedbackBox(`unlinked:${{group.bp ? group.bp.id : \"none\"}}`, \"Feedback zum fehlenden Kontakt/Link\")}}
            </article>`;
        const lines = group.contacts.map((contact, i) => {{
          const rel = group.relationships[i];
          if (!rel) return `<div class=\"connector-line\"></div>`;
          return `<div class=\"connector-line\" title=\"${{esc(rel.contact_id)}} -> ${{esc(rel.gp_id)}}\">
            <div class=\"relation-feedback\">${{esc(rel.contact_id)}} → ${{esc(rel.gp_id)}}</div>
            ${{feedbackBox(rel.id, \"Feedback zur Beziehung\")}}
          </div>`;
        }}).join(\"\");
        return `<section class=\"group\" data-group=\"${{index}}\">
          <div class=\"contacts\">${{contacts}}</div>
          <div class=\"connector\">${{lines}}</div>
          <div class=\"bp-wrap\">${{renderBp(group.bp)}}</div>
        </section>`;
      }}

      function renderReviewItems() {{
        if (!payload.review_items.length) return \"\";
        const items = payload.review_items.map(item => `
          <div class=\"review-item\">
            <strong>${{esc(item.kind)}}</strong> · ${{esc(item.reason || \"\")}}<br>
            <span>${{esc(JSON.stringify(item))}}</span>
          </div>`).join(\"\");
        return `<section class=\"review\"><h2>Review-Hinweise</h2>${{items}}${{feedbackBox(\"review:general\", \"Feedback zu Review-Hinweisen\")}}</section>`;
      }}

      function render() {{
        stats.innerHTML = Object.entries(payload.summary).map(([key, value]) => `<span class=\"stat\">${{esc(key)}}: ${{esc(value)}}</span>`).join(\"\");
        app.innerHTML = payload.groups.map(renderGroup).join(\"\") + renderReviewItems();
      }}

      function collect() {{
        const feedback = {{}};
        document.querySelectorAll(\"textarea[data-feedback-key]\").forEach(input => {{
          feedback[input.dataset.feedbackKey] = input.value.trim();
        }});
        return feedback;
      }}

      function save() {{
        localStorage.setItem(storageKey, JSON.stringify(collect(), null, 2));
      }}

      function download(filename, content, type) {{
        const blob = new Blob([content], {{ type }});
        const url = URL.createObjectURL(blob);
        const link = document.createElement(\"a\");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }}

      function toMarkdown() {{
        const feedback = collect();
        const lines = [\"# Import-Simulation Feedback\", \"\"];
        for (const group of payload.groups) {{
          lines.push(`## ${{entityName(group.bp)}}`, \"\");
          for (const contact of group.contacts) {{
            lines.push(`- Kontakt ${{contact.id}}: ${{contactName(contact)}}`);
            if (feedback[contact.feedback_key]) lines.push(`  - Kontakt-Feedback: ${{feedback[contact.feedback_key]}}`);
          }}
          if (group.bp && feedback[group.bp.feedback_key]) lines.push(`- Geschäftspartner-Feedback: ${{feedback[group.bp.feedback_key]}}`);
          for (const rel of group.relationships) {{
            if (feedback[rel.id]) lines.push(`- Beziehung ${{rel.contact_id}} -> ${{rel.gp_id}}: ${{feedback[rel.id]}}`);
          }}
          lines.push(\"\");
        }}
        if (feedback[\"review:general\"]) lines.push(\"## Review\", \"\", feedback[\"review:general\"], \"\");
        return lines.join(\"\\n\");
      }}

      document.addEventListener(\"input\", event => {{
        if (event.target.matches(\"textarea[data-feedback-key]\")) save();
      }});
      document.querySelector(\"#download-json\").addEventListener(\"click\", () => {{
        save();
        download(\"import-simulation-review-feedback.json\", JSON.stringify({{ summary: payload.summary, feedback: collect() }}, null, 2), \"application/json;charset=utf-8\");
      }});
      document.querySelector(\"#download-md\").addEventListener(\"click\", () => {{
        save();
        download(\"import-simulation-review-feedback.md\", toMarkdown(), \"text/markdown;charset=utf-8\");
      }});
      document.querySelector(\"#clear\").addEventListener(\"click\", () => {{
        if (!confirm(\"Feedback wirklich leeren?\")) return;
        localStorage.removeItem(storageKey);
        document.querySelectorAll(\"textarea[data-feedback-key]\").forEach(input => input.value = \"\");
      }});
      render();
    </script>
  </body>
</html>
"""

OUT.write_text(html_text, encoding="utf-8")
JSON_OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(OUT)
print(JSON_OUT)
print(json.dumps(payload["summary"], ensure_ascii=False))
