import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beispiel, ladeFachlogik } from "./fachlogik";

/**
 * Vom Befund der KI zur XRechnung: zusammensetzen, prüfen, XML erzeugen.
 *
 * Jede erzeugte Datei landet in .kosit/generated/xfact/. Die echte Prüfung
 * macht der KoSIT-Validator:
 *   npm run validate:xrechnung .kosit/generated/xfact/*.xml
 */

const XFact = ladeFachlogik();
const AUSGABE = join(__dirname, "../../.kosit/generated/xfact");
mkdirSync(AUSGABE, { recursive: true });

function zurXml(befund: any, ergaenzungen: object, dateiname: string) {
  const rechnung = XFact.baueRechnung(befund, ergaenzungen);
  const fehlt = XFact.pruefeRechnung(rechnung);
  const xml = fehlt.length ? null : XFact.erzeugeXml(rechnung);
  if (xml) writeFileSync(join(AUSGABE, dateiname), xml);
  return { rechnung, fehlt, xml };
}

const element = (xml: string, name: string) =>
  [...xml.matchAll(new RegExp(`<ram:${name}[^>]*>([^<]*)</ram:${name}>`, "g"))].map((t) => t[1]);

describe("Beispielrechnungen (aufgezeichnete KI-Antworten)", () => {
  const soll: Record<string, { datei: string; brutto: string; positionen: number }> = {
    INV737: { datei: "INV 737 InfraServ GmbH & Co. Wiesbaden KG.xml", brutto: "1000.00", positionen: 1 },
    INV742: { datei: "INV 742 Humboldt-Universität zu Berlin.xml", brutto: "1800.00", positionen: 2 },
    INV745: { datei: "INV 745 GLS ImmoWert GmbH.xml", brutto: "400.00", positionen: 1 },
    INV747: { datei: "INV 747 ADG Forum Assistenz.xml", brutto: "16648.00", positionen: 7 },
    INV753: { datei: "INV 753 Berg GmbH & Co. KG.xml", brutto: "777.00", positionen: 1 },
  };

  for (const [name, erwartet] of Object.entries(soll)) {
    it(name, () => {
      const { befund, pruefung } = beispiel(name);
      const ohne = XFact.baueRechnung(befund, {});
      // Die E-Mail des Kunden steht nie im PDF; bei 737 ist der Leistungszeitraum vertippt (… bis 31.07.25)
      const fehltOhne = XFact.pruefeRechnung(ohne).map((f: any) => f.feld);
      expect(fehltOhne).toContain("empfaenger.email");
      expect(fehltOhne.filter((f: string) => f !== "empfaenger.email" && !/^position\.\d+\.datum$/.test(f))).toEqual([]);
      // Der Prüfer hat nichts angezweifelt
      const zweifel = XFact.hinweiseZurRechnung(ohne, befund, new Set(), pruefung)
        .filter((h: any) => h.stufe === "unsicher" && h.text.startsWith("Prüfer") || h.text === XFact.TEXTE.pruefer.nichtBestaetigt);
      expect(zweifel).toEqual([]);

      const korrektur = name === "INV737" ? { positionen: { 1: { bis: "2026-07-31" } } } : {};
      const { rechnung, fehlt, xml } = zurXml(befund, { empfaenger: { email: "rechnung@kunde.example" }, ...korrektur }, erwartet.datei);
      expect(fehlt).toEqual([]);
      expect(rechnung.steuerfall.kategorie).toBe("AE");
      expect(rechnung.absender.kontakt).toBe("Andrea Kaden");
      expect(element(xml!, "GrandTotalAmount")).toEqual([erwartet.brutto]);
      expect(element(xml!, "LineID")).toHaveLength(erwartet.positionen);
      expect(element(xml!, "ExemptionReasonCode")).toEqual(["VATEX-EU-AE"]);
    });
  }

  it("nur die Humboldt-Universität ist eine Behörde: dort wird nach der Leitweg-ID gefragt", () => {
    const behoerden = Object.keys(soll).filter((name) => beispiel(name).befund.kaeufer.oeffentlich);
    expect(behoerden).toEqual(["INV742"]);
    const { befund } = beispiel("INV742");
    expect(XFact.hinweiseZurRechnung(XFact.baueRechnung(befund, {}), befund))
      .toContainEqual({ feld: "leitwegId", stufe: "unsicher", text: XFact.TEXTE.pruefer.leitwegIdBehoerde });
  });

  it("INV 747: Zeiträume, km, Kopf-Zeitraum vom ersten bis zum letzten Tag", () => {
    const { xml } = zurXml(beispiel("INV747").befund, { empfaenger: { email: "rechnung@kunde.example" } }, "INV 747 ADG Forum Assistenz.xml");
    expect(xml).toContain('<ram:BilledQuantity unitCode="KMT">1080</ram:BilledQuantity>');
    expect(element(xml!, "ChargeAmount")).toContain("0.30");
    expect(xml).toContain("<ram:ApplicableHeaderTradeDelivery/>");
    expect(xml).toMatch(/<\/ram:ApplicableTradeTax>\s*<ram:BillingSpecifiedPeriod>\s*<ram:StartDateTime><udt:DateTimeString format="102">20260101/);
  });
});

