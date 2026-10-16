import { describe, expect, it } from "vitest";
import { ladeFachlogik, musterBefund, musterRechnung } from "./fachlogik";

/** Pflichtangaben (rot), formale Regeln, Nachrechnen und Urteile des Prüfers (gelb). */

const XFact = ladeFachlogik();
const hinweise = (r: object, befund: object = musterBefund(), bestaetigt = new Set<string>(), pruefung: any = null) =>
  XFact.hinweiseZurRechnung(musterRechnung(r), musterBefund(befund), bestaetigt, pruefung);
const gelb = (liste: any[]) => liste.filter((h) => h.stufe === "unsicher").map((h) => `${h.feld}: ${h.text}`);

describe("Pflichtangaben", () => {
  it("eine vollständige Rechnung hat keine", () => {
    expect(XFact.pruefeRechnung(musterRechnung())).toEqual([]);
  });

  it("fehlende Angaben sind rot", () => {
    const fehlt = XFact.pruefeRechnung(musterRechnung({ nummer: null, bank: { iban: null, bic: null } }));
    expect(fehlt.map((f: any) => f.feld)).toEqual(["nummer", "iban"]);
  });

  it("Einheit muss ein Code der XRechnung sein", () => {
    const p = musterRechnung().positionen[0];
    const fehlt = XFact.pruefeRechnung(musterRechnung({ positionen: [{ ...p, einheitCode: "STD" }] }));
    expect(fehlt.map((f: any) => f.feld)).toEqual(["position.1.einheit"]);
  });

  it("ein Zeitraum, der vor seinem Beginn endet, ist rot", () => {
    const p = musterRechnung().positionen[0];
    const fehlt = XFact.pruefeRechnung(musterRechnung({ positionen: [{ ...p, von: "2026-05-01", bis: "2025-07-31" }] }));
    expect(fehlt).toEqual([{ feld: "position.1.datum", text: XFact.TEXTE.pflicht.zeitraumVerkehrt(1), kurz: XFact.TEXTE.pruefer.zeitraumVerkehrt }]);
    // Am Feld steht der eigene Kurztext statt "nicht gefunden"
    const r = musterRechnung({ positionen: [{ ...p, von: "2026-05-01", bis: "2025-07-31" }] });
    expect(XFact.hinweiseZurRechnung(r, musterBefund())).toContainEqual({ feld: "position.1.datum", stufe: "fehlt", text: XFact.TEXTE.pruefer.zeitraumVerkehrt });
  });

  it("Lastschrift: Gläubiger-ID und IBAN des Kunden statt eigener IBAN und Fälligkeit", () => {
    const fehlt = XFact.pruefeRechnung(musterRechnung({ zahlungsart: "lastschrift", faellig: null, bank: { iban: null, bic: null } }));
    expect(fehlt.map((f: any) => f.feld)).toEqual(["absender.glaeubigerId", "empfaenger.iban"]);
    const r = musterRechnung({ zahlungsart: "lastschrift",
      absender: { ...musterRechnung().absender, glaeubigerId: "DE98ZZZ09999999998" },
      empfaenger: { ...musterRechnung().empfaenger, iban: "DE02120300000000202052" } });
    expect(XFact.pruefeRechnung(r)).toEqual([]);
    expect(gelb(hinweise(r))).toEqual([
      `empfaenger.iban: ${XFact.TEXTE.ibanPruefziffer}`, `absender.glaeubigerId: ${XFact.TEXTE.pruefer.glaeubigerIdAufbau}`]);
  });

  it("Kreditkarte: die letzten 4 Ziffern statt eigener IBAN und Fälligkeit", () => {
    const ohne = musterRechnung({ zahlungsart: "kreditkarte", faellig: null, bank: { iban: null, bic: null } });
    expect(XFact.pruefeRechnung(ohne).map((f: any) => f.feld)).toEqual(["empfaenger.karte"]);
    const mit = { ...ohne, empfaenger: { ...ohne.empfaenger, karte: "4242" } };
    expect(XFact.pruefeRechnung(mit)).toEqual([]);
  });

  it("Skonto: ohne Frist rot, ein anderer Betrag als berechnet gelb", () => {
    expect(XFact.pruefeRechnung(musterRechnung({ skonto: [{ prozent: 2, tage: null, bis: null, betrag: null }] })))
      .toEqual([{ feld: "skonto.1", text: XFact.TEXTE.pflicht.skontoFrist(2) }]);
    // Gesamtbetrag 119 €, 2 % Skonto ergibt 116,62 €
    const r = musterRechnung({ skonto: [{ prozent: 2, tage: 8, bis: "2026-09-20", betrag: 116.5 }] });
    expect(gelb(hinweise(r))).toEqual([`skonto.1: ${XFact.TEXTE.pruefer.skontoBetrag("116,50 €", "116,62 €")}`]);
    expect(gelb(hinweise({ skonto: [{ prozent: 2, tage: 8, bis: "2026-09-20", betrag: 116.62 }] }))).toEqual([]);
  });

  it("ein Steuerfall, den XFact nicht kennt, ist rot", () => {
    const fehlt = XFact.pruefeRechnung(musterRechnung({ steuerfall: { art: null, kategorie: null, text: null } }));
    expect(fehlt.map((f: any) => f.feld)).toContain("steuerfall");
  });
});

