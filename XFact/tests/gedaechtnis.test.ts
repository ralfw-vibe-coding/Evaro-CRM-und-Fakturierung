import { describe, expect, it } from "vitest";
import { beispiel, ladeFachlogik } from "./fachlogik";

/** Gedächtnis: Firmen, Kunden, Einheiten, Logbuch, Export und Import. */

const XFact = ladeFachlogik();
const befund: Record<string, any> = { 753: beispiel("INV753").befund, 747: beispiel("INV747").befund };

// E-Mail des Kunden ergänzt; "Pauschale" soll bei dieser Firma Stück heißen statt LS
const ergaenzt753 = { empfaenger: { email: "rechnung@berg.example" }, einheiten: { pauschale: "C62" } };

describe("Merken und wieder ergänzen", () => {
  it("ein leeres Gedächtnis ergänzt nichts", () => {
    expect(XFact.vorgabenAusGedaechtnis(XFact.leeresGedaechtnis(), befund["753"])).toEqual({ ergaenzungen: {}, herkunft: {} });
  });

  it("merkt sich, was im PDF fehlte, und sagt, was neu ist", () => {
    const { gedaechtnis, gemerkt } = XFact.merkeRechnung(XFact.leeresGedaechtnis(), befund["753"], ergaenzt753);
    expect(gemerkt).toEqual([
      "Einheit „pauschale“ = Stück",
      "Berg GmbH & Co. KG: E-Mail für Rechnungen rechnung@berg.example",
    ]);
    const firma = gedaechtnis.firmen.bg205889057;
    expect(firma.name).toBe("Work With Ease EOOD");
    expect(firma.kunden.de196047852).toEqual({ name: "Berg GmbH & Co. KG", plz: "51491", ort: "Overath", email: "rechnung@berg.example" });
    // Ein zweites Mal ist nichts mehr neu
    expect(XFact.merkeRechnung(gedaechtnis, befund["753"], ergaenzt753).gemerkt).toEqual([]);
  });

  it("geänderte Werte, die im PDF stehen, werden nicht gemerkt", () => {
    const { gemerkt } = XFact.merkeRechnung(XFact.leeresGedaechtnis(), befund["753"], { absender: { kontakt: "Ralf Westphal" } });
    expect(gemerkt).toEqual([]);
  });

  it("bei der nächsten Rechnung desselben Kunden fehlt nichts mehr", () => {
    const { gedaechtnis } = XFact.merkeRechnung(XFact.leeresGedaechtnis(), befund["753"], ergaenzt753);
    const { ergaenzungen, herkunft } = XFact.vorgabenAusGedaechtnis(gedaechtnis, befund["753"]);
    expect(ergaenzungen).toEqual({ einheiten: { pauschale: "C62" }, empfaenger: { email: "rechnung@berg.example" } });
    expect(herkunft).toEqual({ "position.1.einheit": "firma", "empfaenger.email": "kunde" });
    expect(XFact.pruefeRechnung(XFact.baueRechnung(befund["753"], ergaenzungen))).toEqual([]);
  });

  it("ein anderer Kunde derselben Firma: Einheiten ja, E-Mail nein", () => {
    const { gedaechtnis } = XFact.merkeRechnung(XFact.leeresGedaechtnis(), befund["753"], ergaenzt753);
    const { ergaenzungen } = XFact.vorgabenAusGedaechtnis(gedaechtnis, befund["747"]);
    expect(ergaenzungen).toEqual({ einheiten: { pauschale: "C62" } });
  });

  it("Leitweg-ID wird je Kunde gemerkt", () => {
    const { gedaechtnis, gemerkt } = XFact.merkeRechnung(XFact.leeresGedaechtnis(), befund["747"], { leitwegId: "11-0-22" });
    expect(gemerkt).toEqual(["Akademie Deutscher Genossenschaften e.V.: Leitweg-ID (nur bei Behörden) 11-0-22"]);
    expect(XFact.vorgabenAusGedaechtnis(gedaechtnis, befund["747"]).ergaenzungen.leitwegId).toBe("11-0-22");
  });
});

describe("Schlüssel", () => {
  it("Firma: USt-IdNr., sonst Steuernummer, sonst Name", () => {
    expect(XFact.firmaSchluessel({ ustId: "DE 123 456 789", steuernummer: "12/345/67890", name: "X" })).toBe("de123456789");
    expect(XFact.firmaSchluessel({ ustId: null, steuernummer: "12/345/67890", name: "X" })).toBe("st:1234567890");
    expect(XFact.firmaSchluessel({ ustId: null, steuernummer: null, name: "Muster GmbH" })).toBe("name:mustergmbh");
  });

  it("Kunde: USt-IdNr., sonst Name und PLZ", () => {
    expect(XFact.kundeSchluessel({ ustId: null, name: "Berg GmbH & Co. KG", plz: "51491" })).toBe("name:berggmbhcokg|51491");
  });
});

