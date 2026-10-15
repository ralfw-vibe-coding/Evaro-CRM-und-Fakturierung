import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { ladeFachlogik, pdfAus as pdfAusZeilen } from "./fachlogik";

/** Erkennung der Positionen (Tabelle mit Leistungen und Beträgen). */

const XFact = ladeFachlogik();
const BEISPIELE = join(__dirname, "../../requirements/XRechnungen/Beispiel-PDFs");
const pdfAus = (...zeilen: (string | [number, string][])[]) => pdfAusZeilen(XFact, ...zeilen);

/** Position kompakt: [von, bis, name, beschreibung, menge, einheit, preis, gesamt] */
const kurz = (p: any) => [p.datumVon, p.datumBis, p.name, p.beschreibung, p.menge, p.einheit, p.einzelpreis, p.gesamt];

describe("Beispielrechnungen", () => {
  const soll: Record<string, unknown[][]> = {
    "INV 737 InfraServ GmbH & Co. Wiesbaden KG.pdf": [
      [null, null, "Online Meeting", "Digitale Ablage optimieren", 4, "Std", 250, 1000],
    ],
    "INV 742 Humboldt-Universität zu Berlin.pdf": [
      [null, null, "Online Seminar", "2.7. & 16.7.26: EI001 ChatGPT & Co: Ein Einstieg in die KI-Nutzung im Office", 6, "Std", 150, 900],
      [null, null, "Online Seminar", "2.7. & 16.7.26: EI002 Prompting like a Pro - Ein KI-Aufbaukurs", 6, "Std", 150, 900],
    ],
    "INV 745 GLS ImmoWert GmbH.pdf": [
      ["2026-07-29", "2026-07-29", "Online Meeting", "Beratungsgespräch M365 optimaler einbinden", 2, "Std", 200, 400],
    ],
    "INV 747 ADG Forum Assistenz.pdf": [
      ["2026-01-01", "2026-08-25", "Konzeption und Vorbereitung", "", 3, "Tage", 2000, 6000],
      ["2026-08-26", "2026-08-28", "ERFA M365, 2 Tage Moderation", "", 3, "Tage", 2000, 6000],
      ["2026-08-26", "2026-08-26", "Ralf Westphal: ERFA Künstliche Intelligenz", "", 1, "Tage", 2000, 2000],
      ["2026-08-27", "2026-08-27", "Ralf Westphal: Deep Dive KI", "", 1, "Pauschale", 1500, 1500],
      // Das Datum steht hier in der Zeile unter dem Betrag
      ["2026-08-27", "2026-08-28", "Ralf Westphal: 2 Tage Technische Unterstützung", "(Musik, Speaker, Präsentationen)", 1, "Pauschale", 500, 500],
      ["2026-08-26", "2026-08-28", "Reisekosten A.Kaden", "", 1080, "km", 0.3, 324],
      ["2026-08-26", "2026-08-28", "Reisekosten", "", 1080, "km", 0.3, 324],
    ],
    "INV 753 Berg GmbH & Co. KG.pdf": [
      ["2026-09-07", "2026-09-07", "Seminar vor Ort Walz",
        "Inventarisierung der Prozesse im Büro, Inventarisierung digitaler Tools, Anleitung zu Prozessoptimierung und Einsatz von KI.",
        1, "Pauschale", 777, 777],
    ],
  };

  for (const [datei, erwartet] of Object.entries(soll)) {
    it(datei, async () => {
      const pdf = await XFact.lesePdf(new Uint8Array(readFileSync(join(BEISPIELE, datei))), pdfjs);
      const positionen = XFact.erkennePositionen(pdf);
      expect(positionen.map(kurz)).toEqual(erwartet);

      const hinweise = XFact.pruefePositionen(positionen, XFact.erkenneKopfdaten(pdf));
      expect(hinweise).toContainEqual({ feld: "positionen", stufe: "ok", text: XFact.TEXTE.positionenGleichNetto });
      // Ohne Positionsdatum ist das Leistungsdatum rot
      const ohneDatum = positionen.filter((p: any) => !p.datumVon).map((p: any) => `position.${p.nr}`);
      expect(hinweise.filter((h: any) => h.stufe === "fehlt").map((h: any) => h.feld)).toEqual(ohneDatum);
    });
  }
});

