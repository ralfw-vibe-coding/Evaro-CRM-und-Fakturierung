import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { buildInvoiceXml, checkXRechnung, countryCode, normalizeVatId } from "../invoice-xrechnung";
import type { AppSettings, Invoice } from "@/domain/model";

/**
 * Nachbau von INV 753 aus requirements/XRechnungen/Beispiel-XML. Die dortige
 * Datei hat der KoSIT-Validator ohne Befund angenommen und ist damit das Soll.
 *
 * Die erzeugte Datei wird zusätzlich nach .kosit/generated/ geschrieben, damit
 * `npm run validate:xrechnung .kosit/generated/*.xml` sie gegen den echten
 * Validator laufen lassen kann — das prüft mehr, als Zusicherungen hier können.
 */

const SETTINGS: AppSettings = {
  updated_at: null,
  invoicing: {
    company_name: "Work With Ease EOOD",
    trading_name: "Уърк уит Ииз ЕООД",
    registration_id: "205889057",
    contact_person: "Andrea Kaden",
    phone: "+49 176 10335862",
    email: "team@work-with-ease.eu",
    vat_number: "BG205889057",
    address: { street: "ul Bor 4", zip: "2777", city: "Dobrinishte", country: "BG" },
    iban: "LT163250046848710872",
    bic: "REVOLT21",
  },
};

const INVOICE: Invoice = {
  id: "inv-753",
  business_partner_id: "bp-1",
  status: "billed",
  invoice_number: "0000000753",
  invoice_date: "2026-09-12",
  vat_rate: 0,
  gp_snapshot: {
    name: "Berg GmbH & Co. KG",
    vat_id: "DE196047852",
    address: { street: "Alte Ziegelei 21", zip: "51491", city: "Overath", country: "Deutschland" },
    email: "rechnung@kunde.example",
    invoice_language: "de",
  },
  data: {
    payment_due_days: 9,
    reverse_charge: true,
    lines: [
      {
        id: "l1",
        service_date: "2026-09-07",
        product_form: "Seminar vor Ort",
        product_topic: "Walz",
        quantity: 1,
        unit: "Pauschale",
        unit_price: 777,
        text: "Inventarisierung der Prozesse im Büro, Inventarisierung digitaler Tools, Anleitung zu Prozessoptimierung und Einsatz von KI.",
      },
    ],
  },
  created_at: "2026-09-12T00:00:00Z",
  updated_at: "2026-09-12T00:00:00Z",
};

describe("Hilfsfunktionen", () => {
  it("bildet Ländernamen und -codes auf ISO ab", () => {
    expect(countryCode("Deutschland")).toBe("DE");
    expect(countryCode("de")).toBe("DE");
    expect(countryCode("Bulgaria")).toBe("BG");
    // Unbekanntes wird nicht geraten — die Prüfung soll es melden.
    expect(countryCode("Absurdistan")).toBeUndefined();
    expect(countryCode("")).toBeUndefined();
  });

  it("normalisiert USt-IdNr.", () => {
    expect(normalizeVatId("DE 133 51 09 45")).toBe("DE133510945");
    expect(normalizeVatId("de133510945")).toBe("DE133510945");
    expect(normalizeVatId("  ")).toBeUndefined();
  });
});

describe("checkXRechnung", () => {
  it("lässt die vollständige Rechnung durch", () => {
    expect(checkXRechnung(INVOICE, SETTINGS)).toEqual([]);
  });

  it("verlangt die E-Mail des Kunden (BT-49)", () => {
    const ohneMail = { ...INVOICE, gp_snapshot: { ...INVOICE.gp_snapshot, email: undefined } };
    expect(checkXRechnung(ohneMail, SETTINGS).join(" ")).toMatch(/BT-49/);
  });

  it("verlangt bei Reverse Charge die USt-IdNr. des Kunden", () => {
    const ohneUstId = { ...INVOICE, gp_snapshot: { ...INVOICE.gp_snapshot, vat_id: undefined } };
    expect(checkXRechnung(ohneUstId, SETTINGS).join(" ")).toMatch(/USt-IdNr/);
  });

  it("meldet ein Land, das sich nicht zuordnen lässt", () => {
    const land = {
      ...INVOICE,
      gp_snapshot: { ...INVOICE.gp_snapshot, address: { ...INVOICE.gp_snapshot.address, country: "Absurdistan" } },
    };
    expect(checkXRechnung(land, SETTINGS).join(" ")).toMatch(/Absurdistan/);
  });

  it("meldet fehlendes Leistungsdatum und Einheit ohne Code", () => {
    const kaputt: Invoice = {
      ...INVOICE,
      data: {
        ...INVOICE.data,
        lines: [{ ...INVOICE.data.lines[0], service_date: undefined, unit: "Säcke" }],
      },
    };
    const issues = checkXRechnung(kaputt, SETTINGS).join(" ");
    expect(issues).toMatch(/Leistungsdatum fehlt/);
    expect(issues).toMatch(/Säcke/);
  });

  it("lehnt 0 % ohne Reverse Charge ab", () => {
    const ohneRc = { ...INVOICE, data: { ...INVOICE.data, reverse_charge: false } };
    expect(checkXRechnung(ohneRc, SETTINGS).join(" ")).toMatch(/0 %/);
  });
});

