import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { ladeFachlogik, pdfAus as pdfAusZeilen } from "./fachlogik";

/** Erkennung von Absender (Rechnungssteller) und Empfänger. */

const XFact = ladeFachlogik();
const BEISPIELE = join(__dirname, "../../requirements/XRechnungen/Beispiel-PDFs");
const pdfAus = (...zeilen: (string | [number, string][])[]) => pdfAusZeilen(XFact, ...zeilen);

/** Erkannte Parteien und die Hinweise, die Absender oder Empfänger betreffen. */
function erkenne(pdf: any) {
  const erkannt = XFact.erkenneRechnung(pdf);
  const hinweise = XFact.hinweiseZurRechnung(XFact.baueRechnung(erkannt, {}), erkannt)
    .filter((h: any) => /^(absender|empfaenger)\./.test(h.feld));
  return { parteien: erkannt.parteien, hinweise };
}
const fehlt = (feld: string) => ({ feld, stufe: "fehlt", text: XFact.TEXTE.fehlt });

const werte = (p: any) => ({
  name: p.name?.wert,
  adresse: p.adresse.map((a: any) => a.wert),
  plz: p.plz?.wert,
  ort: p.ort?.wert,
  land: p.land?.wert,
  ustId: p.ustId?.wert,
  steuernummer: p.steuernummer?.wert,
  email: p.email?.wert,
  telefon: p.telefon?.wert,
});

describe("Beispielrechnungen: Anschriften nebeneinander, mit Überschrift", () => {
  const absender = {
    name: "Work With Ease EOOD", adresse: ["ul Bor 4"], plz: "2777", ort: "Dobrinishte", land: "BG",
    ustId: "BG205889057", steuernummer: undefined, email: "team@work-with-ease.eu", telefon: "+49 176 10335862",
  };
  const ohneKontakt = { steuernummer: undefined, email: undefined, telefon: undefined, land: "DE" };
  const soll: Record<string, object> = {
    "INV 737 InfraServ GmbH & Co. Wiesbaden KG.pdf": { name: "InfraServ GmbH & Co. Wiesbaden KG",
      adresse: ["Rechnungsprüfung"], plz: "65203", ort: "Wiesbaden", ustId: "DE812134836" },
    "INV 742 Humboldt-Universität zu Berlin.pdf": { name: "Humboldt-Universität zu Berlin",
      adresse: ["Unter den Linden 6"], plz: "10099", ort: "Berlin", ustId: "DE137176824" },
    "INV 745 GLS ImmoWert GmbH.pdf": { name: "GLS ImmoWert GmbH",
      adresse: ["Leipziger Platz 21"], plz: "90491", ort: "Nürnberg", ustId: "DE133510945" },
    "INV 747 ADG Forum Assistenz.pdf": { name: "Akademie Deutscher Genossenschaften e.V.",
      adresse: ["Schloss Montabaur"], plz: "56410", ort: "Montabaur", ustId: "DE149338636" },
    "INV 753 Berg GmbH & Co. KG.pdf": { name: "Berg GmbH & Co. KG",
      adresse: ["Alte Ziegelei 21"], plz: "51491", ort: "Overath", ustId: "DE196047852" },
  };

  for (const [datei, empfaenger] of Object.entries(soll)) {
    it(datei, async () => {
      const pdf = await XFact.lesePdf(new Uint8Array(readFileSync(join(BEISPIELE, datei))), pdfjs);
      const { parteien, hinweise } = erkenne(pdf);
      expect(werte(parteien.empfaenger)).toEqual({ ...ohneKontakt, ...empfaenger });
      expect(werte(parteien.absender)).toEqual(absender);
      // Der Steller sitzt in Bulgarien: gelb. Die E-Mail des Kunden steht nie im PDF: rot.
      expect(hinweise).toEqual([fehlt("empfaenger.email"),
        { feld: "absender.land", stufe: "unsicher", text: XFact.TEXTE.nichtDeutschland }]);
    });
  }
});

describe("typischer deutscher Briefbogen ohne Überschriften", () => {
  const pdf = () => pdfAus(
    [[350, "Muster Handwerk GmbH"]],
    [[350, "Hauptstr. 1, 20095 Hamburg"]],
    "",
    "Muster Handwerk GmbH · Hauptstr. 1 · 20095 Hamburg",
    "Firma",
    "Berg GmbH & Co. KG",
    "z. Hd. Frau Müller",
    "Alte Ziegelei 21",
    "51491 Overath",
    "",
    "Rechnungsnummer: 2026-0153",
    "Gesamtbetrag 924,63 €",
    "",
    [[50, "Tel. 040 123456"], [200, "info@muster-handwerk.de"], [400, "Steuernummer 12/345/67890"]],
  );

  it("Empfänger ist das Anschriftfeld, Absender kommt aus der Absenderzeile", () => {
    const { parteien, hinweise } = erkenne(pdf());
    expect(werte(parteien.empfaenger)).toEqual({
      name: "Berg GmbH & Co. KG", adresse: ["z. Hd. Frau Müller", "Alte Ziegelei 21"],
      plz: "51491", ort: "Overath", land: "DE",
      ustId: undefined, steuernummer: undefined, email: undefined, telefon: undefined,
    });
    expect(werte(parteien.absender)).toEqual({
      name: "Muster Handwerk GmbH", adresse: ["Hauptstr. 1"], plz: "20095", ort: "Hamburg", land: "DE",
      ustId: undefined, steuernummer: "12/345/67890", email: "info@muster-handwerk.de", telefon: "040 123456",
    });
    // Ansprechpartner steht nicht auf dieser Rechnung, die E-Mail des Kunden nie
    expect(hinweise).toEqual([fehlt("absender.kontakt"), fehlt("empfaenger.email")]);
  });

  it("ohne USt-IdNr. und Steuernummer fehlt beim Absender eine Pflichtangabe", () => {
    const ohne = pdfAus(
      "Muster Handwerk GmbH · Hauptstr. 1 · 20095 Hamburg",
      "Berg GmbH & Co. KG",
      "Alte Ziegelei 21",
      "51491 Overath",
    );
    const { hinweise } = erkenne(ohne);
    expect(hinweise).toContainEqual(fehlt("absender.ustId"));
  });

  it("ohne erkennbare Anschrift fehlen Name, PLZ und Ort", () => {
    const { hinweise } = erkenne(pdfAus("Rechnung 2026-0153", "Gesamtbetrag 924,63 €"));
    expect(hinweise.filter((h: any) => h.stufe === "fehlt").map((h: any) => h.feld)).toEqual([
      "absender.name", "absender.plz", "absender.ort", "absender.ustId",
      "absender.kontakt", "absender.telefon", "absender.email",
      "empfaenger.name", "empfaenger.plz", "empfaenger.ort", "empfaenger.email",
    ]);
  });
});