describe("formale Regeln", () => {
  it("IBAN-Prüfziffer und Länge", () => {
    expect(XFact.ibanPruefzifferOk("DE89 3704 0044 0532 0130 00")).toBe(true);
    expect(XFact.ibanPruefzifferOk("DE89370400440532013001")).toBe(false);
    expect(XFact.ibanPruefzifferOk("DE8937040044053201300")).toBe(false);
    expect(gelb(hinweise({ bank: { iban: "DE89370400440532013001", bic: null } }))).toContain(`iban: ${XFact.TEXTE.ibanPruefziffer}`);
  });

  it("Aufbau der USt-IdNr.", () => {
    expect(XFact.ustIdAufbauOk("DE123456789")).toBe(true);
    expect(XFact.ustIdAufbauOk("DE12345678")).toBe(false);
    expect(XFact.ustIdAufbauOk("ATU12345678")).toBe(true);
    expect(XFact.ustIdAufbauOk("XX123")).toBe(false);
    const r = { absender: { ...musterRechnung().absender, ustId: "DE12345678" } };
    expect(gelb(hinweise(r))).toContain(`absender.ustId: ${XFact.TEXTE.pruefer.ustIdAufbau}`);
  });

  it("Aufbau und Prüfziffer der Leitweg-ID", () => {
    expect(XFact.leitwegIdOk("04011000-1234512345-06")).toBe(true);
    expect(XFact.leitwegIdOk("992-90009-96")).toBe(true);
    expect(XFact.leitwegIdOk("04011000-1234512345-07")).toBe(false);
    expect(XFact.leitwegIdOk("Auftrag 4711")).toBe(false);
    expect(gelb(hinweise({ leitwegId: "04011000-1234512345-07" }))).toEqual([`leitwegId: ${XFact.TEXTE.pruefer.leitwegIdAufbau}`]);
    expect(gelb(hinweise({ leitwegId: "04011000-1234512345-06" }))).toEqual([]);
  });

  it("Aufbau und Prüfziffer der Gläubiger-ID", () => {
    expect(XFact.glaeubigerIdOk("DE98ZZZ09999999999")).toBe(true);
    expect(XFact.glaeubigerIdOk("DE98 ABC 09999999999")).toBe(true);
    expect(XFact.glaeubigerIdOk("DE98ZZZ09999999998")).toBe(false);
    expect(XFact.glaeubigerIdOk("DE98ZZZ0999999999")).toBe(false);
  });

  it("Behörde ohne Leitweg-ID: gelb, mit „Stimmt“ erledigt", () => {
    const behoerde = { empfaenger: { ...musterRechnung().empfaenger, oeffentlich: true } };
    expect(gelb(hinweise(behoerde))).toEqual([`leitwegId: ${XFact.TEXTE.pruefer.leitwegIdBehoerde}`]);
    expect(gelb(hinweise(behoerde, {}, new Set(["leitwegId"])))).toEqual([]);
    expect(gelb(hinweise({ ...behoerde, leitwegId: "992-90009-96" }))).toEqual([]);
    // Keine Behörde: kein Hinweis, die Leitweg-ID ist dann keine Pflicht
    expect(gelb(hinweise({}))).toEqual([]);
    expect(XFact.pruefeRechnung(musterRechnung(behoerde))).toEqual([]);
  });

  it("selbst Eingegebenes wird weiter formal geprüft, nur „Stimmt“ hebt das auf", () => {
    const r = musterRechnung({ leitwegId: "04011000-1234512345-07", bank: { iban: "DE89370400440532013001", bic: null } });
    const geaendert = new Set(["leitwegId", "iban"]);
    expect(gelb(XFact.hinweiseZurRechnung(r, musterBefund(), new Set(), null, geaendert)))
      .toEqual([`iban: ${XFact.TEXTE.ibanPruefziffer}`, `leitwegId: ${XFact.TEXTE.pruefer.leitwegIdAufbau}`]);
    expect(gelb(XFact.hinweiseZurRechnung(r, musterBefund(), new Set(["leitwegId", "iban"]), null, geaendert))).toEqual([]);
    // Zweifel an der KI entfallen dagegen schon mit der eigenen Eingabe
    const text = "Rechnung 2026-0153 … IBAN DE89 3704 0044 0532 0130 00 … USt-IdNr. DE 123 456 789";
    expect(gelb(XFact.hinweiseZurRechnung(musterRechnung({ nummer: "RE-1" }), musterBefund({ text }), new Set(), null, new Set(["nummer"])))).toEqual([]);
  });

  it("Datum gültig, Fälligkeit nicht vor dem Rechnungsdatum", () => {
    expect(XFact.datumGueltig("2026-02-29")).toBe(false);
    expect(XFact.datumGueltig("2028-02-29")).toBe(true);
    expect(gelb(hinweise({ faellig: "2026-09-01" }))).toContain(`faellig: ${XFact.TEXTE.pruefer.faelligVorDatum}`);
    expect(gelb(hinweise({ datum: "2026-13-01" }))).toContain(`datum: ${XFact.TEXTE.pruefer.datumUngueltig}`);
  });

  it("Rechnungsnummer, IBAN und USt-IdNr. müssen wörtlich im Text stehen", () => {
    const text = "Rechnung 2026-0153 … IBAN DE89 3704 0044 0532 0130 00 … USt-IdNr. DE 123 456 789";
    expect(gelb(hinweise({}, { text }))).toEqual([]);
    expect(gelb(hinweise({ nummer: "2026-0135" }, { text }))).toEqual([`nummer: ${XFact.TEXTE.pruefer.nichtImText}`]);
  });

  it("Rechnungssteller außerhalb Deutschlands: gelb, nicht bestätigbar", () => {
    const r = { absender: { ...musterRechnung().absender, land: "BG" } };
    expect(gelb(hinweise(r, {}, new Set(["absender.land"])))).toEqual([`absender.land: ${XFact.TEXTE.nichtDeutschland}`]);
  });
});

