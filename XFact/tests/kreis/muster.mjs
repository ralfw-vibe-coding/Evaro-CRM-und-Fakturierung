/**
 * Musterrechnungen für den Kreis-Test: XRechnung → PDF → XFact → XRechnung.
 *
 * Jedes Muster ist eine Antwort im Format der KI (KI_SCHEMA); fehlende Felder
 * ergänzt leer(). Zusammen enthalten die Muster jedes Feld der Norm, das XFact
 * aus einer Rechnung liest (STANDARD, Umsetzung "ki"). Die Firmen und
 * Personen sind erfunden.
 */

/** Eine leere Antwort nach dem Schema: Texte "", Zahlen 0, Listen leer */
export function leer(schema) {
  if (schema.type === "object") return Object.fromEntries(Object.entries(schema.properties).map(([n, s]) => [n, leer(s)]));
  if (schema.type === "array") return [];
  if (schema.type === "number") return 0;
  if (schema.type === "boolean") return false;
  return "";
}

/** Legt "teil" über "basis": Objekte Feld für Feld, alles andere als Ganzes */
export function ueber(basis, teil) {
  if (!teil || typeof teil !== "object" || Array.isArray(teil)) return teil;
  const ergebnis = { ...basis };
  for (const [n, w] of Object.entries(teil)) ergebnis[n] = ueber(basis?.[n], w);
  return ergebnis;
}

/** Eine Position mit allen Feldern, "teil" überschreibt */
const position = (teil) => ueber({
  posNr: "", name: "", beschreibung: "", notiz: "", artikelnummer: "", kundenArtikelnummer: "", gtin: "", ursprungsland: "",
  merkmale: [], objekt: "", bestellposition: "", buchungsreferenz: "", menge: 0, einheitText: "", einheitCode: "",
  nettopreis: 0, bruttopreis: 0, preisnachlass: 0, basismenge: 0, nachlaesse: [], zuschlaege: [], gesamt: 0,
  steuerkategorie: "S", steuersatz: 19, von: "", bis: "",
}, teil);
const nachlass = (teil) => ({ betrag: 0, basis: 0, prozent: 0, grund: "", ...teil });

const verkaeufer = {
  name: "Tischlerei Holzmann GmbH & Co. KG", handelsname: "Holzmann Innenausbau", kennung: "",
  register: "HRA 4711, Amtsgericht Köln", ustId: "DE123456788", steuernummer: "214/5800/1234",
  rechtlicheAngaben: "Sitz Köln; Komplementärin: Holzmann Verwaltungs GmbH, HRB 815; Geschäftsführer: Peter Holzmann",
  email: "rechnung@holzmann.example", strasse: "Werkstraße 12", zusatz: "Halle B", zeile3: "Tor 2", ort: "Köln", plz: "50667", region: "Nordrhein-Westfalen", land: "DE",
  kontakt: "Anna Holzmann", telefon: "0221 555 120", kontaktEmail: "anna.holzmann@holzmann.example",
};

const kaeufer = {
  name: "Berger Hotelbetriebe GmbH", handelsname: "Rheinblick Hotels", kennung: "K-20931", register: "HRB 9921, Amtsgericht Bonn", ustId: "DE987654325",
  email: "eingangsrechnungen@berger-hotels.example", strasse: "Rheinallee 7", zusatz: "Buchhaltung", zeile3: "Gebäude C, 2. OG",
  ort: "Bonn", plz: "53111", region: "Nordrhein-Westfalen", land: "DE",
  kontakt: "Jörg Bartel", telefon: "0228 300 40", kontaktEmail: "j.bartel@berger-hotels.example", oeffentlich: false,
};

