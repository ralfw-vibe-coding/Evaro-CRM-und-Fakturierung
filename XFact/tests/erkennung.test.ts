import { describe, expect, it, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { ladeFachlogik, pdfAus as pdfAusZeilen } from "./fachlogik";

/**
 * Erkennung der Kopfdaten: Rechnungsnummer, Datum, Fälligkeit, Summen, IBAN, BIC, USt-IdNr.
 *
 * Die Beispiel-PDFs werden mit derselben Lesefunktion gelesen wie im Browser;
 * nur pdf.js kommt hier aus node_modules statt aus der eingebetteten Kopie.
 */

const XFact = ladeFachlogik();
const BEISPIELE = join(__dirname, "../../requirements/XRechnungen/Beispiel-PDFs");

async function lies(datei: string) {
  const daten = new Uint8Array(readFileSync(join(BEISPIELE, datei)));
  return XFact.lesePdf(daten, pdfjs);
}

const pdfAus = (...zeilen: (string | [number, string][])[]) => pdfAusZeilen(XFact, ...zeilen);

const werte = (kopf: any) => ({
  rechnungsnummer: kopf.rechnungsnummer?.wert,
  rechnungsdatum: kopf.rechnungsdatum?.wert,
  faellig: kopf.faellig?.wert,
  netto: kopf.netto?.wert,
  umsatzsteuer: kopf.umsatzsteuer.map((s: any) => [s.satz, s.betrag]),
  gesamt: kopf.gesamt?.wert,
  iban: kopf.iban?.wert,
  bic: kopf.bic?.wert,
  ustIds: kopf.ustIds.map((u: any) => u.wert),
});

describe("Beispielrechnungen", () => {
  const gemeinsam = {
    umsatzsteuer: [[0, 0]],
    iban: "LT163250046848710872",
    bic: "REVOLT21",
  };
  const soll: Record<string, object> = {
    "INV 737 InfraServ GmbH & Co. Wiesbaden KG.pdf": {
      rechnungsnummer: "0000000737", rechnungsdatum: "2026-07-02", faellig: "2026-07-11",
      netto: 1000, gesamt: 1000, ustIds: ["DE812134836", "BG205889057"],
    },
    "INV 742 Humboldt-Universität zu Berlin.pdf": {
      rechnungsnummer: "0000000742", rechnungsdatum: "2026-07-17", faellig: "2026-07-31",
      netto: 1800, gesamt: 1800, ustIds: ["DE137176824", "BG205889057"],
    },
    "INV 745 GLS ImmoWert GmbH.pdf": {
      rechnungsnummer: "0000000745", rechnungsdatum: "2026-07-31", faellig: "2026-08-10",
      netto: 400, gesamt: 400, ustIds: ["DE133510945", "BG205889057"],
    },
    "INV 747 ADG Forum Assistenz.pdf": {
      rechnungsnummer: "0000000747", rechnungsdatum: "2026-08-29", faellig: "2026-09-10",
      netto: 16648, gesamt: 16648, ustIds: ["BG205889057", "DE149338636"],
    },
    "INV 753 Berg GmbH & Co. KG.pdf": {
      rechnungsnummer: "0000000753", rechnungsdatum: "2026-09-12", faellig: "2026-09-21",
      netto: 777, gesamt: 777, ustIds: ["BG205889057", "DE196047852"],
    },
  };

  for (const [datei, erwartet] of Object.entries(soll)) {
    it(datei, async () => {
      const kopf = XFact.erkenneKopfdaten(await lies(datei));
      expect(werte(kopf)).toEqual({ ...gemeinsam, ...erwartet });

      // Das Datum steht ohne Beschriftung neben der Rechnungsnummer: gelb
      expect(kopf.rechnungsdatum.unsicher).toBeTruthy();
      const hinweise = XFact.pruefeKopfdaten(kopf);
      expect(hinweise.filter((h: any) => h.stufe === "fehlt")).toEqual([]);
      expect(hinweise).toContainEqual({ feld: "gesamt", stufe: "ok", text: "Summen stimmen" });
    });
  }
});

describe("typische deutsche Rechnung mit 19 % und 7 %", () => {
  const kopf = () => XFact.erkenneKopfdaten(pdfAus(
    "Muster Handwerk GmbH · Hauptstr. 1 · 20095 Hamburg",
    "Rechnungsnummer: RE-2026-0153",
    "Rechnungsdatum: 12.09.26",
    "Leistungsdatum: 07.09.2026",
    "Nettobetrag 600,00 €",
    "zzgl. 19 % USt 95,00 €",
    "zzgl. 7 % USt 7,00 €",
    "Gesamtbetrag inkl. USt 702,00 €",
    "Zahlbar bis 26.09.2026 ohne Abzug.",
    "IBAN DE89 3704 0044 0532 0130 00 · BIC COBADEFFXXX",
    "USt-IdNr.: DE 123 456 789 · Steuernummer 12/345/67890",
  ));

  it("erkennt alle Kopfdaten", () => {
    expect(werte(kopf())).toEqual({
      rechnungsnummer: "RE-2026-0153",
      rechnungsdatum: "2026-09-12",
      faellig: "2026-09-26",
      netto: 600,
      umsatzsteuer: [[19, 95], [7, 7]],
      gesamt: 702,
      iban: "DE89370400440532013000",
      bic: "COBADEFFXXX",
      ustIds: ["DE123456789"],
    });
  });

  it("Rechnungsdatum mit Beschriftung ist sicher, Summen stimmen", () => {
    const k = kopf();
    expect(k.rechnungsdatum.unsicher).toBeUndefined();
    expect(XFact.pruefeKopfdaten(k)).toEqual([{ feld: "gesamt", stufe: "ok", text: "Summen stimmen" }]);
  });
});

describe("Werte im Tabellenkopf: Beschriftung oben, Wert darunter", () => {
  it("liest Nummer und Datum aus der Zeile darunter", () => {
    const kopf = XFact.erkenneKopfdaten(pdfAus(
      [[300, "Rechnungsnr."], [400, "Datum"], [480, "Kunden-Nr."]],
      [[300, "2026-0153"], [400, "12.09.2026"], [480, "10023"]],
    ));
    expect(kopf.rechnungsnummer.wert).toBe("2026-0153");
    expect(kopf.rechnungsdatum.wert).toBe("2026-09-12");
  });
});

describe("Prüfungen", () => {
  const basis = (aenderung: object = {}) => ({
    rechnungsnummer: { wert: "1" }, rechnungsdatum: { wert: "2026-09-12" }, faellig: null,
    netto: { wert: 100 }, umsatzsteuer: [{ satz: 19, betrag: 19 }], gesamt: { wert: 119 },
    iban: { wert: "DE89370400440532013000" }, bic: null, ustIds: [], ...aenderung,
  });

  it("meldet fehlende Pflichtangaben rot", () => {
    const hinweise = XFact.pruefeKopfdaten(basis({ iban: null, rechnungsnummer: null }));
    expect(hinweise.filter((h: any) => h.stufe === "fehlt").map((h: any) => h.feld))
      .toEqual(["rechnungsnummer", "iban"]);
  });

  it("meldet eine Differenz in den Summen gelb", () => {
    const hinweise = XFact.pruefeKopfdaten(basis({ gesamt: { wert: 120 } }));
    expect(hinweise).toContainEqual(expect.objectContaining({ feld: "gesamt", stufe: "unsicher" }));
  });

  it("meldet einen Steuerbetrag, der nicht zum Satz passt", () => {
    const hinweise = XFact.pruefeKopfdaten(basis({ umsatzsteuer: [{ satz: 19, betrag: 18 }], gesamt: { wert: 118 } }));
    expect(hinweise).toContainEqual(expect.objectContaining({ feld: "umsatzsteuer", stufe: "unsicher" }));
  });

  it("erkennt eine IBAN mit falscher Prüfziffer als unsicher", () => {
    const kopf = XFact.erkenneKopfdaten(pdfAus("IBAN: DE89 3704 0044 0532 0130 01"));
    expect(kopf.iban.unsicher).toBeTruthy();
  });
});

describe("Zahlen und Daten in deutscher Schreibweise", () => {
  it("Beträge", () => {
    expect(XFact.betraege("1.080,50 € und 324,00 und -12,00").map((b: any) => b.wert)).toEqual([1080.5, 324, -12]);
    expect(XFact.betraege("Menge 1.080 km").map((b: any) => b.wert)).toEqual([]);
  });

  it("Datumsangaben", () => {
    expect(XFact.datumsangaben("7.9.2026, 07.09.26, 31.02.2026").map((d: any) => d.wert))
      .toEqual(["2026-09-07", "2026-09-07"]);
  });

  it("IBAN-Prüfziffer", () => {
    expect(XFact.ibanPruefzifferOk("DE89370400440532013000")).toBe(true);
    expect(XFact.ibanPruefzifferOk("DE89370400440532013001")).toBe(false);
  });
});