describe("Logbuch", () => {
  it("trägt ein und warnt bei derselben Rechnungsnummer", () => {
    const r = XFact.baueRechnung(befund["753"], ergaenzt753);
    const g = XFact.insLogbuch(XFact.leeresGedaechtnis(), r, "INV 753 Berg GmbH & Co. KG.pdf", "2026-10-15T10:00:00.000Z");
    expect(g.logbuch).toEqual([{ zeitpunkt: "2026-10-15T10:00:00.000Z", dateiname: "INV 753 Berg GmbH & Co. KG.pdf",
      firma: "bg205889057", nummer: "0000000753", kunde: "Berg GmbH & Co. KG", betrag: 777 }]);
    expect(XFact.hinweiseAusGedaechtnis(g, r)).toEqual([{ feld: "nummer", stufe: "unsicher", text: "bereits am 15.10.2026 umgewandelt" }]);
    expect(XFact.hinweiseAusGedaechtnis(g, XFact.baueRechnung(befund["747"], {}))).toEqual([]);
  });

  it("zeigt grau, was aus dem Gedächtnis kommt – bis der Nutzer es bestätigt", () => {
    const r = XFact.baueRechnung(befund["753"], {});
    const herkunft = { "empfaenger.email": "kunde" };
    expect(XFact.hinweiseAusGedaechtnis(XFact.leeresGedaechtnis(), r, herkunft))
      .toEqual([{ feld: "empfaenger.email", stufe: "ergaenzt", text: "aus Kundenprofil" }]);
    expect(XFact.hinweiseAusGedaechtnis(XFact.leeresGedaechtnis(), r, herkunft, new Set(["empfaenger.email"]))).toEqual([]);
  });
});

describe("Export und Import", () => {
  const gefuellt = () => {
    const { gedaechtnis } = XFact.merkeRechnung(XFact.leeresGedaechtnis(), befund["753"], ergaenzt753);
    gedaechtnis.einstellungen.ki = { endpunkt: "https://openrouter.ai/api/v1", schluessel: "geheim" };
    return gedaechtnis;
  };

  it("hin und zurück ergibt dasselbe – ohne API-Schlüssel", () => {
    const text = XFact.exportiereGedaechtnis(gefuellt());
    expect(text).not.toContain("geheim");
    const zurueck = XFact.importiereGedaechtnis(text);
    const erwartet = gefuellt();
    delete erwartet.einstellungen.ki.schluessel;
    expect(zurueck).toEqual(erwartet);
  });

  it("mit Schlüssel nur auf Wunsch", () => {
    expect(XFact.exportiereGedaechtnis(gefuellt(), { mitSchluessel: true })).toContain("geheim");
  });

  it("lehnt fremde Dateien verständlich ab", () => {
    expect(() => XFact.importiereGedaechtnis("kein json")).toThrow(XFact.TEXTE.gemerkt.importKeinJson);
    expect(() => XFact.importiereGedaechtnis('{"firmen":{}}')).toThrow(XFact.TEXTE.gemerkt.importFalscheDatei);
    expect(() => XFact.importiereGedaechtnis('{"format":"xfact-daten","version":99,"firmen":{},"logbuch":[]}'))
      .toThrow(XFact.TEXTE.gemerkt.importZuNeu);
  });
});

describe("Speichern im Browser", () => {
  const speicher = () => {
    const daten = new Map<string, string>();
    return { getItem: (k: string) => daten.get(k) ?? null, setItem: (k: string, v: string) => void daten.set(k, v), daten };
  };

  it("speichert und lädt", () => {
    const s = speicher();
    const g = XFact.merkeRechnung(XFact.leeresGedaechtnis(), befund["753"], ergaenzt753).gedaechtnis;
    expect(XFact.speichereGedaechtnis(g, s)).toBe(true);
    expect(XFact.ladeGedaechtnis(s)).toEqual(g);
  });

  it("ohne oder mit kaputtem Speicher: leeres Gedächtnis statt Absturz", () => {
    expect(XFact.ladeGedaechtnis(undefined)).toEqual(XFact.leeresGedaechtnis());
    const s = speicher();
    s.daten.set(XFact.GEDAECHTNIS.speicherSchluessel, "{kaputt");
    expect(XFact.ladeGedaechtnis(s)).toEqual(XFact.leeresGedaechtnis());
    expect(XFact.speichereGedaechtnis(XFact.leeresGedaechtnis(), { setItem: () => { throw new Error("voll"); } })).toBe(false);
  });
});
