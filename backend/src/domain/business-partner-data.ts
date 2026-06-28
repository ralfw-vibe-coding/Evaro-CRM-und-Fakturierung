import type { BusinessPartnerData } from "./model.js";

export interface RawBusinessPartnerData {
  name?: string;
  vat_id?: string;
  address?: {
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
  };
  invoice_language?: string;
  channels?: { type?: string; address?: string }[];
  business_relationship?: string[];
  tags?: string[];
  memo?: string;
  notes?: string;
}

export type ValidateBusinessPartnerDataResult =
  | { ok: true; data: BusinessPartnerData }
  | { ok: false; fields: Record<string, string> };

function trimOrUndefined(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStringList(values: string[] | undefined): string[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const cleaned = values
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeChannels(channels: RawBusinessPartnerData["channels"]): BusinessPartnerData["channels"] {
  if (!Array.isArray(channels)) return [];
  return channels
    .map((c) => ({
      type: trimOrUndefined(c?.type) ?? "",
      address: trimOrUndefined(c?.address) ?? "",
    }))
    .filter((c) => c.type.length > 0 && c.address.length > 0);
}

function normalizeInvoiceLanguage(value: string | undefined): BusinessPartnerData["invoice_language"] {
  const normalized = trimOrUndefined(value)?.toLowerCase();
  return normalized === "en" ? "en" : normalized === "de" ? "de" : undefined;
}

export function normalizeTypes(types: string[] | undefined): string[] {
  if (!Array.isArray(types)) return [];
  return [...new Set(types.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean))];
}

export function validateBusinessPartnerData(
  raw: RawBusinessPartnerData,
): ValidateBusinessPartnerDataResult {
  const fields: Record<string, string> = {};
  const name = trimOrUndefined(raw.name);
  if (!name) fields.name = "Bitte einen Namen angeben.";

  if (Object.keys(fields).length > 0) return { ok: false, fields };

  const address = raw.address
    ? {
        street: trimOrUndefined(raw.address.street),
        zip: trimOrUndefined(raw.address.zip),
        city: trimOrUndefined(raw.address.city),
        country: trimOrUndefined(raw.address.country),
      }
    : undefined;

  return {
    ok: true,
    data: {
      name: name!,
      vat_id: trimOrUndefined(raw.vat_id),
      address,
      invoice_language: normalizeInvoiceLanguage(raw.invoice_language),
      channels: normalizeChannels(raw.channels),
      business_relationship: normalizeStringList(raw.business_relationship),
      tags: normalizeStringList(raw.tags),
      memo: trimOrUndefined(raw.memo),
      notes: trimOrUndefined(raw.notes),
    },
  };
}
