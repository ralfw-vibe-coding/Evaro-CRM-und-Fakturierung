import { describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { ladeFachlogik, pdfAus as pdfAusZeilen } from "./fachlogik";

/**
 * Vom PDF zur XRechnung: erkennen, zusammensetzen, prüfen, XML erzeugen.
 *
 * Jede erzeugte Datei landet in .kosit/generated/xfact/. Die echte Prüfung
 * macht der KoSIT-Validator:
 *   npm run validate:xrechnung .kosit/generated/xfact/*.xml
 */

const XFact = ladeFachlogik();
const BEISPIELE = join(__dirname, "../../requirements/XRechnungen/Beispiel-PDFs");
const AUSGABE = join(__dirname, "../../.kosit/generated/xfact");
const pdfAus = (...zeilen: (string | [number, string][])[]) => pdfAusZeilen(XFact, ...zeilen);

mkdirSync(AUSGABE, { recursive: true });

function zurXml(pdf: any, ergaenzungen: object, dateiname: string) {
  const rechnung = XFact.baueRechnung(XFact.erkenneRechnung(pdf), ergaenzungen);
  const fehlt = XFact.pruefeRechnung(rechnung);
  const xml = fehlt.length ? null : XFact.erzeugeXml(rechnung);
  if (xml) writeFileSync(join(AUSGABE, dateiname), xml);
  return { rechnung, fehlt, xml };
}

const element = (xml: string, name: string) =>
  [...xml.matchAll(new RegExp(`<ram:${name}[^>]*>([^<]*)</ram:${name}>`, "g"))].map((t) => t[1]);

describe("Beispielrechnungen (Reverse Charge, Steller in Bulgarien)", () => {
  const dateien = [
    "INV 737 InfraServ GmbH & Co. Wiesbaden KG.pdf",
    "INV 742 Humboldt-Universität zu Berlin.pdf",
    "INV 745 GLS ImmoWert GmbH.pdf",
    "INV 747 ADG Forum Assistenz.pdf",
    "INV 753 Berg GmbH & Co. KG.pdf",
  ];

  for (const datei of dateien) {
    it(datei, async () => {
      const pdf = await XFact.lesePdf(new Uint8Array(readFileSync(join(BEISPIELE, datei))), pdfjs);

      // Ohne Ergänzungen fehlt die E-Mail des Kunden; bei 737 und 742 auch das Leistungsdatum
      const ohne = XFact.baueRechnung(XFact.erkenneRechnung(pdf), {});
      const felder = XFact.pruefeRechnung(ohne).map((f: any) => f.feld);
      expect(felder).toContain("empfaenger.email");
      expect(felder.filter((f: string) => !/^empfaenger\.email$|\.datum$/.test(f))).toEqual([]);

      const { rechnung, fehlt, xml } = zurXml(pdf, {
        empfaenger: { email: "rechnung@kunde.example" },
        leistungsdatum: ohne.datum,
      }, XFact.xmlDateiname(datei));
      expect(fehlt).toEqual([]);
      expect(rechnung.steuerfall.kategorie).toBe("AE");
      expect(rechnung.absender.kontakt).toBe("Andrea Kaden");
      expect(element(xml!, "CategoryCode").every((k) => k === "AE")).toBe(true);
      expect(element(xml!, "ExemptionReasonCode")).toEqual(["VATEX-EU-AE"]);
    });
  }

  it("INV 747: Zeiträume, km und Gesamtsumme", async () => {
    const pdf = await XFact.lesePdf(new Uint8Array(readFileSync(join(BEISPIELE, dateien[3]))), pdfjs);
    const { xml } = zurXml(pdf, { empfaenger: { email: "rechnung@kunde.example" } }, "INV 747 ADG Forum Assistenz.xml");
    expect(element(xml!, "GrandTotalAmount")).toEqual(["16648.00"]);
    expect(xml).toContain('<ram:BilledQuantity unitCode="KMT">1080</ram:BilledQuantity>');
    expect(element(xml!, "ChargeAmount")).toContain("0.30");
    // Kopf: Zeitraum vom ersten bis zum letzten Leistungstag
    expect(xml).toContain("<ram:ApplicableHeaderTradeDelivery/>");
    expect(xml).toMatch(/<\/ram:ApplicableTradeTax>\s*<ram:BillingSpecifiedPeriod>\s*<ram:StartDateTime><udt:DateTimeString format="102">20260101/);
  });
});

/** Musterrechnung eines deutschen Handwerksbetriebs; Steuerteil und Hinweis austauschbar. */
function musterrechnung({ positionen, summen, hinweis = "", kundeUstId = "" }: {
  positionen: [number, string][][]; summen: [number, string][][]; hinweis?: string; kundeUstId?: string;
}) {
  return pdfAus(
    [[350, "Muster Handwerk GmbH"]],
    "Muster Handwerk GmbH · Hauptstr. 1 · 20095 Hamburg",
    "Berg GmbH & Co. KG",
    "Alte Ziegelei 21",
    "51491 Overath",
    kundeUstId,
    "",
    "Rechnungsnummer: 2026-0153",
    "Rechnungsdatum: 12.09.2026",
    "",
    ...positionen,
    "",
    ...summen,
    "",
    "Zahlbar bis 26.09.2026 ohne Abzug.",
    hinweis,
    "",
    [[50, "Tel. 040 123456"], [200, "info@muster-handwerk.de"], [400, "Steuernummer 12/345/67890"]],
    [[50, "IBAN DE89 3704 0044 0532 0130 00"], [300, "BIC COBADEFFXXX"]],
    "Ihr Ansprechpartner: Max Muster",
  );
}

const kopfMitUst: [number, string][] = [[20, "Datum"], [70, "Bezeichnung"], [300, "Menge"], [340, "Einheit"],
  [390, "Einzelpreis"], [460, "USt"], [500, "Gesamt"]];
const kopfOhneUst: [number, string][] = [[20, "Datum"], [70, "Bezeichnung"], [300, "Menge"], [340, "Einheit"],
  [390, "Einzelpreis"], [500, "Gesamt"]];

describe("die drei Steuerfälle", () => {
  it("19 % und 7 % gemischt, nur Steuernummer (FC)", () => {
    const pdf = musterrechnung({
      positionen: [
        kopfMitUst,
        [[20, "07.09.2026"], [70, "Montage Küche"], [315, "8"], [340, "Std"], [405, "65,00 €"], [460, "19 %"], [490, "520,00 €"]],
        [[20, "07.09.2026"], [70, "Fachbuch Küchenplanung"], [315, "1"], [340, "Stk"], [405, "40,00 €"], [460, "7 %"], [495, "40,00 €"]],
      ],
      summen: [
        [[300, "Nettobetrag"], [490, "560,00 €"]],
        [[300, "zzgl. 19 % USt"], [495, "98,80 €"]],
        [[300, "zzgl. 7 % USt"], [500, "2,80 €"]],
        [[300, "Gesamtbetrag"], [490, "661,60 €"]],
      ],
    });
    const { rechnung, fehlt, xml } = zurXml(pdf, { empfaenger: { email: "rechnung@berg.example" } }, "Muster-19-7.xml");
    expect(fehlt).toEqual([]);
    expect(rechnung.absender).toMatchObject({ steuernummer: "12/345/67890", ustId: null, kontakt: "Max Muster" });
    expect(element(xml!, "CategoryCode")).toEqual(["S", "S", "S", "S"]);
    expect(element(xml!, "CalculatedAmount")).toEqual(["98.80", "2.80"]);
    expect(element(xml!, "GrandTotalAmount")).toEqual(["661.60"]);
    expect(xml).toContain('<ram:ID schemeID="FC">12/345/67890</ram:ID>');
    // Ein einziger Leistungstag: im Kopf als Lieferdatum
    expect(xml).toContain("<ram:OccurrenceDateTime><udt:DateTimeString format=\"102\">20260907");
  });

  it("Steuerschuldnerschaft des Leistungsempfängers (§13b), Kunde mit USt-IdNr.", () => {
    const pdf = musterrechnung({
      positionen: [
        kopfOhneUst,
        [[20, "07.09.2026"], [70, "Estricharbeiten"], [315, "8"], [340, "Std"], [405, "70,00 €"], [490, "560,00 €"]],
      ],
      summen: [[[300, "Gesamtbetrag"], [490, "560,00 €"]]],
      hinweis: "Steuerschuldnerschaft des Leistungsempfängers nach § 13b UStG.",
      kundeUstId: "USt-IdNr.: DE196047852",
    });
    const { rechnung, fehlt, xml } = zurXml(pdf, { empfaenger: { email: "rechnung@berg.example" } }, "Muster-13b.xml");
    expect(fehlt).toEqual([]);
    expect(rechnung.empfaenger.ustId).toBe("DE196047852");
    expect(element(xml!, "ExemptionReason")).toEqual(["Steuerschuldnerschaft des Leistungsempfängers nach § 13b UStG."]);
    expect(element(xml!, "TaxTotalAmount")).toEqual(["0.00"]);
  });

  it("§13b ohne USt-IdNr. des Kunden: fehlt", () => {
    const pdf = musterrechnung({
      positionen: [kopfOhneUst,
        [[20, "07.09.2026"], [70, "Estricharbeiten"], [315, "8"], [340, "Std"], [405, "70,00 €"], [490, "560,00 €"]]],
      summen: [[[300, "Gesamtbetrag"], [490, "560,00 €"]]],
      hinweis: "Steuerschuldnerschaft des Leistungsempfängers nach § 13b UStG.",
    });
    const { fehlt } = zurXml(pdf, { empfaenger: { email: "rechnung@berg.example" } }, "nicht-erzeugt.xml");
    expect(fehlt.map((f: any) => f.feld)).toEqual(["empfaenger.ustId"]);
  });

  it("Kleinunternehmer (§19)", () => {
    const pdf = musterrechnung({
      positionen: [
        kopfOhneUst,
        [[20, "07.09.2026"], [70, "Gartenpflege"], [315, "4"], [340, "Std"], [405, "35,00 €"], [490, "140,00 €"]],
      ],
      summen: [[[300, "Gesamtbetrag"], [490, "140,00 €"]]],
      hinweis: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.",
    });
    const { fehlt, xml } = zurXml(pdf, { empfaenger: { email: "rechnung@berg.example" } }, "Muster-19.xml");
    expect(fehlt).toEqual([]);
    expect(element(xml!, "CategoryCode")).toEqual(["E", "E"]);
    expect(element(xml!, "ExemptionReason")).toEqual(["Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."]);
  });
});

describe("Pflichtangaben und Einzelheiten", () => {
  it("unbekannte Einheit muss zugeordnet werden; eigene Zuordnung gewinnt", () => {
    expect(XFact.einheitCode("Std.")).toBe("HUR");
    expect(XFact.einheitCode("Fahrt")).toBeNull();
    expect(XFact.einheitCode("Fahrt", { fahrt: "C62" })).toBe("C62");
  });

  it("maskiert Sonderzeichen", () => {
    const pdf = musterrechnung({
      positionen: [kopfOhneUst,
        [[20, "07.09.2026"], [70, "Prüfung <Schaltschrank> & Co"], [315, "1"], [340, "Pauschale"], [405, "90,00 €"], [490, "90,00 €"]]],
      summen: [[[300, "Gesamtbetrag"], [490, "90,00 €"]]],
      hinweis: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.",
    });
    const { xml } = zurXml(pdf, { empfaenger: { email: "rechnung@berg.example" } }, "Muster-Sonderzeichen.xml");
    expect(xml).toContain("<ram:Name>Prüfung &lt;Schaltschrank&gt; &amp; Co</ram:Name>");
    expect(xml).toContain("<ram:Name>Berg GmbH &amp; Co. KG</ram:Name>");
  });

  it("Dateiname wie das PDF", () => {
    expect(XFact.xmlDateiname("INV 753 Berg GmbH & Co. KG.pdf")).toBe("INV 753 Berg GmbH & Co. KG.xml");
  });
});
