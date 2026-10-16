import { describe, expect, it } from "vitest";
import { ladeFachlogik, musterAntwort, musterRechnung } from "./fachlogik";

/**
 * Anbindung der KI und des Prüfers Jev – ohne Netz: Statt fetch bekommen die
 * Funktionen eine Fassung, die die Anfrage festhält und eine Antwort liefert.
 */

const XFact = ladeFachlogik();
const einstellungen = { endpunkt: "https://openrouter.ai/api/v1", modell: "google/gemini-3.8-flash", schluessel: "sk-test", jev: true };

/** Ein fetch, das die Anfrage merkt und mit "antwort" (oder einem Status) antwortet. */
function holenMit(antwort: unknown, status = 200) {
  const anfragen: { adresse: string; optionen: any; inhalt: any }[] = [];
  const holen = async (adresse: string, optionen: any) => {
    anfragen.push({ adresse, optionen, inhalt: JSON.parse(optionen.body) });
    return { ok: status < 400, status, json: async () => antwort };
  };
  return { holen, anfragen };
}

const kiAntwort = (daten: unknown) => ({ choices: [{ message: { content: JSON.stringify(daten) } }] });

/** Eine KI-Antwort im Format des Schemas, mit Leerzeichen und Kleinschreibung, wie sie vorkommen */
const roh = musterAntwort({
  rechnung: { nummer: " RE-1 " },
  verkaeufer: { land: "de", ustId: "DE 123 456 789" },
  kaeufer: { zusatz: "Buchhaltung", oeffentlich: true },
  zahlung: { konten: [{ iban: "DE89 3704 0044 0532 0130 00", bic: "COBA DEFF XXX", inhaber: "" }, { iban: "", bic: "", inhaber: "" }] },
  fehlt: [{ feld: "BT-49", grund: "keine E-Mail des Käufers" }],
});
const mitPosition = (teil: object) => ({ ...roh, positionen: [{ ...roh.positionen[0], ...teil }] });

