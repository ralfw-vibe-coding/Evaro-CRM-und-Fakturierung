import { describe, expect, it } from "vitest";
import { ladeFachlogik, musterRechnung } from "./fachlogik";

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

/** Eine knappe KI-Antwort im Format des Schemas */
const roh = {
  rechnung: { nummer: " RE-1 ", datum: "2026-09-12", art: "380", faellig: "2026-09-26", zahlungsbedingungen: "", bestellnummer: "",
    leitwegId: "", leistungVon: "", leistungBis: "", bemerkung: "" },
  verkaeufer: { name: "Muster GmbH", strasse: "Hauptstr. 1", zusatz: "", plz: "20095", ort: "Hamburg", land: "de",
    ustId: "DE 123 456 789", steuernummer: "", email: "info@muster.example", telefon: "040 123456", kontakt: "Max Muster" },
  kaeufer: { name: "Berg GmbH", strasse: "Alte Ziegelei 21", zusatz: "Buchhaltung", plz: "51491", ort: "Overath", land: "DE",
    ustId: "", steuernummer: "", email: "", telefon: "", kontakt: "", oeffentlich: true },
  zahlung: { iban: "DE89 3704 0044 0532 0130 00", bic: "COBADEFFXXX", verwendungszweck: "" },
  positionen: [{ name: "Montage", beschreibung: "", menge: 8, einheitText: "Std", einheitCode: "HUR", einzelpreis: 65,
    gesamt: 520, steuerkategorie: "S", steuersatz: 19, von: "2026-09-07", bis: "2026-09-07" }],
  steuer: [{ kategorie: "S", satz: 19, basis: 520, betrag: 98.8, befreiungsgrund: "" }],
  summen: { netto: 520, steuer: 98.8, brutto: 618.8, zahlbetrag: 618.8 },
  fehlt: [{ feld: "BT-49", grund: "keine E-Mail des Käufers" }],
};

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
    expect(befund.zahlung.iban).toBe("DE89370400440532013000");
    expect(befund.positionen[0]).toMatchObject({ nr: 1, menge: 8, einheitCode: "HUR", gesamt: 520 });
  });

  it("Lastschrift: Gläubiger-ID ohne Leerzeichen, eine maskierte IBAN des Kunden zählt nicht", () => {
    const zahlung = { art: "lastschrift", iban: "", bic: "", verwendungszweck: "", glaeubigerId: "DE98 ZZZ 0999 9999 999",
      mandatsreferenz: "M-4711", kundenIban: "DE12 **** **** 3456" };
    const befund = XFact.befundAusKi({ ...roh, zahlung }, "x");
    expect(befund.zahlung).toMatchObject({ art: "lastschrift", glaeubigerId: "DE98ZZZ09999999999", mandatsreferenz: "M-4711", kundenIban: null });
  });

  it("Kreditkarte: von der Kartennummer bleiben nur die letzten 4 Ziffern", () => {
    const zahlung = { art: "kreditkarte", iban: "", bic: "", verwendungszweck: "", glaeubigerId: "", mandatsreferenz: "",
      kundenIban: "", karte: "4111 1111 1111 4242" };
    expect(XFact.befundAusKi({ ...roh, zahlung }, "x").zahlung).toMatchObject({ art: "kreditkarte", karte: "4242" });
    expect(XFact.befundAusKi({ ...roh, zahlung: { ...zahlung, karte: "" } }, "x").zahlung.karte).toBeNull();
  });

  it("Rabatt auf eine Position wird übernommen", () => {
    const p = { ...roh.positionen[0], einzelpreis: 24.101, nachlass: 23.39, nachlassGrund: "Willkommensangebot", gesamt: 0.711 };
    expect(XFact.befundAusKi({ ...roh, positionen: [p] }, "x").positionen[0])
      .toMatchObject({ einzelpreis: 24.101, nachlass: 23.39, nachlassGrund: "Willkommensangebot", gesamt: 0.711 });
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
  it("fragt je Wert, ob er so in der Rechnung steht, dazu Einheit und Steuerfall", () => {
    const { fragen, felder } = XFact.jevFragen(musterRechnung());
    expect(Object.keys(fragen)).toEqual([
      "nummer", "datum", "faellig",
      "absender_name", "absender_ort", "absender_ust", "empfaenger_name", "empfaenger_ort",
      "iban", "kontakt", "p1_menge", "p1_preis", "p1_gesamt", "p1_einheit", "steuerfall", "zahlungsart",
    ]);
    expect(fragen.datum.instructions).toContain("„12.09.2026“");
    expect(fragen.p1_einheit.criteria.HUR).toBe("Stunde");
    expect(felder.p1_einheit).toEqual({ pfad: "position.1.einheit", art: "choice", erwartet: "HUR" });
    expect(felder.absender_ort).toEqual({ pfad: "absender.plz", art: "noul" });
  });

  it("bei Lastschrift: Gläubiger-ID und IBAN des Kunden statt der eigenen IBAN", () => {
    const r = musterRechnung({ zahlungsart: "lastschrift",
      absender: { ...musterRechnung().absender, glaeubigerId: "DE98ZZZ09999999999" },
      empfaenger: { ...musterRechnung().empfaenger, iban: "DE02120300000000202051" } });
    const { fragen, felder } = XFact.jevFragen(r);
    expect(Object.keys(fragen)).toEqual(expect.arrayContaining(["glaeubiger", "kunden_iban"]));
    expect(fragen.iban).toBeUndefined();
    expect(felder.zahlungsart).toEqual({ pfad: "zahlungsart", art: "choice", erwartet: "lastschrift" });
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
