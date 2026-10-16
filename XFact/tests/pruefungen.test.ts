import { describe, expect, it } from "vitest";
import { ladeFachlogik, musterBefund, musterRechnung } from "./fachlogik";

/** Pflichtangaben (rot), formale Regeln, Nachrechnen und Urteile des Prüfers (gelb). */

const XFact = ladeFachlogik();
const T = XFact.TEXTE;
const hinweise = (r: object, befund: object = {}, { text = "", bestaetigt = new Set<string>(), pruefung = null as any, geaendert = new Set<string>() } = {}) =>
  XFact.hinweiseZurRechnung(musterRechnung(r), musterBefund(befund, text), bestaetigt, pruefung, geaendert);
const gelb = (liste: any[]) => liste.filter((h) => h.stufe === "unsicher").map((h) => `${h.feld}: ${h.text}`);
const rot = (r: object) => XFact.pruefeRechnung(musterRechnung(r)).map((f: any) => f.feld);
const p1 = () => musterRechnung().positionen[0];
const mit = (rolle: "absender" | "empfaenger", teil: object) => ({ [rolle]: { ...musterRechnung()[rolle], ...teil } });

describe("Pflichtangaben", () => {
  it("eine vollständige Rechnung hat keine", () => {
    expect(XFact.pruefeRechnung(musterRechnung())).toEqual([]);
  });

  it("fehlende Angaben sind rot", () => {
    expect(rot({ nummer: null, zahlung: { text: null, verwendungszweck: null, konten: [] } })).toEqual(["nummer", "zahlung.konten.1.iban"]);
  });

  it("Rechnungssteller: Kontakt, Telefon, E-Mail und USt-IdNr. oder Steuernummer (BR-DE-2 … 7, BR-DE-16)", () => {
    expect(rot(mit("absender", { kontakt: null, telefon: null, email: null, ustId: null }))).toEqual(
      ["absender.ustId", "absender.kontakt", "absender.telefon", "absender.email"]);
    expect(rot(mit("absender", { ustId: null, steuernummer: "12/345/67890" }))).toEqual([]);
  });

  it("nur Euro; kein Steuervertreter", () => {
    expect(rot({ waehrung: "USD" })).toEqual(["waehrung"]);
    expect(rot({ steuervertreter: "Tax Rep Ltd." })).toEqual(["steuervertreter"]);
  });

  it("Einheit muss ein Code der XRechnung sein", () => {
    expect(rot({ positionen: [{ ...p1(), einheitCode: "STD" }] })).toEqual(["position.1.einheit"]);
  });

  it("ein Zeitraum, der vor seinem Beginn endet, ist rot (BR-30)", () => {
    const r = musterRechnung({ positionen: [{ ...p1(), von: "2026-05-01", bis: "2025-07-31" }] });
    expect(XFact.pruefeRechnung(r)).toEqual([{ feld: "position.1.datum", text: T.pflicht.zeitraumVerkehrt("1"), kurz: T.pruefer.zeitraumVerkehrt }]);
    expect(XFact.hinweiseZurRechnung(r, musterBefund())).toContainEqual({ feld: "position.1.datum", stufe: "fehlt", text: T.pruefer.zeitraumVerkehrt });
  });

  it("Leistungsdatum: eigenes der Position oder eines für die ganze Rechnung", () => {
    expect(rot({ positionen: [{ ...p1(), von: null, bis: null }], leistungsdatum: null })).toEqual(["position.1.datum"]);
    expect(rot({ positionen: [{ ...p1(), von: null, bis: null }], leistungsdatum: "2026-09-10" })).toEqual([]);
  });

  it("Position außerhalb des Leistungszeitraums der Rechnung (PEPPOL-R110/R111)", () => {
    expect(rot({ leistungsdatum: null, leistungVon: "2026-09-08", leistungBis: "2026-09-30" })).toEqual(["position.1.datum"]);
  });

  it("Nettopreis = Bruttopreis − Preisnachlass (PEPPOL-R046)", () => {
    expect(rot({ positionen: [{ ...p1(), bruttopreis: 60, preisnachlass: 5 }] })).toEqual(["position.1.einzelpreis"]);
    expect(rot({ positionen: [{ ...p1(), bruttopreis: 60, preisnachlass: 10 }] })).toEqual([]);
  });

  it("Lastschrift: Gläubiger-ID, IBAN des Kunden und Mandatsreferenz statt eigener IBAN (BR-DE-30, BR-DE-31, PEPPOL-R061)", () => {
    expect(rot({ zahlungsart: "lastschrift", faellig: null })).toEqual(["absender.glaeubigerId", "empfaenger.iban", "empfaenger.mandatsreferenz"]);
    const r = { zahlungsart: "lastschrift", ...mit("absender", { glaeubigerId: "DE98ZZZ09999999998" }),
      ...mit("empfaenger", { iban: "DE02120300000000202052", mandatsreferenz: "M-1" }) };
    expect(rot(r)).toEqual([]);
    expect(gelb(hinweise(r))).toEqual([`empfaenger.iban: ${T.ibanPruefziffer}`, `absender.glaeubigerId: ${T.pruefer.glaeubigerIdAufbau}`]);
  });

  it("Karte: die letzten 4 Ziffern (BR-DE-24)", () => {
    expect(rot({ zahlungsart: "kreditkarte" })).toEqual(["empfaenger.karte"]);
    expect(rot({ zahlungsart: "debitkarte", ...mit("empfaenger", { karte: "4242" }) })).toEqual([]);
  });

  it("Überweisung: Fälligkeit oder Zahlungsbedingungen (BR-CO-25)", () => {
    expect(rot({ faellig: null })).toEqual(["faellig"]);
    expect(rot({ faellig: null, zahlungsbedingungen: "Zahlbar sofort ohne Abzug." })).toEqual([]);
  });

  it("Skonto: ohne Frist rot, ein anderer Betrag als berechnet gelb", () => {
    expect(XFact.pruefeRechnung(musterRechnung({ skonto: [{ prozent: 2, tage: null, bis: null, betrag: null }] })))
      .toEqual([{ feld: "skonto.1", text: T.pflicht.skontoFrist(2) }]);
    // Gesamtbetrag 119 €, 2 % Skonto ergibt 116,62 €
    expect(gelb(hinweise({ skonto: [{ prozent: 2, tage: 8, bis: "2026-09-20", betrag: 116.5 }] })))
      .toEqual([`skonto.1: ${T.pruefer.skontoBetrag("116,50 €", "116,62 €")}`]);
    expect(gelb(hinweise({ skonto: [{ prozent: 2, tage: 8, bis: "2026-09-20", betrag: 116.62 }] }))).toEqual([]);
  });

  it("Steuer: K, G, L, M lehnt XFact ab; S braucht einen Satz", () => {
    expect(rot({ positionen: [{ ...p1(), kategorie: "K", satz: 0 }] })).toEqual(["position.1.steuer"]);
    expect(rot({ positionen: [{ ...p1(), satz: null }] })).toEqual(["position.1.steuer"]);
  });

  it("Befreiungen brauchen einen Grund (BR-E-10); § 13b die USt-IdNr. des Empfängers (BR-AE-02)", () => {
    const ae = { positionen: [{ ...p1(), kategorie: "AE", satz: 0 }] };
    expect(rot(ae)).toEqual(["empfaenger.ustId"]);
    expect(rot({ ...ae, ...mit("empfaenger", { ustId: "DE196047852" }) })).toEqual([]);
    expect(rot({ positionen: [{ ...p1(), kategorie: "E", satz: 0 }] })).toEqual(["steuerText.E"]);
  });

  it("„nicht steuerbar“ nur allein (BR-O-11)", () => {
    expect(rot({ positionen: [p1(), { ...p1(), nr: 2, posNr: "2", kategorie: "O", satz: 0 }] })).toEqual(["steuer"]);
  });

  it("Nachlass auf die Rechnung braucht eine Steuerkategorie (BR-32)", () => {
    expect(rot({ nachlaesse: [{ betrag: 10, basis: null, prozent: null, grund: "Rabatt", kategorie: null, satz: null }] })).toEqual(["nachlaesse.1.kategorie"]);
  });

  it("Lieferanschrift mit PLZ und Ort (BR-DE-10, BR-DE-11)", () => {
    const lieferung = { name: "Lager", ortKennung: null, strasse: "Hafen 1", zusatz: null, zeile3: null, plz: null, ort: null, region: null, land: "DE" };
    expect(rot({ lieferung })).toEqual(["lieferung.plz", "lieferung.ort"]);
  });
});

