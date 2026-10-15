import type { AppSettings, Invoice, InvoiceLine } from "@/domain/model";
import { invoiceUnitCode } from "@/domain/invoice-units";
import {
  invoiceFileStem,
  invoiceTotal,
  lineTotal,
  offsetIsoDate,
  paymentTermsText,
} from "./invoice-print-format";

/**
 * XRechnung 3.0 in CII-Syntax (UN/CEFACT D16B) — dieselbe Syntax wie ZUGFeRD,
 * damit ein späterer Wechsel dorthin ohne Umbau möglich bleibt.
 *
 * Die Reihenfolge der Elemente ist durch das Schema fest vorgegeben; die
 * Referenzdateien unter requirements/XRechnungen/Beispiel-XML sind die Vorlage.
 * Wer hier Elemente vertauscht, bekommt eine ungültige Datei.
 *
 * Beträge kommen aus denselben Helfern wie das PDF (invoice-print-format),
 * damit beide Ausgaben auf den Cent übereinstimmen.
 */

const PROFILE_ID = "urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0";
const PROCESS_ID = "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0";

/** Ersatzwert für BT-10, wenn weder Leitweg-ID noch Referenz erfasst sind. */
const BUYER_REFERENCE_FALLBACK = "keine Angabe";

/**
 * Ländernamen aus dem Bestand auf ISO 3166-1 Alpha-2. Zweibuchstabige Eingaben
 * gelten bereits als Code. Unbekanntes wird nicht geraten, sondern blockiert.
 */
const COUNTRY_CODES: Record<string, string> = {
  deutschland: "DE",
  germany: "DE",
  österreich: "AT",
  oesterreich: "AT",
  austria: "AT",
  schweiz: "CH",
  switzerland: "CH",
  bulgarien: "BG",
  bulgaria: "BG",
  niederlande: "NL",
  netherlands: "NL",
  frankreich: "FR",
  france: "FR",
  italien: "IT",
  italy: "IT",
  polen: "PL",
  poland: "PL",
  luxemburg: "LU",
  luxembourg: "LU",
  belgien: "BE",
  belgium: "BE",
};

export function countryCode(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  return COUNTRY_CODES[raw.toLowerCase()];
}

/** USt-IdNr. ohne Leerzeichen und Trennzeichen, in Grossbuchstaben. */
export function normalizeVatId(value: string | undefined): string | undefined {
  const compact = value?.replace(/[\s.\-/]+/g, "").toUpperCase();
  return compact ? compact : undefined;
}

function isPlausibleVatId(value: string): boolean {
  if (!/^[A-Z]{2}[0-9A-Z]{2,12}$/.test(value)) return false;
  if (value.startsWith("DE")) return /^DE\d{9}$/.test(value);
  return true;
}

// ── XML-Bausteine ────────────────────────────────────────────────────────────

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Ein Element; `undefined` als Inhalt lässt es ganz entfallen. */
function el(name: string, content: string | undefined, attrs = ""): string[] {
  if (content === undefined || content === "") return [];
  return [`<${name}${attrs}>${escapeXml(content)}</${name}>`];
}

function wrap(name: string, children: string[], attrs = ""): string[] {
  if (children.length === 0) return [];
  return [`<${name}${attrs}>`, ...indent(children), `</${name}>`];
}

function indent(lines: string[]): string[] {
  return lines.map((line) => `  ${line}`);
}

/** Datum als JJJJMMTT im udt-Wrapper (Format 102). */
function dateElement(name: string, isoDate: string): string[] {
  const compact = isoDate.slice(0, 10).replace(/-/g, "");
  return wrap(name, [`<udt:DateTimeString format="102">${compact}</udt:DateTimeString>`]);
}

/** Dezimalpunkt, genau zwei Nachkommastellen, kein Tausendertrenner. */
function amount(value: number): string {
  return value.toFixed(2);
}

/** Menge und Prozentsatz: Punkt, keine erzwungene Stellenzahl ("1080", nicht "1.080"). */
function decimal(value: number): string {
  return String(Number(value));
}

/** Einzelpreis (BT-146): mindestens zwei, höchstens vier Nachkommastellen. */
function price(value: number): string {
  const [whole, fraction = ""] = value.toFixed(4).replace(/0+$/, "").split(".");
  return `${whole}.${fraction.padEnd(2, "0")}`;
}

