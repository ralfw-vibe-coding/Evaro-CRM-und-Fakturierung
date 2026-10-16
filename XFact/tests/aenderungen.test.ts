import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beispiel, ladeFachlogik } from "./fachlogik";

/**
 * Was der Nutzer in der Prüfansicht ergänzt oder ändert, geht über
 * "ergaenzungen" in baueRechnung() – und hat immer Vorrang vor dem Erkannten.
 */

const XFact = ladeFachlogik();
const AUSGABE = join(__dirname, "../../.kosit/generated/xfact");
const befund: Record<string, any> = { 753: beispiel("INV753").befund, 742: beispiel("INV742").befund, 747: beispiel("INV747").befund };

const mitEmail = { empfaenger: { email: "rechnung@kunde.example" } };

describe("Ergänzungen haben Vorrang", () => {
  it("ein geänderter Wert ersetzt den erkannten", () => {
    const r = XFact.baueRechnung(befund["753"], { nummer: "RE-753", absender: { kontakt: "Ralf Westphal" } });
    expect(r.nummer).toBe("RE-753");
    expect(r.absender.kontakt).toBe("Ralf Westphal");
    expect(r.absender.name).toBe("Work With Ease EOOD");
  });

  it("ein bewusst geleertes Feld fehlt danach", () => {
    const r = XFact.baueRechnung(befund["753"], { ...mitEmail, iban: null });
    expect(XFact.pruefeRechnung(r).map((f: any) => f.feld)).toEqual(["iban"]);
  });

  it("Anschriftzeilen lassen sich ersetzen", () => {
    const r = XFact.baueRechnung(befund["753"], { empfaenger: { adresse: ["Buchhaltung", "Alte Ziegelei 21"] } });
    expect(r.empfaenger.adresse).toEqual(["Buchhaltung", "Alte Ziegelei 21"]);
  });

  it("geänderte Menge: Rechenkontrolle meldet sich", () => {
    const r = XFact.baueRechnung(befund["753"], { positionen: { 1: { menge: 2 } } });
    expect(r.positionen[0]).toMatchObject({ menge: 2, einzelpreis: 777, gesamt: 777 });
    expect(XFact.hinweiseZurRechnung(r, befund["753"]))
      .toContainEqual(expect.objectContaining({ feld: "position.1.gesamt", stufe: "unsicher" }));
  });

  it("eigene Zuordnung einer Einheit hat Vorrang vor der KI", () => {
    expect(XFact.baueRechnung(befund["753"], {}).positionen[0]).toMatchObject({ einheit: "Pauschale", einheitCode: "LS" });
    const r = XFact.baueRechnung(befund["753"], { einheiten: { pauschale: "C62" } });
    expect(r.positionen[0]).toMatchObject({ einheit: "Pauschale", einheitCode: "C62" });
    expect(XFact.baueRechnung(befund["753"], { positionen: { 1: { einheitCode: "HUR" } } }).positionen[0].einheitCode).toBe("HUR");
  });

  it("Steuerfall wechseln: Kleinunternehmer mit Standardtext", () => {
    const r = XFact.baueRechnung(befund["753"], { steuerfall: "kleinunternehmer" });
    expect(r.steuerfall).toEqual({ art: "kleinunternehmer", kategorie: "E", text: XFact.TEXTE.steuerfallText.kleinunternehmer });
    expect(r.positionen.every((p: any) => p.kategorie === "E" && p.satz === 0)).toBe(true);
  });

  it("Steuerfall bleibt: der Hinweistext von der Rechnung wird übernommen", () => {
    const r = XFact.baueRechnung(befund["753"], {});
    expect(r.steuerfall.text).toBe("Steuerschuldnerschaft des Leistungsempfängers (reverse charge).");
  });
});

describe("Leistungsdatum für Positionen ohne Datum", () => {
  // 742 so, als hätte die KI kein Datum gefunden
  const ohneDatum = () => {
    const b = JSON.parse(JSON.stringify(befund["742"]));
    for (const p of b.positionen) p.von = p.bis = null;
    b.rechnung.leistungVon = b.rechnung.leistungBis = null;
    return b;
  };

  it("ohne Datum fehlt es", () => {
    expect(XFact.pruefeRechnung(XFact.baueRechnung(ohneDatum(), {})).map((f: any) => f.feld))
      .toEqual(expect.arrayContaining(["position.1.datum", "position.2.datum"]));
  });

  it("gilt für alle Positionen ohne eigenes Datum", () => {
    const r = XFact.baueRechnung(ohneDatum(), { leistungsdatum: "2026-07-16" });
    expect(r.positionen.map((p: any) => [p.von, p.bis])).toEqual([["2026-07-16", "2026-07-16"], ["2026-07-16", "2026-07-16"]]);
  });

  it("Positionen mit eigenem Datum bleiben unberührt", () => {
    const r = XFact.baueRechnung(befund["747"], { leistungsdatum: "2026-08-29" });
    expect(r.positionen[0]).toMatchObject({ von: "2026-01-01", bis: "2026-08-25" });
  });

  it("ein einzelnes Positionsdatum lässt sich setzen", () => {
    const r = XFact.baueRechnung(ohneDatum(), { positionen: { 2: { von: "2026-07-16", bis: "2026-07-16" } } });
    expect(r.positionen.map((p: any) => p.von)).toEqual([null, "2026-07-16"]);
  });
});

describe("Käuferreferenz und Leitweg-ID", () => {
  it("ohne Angaben: Ersatzwert", () => {
    expect(XFact.baueRechnung(befund["753"], {}).kaeuferreferenz).toBe(XFact.TEXTE.keineKaeuferreferenz);
  });

  it("nur Referenz: sie ist die Käuferreferenz", () => {
    const r = XFact.baueRechnung(befund["753"], { kaeuferreferenz: "Auftrag 4711" });
    expect([r.kaeuferreferenz, r.bestellreferenz]).toEqual(["Auftrag 4711", null]);
  });

  it("mit Leitweg-ID: die ist die Käuferreferenz, die Referenz wird Bestellnummer – und die XML ist gültig", () => {
    const r = XFact.baueRechnung(befund["742"], {
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