describe("formale Regeln", () => {
  it("IBAN-Prüfziffer und Länge", () => {
    expect(XFact.ibanPruefzifferOk("DE89 3704 0044 0532 0130 00")).toBe(true);
    expect(XFact.ibanPruefzifferOk("DE89370400440532013001")).toBe(false);
    expect(XFact.ibanPruefzifferOk("DE8937040044053201300")).toBe(false);
    const konten = [{ iban: "DE89370400440532013001", bic: null, inhaber: null }];
    expect(gelb(hinweise({ zahlung: { ...musterRechnung().zahlung, konten } }))).toContain(`zahlung.konten.1.iban: ${T.ibanPruefziffer}`);
  });

  it("Aufbau der USt-IdNr.", () => {
    expect(XFact.ustIdAufbauOk("DE123456789")).toBe(true);
    expect(XFact.ustIdAufbauOk("DE12345678")).toBe(false);
    expect(XFact.ustIdAufbauOk("ATU12345678")).toBe(true);
    expect(XFact.ustIdAufbauOk("XX123")).toBe(false);
    expect(gelb(hinweise(mit("absender", { ustId: "DE12345678" })))).toContain(`absender.ustId: ${T.pruefer.ustIdAufbau}`);
  });

  it("Aufbau und Prüfziffer der Leitweg-ID", () => {
    expect(XFact.leitwegIdOk("04011000-1234512345-06")).toBe(true);
    expect(XFact.leitwegIdOk("992-90009-96")).toBe(true);
    expect(XFact.leitwegIdOk("04011000-1234512345-07")).toBe(false);
    expect(XFact.leitwegIdOk("Auftrag 4711")).toBe(false);
    expect(gelb(hinweise({ leitwegId: "04011000-1234512345-07" }))).toEqual([`leitwegId: ${T.pruefer.leitwegIdAufbau}`]);
    expect(gelb(hinweise({ leitwegId: "04011000-1234512345-06" }))).toEqual([]);
  });

  it("Aufbau und Prüfziffer der Gläubiger-ID", () => {
    expect(XFact.glaeubigerIdOk("DE98ZZZ09999999999")).toBe(true);
    expect(XFact.glaeubigerIdOk("DE98 ABC 09999999999")).toBe(true);
    expect(XFact.glaeubigerIdOk("DE98ZZZ09999999998")).toBe(false);
    expect(XFact.glaeubigerIdOk("DE98ZZZ0999999999")).toBe(false);
  });

  it("Telefon mit drei Ziffern, E-Mail mit einem @ (BR-DE-27, BR-DE-28)", () => {
    expect(gelb(hinweise(mit("absender", { telefon: "12" })))).toEqual([`absender.telefon: ${T.pruefer.telefon}`]);
    expect(gelb(hinweise(mit("empfaenger", { email: "rechnung(at)berg.example" })))).toEqual([`empfaenger.email: ${T.pruefer.email}`]);
    expect(XFact.emailOk("a.b@c.de")).toBe(true);
  });

  it("Behörde ohne Leitweg-ID: gelb, mit „Stimmt“ erledigt", () => {
    const behoerde = mit("empfaenger", { oeffentlich: true });
    expect(gelb(hinweise(behoerde))).toEqual([`leitwegId: ${T.pruefer.leitwegIdBehoerde}`]);
    expect(gelb(hinweise(behoerde, {}, { bestaetigt: new Set(["leitwegId"]) }))).toEqual([]);
    expect(gelb(hinweise({ ...behoerde, leitwegId: "992-90009-96" }))).toEqual([]);
    expect(XFact.pruefeRechnung(musterRechnung(behoerde))).toEqual([]);
  });

  it("selbst Eingegebenes wird weiter formal geprüft, nur „Stimmt“ hebt das auf", () => {
    const konten = [{ iban: "DE89370400440532013001", bic: null, inhaber: null }];
    const r = { leitwegId: "04011000-1234512345-07", zahlung: { ...musterRechnung().zahlung, konten } };
    const geaendert = new Set(["leitwegId", "zahlung.konten.1.iban"]);
    expect(gelb(hinweise(r, {}, { geaendert }))).toEqual([`zahlung.konten.1.iban: ${T.ibanPruefziffer}`, `leitwegId: ${T.pruefer.leitwegIdAufbau}`]);
    expect(gelb(hinweise(r, {}, { geaendert, bestaetigt: geaendert }))).toEqual([]);
    // Zweifel an der KI entfallen dagegen schon mit der eigenen Eingabe
    const text = "Rechnung 2026-0153 … IBAN DE89 3704 0044 0532 0130 00 … USt-IdNr. DE 123 456 789";
    expect(gelb(hinweise({ nummer: "RE-1" }, {}, { text, geaendert: new Set(["nummer"]) }))).toEqual([]);
  });

  it("Datum gültig, Fälligkeit nicht vor dem Rechnungsdatum", () => {
    expect(XFact.datumGueltig("2026-02-29")).toBe(false);
    expect(XFact.datumGueltig("2028-02-29")).toBe(true);
    expect(gelb(hinweise({ faellig: "2026-09-01" }))).toContain(`faellig: ${T.pruefer.faelligVorDatum}`);
    expect(gelb(hinweise({ datum: "2026-13-01" }))).toContain(`datum: ${T.pruefer.datumUngueltig}`);
  });

  it("Rechnungsnummer, IBAN und Kennungen müssen wörtlich im Text stehen", () => {
    const text = "Rechnung 2026-0153 … IBAN DE89 3704 0044 0532 0130 00 … USt-IdNr. DE 123 456 789 … Bestellung B-1";
    expect(gelb(hinweise({ bestellnummer: "B-1" }, {}, { text }))).toEqual([]);
    expect(gelb(hinweise({ nummer: "2026-0135", bestellnummer: "B-2" }, {}, { text })))
      .toEqual([`nummer: ${T.pruefer.nichtImText}`, `bestellnummer: ${T.pruefer.nichtImText}`]);
  });

  it("Rechnungskorrektur ohne Bezug: gelb (BR-DE-26)", () => {
    expect(gelb(hinweise({ art: "384" }))).toEqual([`art: ${T.pruefer.korrekturOhneBezug}`]);
    expect(gelb(hinweise({ art: "384", vorherigeRechnungen: [{ nummer: "R-1", datum: null }] }))).toEqual([]);
  });

  it("Rechnungssteller außerhalb Deutschlands: gelb, nicht bestätigbar", () => {
    expect(gelb(hinweise(mit("absender", { land: "BG" }), {}, { bestaetigt: new Set(["absender.land"]) })))
      .toEqual([`absender.land: ${T.nichtDeutschland}`]);
  });
});

