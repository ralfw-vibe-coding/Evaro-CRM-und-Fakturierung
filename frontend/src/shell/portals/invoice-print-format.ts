import type { Invoice, InvoiceData, InvoiceLine } from "@/domain/model";

/**
 * Pure formatting/labels shared by every rendering of an invoice — the HTML
 * print preview (invoicing-area.tsx) and the generated PDF (invoice-pdf.ts).
 * No JSX, no pdfmake types here — just the numbers/strings both surfaces need.
 */

export type InvoicePrintLanguage = "de" | "en";

export const invoicePrintLabels: Record<InvoicePrintLanguage, Record<string, string>> = {
  de: {
    invoiceNo: "Rechnung Nr.",
    billTo: "Rechnungsempfänger",
    buyerVatId: "USt-ID",
    customerRef: "Kundenreferenz",
    seller: "Rechnungssteller",
    sellerVatNo: "USt-Nr.",
    serviceDate: "Leistungsdatum",
    description: "Beschreibung",
    qty: "Menge",
    unit: "Einheit",
    unitPrice: "Einzelpreis",
    total: "Gesamt",
    comment: "Kommentar",
    paymentTerms: "Zahlungsbedingungen",
    net: "Netto",
    vat: "USt.",
    amountDue: "Rechnungsbetrag",
    reverseCharge: "Steuerschuldnerschaft des Leistungsempfängers (reverse charge).",
    registration: "Registrierung",
    bank: "Bank",
    contact: "Kontakt",
    paymentDueLine: "Der Rechnungsbetrag ist ohne Abzug zahlbar bis:",
    page: "Seite",
  },
  en: {
    invoiceNo: "Invoice #",
    billTo: "Bill To",
    buyerVatId: "VAT ID",
    customerRef: "Customer Ref.",
    seller: "Seller",
    sellerVatNo: "VAT No.",
    serviceDate: "Service Date",
    description: "Description",
    qty: "Qty",
    unit: "Unit",
    unitPrice: "Unit Price",
    total: "Total",
    comment: "Comment",
    paymentTerms: "Payment Terms",
    net: "Net",
    vat: "VAT",
    amountDue: "Amount Due",
    reverseCharge: "Tax liability of the recipient of the service (reverse charge).",
    registration: "Registration",
    bank: "Bank",
    contact: "Contact",
    paymentDueLine: "The invoice amount is payable without deduction by:",
    page: "Page",
  },
};

export function invoiceTitle(language: InvoicePrintLanguage, invoiceNumber: string): string {
  return language === "en" ? `Invoice #${invoiceNumber}` : `Rechnung Nr. ${invoiceNumber}`;
}

export function invoicePdfFilename(invoiceNumber: string, companyName: string): string {
  const parsedNumber = Number.parseInt(invoiceNumber, 10);
  const normalizedNumber = Number.isNaN(parsedNumber) ? invoiceNumber : String(parsedNumber);
  const safeCompany = companyName
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 25)
    .trim();
  return `INV ${normalizedNumber} ${safeCompany || "Kunde"}.pdf`;
}

/** Kaufmännisch auf zwei Stellen. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Positionsbetrag, auf zwei Stellen gerundet (Regel R5 der XRechnung-
 * Anforderung). Die Summen werden aus den **gerundeten** Positionsbeträgen
 * gebildet, damit PDF und XML auf denselben Betrag kommen.
 */
export function lineTotal(line: InvoiceLine): number {
  return round2(Math.max(0, Number(line.quantity) || 0) * Math.max(0, Number(line.unit_price) || 0));
}

export function invoiceTotal(invoice: Invoice) {
  const net = round2(invoice.data.lines.reduce((sum, line) => sum + lineTotal(line), 0));
  const vat = round2(net * (Math.max(0, Number(invoice.vat_rate) || 0) / 100));
  return { net, vat, gross: round2(net + vat) };
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(Number(value) || 0);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("de-DE").format(new Date(`${value}T00:00:00`));
}

export function splitLines(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Datum plus Tage als JJJJ-MM-TT.
 *
 * Bewusst aus den lokalen Datumsteilen zusammengesetzt: `toISOString()` rechnet
 * nach UTC um und verschiebt östlich von Greenwich auf den Vortag — das
 * Zahlungsziel landete dadurch einen Tag zu früh im PDF.
 */
export function offsetIsoDate(base: Date, days: number): string {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatOffsetDate(base: Date, days: number): string {
  return formatDate(offsetIsoDate(base, days));
}

export function standardPaymentTermsLine(
  days: number | undefined,
  invoiceDate: string | null,
  language: InvoicePrintLanguage,
): string {
  const prefix = invoicePrintLabels[language].paymentDueLine;
  if (days === undefined) return `${prefix} -`;
  const base = invoiceDate ? new Date(`${invoiceDate}T00:00:00`) : new Date();
  return `${prefix} ${formatOffsetDate(base, days)}`;
}

export function previewPaymentTerms(template: string | undefined, invoiceDate: string | null): string {
  const text = template?.trim();
  if (!text) return "";
  const base = invoiceDate ? new Date(`${invoiceDate}T00:00:00`) : new Date();
  return text
    .replace(/\{(\d+)\}/g, (_, days: string) => formatOffsetDate(base, Number(days)))
    .replace(
      /\{(?:rgdatum|rechnungsdatum|rgd|invdate)(?:\s*\+\s*(\d+))?\}/gi,
      (_, days: string | undefined) => formatOffsetDate(base, Number(days ?? 0)),
    );
}

export function paymentTermsText(data: InvoiceData, invoiceDate: string | null, language: InvoicePrintLanguage): string {
  const parts = [
    data.payment_due_days !== undefined ? standardPaymentTermsLine(data.payment_due_days, invoiceDate, language) : undefined,
    data.payment_free_text?.trim(),
  ].filter(Boolean);
  if (parts.length > 0) return parts.join("\n");
  return previewPaymentTerms(data.payment_terms, invoiceDate);
}
