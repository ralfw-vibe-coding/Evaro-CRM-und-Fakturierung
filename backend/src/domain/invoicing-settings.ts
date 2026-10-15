import type { Address, InvoicingAppSettings } from "./model.js";

/**
 * Normalisierung der Fakturierungs-Einstellungen — an einer Stelle.
 *
 * Die Felderliste ist eine Whitelist: Unbekanntes wird verworfen. Sie lag
 * früher dreimal im Code (RPU, In-Memory- und Postgres-Provider), was dazu
 * führte, dass neue Felder stillschweigend unterwegs verloren gingen.
 *
 * Die Eingabe ist `unknown`, weil Postgres die Einstellungen als JSONB
 * zurückgibt und dort nichts garantiert ist.
 */

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function positiveInt(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return undefined;
  return parsed;
}

/** Bezeichner ohne Leerzeichen und in Grossbuchstaben, wie die XRechnung sie verlangt. */
function code(value: unknown): string | undefined {
  const raw = text(value);
  return raw ? raw.replace(/\s+/g, "").toUpperCase() : undefined;
}

function address(value: unknown): Address | undefined {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const normalized: Address = {
    street: text(data.street),
    zip: text(data.zip),
    city: text(data.city),
    country: code(data.country),
  };
  return Object.values(normalized).some(Boolean) ? normalized : undefined;
}

export function normalizeInvoicingSettings(value: unknown): InvoicingAppSettings {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    company_name: text(data.company_name),
    sender_address: text(data.sender_address),
    bank_details: text(data.bank_details),
    company_registration: text(data.company_registration),
    default_payment_due_days: positiveInt(data.default_payment_due_days),
    vat_number: text(data.vat_number),
    contact_person: text(data.contact_person),
    email: text(data.email),
    phone: text(data.phone),
    website: text(data.website),
    address: address(data.address),
    iban: code(data.iban),
    bic: code(data.bic),
    trading_name: text(data.trading_name),
    registration_id: text(data.registration_id),
  };
}