describe("KI fragen", () => {
  it("schickt Anweisung, Text und Schema an den eingestellten Endpunkt", async () => {
    const { holen, anfragen } = holenMit(kiAntwort(roh));
    await XFact.frageKi("Rechnungstext", einstellungen, holen);
    const [{ adresse, optionen, inhalt }] = anfragen;
    expect(adresse).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(optionen.headers.Authorization).toBe("Bearer sk-test");
    expect(inhalt.model).toBe("google/gemini-3.8-flash");
    expect(inhalt.messages).toEqual([{ role: "system", content: XFact.KI_ANWEISUNG }, { role: "user", content: "Rechnungstext" }]);
    expect(inhalt.response_format.json_schema.schema).toEqual(XFact.KI_SCHEMA);
  });

  it("ohne Schlüssel (lokale KI) keine Anmeldung", async () => {
    const { holen, anfragen } = holenMit(kiAntwort(roh));
    await XFact.frageKi("x", { endpunkt: "http://localhost:1234/v1/", modell: "lokal", schluessel: "" }, holen);
    expect(anfragen[0].adresse).toBe("http://localhost:1234/v1/chat/completions");
    expect(anfragen[0].optionen.headers.Authorization).toBeUndefined();
  });

  it("bringt die Antwort in die feste Form (Befund)", async () => {
    const { holen } = holenMit(kiAntwort(roh));
    const befund = await XFact.frageKi("Rechnungstext", einstellungen, holen);
    expect(befund.text).toBe("Rechnungstext");
    expect(befund.rechnung.nummer).toBe("RE-1");
    expect(befund.rechnung.bestellnummer).toBeNull();
    expect(befund.verkaeufer).toMatchObject({ ustId: "DE123456789", land: "DE", steuernummer: null });
    expect(befund.kaeufer.oeffentlich).toBe(true);
    expect(befund.zahlung.art).toBe("ueberweisung");
    // Konten ohne IBAN entfallen, IBAN und BIC ohne Leerzeichen
    expect(befund.zahlung.konten).toEqual([{ iban: "DE89370400440532013000", bic: "COBADEFFXXX", inhaber: null }]);
    expect(befund.positionen[0]).toMatchObject({ nr: 1, menge: 2, einheitCode: "HUR", gesamt: 100 });
  });

  it("jedes Feld des Schemas kommt im Befund an, auch wenn die KI es weglässt", () => {
    const befund = XFact.befundAusKi({}, "x");
    expect(Object.keys(befund)).toEqual(["text", ...Object.keys(XFact.KI_SCHEMA.properties)]);
    expect(befund.rechnung.skonto).toEqual([]);
    expect(befund.lieferung.name).toBeNull();
  });

  it("Lastschrift: Gläubiger-ID ohne Leerzeichen, eine maskierte IBAN des Kunden zählt nicht", () => {
    const zahlung = { ...roh.zahlung, art: "lastschrift", glaeubigerId: "DE98 ZZZ 0999 9999 999", mandatsreferenz: "M-4711", kundenIban: "DE12 **** **** 3456" };
    const befund = XFact.befundAusKi({ ...roh, zahlung }, "x");
    expect(befund.zahlung).toMatchObject({ art: "lastschrift", glaeubigerId: "DE98ZZZ09999999999", mandatsreferenz: "M-4711", kundenIban: null });
  });

  it("Karte: von der Kartennummer bleiben nur die letzten 4 Ziffern", () => {
    const zahlung = { ...roh.zahlung, art: "kreditkarte", karte: "4111 1111 1111 4242" };
    expect(XFact.befundAusKi({ ...roh, zahlung }, "x").zahlung).toMatchObject({ art: "kreditkarte", karte: "4242" });
    expect(XFact.befundAusKi({ ...roh, zahlung: { ...zahlung, karte: "" } }, "x").zahlung.karte).toBeNull();
  });

  it("Skonto und Positionsnummer werden übernommen, leere Einträge entfallen", () => {
    const rechnung = { ...roh.rechnung, skonto: [{ prozent: 2, tage: 8, bis: "2026-09-20", betrag: 606.42 }, { prozent: 0, tage: 0, bis: "", betrag: 0 }] };
    const befund = XFact.befundAusKi({ ...mitPosition({ posNr: "4" }), rechnung }, "x");
    expect(befund.rechnung.skonto).toEqual([{ prozent: 2, tage: 8, bis: "2026-09-20", betrag: 606.42 }]);
    expect(XFact.baueRechnung(befund, {}).positionen[0]).toMatchObject({ nr: 1, posNr: "4" });
  });

  it("Rabatte und Zuschläge auf eine Position, Bruttopreis, Merkmale", () => {
    const befund = XFact.befundAusKi(mitPosition({
      nettopreis: 24.101, nachlaesse: [{ betrag: 23.39, basis: 0, prozent: 0, grund: "Willkommensangebot" }, { betrag: 0, basis: 0, prozent: 0, grund: "" }],
      merkmale: [{ name: "Farbe", wert: "weiß" }, { name: "", wert: "" }], gtin: "4012 3456 78901", gesamt: 0.711,
    }), "x");
    expect(befund.positionen[0]).toMatchObject({ nettopreis: 24.101, gesamt: 0.711, gtin: "4012345678901",
      nachlaesse: [{ betrag: 23.39, basis: 0, prozent: 0, grund: "Willkommensangebot" }], merkmale: [{ name: "Farbe", wert: "weiß" }] });
  });

  it("was die KI nicht zuordnen konnte, kommt mit", () => {
    const befund = XFact.befundAusKi({ ...roh, nichtZugeordnet: [{ text: "frei Haus", bereich: "sonstiges" }, { text: "", bereich: "kopf" }] }, "x");
    expect(befund.nichtZugeordnet).toEqual([{ text: "frei Haus", bereich: "sonstiges" }]);
  });

  it("liest JSON auch, wenn es in Text eingebettet ist", async () => {
    const { holen } = holenMit({ choices: [{ message: { content: "Hier das Ergebnis:\n" + JSON.stringify(roh) + "\nFertig." } }] });
    expect((await XFact.frageKi("x", einstellungen, holen)).rechnung.nummer).toBe("RE-1");
  });

  it.each([
    [401, "schluessel"], [402, "guthaben"], [404, "modell"], [429, "zuViele"],
  ])("Status %i ergibt eine verständliche Meldung", async (status, schluessel) => {
    const { holen } = holenMit({}, status);
    await expect(XFact.frageKi("x", einstellungen, holen)).rejects.toThrow(XFact.TEXTE.ki.fehler[schluessel]);
  });

  it("andere Fehler, kein Netz, unlesbare Antwort", async () => {
    await expect(XFact.frageKi("x", einstellungen, holenMit({}, 500).holen)).rejects.toThrow(XFact.TEXTE.ki.fehler.allgemein(500));
    await expect(XFact.frageKi("x", einstellungen, async () => { throw new TypeError("offline"); })).rejects.toThrow(XFact.TEXTE.ki.fehler.netz);
    await expect(XFact.frageKi("x", einstellungen, holenMit({ choices: [{ message: { content: "kein JSON" } }] }).holen))
      .rejects.toThrow(XFact.TEXTE.ki.fehler.antwort);
  });

  it("Verbindung testen", async () => {
    const { holen, anfragen } = holenMit({ choices: [{ message: { content: "OK" } }] });
    expect(await XFact.pruefeVerbindung(einstellungen, holen)).toBe(true);
    expect(anfragen[0].inhalt.max_tokens).toBe(5);
  });

  it("eingerichtet ist die KI mit Endpunkt und Modell", () => {
    expect(XFact.kiEingerichtet(einstellungen)).toBe(true);
    expect(XFact.kiEingerichtet({ endpunkt: "http://localhost:1234/v1", modell: "x" })).toBe(true);
    expect(XFact.kiEingerichtet({ endpunkt: "", modell: "x" })).toBe(false);
    expect(XFact.kiEingerichtet(undefined)).toBe(false);
  });
});