/** KI-Antwort für eine Rechnung eines deutschen Handwerksbetriebs; Positionen, Steuer und Käufer austauschbar */
function musterBefund({ positionen, steuer, kaeuferUstId = "", summen, leitwegId = "", zahlung = {}, faellig = "2026-09-26" }: {
  positionen: object[]; steuer: object[]; kaeuferUstId?: string; summen: object; leitwegId?: string; zahlung?: object; faellig?: string;
}) {
  const text = "Muster Handwerk GmbH … Rechnungsnummer: 2026-0153 … IBAN DE89 3704 0044 0532 0130 00 … DE196047852";
  return XFact.befundAusKi({
    rechnung: { nummer: "2026-0153", datum: "2026-09-12", art: "380", faellig, zahlungsbedingungen: "",
      bestellnummer: "Auftrag 4711", leitwegId, leistungVon: "", leistungBis: "", bemerkung: "" },
    verkaeufer: { name: "Muster Handwerk GmbH", strasse: "Hauptstr. 1", zusatz: "", plz: "20095", ort: "Hamburg", land: "DE",
      ustId: "", steuernummer: "12/345/67890", email: "info@muster-handwerk.example", telefon: "040 123456", kontakt: "Max Muster" },
    kaeufer: { name: "Berg GmbH & Co. KG", strasse: "Alte Ziegelei 21", zusatz: "", plz: "51491", ort: "Overath", land: "DE",
      ustId: kaeuferUstId, steuernummer: "", email: "rechnung@berg.example", telefon: "", kontakt: "" },
    zahlung: { art: "ueberweisung", iban: "DE89370400440532013000", bic: "COBADEFFXXX", verwendungszweck: "",
      glaeubigerId: "", mandatsreferenz: "", kundenIban: "", ...zahlung },
    positionen, steuer, summen, fehlt: [],
  }, text);
}

const pos = (name: string, menge: number, einheit: string, preis: number, gesamt: number, kategorie: string, satz: number,
  nachlass = 0, nachlassGrund = "") => ({
  name, beschreibung: "", menge, einheitText: einheit, einheitCode: ({ Std: "HUR", Stk: "C62", Pauschale: "LS" } as any)[einheit] || "",
  einzelpreis: preis, gesamt, steuerkategorie: kategorie, steuersatz: satz, von: "2026-09-07", bis: "2026-09-07", nachlass, nachlassGrund,
});
const keineSteuer = (betrag: number, kategorie: string, grund: string) => ({
  steuer: [{ kategorie, satz: 0, basis: betrag, betrag: 0, befreiungsgrund: grund }],
  summen: { netto: betrag, steuer: 0, brutto: betrag, zahlbetrag: betrag },
});

