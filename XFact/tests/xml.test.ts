import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beispiel, ladeFachlogik, musterBefund } from "./fachlogik";

/**
 * Vom Befund der KI zur XRechnung: zusammensetzen, prüfen, XML erzeugen.
 * Die Musterrechnungen des Kreis-Tests (kreis/) decken alle Felder ab; hier
 * stehen die echten Beispielrechnungen und Sonderfälle der Syntax.
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
      expect(fehltOhne.filter((f: string) => f !== "empfaenger.email" && !/^position\.\d+\.datum$/.test(f) && f !== "leistungBis")).toEqual([]);
      // Der Prüfer hat nichts angezweifelt
      const zweifel = XFact.hinweiseZurRechnung(ohne, befund, new Set(), pruefung)
        .filter((h: any) => h.text.startsWith("Prüfer") || h.text === XFact.TEXTE.pruefer.nichtBestaetigt);
      expect(zweifel).toEqual([]);

      const korrektur = name === "INV737" ? { leistungBis: "2026-07-31" } : {};
      const { rechnung, fehlt, xml } = zurXml(befund, { empfaenger: { email: "rechnung@kunde.example" }, ...korrektur }, erwartet.datei);
      expect(fehlt).toEqual([]);
      expect(XFact.steuerkategorienDerRechnung(rechnung)).toEqual(["AE"]);
      expect(rechnung.absender.kontakt).toBe("Andrea Kaden");
      expect(element(xml!, "GrandTotalAmount")).toEqual([erwartet.brutto]);
      expect(element(xml!, "LineID")).toHaveLength(erwartet.positionen);
      expect(element(xml!, "ExemptionReasonCode")).toEqual(["VATEX-EU-AE"]);
    });
  }

  it("INV 747: Zeiträume, km", () => {
    const { xml } = zurXml(beispiel("INV747").befund, { empfaenger: { email: "rechnung@kunde.example" } }, "INV 747 ADG Forum Assistenz.xml");
    expect(xml).toContain('<ram:BilledQuantity unitCode="KMT">1080</ram:BilledQuantity>');
    expect(element(xml!, "ChargeAmount")).toContain("0.30");
  });
});

const pos = (teil: object) => ({
  posNr: "1", name: "Montage", beschreibung: "", notiz: "", artikelnummer: "", kundenArtikelnummer: "", gtin: "", ursprungsland: "",
  merkmale: [], objekt: "", bestellposition: "", buchungsreferenz: "", menge: 8, einheitText: "Std", einheitCode: "HUR", nettopreis: 65,
  bruttopreis: 0, preisnachlass: 0, basismenge: 0, nachlaesse: [], zuschlaege: [], gesamt: 520, steuerkategorie: "S", steuersatz: 19,
  von: "2026-09-07", bis: "2026-09-07", ...teil,
});

describe("Sonderfälle der Syntax", () => {
  it("nur Steuernummer: als Steuernummer (FC) und als Kennung des Verkäufers (BR-CO-26)", () => {
    const befund = musterBefund({ verkaeufer: { ustId: "", steuernummer: "12/345/67890" } });
    const { fehlt, xml } = zurXml(befund, {}, "Muster-Steuernummer.xml");
    expect(fehlt).toEqual([]);
    expect(xml).toContain('<ram:ID schemeID="FC">12/345/67890</ram:ID>');
    expect(xml).toMatch(/<ram:SellerTradeParty>\s*<ram:ID>12\/345\/67890<\/ram:ID>/);
  });

  it("19 % und 7 % gemischt", () => {
    const befund = musterBefund({ positionen: [pos({}), pos({ posNr: "2", name: "Fachbuch", menge: 1, einheitText: "Stk", einheitCode: "C62", nettopreis: 40, gesamt: 40, steuersatz: 7 })] });
    const { xml } = zurXml(befund, {}, "Muster-19-7.xml");
    expect(element(xml!, "CalculatedAmount")).toEqual(["98.80", "2.80"]);
    expect(element(xml!, "GrandTotalAmount")).toEqual(["661.60"]);
  });

  it("Leitweg-ID ist die Käuferreferenz, die Bestellnummer steht trotzdem in BT-13", () => {
    const befund = musterBefund({ rechnung: { leitwegId: "04011000-1234512345-06", bestellnummer: "Auftrag 4711" } });
    const { xml } = zurXml(befund, {}, "Muster-Leitweg.xml");
    expect(xml).toContain("<ram:BuyerReference>04011000-1234512345-06</ram:BuyerReference>");
    expect(xml).toMatch(/<ram:BuyerOrderReferencedDocument>\s*<ram:IssuerAssignedID>Auftrag 4711<\/ram:IssuerAssignedID>/);
  });

  it("ohne Referenz: Ersatzwert in BT-10", () => {
    const { xml } = zurXml(musterBefund(), {}, "Muster-ohne-Referenz.xml");
    expect(xml).toContain(`<ram:BuyerReference>${XFact.TEXTE.keineKaeuferreferenz}</ram:BuyerReference>`);
  });

  it("Sonderzeichen werden maskiert", () => {
    const befund = musterBefund({ positionen: [pos({ name: "Prüfung <Schaltschrank> & Co" })], kaeufer: { name: "Berg GmbH & Co. KG" } });
    const { xml } = zurXml(befund, {}, "Muster-Sonderzeichen.xml");
    expect(xml).toContain("<ram:Name>Prüfung &lt;Schaltschrank&gt; &amp; Co</ram:Name>");
    expect(xml).toContain("<ram:Name>Berg GmbH &amp; Co. KG</ram:Name>");
  });

  it("Skonto im Format der XRechnung, Frist aus dem Datum; Zeilenumbrüche bleiben erhalten (BR-DE-18)", () => {
    const befund = musterBefund({ rechnung: { faellig: "2026-10-12", skonto: [{ prozent: 2, tage: 0, bis: "2026-09-20", betrag: 0 }, { prozent: 1, tage: 14, bis: "", betrag: 0 }] } });
    const { rechnung, xml } = zurXml(befund, {}, "Muster-Skonto.xml");
    expect(rechnung.skonto.map((k: any) => [k.prozent, k.tage, k.bis])).toEqual([[2, 8, "2026-09-20"], [1, 14, "2026-09-26"]]);
    expect(xml).toContain("<ram:Description>#SKONTO#TAGE=8#PROZENT=2.00#\n#SKONTO#TAGE=14#PROZENT=1.00#\nZahlbar bis 12.10.2026</ram:Description>");
  });

  it("ein eigener Text der Rechnung, der mit # beginnt, wird nicht als Skonto gelesen", () => {
    const befund = musterBefund({ rechnung: { zahlungsbedingungen: "#Rabatt nur bei Barzahlung" } });
    expect(zurXml(befund, {}, "Muster-Raute.xml").xml).toContain("<ram:Description>Nr. Rabatt nur bei Barzahlung</ram:Description>");
  });

  it("Positionsnummern wie auf der Rechnung, auch mit Lücke; doppelte werden durchgezählt", () => {
    const zwei = (a: string, b: string) => musterBefund({ positionen: [pos({ posNr: a }), pos({ posNr: b })] });
    expect(element(zurXml(zwei("2", "4"), {}, "Muster-Positionsnummern.xml").xml!, "LineID")).toEqual(["2", "4"]);
    expect(element(zurXml(zwei("1", "1"), {}, "Muster-Positionsnummern-doppelt.xml").xml!, "LineID")).toEqual(["1", "2"]);
  });

  it("nur eine vorausgegangene Rechnung in CII; weitere als Bemerkung", () => {
    const befund = musterBefund({ rechnung: { art: "877", vorherigeRechnungen: [{ nummer: "AR-1", datum: "2026-07-01" }, { nummer: "AR-2", datum: "2026-08-01" }] } });
    const { xml } = zurXml(befund, {}, "Muster-Schlussrechnung.xml");
    expect(element(xml!, "IssuerAssignedID")).toContain("AR-1");
    expect(element(xml!, "Content")).toEqual([XFact.TEXTE.weitereVorherige("AR-2 (01.08.2026)")]);
  });

  it("leere Werte erzeugen keine leeren Elemente (PEPPOL-R008)", () => {
    expect(XFact.erzeugeXml(XFact.baueRechnung(musterBefund(), {}))).not.toMatch(/<ram:[A-Za-z]+(\s[^>]*)?><\/ram:[A-Za-z]+>/);
  });

  it("Dateiname wie das PDF", () => {
    expect(XFact.xmlDateiname("INV 753 Berg GmbH & Co. KG.pdf")).toBe("INV 753 Berg GmbH & Co. KG.xml");
  });
});
