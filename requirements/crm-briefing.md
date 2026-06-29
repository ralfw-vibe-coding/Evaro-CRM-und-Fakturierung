# CRM & Invoicing App — Implementation Briefing

## Overview

This app serves two purposes: **contact management (CRM)** and **invoicing**. This briefing covers the CRM layer. Invoicing will be specified separately.

The app is a web application with:
- A **React frontend** (browser-based, mobile-friendly)
- A **serverless backend** (Netlify Functions)
- A **PostgreSQL database** (cloud-hosted)

---

## Conceptual Model

### Core Principle: Contacts First

**Contacts are the primary entity.** Every interaction starts with a person. Business Partners are secondary — they are created when a business relationship requires it (invoicing, formal agreements).

The flow is always:

```
Person reaches out → Contact is created → Business Partner optionally attached
```

Never the other way around.

### Contacts

A contact is always a **human being**. Contacts capture the minimum needed to reach someone:
name, communication channels, and a few classification tags.

A contact does **not** require a postal address. Addresses belong to Business Partners.

Contacts can exist without any Business Partner link — e.g. newsletter subscribers, conference acquaintances, leads.

### Business Partners

A Business Partner is the entity that receives an invoice. It can be:
- A company (legal entity)
- A sole trader (natural person with VAT ID)
- A private individual

A Business Partner is created only when needed — typically when an invoice is to be written. Until then, the company name lives as free text (`company_text`) on the Contact.

### Relationship Between Contacts and Business Partners

- **n:m** — one Contact can belong to multiple Business Partners (e.g. employee of a company AND private customer), one Business Partner can have multiple Contacts.
- The relationship is **typed** (role of the contact at the BP: employee, owner, contact person, etc.)
- One BP can be marked as **primary** per Contact — this is the one shown in the Contact view.
- Management of the relationship always happens via the Contact. The BP view shows linked Contacts as read-only information.

---

## UI Concepts

### Three Primary Use Cases

1. **Proactive lookup** — User searches for a contact to call them or send a message.
2. **Reactive reminder** — App surfaces a contact because a follow-up is due.
3. **Incoming contact** — Someone calls or writes. User checks: do I know them? If not, create.

The UI must support all three efficiently. Search and quick-create are the two most important interactions.

### Contact Creation Flows

- **Email forward / paste** — User pastes an email signature or forwards an email. AI extracts contact and optionally BP data.
- **Business card photo** — AI extracts all fields.
- **Manual quick entry** — Name + one channel. Fast, minimal friction.
- **CSV import** — Bulk import, all imported contacts flagged as `active = false`.

### Duplicate Detection

On creation, the app checks for existing contacts with matching name, email, or phone. Suggest merge or link before saving.

### Tags — Combobox Pattern

All tag fields (except `gender` and `salutation`) use a **combobox**: type to filter existing values, or enter a new one to create it on the fly. No separate tag management UI. The available options are derived at runtime from all values present in the loaded dataset.

### Selectable Filters (saved)

Users can save filter combinations for reuse — e.g. "My active customers", "Follow-ups this week".

### Two Levels of Notes

- **Memo** (`memo`) — Fixed, always visible. For standing agreements and key facts. Short.
- **Notes** (`notes`) — Append-style, grows over time. For freeform observations.

Only Business Partners have a memo. Contacts have notes only.

### Activity Log / Protocol

Each Contact and Business Partner has a chronological activity log. Entries are created by:
- System (on field changes)
- User (manual log entries, comments)

Each log entry has:
- A type (past tense verb: `contact_created`, `invoice_sent`, `comment_added`, `offer_sent`, ...)
- A payload (diff or comment text)
- An optional **follow-up date** (`follow_up_at`) — triggers the reactive reminder use case
- Author and timestamp

The log is **append-only**. Entries are never edited or deleted.

A dedicated **Follow-ups view** shows all contacts with a due `follow_up_at` date.

### Active vs. Passive Contacts

- `active = true` — loaded to the client on every session. These are the contacts the user actively works with.
- `active = false` — never loaded unless explicitly requested ("show all"). Used for bulk-imported contacts (newsletter lists etc.).

Default on manual creation: `active = true`.
Default on CSV import: `active = false`.

This is a **server-side selection**, not a client-side filter. Passive contacts are not transmitted to the browser by default.

The same active/passive distinction applies to Business Partners. Business
Partners created through bulk imports default to `active = false`; manually
created Business Partners default to `active = true`.

---

## Data Model

### Metadata columns (all tables)

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

`updated_at` is used for polling-based sync (see below). No `version` column needed.

---

### Table: `contacts`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `active` | BOOLEAN | default true, indexed |
| `data` | JSONB | all fields below |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | indexed |

**`data` fields:**

```json
{
  "title":        "Prof.",
  "first_name":   "Petra",
  "last_name":    "Paulsen",
  "gender":       "f",
  "salutation":   "formal",
  "origin":       "KI-Seminar Berlin 2024",
  "company_text": "AOK Rheinland",
  "channels": [
    { "type": "email",    "address": "petra@aok.de" },
    { "type": "phone",    "address": "+49 211 ..." },
    { "type": "whatsapp", "address": "+49 211 ..." }
  ],
  "relationship": ["customer", "referral"],
  "role":         ["decision_maker"],
  "work_area":    ["purchasing"],
  "interests":    ["AI", "office365"],
  "tags":         ["vip"],
  "notes":        "Met at KI conference. Very interested in coaching."
}
```

**Tag fields and their semantics:**

