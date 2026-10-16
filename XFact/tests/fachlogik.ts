import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createContext, runInContext } from "node:vm";
import { DOMParser } from "@xmldom/xmldom";
// @ts-ignore – reines JavaScript
import { leer, ueber } from "./kreis/muster.mjs";

/**
 * Lädt den Fachlogik-Teil von xfact.html (<script id="xfact-fachlogik">) in
 * eine eigene Umgebung und gibt window.XFact zurück.
 *
 * Getestet wird so genau der Code, der ausgeliefert wird. Die Fachlogik greift
 * nicht auf die Seite zu; nur das Laden von pdf.js braucht den Browser, darum
 * übergeben Tests pdf.js selbst an lesePdf().
 */
export function ladeFachlogik(): any {
  const html = readFileSync(join(__dirname, "..", "xfact.html"), "utf8");
  const treffer = /<script type="module" id="xfact-fachlogik">([\s\S]*?)<\/script>/.exec(html);
  if (!treffer) throw new Error('<script id="xfact-fachlogik"> nicht in xfact.html gefunden');
  // Was die Fachlogik vom Browser braucht; fetch nur für ausdrückliche Live-Läufe
  const umgebung: any = { console, setTimeout, clearTimeout, AbortController, URL, fetch: globalThis.fetch };
  umgebung.window = umgebung;
  createContext(umgebung);
  runInContext(treffer[1], umgebung, { filename: "xfact.html#xfact-fachlogik" });
  return umgebung.XFact;
}

let geladen: any;
const XF = () => (geladen ??= ladeFachlogik());

/** Antwort der KI für eine einfache, vollständige Rechnung; "teil" überschreibt (Objekte Feld für Feld) */
export function musterAntwort(teil: object = {}) {
  const basis = {
    rechnung: { nummer: "2026-0153", datum: "2026-09-12", art: "380", waehrung: "EUR", faellig: "2026-09-26" },
    verkaeufer: { name: "Muster GmbH", strasse: "Hauptstr. 1", plz: "20095", ort: "Hamburg", land: "DE", ustId: "DE123456789",
      email: "info@muster.example", telefon: "040 123456", kontakt: "Max Muster" },
    kaeufer: { name: "Berg GmbH", strasse: "Alte Ziegelei 21", plz: "51491", ort: "Overath", land: "DE", email: "rechnung@berg.example" },
    zahlung: { art: "ueberweisung", konten: [{ iban: "DE89370400440532013000", bic: "", inhaber: "" }] },
    positionen: [{ posNr: "1", name: "Montage", beschreibung: "", notiz: "", artikelnummer: "", kundenArtikelnummer: "", gtin: "",
      ursprungsland: "", merkmale: [], objekt: "", bestellposition: "", buchungsreferenz: "", menge: 2, einheitText: "Std",
      einheitCode: "HUR", nettopreis: 50, bruttopreis: 0, preisnachlass: 0, basismenge: 0, nachlaesse: [], zuschlaege: [],
      gesamt: 100, steuerkategorie: "S", steuersatz: 19, von: "2026-09-07", bis: "2026-09-07" }],
  };
  return ueber(leer(XF().KI_SCHEMA), ueber(basis, teil));
}

/** Befund zu musterAntwort (wie ihn befundAusKi liefert); "text" ist der Rechnungstext */
export function musterBefund(teil: object = {}, text = "") {
  return XF().befundAusKi(musterAntwort(teil), text);
}

/** Eine vollständige, gültige Rechnung (wie baueRechnung sie liefert); "aenderung" ersetzt Felder der obersten Ebene */
export function musterRechnung(aenderung: object = {}) {
  return { ...XF().baueRechnung(musterBefund(), {}), ...aenderung };
}

/** Aufgezeichnete Antwort von KI und Prüfer zu einer Beispielrechnung (siehe aufzeichnen.mjs). */
export function beispiel(name: string): { modell: string; befund: any; pruefung: any } {
  return JSON.parse(readFileSync(join(__dirname, "ki-antworten", `${name}.json`), "utf8"));
}

/**
 * Lädt den Fachlogik-Teil von XFactViewer.html (<script id="viewer-fachlogik">)
 * und gibt window.XFactViewer zurück. Den XML-Parser des Browsers ersetzt
 * @xmldom/xmldom.
 */
export function ladeViewer(): any {
  const html = readFileSync(join(__dirname, "..", "XFactViewer.html"), "utf8");
  const treffer = /<script type="module" id="viewer-fachlogik">([\s\S]*?)<\/script>/.exec(html);
  if (!treffer) throw new Error('<script id="viewer-fachlogik"> nicht in XFactViewer.html gefunden');
  const umgebung: any = { console, DOMParser };
  umgebung.window = umgebung;
  createContext(umgebung);
  runInContext(treffer[1], umgebung, { filename: "XFactViewer.html#viewer-fachlogik" });
  return umgebung.XFactViewer;
}
