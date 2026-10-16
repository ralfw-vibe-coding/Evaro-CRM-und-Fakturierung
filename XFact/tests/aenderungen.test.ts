import { describe, expect, it } from "vitest";
import { beispiel, ladeFachlogik } from "./fachlogik";

/**
 * Was der Nutzer in der Prüfansicht ergänzt oder ändert, geht über
 * "ergaenzungen" in baueRechnung() – und hat immer Vorrang vor dem Erkannten.
 * Ergänzungen haben die Form der Rechnung; Listen werden als Ganzes ersetzt,
 * Positionen nach ihrer Nummer.
 */

const XFact = ladeFachlogik();
const befund: Record<string, any> = { 753: beispiel("INV753").befund, 742: beispiel("INV742").befund, 747: beispiel("INV747").befund };

const mitEmail = { empfaenger: { email: "rechnung@kunde.example" } };
const felder = (r: any) => XFact.pruefeRechnung(r).map((f: any) => f.feld);

describe("Ergänzungen haben Vorrang", () => {
  it("ein geänderter Wert ersetzt den erkannten, der Rest bleibt", () => {
    const r = XFact.baueRechnung(befund["753"], { nummer: "RE-753", absender: { kontakt: "Ralf Westphal" } });
    expect(r.nummer).toBe("RE-753");
    expect(r.absender.kontakt).toBe("Ralf Westphal");
    expect(r.absender.name).toBe("Work With Ease EOOD");
  });

  it("ein bewusst geleertes Feld fehlt danach", () => {
    const r = XFact.baueRechnung(befund["753"], { ...mitEmail, zahlung: { konten: [] } });
    expect(felder(r)).toEqual(["zahlung.konten.1.iban"]);
  });

  it("Anschrift Feld für Feld", () => {
    const r = XFact.baueRechnung(befund["753"], { empfaenger: { zusatz: "Buchhaltung" } });
    expect([r.empfaenger.strasse, r.empfaenger.zusatz]).toEqual(["Alte Ziegelei 21", "Buchhaltung"]);
  });

  it("geänderte Menge: Rechenkontrolle meldet sich", () => {
    const r = XFact.baueRechnung(befund["753"], { positionen: { 1: { menge: 2 } } });
    expect(r.positionen[0]).toMatchObject({ menge: 2, einzelpreis: 777, gesamt: 777 });
    expect(XFact.hinweiseZurRechnung(r, befund["753"])).toContainEqual(expect.objectContaining({ feld: "position.1.gesamt", stufe: "unsicher" }));
  });

  it("eigene Zuordnung einer Einheit hat Vorrang vor der KI", () => {
    expect(XFact.baueRechnung(befund["753"], {}).positionen[0]).toMatchObject({ einheit: "Pauschale", einheitCode: "LS" });
    const r = XFact.baueRechnung(befund["753"], { einheiten: { pauschale: "C62" } });
    expect(r.positionen[0]).toMatchObject({ einheit: "Pauschale", einheitCode: "C62" });
    expect(XFact.baueRechnung(befund["753"], { positionen: { 1: { einheitCode: "HUR" } } }).positionen[0].einheitCode).toBe("HUR");
  });

  it("Steuer für alle Positionen: Kleinunternehmer braucht dann den Hinweis nach § 19", () => {
    const vorher = XFact.baueRechnung(befund["753"], mitEmail);
    const e = { ...mitEmail, ...XFact.steuerFuerAlle(vorher, "E") };
    const r = XFact.baueRechnung(befund["753"], e);
    expect(r.positionen.every((p: any) => p.kategorie === "E" && p.satz === 0)).toBe(true);
    expect(felder(r)).toEqual(["steuerText.E"]);
    expect(felder(XFact.baueRechnung(befund["753"], { ...e, steuerTexte: { E: XFact.TEXTE.steuerText.kleinunternehmer } }))).toEqual([]);
  });

  it("Steuer für alle gilt auch für Nachlässe und Zuschläge auf die Rechnung", () => {
    const nachlaesse = [{ betrag: 77, basis: null, prozent: null, grund: "Kulanz", kategorie: "AE", satz: 0 }];
    const vorher = XFact.baueRechnung(befund["753"], { ...mitEmail, nachlaesse });
    const r = XFact.baueRechnung(befund["753"], { ...mitEmail, nachlaesse, ...XFact.steuerFuerAlle(vorher, "S19") });
    expect(XFact.summenDerRechnung(r).gruppen).toEqual([{ kategorie: "S", satz: 19, basis: 700, betrag: 133, grund: null }]);
  });

  it("Steuer einer Position: 19 % statt § 13b", () => {
    const r = XFact.baueRechnung(befund["747"], { ...mitEmail, positionen: { 2: { kategorie: "S", satz: 19 } } });
    expect(r.positionen.map((p: any) => XFact.steuerSchluessel(p))).toEqual(["AE", "S19", "AE", "AE", "AE", "AE", "AE"]);
    expect(XFact.summenDerRechnung(r).gruppen.map((g: any) => g.kategorie)).toEqual(["AE", "S"]);
  });

  it("der Hinweis zur Steuerbefreiung von der Rechnung wird übernommen", () => {
    expect(XFact.baueRechnung(befund["753"], {}).steuerTexte.AE).toMatch(/Steuerschuldnerschaft des Leistungsempfängers/);
  });

  it("Listen wie Nachlässe werden als Ganzes ersetzt", () => {
    const nachlaesse = [{ betrag: 77, basis: null, prozent: null, grund: "Kulanz", kategorie: "AE", satz: 0 }];
    const r = XFact.baueRechnung(befund["753"], { ...mitEmail, nachlaesse });
    expect(XFact.summenDerRechnung(r)).toMatchObject({ positionen: 777, nachlaesse: 77, netto: 700, zahlbetrag: 700 });
    expect(felder(r)).toEqual([]);
  });
});