| Field | Classified | Example values |
|---|---|---|
| `relationship` | yes | network, lead, customer, referral, partner |
| `role` | yes | decision_maker, specialist, assistant |
| `work_area` | yes | purchasing, marketing, hr, management |
| `interests` | yes | free, topic-based |
| `tags` | no | free, unclassified |

**Fixed enums:**

| Field | Options |
|---|---|
| `gender` | m / f / d |
| `salutation` | formal / informal |

**`company_text`** is a free-text fallback. When a Business Partner is linked as primary in `contact_gp`, this field is ignored in the UI and the BP name is shown read-only instead.

---

### Table: `business_partners`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `active` | BOOLEAN | default true, indexed |
| `types` | TEXT[] | e.g. `{customer, supplier}` |
| `data` | JSONB | all fields below |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | indexed |

**`data` fields:**

```json
{
  "name": "AOK Rheinland GmbH & Co. KG",
  "vat_id": "DE123456789",
  "address": {
    "street":  "Kasernenstraße 61",
    "zip":     "40213",
    "city":    "Düsseldorf",
    "country": "DE"
  },
  "channels": [
    { "type": "website", "address": "https://aok.de" },
    { "type": "email",   "address": "invoice@aok.de" }
  ],
  "business_relationship": ["customer"],
  "tags":  ["key_account"],
  "memo":  "Invoices go to procurement. Contact: Nadine Gödde.",
  "notes": "First contact via KI seminar 2023. Two invoices so far."
}
```

**`types`** array on the table level (not in JSONB) because it may be used in server-side selection queries:

| Value | Meaning |
|---|---|
| `customer` | Money flows in |
| `supplier` | Money flows out |
| `partner` | Collaboration, no primary money flow |
| `authority` | Government / regulatory bodies |

A BP can have multiple types simultaneously.

---

### Table: `contact_gp`

Junction table for the n:m relationship.

```sql
CREATE TABLE contact_gp (
  contact_id  UUID NOT NULL REFERENCES contacts(id),
  gp_id       UUID NOT NULL REFERENCES business_partners(id),
  role        TEXT NOT NULL,
  "primary"   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, gp_id)
);

-- Ensures max one primary BP per contact
CREATE UNIQUE INDEX ON contact_gp (contact_id)
  WHERE "primary" = true;
```

**`role`** examples: `employee`, `owner`, `contact_person`, `billing_contact`

---

### Table: `activity_log`

Append-only event stream. Never update or delete rows.

```sql
CREATE TABLE activity_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  TEXT NOT NULL,        -- 'contact' | 'business_partner'
  entity_id    UUID NOT NULL,
  user_id      UUID NOT NULL REFERENCES users(id),
  type         TEXT NOT NULL,        -- past tense event name
  payload      JSONB NOT NULL DEFAULT '{}',
  follow_up_at TIMESTAMPTZ,          -- optional, drives reminders
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON activity_log (entity_type, entity_id);
CREATE INDEX ON activity_log (follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE INDEX ON activity_log (created_at);
```

**Event type naming convention:** always past tense.

Examples:
- `contact_created`
- `contact_updated`
- `comment_added`
- `offer_sent`
- `invoice_created`
- `call_attempted`
- `gp_linked`

**`payload`** contains either a diff (for change events) or free text (for comments/manual entries).

The activity log is loaded **on demand only** — not part of the initial data load.

---

### Table: `users`

```sql
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  abbr       TEXT NOT NULL UNIQUE,   -- short identifier, e.g. "AP", "RK"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Authentication via **email + OTP**. No password stored. OTP is transient (short-lived signed token), no dedicated table needed.

---

### Indexes summary

```sql
CREATE INDEX ON contacts (active);
CREATE INDEX ON contacts (updated_at);
CREATE INDEX ON business_partners (updated_at);
CREATE INDEX ON activity_log (entity_type, entity_id);
CREATE INDEX ON activity_log (follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE INDEX ON activity_log (created_at);
```

---

## Data Flow

### Selection (server → client)

On session start, the backend sends:
- All `contacts` where `active = true` — with primary BP name joined from `contact_gp` + `business_partners`
- All `business_partners` — full records
- All `contact_gp` rows — for relationship display

This is **one request, one response**. No lazy loading, no pagination for the main dataset.

Passive contacts (`active = false`) are **never sent** unless the user explicitly requests them ("Load all contacts").

### Filtering (client-side only)

All filtering of the loaded dataset happens in the browser. No additional server requests for:
- Searching by name
- Filtering by tag
- Filtering by relationship type
- Filtering by BP

### Polling for updates

Every **60 seconds** (or on user request, or on tab focus / reconnect), the client sends:

```
GET /changes?since=<last_updated_at_timestamp>
```

The backend returns all rows from all tables where `updated_at > since`. The client merges silently into local state.

**Conflict resolution:** last-write-wins with a warning if `updated_at` at write time differs from what the client last saw. No merge logic. Given the small number of concurrent users, this is sufficient.

### Write flow

Every user action that changes data follows this sequence:

1. Frontend sends an **event** to the backend (e.g. `contact_updated` with diff)
2. Backend writes to `activity_log`
3. Backend updates the entity (`contacts` or `business_partners`)
4. Backend returns updated entity to frontend
5. Frontend updates local state

The entities are **read models** — projections of the event stream. Not pure event sourcing, but event-log-adjacent: the log is the record of truth, the entity tables are the materialized current state.

---

## Open Questions

- Does a Business Partner need separate `first_name` / `last_name` fields for sole traders and private individuals, or is a single `name` field sufficient?
- Should channels on contacts support multiple entries of the same type (e.g. two phone numbers)?