describe("Nachrechnen", () => {
  it("Menge × Preis, mit Basismenge, Rabatt und Zuschlag (PEPPOL-R120)", () => {
    expect(gelb(hinweise({ positionen: [{ ...p1(), gesamt: 110 }] }))).toEqual([`position.1.gesamt: ${T.mengeMalPreis("100,00 €")}`]);
    const nachlaesse = [{ betrag: 10, basis: null, prozent: null, grund: "Rabatt" }];
    const zuschlaege = [{ betrag: 5, basis: null, prozent: null, grund: "Express" }];
    expect(gelb(hinweise({ positionen: [{ ...p1(), menge: 200, einzelpreis: 50, basismenge: 100, nachlaesse, zuschlaege, gesamt: 95 }] }))).toEqual([]);
  });

  it("Summen gegen die Rechnung", () => {
    expect(hinweise({}, { summen: { positionen: 100, netto: 100, steuer: 19, brutto: 119, zahlbetrag: 119 } }).filter((h: any) => h.feld.startsWith("summe.")))
      .toEqual([{ feld: "summe.brutto", stufe: "ok", text: T.summenWieAufRechnung }]);
    expect(gelb(hinweise({}, { summen: { netto: 100, steuer: 19, brutto: 120, zahlbetrag: 120 } })))
      .toEqual([`summe.brutto: ${T.aufDerRechnung("120,00 €")}`, `summe.zahlbetrag: ${T.aufDerRechnung("120,00 €")}`]);
    expect(gelb(hinweise({}, { steuer: [{ kategorie: "S", satz: 19, basis: 100, betrag: 18, befreiungsgrund: "" }] })))
      .toEqual([`summe.steuer.S19: ${T.aufDerRechnung("18,00 €")}`]);
  });

  it("Summen mit Nachlass, Zuschlag, Anzahlung und Rundung", () => {
    const s = XFact.summenDerRechnung(musterRechnung({
      nachlaesse: [{ betrag: 10, kategorie: "S", satz: 19 }], zuschlaege: [{ betrag: 20, kategorie: "S", satz: 19 }], gezahlt: 50, rundung: 0.01,
    }));
    expect(s).toMatchObject({ positionen: 100, nachlaesse: 10, zuschlaege: 20, netto: 110, steuer: 20.9, brutto: 130.9, zahlbetrag: 80.91 });
  });
});