export const MUSTER = {
  // Überweisung mit zwei Konten und Skonto; alle Referenzen; 19 % und 7 %; Preise mit Basismenge und Bruttopreis;
  // Rabatte und Zuschläge auf Positionen und auf die Rechnung; Lieferanschrift; Zahlungsempfänger; Anlagen
  "Handwerk-voll": {
    rechnung: {
      nummer: "RE-2026-0815", datum: "2026-09-14", art: "380", waehrung: "EUR", faellig: "2026-10-14",
      leistungVon: "2026-09-01", leistungBis: "2026-09-12",
      kaeuferreferenz: "Hr. Bartel / Umbau Lobby", bestellnummer: "BE-4500123", auftragsnummer: "AB-26-0412", vertrag: "RV-2025-07",
      projekt: "Umbau Lobby Hotel Rheinblick", wareneingang: "WE-88812", lieferschein: "LS-26-3301", ausschreibung: "Los 3 Innenausbau",
      objekt: "Hotel Rheinblick, Gebäude A", buchungsreferenz: "Kostenstelle 4410",
      bemerkungen: ["Vielen Dank für Ihren Auftrag.", "Die Gewährleistung beträgt 5 Jahre ab Abnahme."],
      zahlungsbedingungen: "", skonto: [{ prozent: 2, tage: 10, bis: "2026-09-24", betrag: 0 }],
      anlagen: [{ kennung: "Aufmaß Nr. 12", beschreibung: "Aufmaß vom 12.09.2026", link: "" },
        { kennung: "Fotodokumentation", beschreibung: "Fotos der Montage", link: "https://holzmann.example/docs/0815" }],
    },
    verkaeufer,
    kaeufer,
    zahlungsempfaenger: { name: "Rhein Factoring AG", kennung: "RF-3301", register: "HRB 1234, Amtsgericht Düsseldorf" },
    lieferung: { name: "Hotel Rheinblick", ortKennung: "LO-0007", strasse: "Uferweg 3", zusatz: "Anlieferung Hof", zeile3: "Tor 4",
      ort: "Königswinter", plz: "53639", region: "Nordrhein-Westfalen", land: "DE" },
    zahlung: {
      art: "ueberweisung", text: "Überweisung", verwendungszweck: "RE-2026-0815 K-20931",
      konten: [{ iban: "DE89370400440532013000", bic: "COBADEFFXXX", inhaber: "Rhein Factoring AG" },
        { iban: "DE02120300000000202051", bic: "BYLADEM1001", inhaber: "" }],
    },
    nachlaesse: [{ betrag: 0, basis: 0, prozent: 3, grund: "Treuerabatt", kategorie: "S", satz: 19 }],
    zuschlaege: [{ betrag: 45, basis: 0, prozent: 0, grund: "Fracht", kategorie: "S", satz: 19 }],
    positionen: [
      position({ posNr: "10", name: "Einbauschrank Eiche", beschreibung: "nach Aufmaß, 3-türig", notiz: "Titel 1: Möbel",
        artikelnummer: "ES-300", kundenArtikelnummer: "BH-77-1", gtin: "4012345678901", ursprungsland: "DE",
        merkmale: [{ name: "Holzart", wert: "Eiche massiv" }, { name: "Oberfläche", wert: "geölt" }],
        bestellposition: "1", buchungsreferenz: "4410-01", menge: 2, einheitText: "Stk", einheitCode: "C62",
        nettopreis: 1080, bruttopreis: 1200, preisnachlass: 120, nachlaesse: [nachlass({ betrag: 108, basis: 2160, prozent: 5, grund: "Projektrabatt" })],
        zuschlaege: [nachlass({ betrag: 60, grund: "Sonderfarbe" })], gesamt: 2112, von: "2026-09-01", bis: "2026-09-05" }),
      position({ posNr: "20", name: "Montage", menge: 12, einheitText: "Std", einheitCode: "HUR", nettopreis: 65, gesamt: 975,
        zuschlaege: [nachlass({ prozent: 25, grund: "Wochenendzuschlag" })],
        objekt: "Zimmer 101-104", von: "2026-09-08", bis: "2026-09-12" }),
      position({ posNr: "30", name: "Schrauben Edelstahl", beschreibung: "4 x 40 mm", menge: 400, einheitText: "Stk", einheitCode: "C62",
        nettopreis: 12.5, basismenge: 100, gesamt: 50, von: "2026-09-08", bis: "2026-09-08" }),
      position({ posNr: "40", name: "Fachbuch Holzpflege", menge: 1, einheitText: "Stk", einheitCode: "C62", nettopreis: 8, gesamt: 8,
        steuersatz: 7, von: "2026-09-12", bis: "2026-09-12" }),
    ],
  },

  // Schlussrechnung Bau mit zwei Abschlagsrechnungen, Lastschrift, Rundung
  "Schlussrechnung-Lastschrift": {
    rechnung: {
      nummer: "SR-2026-077", datum: "2026-10-02", art: "877", waehrung: "EUR", faellig: "2026-10-09", leistungsdatum: "2026-09-30",
      bestellnummer: "BV-Schulstraße", projekt: "Neubau Kita Schulstraße",
      vorherigeRechnungen: [{ nummer: "AR-2026-031", datum: "2026-07-01" }, { nummer: "AR-2026-052", datum: "2026-08-15" }],
      gezahlt: 20000, rundung: 0.01,
    },
    zuschlaege: [{ betrag: 0, basis: 0, prozent: 1.5, grund: "Baustellengemeinkosten", kategorie: "S", satz: 19 }],
    verkaeufer: { ...verkaeufer, handelsname: "", rechtlicheAngaben: "", register: "", zusatz: "" },
    kaeufer: { ...kaeufer, handelsname: "", zusatz: "", zeile3: "", region: "", kontakt: "", telefon: "", kontaktEmail: "", register: "" },
    zahlung: { art: "lastschrift", text: "SEPA-Lastschrift", glaeubigerId: "DE98ZZZ09999999999", mandatsreferenz: "M-2026-118",
      kundenIban: "DE75512108001245126199" },
    positionen: [
      position({ posNr: "1", name: "Innentüren liefern und montieren", menge: 18, einheitText: "Stk", einheitCode: "C62", nettopreis: 980, gesamt: 17640 }),
      position({ posNr: "2", name: "Treppengeländer Eiche", menge: 1, einheitText: "psch", einheitCode: "LS", nettopreis: 9850.5, gesamt: 9850.5 }),
    ],
  },

  // Rechnungskorrektur nach § 13b, bezahlt per Kreditkarte
  "Korrektur-13b-Kreditkarte": {
    rechnung: {
      nummer: "RK-2026-004", datum: "2026-09-20", art: "384", waehrung: "EUR", leistungsdatum: "2026-09-02",
      vorherigeRechnungen: [{ nummer: "RE-2026-0790", datum: "2026-09-03" }],
      bemerkungen: ["Diese Rechnung ersetzt die Rechnung RE-2026-0790."],
    },
    verkaeufer: { ...verkaeufer, zeile3: "" },
    kaeufer: { ...kaeufer, name: "Bau & Boden Schmitt GmbH", handelsname: "", kennung: "", register: "", ustId: "DE811907980", email: "rechnung@bau-schmitt.example",
      strasse: "Industriestraße 40", zusatz: "", zeile3: "", ort: "Leverkusen", plz: "51373", region: "", kontakt: "", telefon: "", kontaktEmail: "" },
    zahlung: { art: "kreditkarte", text: "Kreditkarte", karte: "4242", karteninhaber: "Marco Schmitt" },
    steuer: [{ kategorie: "AE", satz: 0, basis: 0, betrag: 0, befreiungsgrund: "Steuerschuldnerschaft des Leistungsempfängers nach § 13b UStG" }],
    positionen: [
      position({ posNr: "1", name: "Parkett verlegen", menge: 85.5, einheitText: "m²", einheitCode: "MTK", nettopreis: 38, gesamt: 3249,
        steuerkategorie: "AE", steuersatz: 0 }),
    ],
  },

  // Kleinunternehmer an eine Behörde mit Leitweg-ID, bar bezahlt
  "Kleinunternehmer-Behoerde-bar": {
    rechnung: {
      nummer: "2026-031", datum: "2026-09-11", art: "380", waehrung: "EUR", leistungsdatum: "2026-09-10",
      leitwegId: "05334002-12345-14",
    },
    verkaeufer: { name: "Gartenpflege Weber", handelsname: "", kennung: "", register: "", ustId: "", steuernummer: "203/123/45678",
      rechtlicheAngaben: "", email: "weber@gartenpflege-weber.example", strasse: "Lindenweg 4", zusatz: "", zeile3: "", ort: "Aachen",
      plz: "52062", region: "", land: "DE", kontakt: "Tom Weber", telefon: "0241 991 22", kontaktEmail: "" },
    kaeufer: { name: "Stadt Aachen", handelsname: "", kennung: "", register: "", ustId: "", email: "erechnung@stadt-aachen.example",
      strasse: "Markt 1", zusatz: "Fachbereich Umwelt", zeile3: "", ort: "Aachen", plz: "52058", region: "", land: "DE",
      kontakt: "Frau Klein", telefon: "", kontaktEmail: "", oeffentlich: true },
    lieferung: { name: "Grünanlage Stadtpark", ortKennung: "GA-117", strasse: "", zusatz: "", zeile3: "", ort: "", plz: "", region: "", land: "" },
    zahlung: { art: "bar", text: "bar" },
    steuer: [{ kategorie: "E", satz: 0, basis: 0, betrag: 0, befreiungsgrund: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet." }],
    positionen: [
      position({ posNr: "1", name: "Rasen mähen", menge: 6, einheitText: "Std", einheitCode: "HUR", nettopreis: 35, gesamt: 210, steuerkategorie: "E", steuersatz: 0 }),
      position({ posNr: "2", name: "Grünschnitt entsorgen", menge: 1, einheitText: "psch", einheitCode: "LS", nettopreis: 40, gesamt: 40, steuerkategorie: "E", steuersatz: 0 }),
    ],
  },

  // Photovoltaik zum Nullsatz und Wartung mit 19 %, vorab per PayPal bezahlt
  "Photovoltaik-Nullsatz-online": {
    rechnung: { nummer: "PV-2026-210", datum: "2026-08-28", art: "380", waehrung: "EUR", leistungsdatum: "2026-08-27", gezahlt: 9178.5 },
    verkaeufer: { ...verkaeufer, name: "Sonnenstrom Rheinland GmbH", handelsname: "", register: "HRB 5521, Amtsgericht Köln", rechtlicheAngaben: "",
      email: "service@sonnenstrom.example", zusatz: "", kontakt: "Lea Sommer", telefon: "0221 777 80", kontaktEmail: "" },
    kaeufer: { ...kaeufer, name: "Familie Krüger", handelsname: "", kennung: "", register: "", ustId: "", email: "kruger.familie@mail.example", strasse: "Am Hang 9",
      zusatz: "", zeile3: "", ort: "Bergisch Gladbach", plz: "51465", region: "", kontakt: "", telefon: "", kontaktEmail: "" },
    zahlung: { art: "online", text: "PayPal" },
    positionen: [
      position({ posNr: "1", name: "Photovoltaikanlage 9,8 kWp inkl. Speicher", menge: 1, einheitText: "Stk", einheitCode: "C62",
        nettopreis: 9000, gesamt: 9000, steuerkategorie: "Z", steuersatz: 0 }),
      position({ posNr: "2", name: "Wartungsvertrag erstes Jahr", menge: 1, einheitText: "Jahr", einheitCode: "ANN", nettopreis: 150, gesamt: 150 }),
    ],
  },

  // Nicht steuerbarer Schadenersatz, wird verrechnet
  "Schadenersatz-nicht-steuerbar": {
    rechnung: { nummer: "SE-2026-002", datum: "2026-09-30", art: "380", waehrung: "EUR", leistungsdatum: "2026-09-15",
      zahlungsbedingungen: "Der Betrag wird mit Ihrer Rechnung 4711 verrechnet." },
    verkaeufer: { ...verkaeufer, ustId: "", handelsname: "", rechtlicheAngaben: "", zusatz: "" },
    kaeufer: { ...kaeufer, ustId: "", zusatz: "", zeile3: "", region: "", kontakt: "", telefon: "", kontaktEmail: "", register: "" },
    zahlung: { art: "verrechnung", text: "Verrechnung" },
    steuer: [{ kategorie: "O", satz: 0, basis: 0, betrag: 0, befreiungsgrund: "Nicht steuerbarer Schadenersatz" }],
    positionen: [
      position({ posNr: "1", name: "Schadenersatz beschädigte Arbeitsplatte", menge: 1, einheitText: "psch", einheitCode: "LS",
        nettopreis: 640, gesamt: 640, steuerkategorie: "O", steuersatz: 0 }),
    ],
  },
};

/** Das Muster als vollständige KI-Antwort */
export function musterAntwort(name, schema) {
  return ueber(leer(schema), MUSTER[name]);
}