// ── Inhaltliche Ableitungen ──────────────────────────────────────────────────

/**
 * Positionsname (BT-153) ist Pflicht. Leistungsart und Thema bilden ihn, wie
 * im PDF die fett gedruckte erste Zeile. Fehlt beides, rückt der Freitext nach.
 */
function lineName(line: InvoiceLine): string | undefined {
  const label = [line.product_form, line.product_topic].map((v) => v?.trim()).filter(Boolean).join(" ");
  if (label) return label;
  return line.text?.trim().split(/\r?\n/)[0]?.trim() || undefined;
}

/** Beschreibung (BT-154) ist der Freitext — ausser er dient schon als Name. */
function lineDescription(line: InvoiceLine): string | undefined {
  const text = line.text?.trim();
  if (!text) return undefined;
  return lineName(line) === text.split(/\r?\n/)[0]?.trim() && !line.product_form && !line.product_topic
    ? undefined
    : text;
}

function serviceDates(invoice: Invoice): string[] {
  return invoice.data.lines.map((line) => line.service_date ?? "").filter(Boolean);
}

/**
 * Fälligkeit (BT-9) über denselben Helfer wie der Text der Zahlungsbedingungen
 * (BT-20) — sonst können Datum und Satz auseinanderlaufen.
 */
function dueDate(invoice: Invoice): string | undefined {
  const days = invoice.data.payment_due_days;
  if (days === undefined || !invoice.invoice_date) return undefined;
  return offsetIsoDate(new Date(`${invoice.invoice_date}T00:00:00`), days);
}

interface TaxBlock {
  categoryCode: string;
  ratePercent: number;
  exemptionReason?: string;
  exemptionReasonCode?: string;
}

function taxBlock(invoice: Invoice, language: "de" | "en"): TaxBlock {
  if (invoice.data.reverse_charge === true) {
    return {
      categoryCode: "AE",
      ratePercent: 0,
      exemptionReason:
        language === "en"
          ? "Tax liability of the recipient of the service (reverse charge)"
          : "Steuerschuldnerschaft des Leistungsempfängers (reverse charge)",
      exemptionReasonCode: "VATEX-EU-AE",
    };
  }
  return { categoryCode: "S", ratePercent: Math.max(0, Number(invoice.vat_rate) || 0) };
}

// ── Prüfungen ────────────────────────────────────────────────────────────────

/**
 * Prüfung vor dem Abrechnen: alles ausser Rechnungsnummer und -datum, die
 * das Abrechnen selbst erst vergibt. Schlägt sie an, wird der Statuswechsel
 * abgelehnt — eine Rechnung, zu der es keine gültige XRechnung geben kann,
 * soll gar nicht erst entstehen.
 */
export function checkXRechnungBeforeBilling(invoice: Invoice, settings: AppSettings): string[] {
  return collectIssues(invoice, settings, { billed: false });
}

/**
 * Alles, was einer gültigen XRechnung im Weg steht — als Liste, damit die
 * Oberfläche sie gesammelt zeigen kann statt eine nach der anderen.
 */
export function checkXRechnung(invoice: Invoice, settings: AppSettings): string[] {
  return collectIssues(invoice, settings, { billed: true });
}