describe("Sicherheitsnetz: was die KI keinem Feld zuordnen konnte", () => {
  it("steht gelb in der Prüfansicht und lässt sich bestätigen", () => {
    const befund = { nichtZugeordnet: [{ text: "Lieferung frei Haus ab 500 €", bereich: "sonstiges" }] };
    expect(gelb(hinweise({}, befund))).toEqual(["nichtZugeordnet.1: Lieferung frei Haus ab 500 €"]);
    expect(gelb(hinweise({}, befund, { bestaetigt: new Set(["nichtZugeordnet.1"]) }))).toEqual([]);
  });
});

describe("Urteile des Prüfers", () => {
  const pruefung = (antworten: object) => ({
    felder: {
      nummer: { pfad: "nummer", art: "noul" },
      p1_einheit: { pfad: "position.1.einheit", art: "choice", erwartet: "HUR", namen: { HUR: "Stunde", LS: "Pauschale" } },
      p1_steuer: { pfad: "position.1.steuer", art: "choice", erwartet: "S19", namen: { S19: "19 %", AE: "§ 13b (Reverse Charge)" } },
    },
    antworten,
  });

  it("bestätigt: keine Hinweise", () => {
    const p = pruefung({ nummer: { noul: 0.97 }, p1_einheit: { choice: "HUR" }, p1_steuer: { choice: "S19" } });
    expect(gelb(hinweise({}, {}, { pruefung: p }))).toEqual([]);
  });

  it("nicht bestätigt oder andere Wahl: gelb mit Grund", () => {
    const p = pruefung({ nummer: { noul: 0.03 }, p1_einheit: { choice: "LS" }, p1_steuer: { choice: "AE" } });
    expect(gelb(hinweise({}, {}, { pruefung: p }))).toEqual([
      `nummer: ${T.pruefer.nichtBestaetigt}`,
      `position.1.einheit: ${T.pruefer.eher("Pauschale")}`,
      `position.1.steuer: ${T.pruefer.eher("§ 13b (Reverse Charge)")}`,
    ]);
  });

  it("bestätigt der Nutzer den Wert, entfällt der Zweifel; ein geleertes Feld braucht keinen", () => {
    const p = pruefung({ nummer: { noul: 0.03 } });
    expect(gelb(hinweise({}, {}, { pruefung: p, bestaetigt: new Set(["nummer"]) }))).toEqual([]);
    expect(gelb(hinweise({ nummer: null }, {}, { pruefung: p }))).toEqual([]);
  });

  it("war der Prüfer nicht erreichbar, steht das dabei", () => {
    expect(gelb(hinweise({}, {}, { pruefung: { fehler: "offline" } }))).toEqual([`pruefer: ${T.ki.jevNichtMoeglich}`]);
  });
});
