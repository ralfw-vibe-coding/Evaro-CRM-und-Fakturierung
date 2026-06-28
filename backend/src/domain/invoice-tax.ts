import type { InvoiceGpSnapshot } from "./model.js";

export interface InvoiceVatRule {
  vat_rate: number;
  reverse_charge: boolean;
}

function normalizeCountry(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z]/g, "");
}

function hasVatId(snapshot: InvoiceGpSnapshot): boolean {
  return Boolean(snapshot.vat_id?.trim());
}

export function determineInvoiceVatRule(snapshot: InvoiceGpSnapshot): InvoiceVatRule {
  const country = normalizeCountry(snapshot.address?.country);

  if (["bulgarien", "bulgaria", "bg", "bgr"].includes(country)) {
    return { vat_rate: 20, reverse_charge: false };
  }

  if (country === "" || ["deutschland", "germany", "de", "deu"].includes(country)) {
    return hasVatId(snapshot)
      ? { vat_rate: 0, reverse_charge: true }
      : { vat_rate: 19, reverse_charge: false };
  }

  if (["osterreich", "austria", "at", "aut"].includes(country)) {
    return hasVatId(snapshot)
      ? { vat_rate: 0, reverse_charge: true }
      : { vat_rate: 20, reverse_charge: false };
  }

  return { vat_rate: 0, reverse_charge: false };
}