describe("Nachrechnen", () => {
  it("Menge × Preis", () => {
    const p = musterRechnung().positionen[0];
    expect(gelb(hinweise({ positionen: [{ ...p, gesamt: 110 }] }))).toEqual([`position.1.gesamt: ${XFact.TEXTE.mengeMalPreis("100,00 €")}`]);
  });

  it("Summen gegen die Rechnung", () => {
    expect(hinweise({}, { summen: { netto: 100, steuer: 19, brutto: 119, zahlbetrag: 119 } }))
      .toEqual([{ feld: "summe.brutto", stufe: "ok", text: XFact.TEXTE.summenWieAufRechnung }]);
    expect(gelb(hinweise({}, { summen: { netto: 100, steuer: 19, brutto: 120, zahlbetrag: 120 } })))
      .toEqual([`summe.brutto: ${XFact.TEXTE.aufDerRechnung("120,00 €")}`]);
    expect(gelb(hinweise({}, { steuer: [{ kategorie: "S", satz: 19, basis: 100, betrag: 18, befreiungsgrund: null }] })))
      .toEqual([`summe.steuer.19: ${XFact.TEXTE.aufDerRechnung("18,00 €")}`]);
  });
});

describe("Urteile des Prüfers", () => {
  const pruefung = (antworten: object) => ({
    felder: {
      nummer: { pfad: "nummer", art: "noul" },
      p1_einheit: { pfad: "position.1.einheit", art: "choice", erwartet: "HUR" },
      steuerfall: { pfad: "steuerfall", art: "choice", erwartet: "S" },
    },
    antworten,
  });

  it("bestätigt: keine Hinweise", () => {
    const p = pruefung({ nummer: { noul: 0.97 }, p1_einheit: { choice: "HUR" }, steuerfall: { choice: "S" } });
    expect(gelb(hinweise({}, {}, new Set(), p))).toEqual([]);
  });

  it("nicht bestätigt oder andere Wahl: gelb mit Grund", () => {
    const p = pruefung({ nummer: { noul: 0.03 }, p1_einheit: { choice: "LS" }, steuerfall: { choice: "AE" } });
    expect(gelb(hinweise({}, {}, new Set(), p))).toEqual([
      `nummer: ${XFact.TEXTE.pruefer.nichtBestaetigt}`,
      `position.1.einheit: ${XFact.TEXTE.pruefer.eher("Pauschale")}`,
      `steuerfall: ${XFact.TEXTE.pruefer.eher(XFact.TEXTE.ansicht.steuerfaelle.reverse_charge)}`,
    ]);
  });

  it("bestätigt der Nutzer den Wert, entfällt der Zweifel", () => {
    const p = pruefung({ nummer: { noul: 0.03 } });
    expect(gelb(hinweise({}, {}, new Set(["nummer"]), p))).toEqual([]);
  });

  it("war der Prüfer nicht erreichbar, steht das dabei", () => {
    expect(gelb(hinweise({}, {}, new Set(), { fehler: "offline" }))).toEqual([`pruefer: ${XFact.TEXTE.ki.jevNichtMoeglich}`]);
  });
});
