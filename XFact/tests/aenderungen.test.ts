import { describe, expect, it, beforeAll } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { ladeFachlogik } from "./fachlogik";

/**
 * Was der Nutzer in der Prüfansicht ergänzt oder ändert, geht über
 * "ergaenzungen" in baueRechnung() – und hat immer Vorrang vor dem Erkannten.
 */

const XFact = ladeFachlogik();
const BEISPIELE = join(__dirname, "../../requirements/XRechnungen/Beispiel-PDFs");
const AUSGABE = join(__dirname, "../../.kosit/generated/xfact");

const erkannt: Record<string, any> = {};
beforeAll(async () => {
  for (const [kurz, datei] of [["753", "INV 753 Berg GmbH & Co. KG.pdf"], ["742", "INV 742 Humboldt-Universität zu Berlin.pdf"],
    ["747", "INV 747 ADG Forum Assistenz.pdf"]]) {
    const pdf = await XFact.lesePdf(new Uint8Array(readFileSync(join(BEISPIELE, datei))), pdfjs);
    erkannt[kurz] = XFact.erkenneRechnung(pdf);
  }
});

const mitEmail = { empfaenger: { email: "rechnung@kunde.example" } };

describe("Ergänzungen haben Vorrang", () => {
  it("ein geänderter Wert ersetzt den erkannten", () => {
    const r = XFact.baueRechnung(erkannt["753"], { nummer: "RE-753", absender: { kontakt: "Ralf Westphal" } });
    expect(r.nummer).toBe("RE-753");
    expect(r.absender.kontakt).toBe("Ralf Westphal");
    expect(r.absender.name).toBe("Work With Ease EOOD");
  });

  it("ein bewusst geleertes Feld fehlt danach", () => {
    const r = XFact.baueRechnung(erkannt["753"], { ...mitEmail, iban: null });
    expect(XFact.pruefeRechnung(r).map((f: any) => f.feld)).toEqual(["iban"]);
  });

  it("Anschriftzeilen lassen sich ersetzen", () => {
    const r = XFact.baueRechnung(erkannt["753"], { empfaenger: { adresse: ["Buchhaltung", "Alte Ziegelei 21"] } });
    expect(r.empfaenger.adresse).toEqual(["Buchhaltung", "Alte Ziegelei 21"]);
  });

  it("geänderte Menge: Rechenkontrolle meldet sich", () => {
    const r = XFact.baueRechnung(erkannt["753"], { positionen: { 1: { menge: 2 } } });
    expect(r.positionen[0]).toMatchObject({ menge: 2, einzelpreis: 777, gesamt: 777 });
    expect(XFact.hinweiseZurRechnung(r, erkannt["753"]))
      .toContainEqual(expect.objectContaining({ feld: "position.1.gesamt", stufe: "unsicher" }));
  });

  it("eigene Einheit bekommt einen Code", () => {
    const r = XFact.baueRechnung(erkannt["753"], { positionen: { 1: { einheit: "Fahrt" } }, einheiten: { fahrt: "C62" } });
    expect(r.positionen[0]).toMatchObject({ einheit: "Fahrt", einheitCode: "C62" });
  });

  it("Steuerfall wechseln: Kleinunternehmer mit Standardtext", () => {
    const r = XFact.baueRechnung(erkannt["753"], { steuerfall: "kleinunternehmer" });
    expect(r.steuerfall).toEqual({ art: "kleinunternehmer", kategorie: "E", text: XFact.TEXTE.steuerfallText.kleinunternehmer });
    expect(r.positionen.every((p: any) => p.kategorie === "E" && p.satz === 0)).toBe(true);
  });

  it("Steuerfall bleibt: der Hinweistext von der Rechnung wird übernommen", () => {
    const r = XFact.baueRechnung(erkannt["753"], {});
    expect(r.steuerfall.text).toBe("Steuerschuldnerschaft des Leistungsempfängers (reverse charge).");
  });
});

describe("Leistungsdatum für Positionen ohne Datum", () => {
  it("gilt für alle Positionen ohne eigenes Datum", () => {
    const r = XFact.baueRechnung(erkannt["742"], { leistungsdatum: "2026-07-16" });
    expect(r.positionen.map((p: any) => [p.von, p.bis])).toEqual([["2026-07-16", "2026-07-16"], ["2026-07-16", "2026-07-16"]]);
  });

  it("Positionen mit eigenem Datum bleiben unberührt", () => {
    const r = XFact.baueRechnung(erkannt["747"], { leistungsdatum: "2026-08-29" });
    expect(r.positionen[0]).toMatchObject({ von: "2026-01-01", bis: "2026-08-25" });
  });

  it("ein einzelnes Positionsdatum lässt sich setzen", () => {
    const r = XFact.baueRechnung(erkannt["742"], { positionen: { 2: { von: "2026-07-16", bis: "2026-07-16" } } });
    expect(r.positionen.map((p: any) => p.von)).toEqual([null, "2026-07-16"]);
  });
});

describe("Käuferreferenz und Leitweg-ID", () => {
  it("ohne Angaben: Ersatzwert", () => {
    expect(XFact.baueRechnung(erkannt["753"], {}).kaeuferreferenz).toBe(XFact.TEXTE.keineKaeuferreferenz);
  });

  it("nur Referenz: sie ist die Käuferreferenz", () => {
    const r = XFact.baueRechnung(erkannt["753"], { kaeuferreferenz: "Auftrag 4711" });
    expect([r.kaeuferreferenz, r.bestellreferenz]).toEqual(["Auftrag 4711", null]);
  });

  it("mit Leitweg-ID: die ist die Käuferreferenz, die Referenz wird Bestellnummer – und die XML ist gültig", () => {
    const r = XFact.baueRechnung(erkannt["742"], {
      ...mitEmail, leistungsdatum: "2026-07-16", kaeuferreferenz: "Auftrag 4711", leitwegId: "11-0-22",
    });
    expect([r.kaeuferreferenz, r.bestellreferenz]).toEqual(["11-0-22", "Auftrag 4711"]);
    expect(XFact.pruefeRechnung(r)).toEqual([]);
    const xml = XFact.erzeugeXml(r);
    expect(xml).toContain("<ram:BuyerReference>11-0-22</ram:BuyerReference>");
    expect(xml).toContain("<ram:IssuerAssignedID>Auftrag 4711</ram:IssuerAssignedID>");
    mkdirSync(AUSGABE, { recursive: true });
    writeFileSync(join(AUSGABE, "Muster-Leitweg.xml"), xml);
  });
});