function collectIssues(invoice: Invoice, settings: AppSettings, scope: { billed: boolean }): string[] {
  const issues: string[] = [];
  const seller = settings.invoicing;
  const buyer = invoice.gp_snapshot;

  // Eigene Firmendaten
  if (!seller.company_name?.trim()) issues.push("Einstellungen: Firmenname fehlt.");
  if (!seller.address?.street?.trim()) issues.push("Einstellungen: Straße fehlt.");
  if (!seller.address?.zip?.trim()) issues.push("Einstellungen: PLZ fehlt.");
  if (!seller.address?.city?.trim()) issues.push("Einstellungen: Ort fehlt.");
  if (!countryCode(seller.address?.country)) issues.push("Einstellungen: Ländercode fehlt.");
  if (!seller.iban?.trim()) issues.push("Einstellungen: IBAN fehlt.");
  if (!normalizeVatId(seller.vat_number)) issues.push("Einstellungen: eigene USt-IdNr. fehlt.");
  if (!seller.contact_person?.trim()) issues.push("Einstellungen: Ansprechpartner fehlt.");
  if (!seller.phone?.trim()) issues.push("Einstellungen: Telefon fehlt.");
  if (!seller.email?.trim()) issues.push("Einstellungen: E-Mail fehlt.");

  // Kunde
  if (!buyer.name?.trim()) issues.push("Kunde: Name fehlt.");
  if (!buyer.address?.zip?.trim()) issues.push("Kunde: PLZ fehlt.");
  if (!buyer.address?.city?.trim()) issues.push("Kunde: Ort fehlt.");
  if (!countryCode(buyer.address?.country)) {
    issues.push(
      buyer.address?.country?.trim()
        ? `Kunde: Land "${buyer.address.country}" ist kein bekannter Ländercode.`
        : "Kunde: Land fehlt.",
    );
  }
  if (!buyer.email?.trim()) {
    issues.push("Kunde: E-Mail fehlt — die XRechnung verlangt eine elektronische Adresse (BT-49).");
  }

  // Umsatzsteuer
  const reverseCharge = invoice.data.reverse_charge === true;
  const vatRate = Math.max(0, Number(invoice.vat_rate) || 0);
  if (reverseCharge) {
    const vatId = normalizeVatId(buyer.vat_id);
    if (!vatId) issues.push("Kunde: USt-IdNr. fehlt, bei Reverse Charge ist sie Pflicht.");
    else if (!isPlausibleVatId(vatId)) issues.push(`Kunde: USt-IdNr. "${vatId}" passt nicht zum Muster.`);
  } else if (vatRate === 0) {
    issues.push("Umsatzsteuer 0 % ohne Reverse Charge wird nicht unterstützt — ein Befreiungsgrund fehlt.");
  }

  // Positionen
  if (invoice.data.lines.length === 0) issues.push("Die Rechnung hat keine Positionen.");
  invoice.data.lines.forEach((line, index) => {
    const nr = index + 1;
    if (!line.service_date) issues.push(`Position ${nr}: Leistungsdatum fehlt.`);
    if (!lineName(line)) issues.push(`Position ${nr}: Bezeichnung fehlt.`);
    if (!(Number(line.quantity) > 0)) issues.push(`Position ${nr}: Menge muss grösser als 0 sein.`);
    if (!invoiceUnitCode(line.unit)) {
      issues.push(
        line.unit?.trim()
          ? `Position ${nr}: Einheit "${line.unit}" hat keinen Code.`
          : `Position ${nr}: Einheit fehlt.`,
      );
    }
  });

  if (!(invoiceTotal(invoice).gross > 0)) issues.push("Der Rechnungsbetrag muss grösser als 0 sein.");
  if (invoice.data.payment_due_days === undefined) {
    issues.push("Zahlungsbedingungen: Zahlungszeitraum in Tagen fehlt.");
  }

  // Nummer und Datum vergibt das Abrechnen — vorher wäre ihr Fehlen kein Mangel.
  if (scope.billed && !invoice.invoice_date) {
    issues.push("Das Rechnungsdatum fehlt — die Rechnung ist noch nicht abgerechnet.");
  }

  return issues;
}

// ── Erzeugung ────────────────────────────────────────────────────────────────