describe("Leistungsdatum", () => {
  // 742 so, als hätte die KI kein Datum gefunden
  const ohneDatum = () => {
    const b = JSON.parse(JSON.stringify(befund["742"]));
    for (const p of b.positionen) p.von = p.bis = null;
    b.rechnung.leistungVon = b.rechnung.leistungBis = b.rechnung.leistungsdatum = null;
    return b;
  };

  it("ohne Datum fehlt es bei jeder Position", () => {
    expect(felder(XFact.baueRechnung(ohneDatum(), {}))).toEqual(expect.arrayContaining(["position.1.datum", "position.2.datum"]));
  });

  it("ein Datum für die ganze Rechnung genügt (BT-72)", () => {
    const r = XFact.baueRechnung(ohneDatum(), { ...mitEmail, leistungsdatum: "2026-07-16" });
    expect(felder(r)).toEqual([]);
    expect(XFact.erzeugeXml(r)).toMatch(/<ram:ActualDeliverySupplyChainEvent>\s*<ram:OccurrenceDateTime>\s*<udt:DateTimeString format="102">20260716/);
  });

  it("ohne Datum für die ganze Rechnung: aus den Positionen, ein Tag oder der Zeitraum", () => {
    const b = ohneDatum();
    b.positionen[0].von = b.positionen[0].bis = "2026-07-02";
    b.positionen[1].von = b.positionen[1].bis = "2026-07-16";
    expect(XFact.baueRechnung(b, {})).toMatchObject({ leistungsdatum: null, leistungVon: "2026-07-02", leistungBis: "2026-07-16" });
    b.positionen[1].von = b.positionen[1].bis = "2026-07-02";
    expect(XFact.baueRechnung(b, {})).toMatchObject({ leistungsdatum: "2026-07-02", leistungVon: null });
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

  it("Referenz des Kunden, sonst seine Bestellnummer", () => {
    expect(XFact.baueRechnung(befund["753"], { referenz: "Hr. Berg" }).kaeuferreferenz).toBe("Hr. Berg");
    expect(XFact.baueRechnung(befund["753"], { bestellnummer: "B-4711" }).kaeuferreferenz).toBe("B-4711");
  });

  it("mit Leitweg-ID: die ist die Käuferreferenz; eine gleichlautende Referenz entfällt", () => {
    const r = XFact.baueRechnung(befund["742"], { ...mitEmail, leitwegId: "04011000-1234512345-06", referenz: "04011000-1234512345-06", bestellnummer: "B-4711" });
    expect([r.kaeuferreferenz, r.referenz, r.bestellnummer]).toEqual(["04011000-1234512345-06", null, "B-4711"]);
    expect(felder(r)).toEqual([]);
  });
});