describe("Tabelle mit Pos.-Nummer, USt-Spalte und Silbentrennung", () => {
  const pdf = () => pdfAus(
    [[40, "Pos."], [70, "Bezeichnung"], [300, "Menge"], [340, "Einheit"], [390, "Einzelpreis"], [460, "USt"], [500, "Gesamt"]],
    [[40, "1"], [70, "Montage Küche"], [315, "8"], [340, "Std"], [405, "65,00 €"], [460, "19 %"], [490, "520,00 €"]],
    [[70, "inkl. Anfahrt und Ent-"]],
    [[70, "sorgung"]],
    [[40, "2"], [70, "Fachbuch Küchenplanung"], [315, "1"], [340, "Stk"], [405, "40,00 €"], [460, "7 %"], [495, "40,00 €"]],
    "",
    [[300, "Nettobetrag"], [490, "560,00 €"]],
  );

  it("erkennt beide Positionen mit Steuersatz", () => {
    const positionen = XFact.erkennePositionen(pdf());
    expect(positionen.map((p: any) => [...kurz(p), p.steuersatz])).toEqual([
      [null, null, "Montage Küche", "inkl. Anfahrt und Entsorgung", 8, "Std", 65, 520, 19],
      [null, null, "Fachbuch Küchenplanung", "", 1, "Stk", 40, 40, 7],
    ]);
  });

  it("Summe der Positionen = Netto, aber kein Leistungsdatum", () => {
    const p = pdf();
    const hinweise = XFact.pruefePositionen(XFact.erkennePositionen(p), XFact.erkenneKopfdaten(p));
    expect(hinweise.map((h: any) => `${h.feld}:${h.stufe}`)).toEqual(["position.1:fehlt", "position.2:fehlt", "positionen:ok"]);
  });
});

describe("Tabelle ohne Einheiten-Spalte, mit Pauschale ohne Menge", () => {
  const pdf = () => pdfAus(
    [[20, "Datum"], [70, "Leistung"], [300, "Menge"], [390, "Preis"], [500, "Betrag"]],
    [[20, "07.09.2026"], [70, "Beratung"], [300, "2,5 Std."], [400, "80,00"], [495, "200,00"]],
    [[20, "01.09.-05.09.2026"], [70, "Pauschale Projektleitung"], [495, "150,00"]],
  );

  it("liest die Einheit aus der Mengenspalte und nimmt Menge 1 an", () => {
    const positionen = XFact.erkennePositionen(pdf());
    expect(positionen.map(kurz)).toEqual([
      ["2026-09-07", "2026-09-07", "Beratung", "", 2.5, "Std.", 80, 200],
      ["2026-09-01", "2026-09-05", "Pauschale Projektleitung", "", 1, null, 150, 150],
    ]);
    const hinweise = XFact.pruefePositionen(positionen, { netto: null });
    expect(hinweise).toEqual([{ feld: "position.2", stufe: "unsicher", text: XFact.TEXTE.mengeAngenommen }]);
  });
});

describe("Prüfungen der Positionen", () => {
  const position = (aenderung: object = {}) => ({
    nr: 1, datumVon: "2026-09-07", datumBis: "2026-09-07", name: "X", beschreibung: "",
    menge: 2, einheit: "Std", einzelpreis: 50, gesamt: 100, ...aenderung,
  });

  it("ohne Positionen: rot", () => {
    expect(XFact.pruefePositionen([], { netto: null }))
      .toEqual([{ feld: "positionen", stufe: "fehlt", text: XFact.TEXTE.keinePositionen }]);
  });

  it("Menge × Preis passt nicht zum Gesamt: gelb", () => {
    expect(XFact.pruefePositionen([position({ gesamt: 110 })], { netto: null }))
      .toContainEqual(expect.objectContaining({ feld: "position.1", stufe: "unsicher" }));
  });

  it("Summe weicht vom Netto ab: gelb", () => {
    expect(XFact.pruefePositionen([position()], { netto: { wert: 120 } }))
      .toContainEqual(expect.objectContaining({ feld: "positionen", stufe: "unsicher" }));
  });
});

describe("Leistungszeitraum aus Text", () => {
  it.each([
    ["7.9.2026", "2026-09-07", "2026-09-07"],
    ["26.-28.08.26", "2026-08-26", "2026-08-28"],
    ["01.01.-25.08.26", "2026-01-01", "2026-08-25"],
    ["01.09.2026 - 15.09.2026", "2026-09-01", "2026-09-15"],
    ["", null, null],
  ])("%s", (text, von, bis) => {
    expect(XFact.leistungszeitraum(text)).toEqual({ von, bis });
  });
});
