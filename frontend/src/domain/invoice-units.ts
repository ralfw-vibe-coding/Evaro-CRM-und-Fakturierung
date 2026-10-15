/**
 * Einheiten für Rechnungspositionen samt Code nach UN/ECE Rec. 20.
 *
 * Gespeichert und angezeigt wird nur die Beschriftung ("Std"). Der Code ist
 * reine Ausgabeinformation für die XRechnung (BT-130) und taucht im UI nicht
 * auf — deshalb bleibt `InvoiceLine.unit` eine schlichte Zeichenkette.
 */

export interface InvoiceUnit {
  label: string;
  /** unitCode nach UN/ECE Rec. 20 */
  code: string;
}

export const INVOICE_UNITS: InvoiceUnit[] = [
  { label: "Std", code: "HUR" },
  { label: "Tage", code: "DAY" },
  { label: "Pauschale", code: "LS" },
  { label: "km", code: "KMT" },
  { label: "Stück", code: "C62" },
  { label: "Monat", code: "MON" },
];

export const INVOICE_UNIT_LABELS = INVOICE_UNITS.map((unit) => unit.label);

/**
 * Code zu einer Beschriftung, ohne Rücksicht auf Gross-/Kleinschreibung und
 * Leerzeichen — Bestandsdaten sind als Freitext erfasst worden.
 * `undefined` heisst: keine gültige XRechnung möglich.
 */
export function invoiceUnitCode(label: string | undefined): string | undefined {
  const needle = label?.trim().toLowerCase();
  if (!needle) return undefined;
  return INVOICE_UNITS.find((unit) => unit.label.toLowerCase() === needle)?.code;
}