export function buildInvoiceXml(invoice: Invoice, settings: AppSettings): string {
  const seller = settings.invoicing;
  const buyer = invoice.gp_snapshot;
  const language = buyer.invoice_language ?? "de";
  const totals = invoiceTotal(invoice);
  const tax = taxBlock(invoice, language);
  const invoiceNumber = invoice.invoice_number ?? "";
  const invoiceDate = invoice.invoice_date ?? "";
  const taxAmount = tax.categoryCode === "AE" ? 0 : totals.vat;

  // R4: Ein einzelner, für alle Positionen gleicher Leistungstag steht im Kopf
  // (BT-72). Sonst steht dort der Zeitraum, und das Delivery-Element bleibt leer.
  const dates = serviceDates(invoice);
  const uniqueDates = [...new Set(dates)].sort();
  const singleDay = uniqueDates.length === 1 ? uniqueDates[0] : undefined;

  const lines = invoice.data.lines.map((line, index) => {
    const date = line.service_date ?? invoiceDate;
    return wrap("ram:IncludedSupplyChainTradeLineItem", [
      ...wrap("ram:AssociatedDocumentLineDocument", el("ram:LineID", String(index + 1))),
      ...wrap("ram:SpecifiedTradeProduct", [
        ...el("ram:Name", lineName(line)),
        ...el("ram:Description", lineDescription(line)),
      ]),
      ...wrap(
        "ram:SpecifiedLineTradeAgreement",
        wrap("ram:NetPriceProductTradePrice", el("ram:ChargeAmount", price(line.unit_price))),
      ),
      ...wrap(
        "ram:SpecifiedLineTradeDelivery",
        el("ram:BilledQuantity", decimal(line.quantity), ` unitCode="${invoiceUnitCode(line.unit) ?? ""}"`),
      ),
      ...wrap("ram:SpecifiedLineTradeSettlement", [
        ...wrap("ram:ApplicableTradeTax", [
          ...el("ram:TypeCode", "VAT"),
          ...el("ram:CategoryCode", tax.categoryCode),
          ...el("ram:RateApplicablePercent", decimal(tax.ratePercent)),
        ]),
        ...wrap("ram:BillingSpecifiedPeriod", [
          ...dateElement("ram:StartDateTime", date),
          ...dateElement("ram:EndDateTime", date),
        ]),
        ...wrap(
          "ram:SpecifiedTradeSettlementLineMonetarySummation",
          el("ram:LineTotalAmount", amount(lineTotal(line))),
        ),
      ]),
    ]);
  });

  const sellerParty = wrap("ram:SellerTradeParty", [
    ...el("ram:Name", seller.company_name?.trim()),
    ...wrap("ram:SpecifiedLegalOrganization", [
      ...el("ram:ID", seller.registration_id?.trim()),
      ...el("ram:TradingBusinessName", seller.trading_name?.trim()),
    ]),
    ...wrap("ram:DefinedTradeContact", [
      ...el("ram:PersonName", seller.contact_person?.trim()),
      ...wrap("ram:TelephoneUniversalCommunication", el("ram:CompleteNumber", seller.phone?.trim())),
      ...wrap("ram:EmailURIUniversalCommunication", el("ram:URIID", seller.email?.trim())),
    ]),
    ...wrap("ram:PostalTradeAddress", [
      ...el("ram:PostcodeCode", seller.address?.zip?.trim()),
      ...el("ram:LineOne", seller.address?.street?.trim()),
      ...el("ram:CityName", seller.address?.city?.trim()),
      ...el("ram:CountryID", countryCode(seller.address?.country)),
    ]),
    ...wrap("ram:URIUniversalCommunication", el("ram:URIID", seller.email?.trim(), ' schemeID="EM"')),
    ...wrap("ram:SpecifiedTaxRegistration", el("ram:ID", normalizeVatId(seller.vat_number), ' schemeID="VA"')),
  ]);

  // Hat der Kunde eine Straße, kommt ein Adresszusatz in LineTwo; sonst rückt
  // er in LineOne nach, damit die Adresse nicht auseinanderfällt.
  const street = buyer.address?.street?.trim();
  const buyerParty = wrap("ram:BuyerTradeParty", [
    ...el("ram:Name", buyer.name?.trim()),
    ...wrap("ram:PostalTradeAddress", [
      ...el("ram:PostcodeCode", buyer.address?.zip?.trim()),
      ...el("ram:LineOne", street),
      ...el("ram:CityName", buyer.address?.city?.trim()),
      ...el("ram:CountryID", countryCode(buyer.address?.country)),
    ]),
    ...wrap("ram:URIUniversalCommunication", el("ram:URIID", buyer.email?.trim(), ' schemeID="EM"')),
    ...wrap("ram:SpecifiedTaxRegistration", el("ram:ID", normalizeVatId(buyer.vat_id), ' schemeID="VA"')),
  ]);

  const paymentDescription = paymentTermsText(invoice.data, invoice.invoice_date, language)
    // Ein führendes # wertet XRechnung als Skonto-Angabe aus.
    .replace(/^#+/, "")
    .trim();
  const due = dueDate(invoice);

  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rsm:CrossIndustryInvoice`,
    `    xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"`,
    `    xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"`,
    `    xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"`,
    `    xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">`,
    ...indent([
      ...wrap("rsm:ExchangedDocumentContext", [
        ...wrap("ram:BusinessProcessSpecifiedDocumentContextParameter", el("ram:ID", PROCESS_ID)),
        ...wrap("ram:GuidelineSpecifiedDocumentContextParameter", el("ram:ID", PROFILE_ID)),
      ]),
      ...wrap("rsm:ExchangedDocument", [
        ...el("ram:ID", invoiceNumber),
        ...el("ram:TypeCode", "380"),
        ...dateElement("ram:IssueDateTime", invoiceDate),
        ...wrap("ram:IncludedNote", el("ram:Content", invoice.data.comment?.trim())),
      ]),
      ...wrap("rsm:SupplyChainTradeTransaction", [
        ...lines.flat(),
        ...wrap("ram:ApplicableHeaderTradeAgreement", [
          ...el("ram:BuyerReference", invoice.data.reference?.trim() || BUYER_REFERENCE_FALLBACK),
          ...sellerParty,
          ...buyerParty,
        ]),
        ...(singleDay
          ? wrap(
              "ram:ApplicableHeaderTradeDelivery",
              wrap("ram:ActualDeliverySupplyChainEvent", dateElement("ram:OccurrenceDateTime", singleDay)),
            )
          : ["<ram:ApplicableHeaderTradeDelivery/>"]),
        ...wrap("ram:ApplicableHeaderTradeSettlement", [
          ...el("ram:PaymentReference", invoiceNumber),
          ...el("ram:InvoiceCurrencyCode", "EUR"),
          ...wrap("ram:SpecifiedTradeSettlementPaymentMeans", [
            ...el("ram:TypeCode", "58"),
            ...wrap("ram:PayeePartyCreditorFinancialAccount", [
              ...el("ram:IBANID", seller.iban?.trim()),
              ...el("ram:AccountName", seller.company_name?.trim()),
            ]),
            ...wrap("ram:PayeeSpecifiedCreditorFinancialInstitution", el("ram:BICID", seller.bic?.trim())),
          ]),
          ...wrap("ram:ApplicableTradeTax", [
            ...el("ram:CalculatedAmount", amount(taxAmount)),
            ...el("ram:TypeCode", "VAT"),
            ...el("ram:ExemptionReason", tax.exemptionReason),
            ...el("ram:BasisAmount", amount(totals.net)),
            ...el("ram:CategoryCode", tax.categoryCode),
            ...el("ram:ExemptionReasonCode", tax.exemptionReasonCode),
            ...el("ram:RateApplicablePercent", decimal(tax.ratePercent)),
          ]),
          ...(singleDay
            ? []
            : wrap("ram:BillingSpecifiedPeriod", [
                ...dateElement("ram:StartDateTime", uniqueDates[0] ?? invoiceDate),
                ...dateElement("ram:EndDateTime", uniqueDates[uniqueDates.length - 1] ?? invoiceDate),
              ])),
          ...wrap("ram:SpecifiedTradePaymentTerms", [
            ...el("ram:Description", paymentDescription),
            ...(due ? dateElement("ram:DueDateDateTime", due) : []),
          ]),
          ...wrap("ram:SpecifiedTradeSettlementHeaderMonetarySummation", [
            ...el("ram:LineTotalAmount", amount(totals.net)),
            ...el("ram:TaxBasisTotalAmount", amount(totals.net)),
            ...el("ram:TaxTotalAmount", amount(taxAmount), ' currencyID="EUR"'),
            ...el("ram:GrandTotalAmount", amount(totals.net + taxAmount)),
            ...el("ram:DuePayableAmount", amount(totals.net + taxAmount)),
          ]),
        ]),
      ]),
    ]),
    `</rsm:CrossIndustryInvoice>`,
    ``,
  ];

  return body.join("\n");
}

/** Gleicher Stamm wie das PDF, damit beide Dateien zusammen bleiben. */
export function invoiceXmlFilename(invoice: Invoice): string {
  return `${invoiceFileStem(invoice.invoice_number ?? "0000000000", invoice.gp_snapshot.name)}.xml`;
}