describe("buildInvoiceXml", () => {
  const xml = buildInvoiceXml(INVOICE, SETTINGS);

  it("schreibt die Datei für den KoSIT-Validator mit", () => {
    mkdirSync(".kosit/generated", { recursive: true });
    writeFileSync(".kosit/generated/Rechnung-0000000753.xml", xml, "utf8");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it("trägt Profil und Geschäftsprozess", () => {
    expect(xml).toContain("urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0");
    expect(xml).toContain("urn:fdc:peppol.eu:2017:poacc:billing:01:1.0");
  });

  it("übernimmt Kopfdaten wie in der Referenz", () => {
    expect(xml).toContain("<ram:ID>0000000753</ram:ID>");
    expect(xml).toContain("<ram:TypeCode>380</ram:TypeCode>");
    expect(xml).toContain('<udt:DateTimeString format="102">20260912</udt:DateTimeString>');
    expect(xml).toContain("<ram:BuyerReference>keine Angabe</ram:BuyerReference>");
    expect(xml).toContain("<ram:PaymentReference>0000000753</ram:PaymentReference>");
  });

  it("bildet Leistungsart und Thema als Positionsnamen ab", () => {
    expect(xml).toContain("<ram:Name>Seminar vor Ort Walz</ram:Name>");
    expect(xml).toContain("<ram:Description>Inventarisierung der Prozesse");
  });

  it("codiert die Einheit und rechnet den Positionsbetrag", () => {
    expect(xml).toContain('<ram:BilledQuantity unitCode="LS">1</ram:BilledQuantity>');
    expect(xml).toContain("<ram:LineTotalAmount>777.00</ram:LineTotalAmount>");
  });

  it("setzt den Reverse-Charge-Steuerblock", () => {
    expect(xml).toContain("<ram:CategoryCode>AE</ram:CategoryCode>");
    expect(xml).toContain(
      "<ram:ExemptionReason>Steuerschuldnerschaft des Leistungsempfängers (reverse charge)</ram:ExemptionReason>",
    );
    expect(xml).toContain("<ram:ExemptionReasonCode>VATEX-EU-AE</ram:ExemptionReasonCode>");
    expect(xml).toContain("<ram:CalculatedAmount>0.00</ram:CalculatedAmount>");
  });

  it("summiert wie die Referenz", () => {
    expect(xml).toContain("<ram:BasisAmount>777.00</ram:BasisAmount>");
    expect(xml).toContain("<ram:GrandTotalAmount>777.00</ram:GrandTotalAmount>");
    expect(xml).toContain("<ram:DuePayableAmount>777.00</ram:DuePayableAmount>");
  });

  it("legt den einzelnen Leistungstag in den Kopf (R4)", () => {
    expect(xml).toContain("<ram:ActualDeliverySupplyChainEvent>");
    expect(xml).toContain('<udt:DateTimeString format="102">20260907</udt:DateTimeString>');
    expect(xml).not.toContain("<ram:ApplicableHeaderTradeDelivery/>");
  });

  it("schreibt Zahlungsziel und Fälligkeit auf denselben Tag", () => {
    // Die Referenz schreibt "21.09.2026"; die App formatiert Datumsangaben
    // ohne führende Null. Inhaltlich derselbe Tag, im PDF seit jeher so.
    expect(xml).toContain("Der Rechnungsbetrag ist ohne Abzug zahlbar bis: 21.9.2026");
    expect(xml).toContain('<udt:DateTimeString format="102">20260921</udt:DateTimeString>');
  });

  it("normalisiert Land und USt-IdNr. des Kunden", () => {
    expect(xml).toContain("<ram:CountryID>DE</ram:CountryID>");
    expect(xml).toContain('<ram:ID schemeID="VA">DE196047852</ram:ID>');
  });

  it("maskiert Sonderzeichen und behält Kyrillisch", () => {
    const mitUndZeichen = {
      ...INVOICE,
      gp_snapshot: { ...INVOICE.gp_snapshot, name: "Berg GmbH & Co. KG" },
    };
    const out = buildInvoiceXml(mitUndZeichen, SETTINGS);
    expect(out).toContain("Berg GmbH &amp; Co. KG");
    expect(out).toContain("Уърк уит Ииз ЕООД");
  });

  it("legt bei mehreren Leistungstagen den Zeitraum in den Kopf (R4)", () => {
    const zeitraum: Invoice = {
      ...INVOICE,
      data: {
        ...INVOICE.data,
        lines: [
          { ...INVOICE.data.lines[0], id: "a", service_date: "2026-09-07" },
          { ...INVOICE.data.lines[0], id: "b", service_date: "2026-09-09" },
        ],
      },
    };
    const out = buildInvoiceXml(zeitraum, SETTINGS);
    expect(out).toContain("<ram:ApplicableHeaderTradeDelivery/>");
    expect(out).toContain("<ram:BillingSpecifiedPeriod>");
    expect(out).not.toContain("<ram:ActualDeliverySupplyChainEvent>");
  });
});