describe("Prüfer Jev", () => {
  it("fragt je Wert, ob er so in der Rechnung steht, dazu Einheit, Steuer und Zahlungsart", () => {
    const { fragen, felder } = XFact.jevFragen(musterRechnung());
    expect(Object.keys(fragen)).toEqual([
      "nummer", "datum", "faellig",
      "absender_name", "absender_ort", "absender_ust", "empfaenger_name", "empfaenger_ort",
      "kontakt", "iban", "p1_menge", "p1_preis", "p1_gesamt", "p1_einheit", "p1_steuer", "zahlungsart",
    ]);
    expect(fragen.datum.instructions).toContain("„12.09.2026“");
    expect(fragen.p1_einheit.criteria.HUR).toBe("Stunde");
    expect(felder.p1_einheit).toMatchObject({ pfad: "position.1.einheit", art: "choice", erwartet: "HUR" });
    expect(felder.p1_steuer).toMatchObject({ pfad: "position.1.steuer", art: "choice", erwartet: "S19" });
    expect(Object.keys(fragen.p1_steuer.criteria)).toEqual(["S19", "S7", "Z", "E", "AE", "O"]);
    expect(felder.absender_ort).toEqual({ pfad: "absender.plz", art: "noul" });
  });

  it("ein Leistungsdatum, das XFact aus den Positionen ableitet, wird nicht geprüft; eines von der Rechnung schon", () => {
    expect(XFact.jevFragen(musterRechnung()).fragen.leistungsdatum).toBeUndefined();
    expect(XFact.jevFragen(musterRechnung({ leistungsdatum: "2026-09-07", leistungAbgeleitet: false })).fragen.leistungsdatum.instructions).toContain("07.09.2026");
  });

  it("Referenzen, Kennungen, Nachlässe werden ebenfalls geprüft", () => {
    const r = musterRechnung({ bestellnummer: "B-1", lieferschein: "LS-9", nachlaesse: [{ betrag: 5, grund: "Treue", kategorie: "S", satz: 19 }] });
    const { fragen } = XFact.jevFragen(r);
    expect(Object.keys(fragen)).toEqual(expect.arrayContaining(["bestellnummer", "lieferschein", "nachlaesse1"]));
  });

  it("Position mit ihrer Nummer, gleichnamige mit Beschreibung; Preis je Basismenge; Skonto", () => {
    const p = musterRechnung().positionen[0];
    const r = musterRechnung({ positionen: [{ ...p, posNr: "2", beschreibung: "schwarz" }, { ...p, nr: 2, posNr: "4", beschreibung: "weiß", basismenge: 100 }],
      skonto: [{ prozent: 2, tage: 8, bis: "2026-09-20", betrag: null }] });
    const { fragen, felder } = XFact.jevFragen(r);
    expect(fragen.p2_menge.instructions).toContain("Position 4 („Montage“, weiß)");
    expect(fragen.p2_preis.instructions).toContain("je 100 Einheiten");
    expect(fragen.skonto1.instructions).toContain("Zahlung bis 20.09.2026");
    expect(felder.skonto1).toEqual({ pfad: "skonto.1", art: "noul" });
  });

  it("bei Lastschrift: Gläubiger-ID, IBAN des Kunden, Mandat", () => {
    const r = musterRechnung({ zahlungsart: "lastschrift",
      absender: { ...musterRechnung().absender, glaeubigerId: "DE98ZZZ09999999999" },
      empfaenger: { ...musterRechnung().empfaenger, iban: "DE02120300000000202051", mandatsreferenz: "M-1" } });
    const { fragen, felder } = XFact.jevFragen(r);
    expect(Object.keys(fragen)).toEqual(expect.arrayContaining(["glaeubiger", "kunden_iban", "mandat"]));
    expect(felder.zahlungsart).toMatchObject({ pfad: "zahlungsart", art: "choice", erwartet: "lastschrift" });
  });

  it("schickt alle Fragen in einer Anfrage an die Decisions-Schnittstelle", async () => {
    const { holen, anfragen } = holenMit({ answers: { nummer: { type: "noul", noul: 0.97 } } });
    const pruefung = await XFact.frageJev(musterRechnung(), "Rechnungstext", einstellungen, holen);
    expect(anfragen[0].adresse).toBe(XFact.KI.jevEndpunkt);
    expect(anfragen[0].inhalt).toMatchObject({ model: XFact.KI.jevModell, state: { rechnung: "Rechnungstext" } });
    expect(pruefung.antworten.nummer.noul).toBe(0.97);
    expect(pruefung.felder.nummer.pfad).toBe("nummer");
  });

  it("nur über OpenRouter und nur, wenn eingeschaltet", async () => {
    const { holen, anfragen } = holenMit({ answers: {} });
    expect(await XFact.frageJev(musterRechnung(), "x", { ...einstellungen, jev: false }, holen)).toBeNull();
    expect(await XFact.frageJev(musterRechnung(), "x", { endpunkt: "http://localhost:1234/v1", modell: "m", jev: true }, holen)).toBeNull();
    expect(anfragen).toEqual([]);
  });

  it("ein Fehler des Prüfers hält niemanden auf", async () => {
    const pruefung = await XFact.frageJev(musterRechnung(), "x", einstellungen, holenMit({}, 500).holen);
    expect(pruefung.fehler).toBe(XFact.TEXTE.ki.fehler.allgemein(500));
  });
});