describe("die drei Steuerfälle", () => {
  it("19 % und 7 % gemischt, nur Steuernummer (FC und als Verkäuferkennung)", () => {
    const befund = musterBefund({
      positionen: [pos("Montage Küche", 8, "Std", 65, 520, "S", 19), pos("Fachbuch Küchenplanung", 1, "Stk", 40, 40, "S", 7)],
      steuer: [{ kategorie: "S", satz: 19, basis: 520, betrag: 98.8, befreiungsgrund: "" }, { kategorie: "S", satz: 7, basis: 40, betrag: 2.8, befreiungsgrund: "" }],
      summen: { netto: 560, steuer: 101.6, brutto: 661.6, zahlbetrag: 661.6 },
    });
    const { fehlt, xml } = zurXml(befund, {}, "Muster-19-7.xml");
    expect(fehlt).toEqual([]);
    expect(element(xml!, "CalculatedAmount")).toEqual(["98.80", "2.80"]);
    expect(element(xml!, "GrandTotalAmount")).toEqual(["661.60"]);
    expect(xml).toContain('<ram:ID schemeID="FC">12/345/67890</ram:ID>');
    expect(xml).toMatch(/<ram:SellerTradeParty>\s*<ram:ID>12\/345\/67890<\/ram:ID>/);
    expect(XFact.hinweiseZurRechnung(XFact.baueRechnung(befund, {}), befund))
      .toEqual([{ feld: "summe.brutto", stufe: "ok", text: XFact.TEXTE.summenWieAufRechnung }]);
  });

  it("Steuerschuldnerschaft des Leistungsempfängers (§13b), Kunde mit USt-IdNr.", () => {
    const befund = musterBefund({ positionen: [pos("Estricharbeiten", 8, "Std", 70, 560, "AE", 0)], kaeuferUstId: "DE196047852",
      ...keineSteuer(560, "AE", "Steuerschuldnerschaft des Leistungsempfängers nach § 13b UStG.") });
    const { fehlt, xml } = zurXml(befund, {}, "Muster-13b.xml");
    expect(fehlt).toEqual([]);
    expect(element(xml!, "ExemptionReason")).toEqual(["Steuerschuldnerschaft des Leistungsempfängers nach § 13b UStG."]);
  });

  it("§13b ohne USt-IdNr. des Kunden: fehlt", () => {
    const befund = musterBefund({ positionen: [pos("Estricharbeiten", 8, "Std", 70, 560, "AE", 0)], ...keineSteuer(560, "AE", "") });
    expect(zurXml(befund, {}, "nicht-erzeugt.xml").fehlt.map((f: any) => f.feld)).toEqual(["empfaenger.ustId"]);
  });

  it("Kleinunternehmer (§19)", () => {
    const befund = musterBefund({ positionen: [pos("Gartenpflege", 4, "Std", 35, 140, "E", 0)],
      ...keineSteuer(140, "E", "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.") });
    const { fehlt, xml } = zurXml(befund, {}, "Muster-19.xml");
    expect(fehlt).toEqual([]);
    expect(element(xml!, "CategoryCode")).toEqual(["E", "E"]);
  });

  it("Leitweg-ID: sie ist die Käuferreferenz, die Referenz wird Bestellnummer", () => {
    const befund = musterBefund({ positionen: [pos("Gartenpflege", 4, "Std", 35, 140, "E", 0)], leitwegId: "04011000-1234512345-06",
      ...keineSteuer(140, "E", "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.") });
    const { xml } = zurXml(befund, {}, "Muster-Leitweg.xml");
    expect(xml).toContain("<ram:BuyerReference>04011000-1234512345-06</ram:BuyerReference>");
    expect(xml).toContain("<ram:IssuerAssignedID>Auftrag 4711</ram:IssuerAssignedID>");
  });

  it("SEPA-Lastschrift: Gläubiger-ID, IBAN des Kunden, Mandat; ohne eigene IBAN und ohne Fälligkeit", () => {
    const befund = musterBefund({ positionen: [pos("Wartung Heizung", 2, "Std", 65, 130, "S", 19)],
      steuer: [{ kategorie: "S", satz: 19, basis: 130, betrag: 24.7, befreiungsgrund: "" }],
      summen: { netto: 130, steuer: 24.7, brutto: 154.7, zahlbetrag: 154.7 }, faellig: "",
      zahlung: { art: "lastschrift", iban: "", bic: "", glaeubigerId: "DE98ZZZ09999999999", mandatsreferenz: "M-4711",
        kundenIban: "DE02120300000000202051" } });
    const { fehlt, xml } = zurXml(befund, {}, "Muster-Lastschrift.xml");
    expect(fehlt).toEqual([]);
    expect(element(xml!, "TypeCode")).toContain("59");
    expect(element(xml!, "CreditorReferenceID")).toEqual(["DE98ZZZ09999999999"]);
    expect(xml).toMatch(/<ram:PayerPartyDebtorFinancialAccount>\s*<ram:IBANID>DE02120300000000202051<\/ram:IBANID>/);
    expect(element(xml!, "DirectDebitMandateID")).toEqual(["M-4711"]);
    expect(element(xml!, "Description")).toContain(XFact.TEXTE.lastschrift(null));
    expect(xml).not.toContain("PayeePartyCreditorFinancialAccount");
    expect(xml).not.toContain("DueDateDateTime");
  });

  it("Lastschrift ohne Gläubiger-ID und IBAN des Kunden: fehlt", () => {
    const befund = musterBefund({ positionen: [pos("Wartung Heizung", 2, "Std", 65, 130, "E", 0)],
      ...keineSteuer(130, "E", "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."), zahlung: { art: "lastschrift" } });
    expect(zurXml(befund, {}, "nicht-erzeugt.xml").fehlt.map((f: any) => f.feld)).toEqual(["absender.glaeubigerId", "empfaenger.iban"]);
  });

  it("Kreditkarte und Rabatt auf eine Position, Preise mit drei Nachkommastellen", () => {
    const befund = musterBefund({
      positionen: [pos("Domain muster.com", 1, "Stk", 24.101, 0.711, "S", 19, 23.39, "Willkommensangebot"),
        pos("Domain muster.eu", 1, "Stk", 25.109, 25.109, "S", 19)],
      steuer: [{ kategorie: "S", satz: 19, basis: 25.82, betrag: 4.91, befreiungsgrund: "" }],
      summen: { netto: 25.82, steuer: 4.91, brutto: 30.73, zahlbetrag: 30.73 }, faellig: "",
      zahlung: { art: "kreditkarte", iban: "", bic: "", karte: "4242" } });
    expect(XFact.hinweiseZurRechnung(XFact.baueRechnung(befund, {}), befund))
      .toEqual([{ feld: "summe.brutto", stufe: "ok", text: XFact.TEXTE.summenWieAufRechnung }]);
    const { fehlt, xml } = zurXml(befund, {}, "Muster-Kreditkarte-Rabatt.xml");
    expect(fehlt).toEqual([]);
    expect(element(xml!, "TypeCode")).toContain("54");
    expect(xml).toMatch(/<ram:ApplicableTradeSettlementFinancialCard>\s*<ram:ID>4242<\/ram:ID>/);
    expect(element(xml!, "ChargeAmount")).toEqual(["24.101", "25.109"]);
    expect(element(xml!, "ActualAmount")).toEqual(["23.39"]);
    expect(element(xml!, "Reason")).toEqual(["Willkommensangebot"]);
    expect(element(xml!, "LineTotalAmount")).toEqual(["0.71", "25.11", "25.82"]);
    expect(element(xml!, "Description")).toContain(XFact.TEXTE.kreditkarte(null));
    expect(xml).not.toContain("PayeePartyCreditorFinancialAccount");
  });

  it("Kreditkarte ohne die letzten 4 Ziffern: fehlt", () => {
    const befund = musterBefund({ positionen: [pos("Wartung", 2, "Std", 65, 130, "E", 0)],
      ...keineSteuer(130, "E", "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."), zahlung: { art: "kreditkarte" } });
    expect(zurXml(befund, {}, "nicht-erzeugt.xml").fehlt.map((f: any) => f.feld)).toEqual(["empfaenger.karte"]);
  });

  it("Sonderzeichen werden maskiert", () => {
    const befund = musterBefund({ positionen: [pos("Prüfung <Schaltschrank> & Co", 1, "Pauschale", 90, 90, "E", 0)],
      ...keineSteuer(90, "E", "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.") });
    const { xml } = zurXml(befund, {}, "Muster-Sonderzeichen.xml");
    expect(xml).toContain("<ram:Name>Prüfung &lt;Schaltschrank&gt; &amp; Co</ram:Name>");
    expect(xml).toContain("<ram:Name>Berg GmbH &amp; Co. KG</ram:Name>");
  });

  it("Dateiname wie das PDF", () => {
    expect(XFact.xmlDateiname("INV 753 Berg GmbH & Co. KG.pdf")).toBe("INV 753 Berg GmbH & Co. KG.xml");
  });
});
