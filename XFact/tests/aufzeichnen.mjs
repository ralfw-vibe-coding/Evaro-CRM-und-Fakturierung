#!/usr/bin/env node
/**
 * Zeichnet echte Antworten von KI und Prüfer für die Beispielrechnungen auf.
 * Die Tests laufen danach ohne Netz gegen diese Aufzeichnungen.
 *
 * Benutzt genau die Funktionen aus xfact.html (frageKi, frageJev).
 * Aufruf: node XFact/tests/aufzeichnen.mjs <datei-mit-openrouter-schlüssel>
 * Der Schlüssel wird nicht gespeichert.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..");
const pdfjs = await import(join(WURZEL, "node_modules/pdfjs-dist/legacy/build/pdf.mjs"));
const html = readFileSync(join(HIER, "..", "xfact.html"), "utf8");
const code = /<script type="module" id="xfact-fachlogik">([\s\S]*?)<\/script>/.exec(html)[1];
const umgebung = { console, setTimeout, clearTimeout, AbortController, URL, fetch };
umgebung.window = umgebung;
createContext(umgebung);
runInContext(code, umgebung);
const X = umgebung.XFact;

const einstellungen = { endpunkt: X.KI.endpunkt, modell: X.KI.modell, schluessel: readFileSync(process.argv[2], "utf8").trim(), jev: true };
const ordner = join(WURZEL, "requirements/XRechnungen/Beispiel-PDFs");
for (const datei of readdirSync(ordner).filter((d) => d.endsWith(".pdf"))) {
  const pdf = await X.lesePdf(new Uint8Array(readFileSync(join(ordner, datei))), pdfjs);
  const text = X.alsLayoutText(pdf);
  const t0 = Date.now();
  const befund = await X.frageKi(text, einstellungen);
  const t1 = Date.now();
  const pruefung = await X.frageJev(X.baueRechnung(befund, {}), text, einstellungen);
  const t2 = Date.now();
  const name = datei.match(/INV \d+/)[0].replace(" ", "");
  writeFileSync(join(HIER, "ki-antworten", `${name}.json`), JSON.stringify({ modell: X.KI.modell, befund, pruefung }, null, 1));
  const zweifel = Object.entries(pruefung?.felder || {}).filter(([id, f]) => {
    const a = pruefung.antworten[id];
    return a && (f.art === "noul" ? a.noul < X.KI.jevSchwelle : a.choice !== f.erwartet);
  }).map(([id]) => id);
  console.log(`${name}: KI ${((t1 - t0) / 1000).toFixed(1)} s, Prüfer ${((t2 - t1) / 1000).toFixed(1)} s, ${Object.keys(pruefung?.felder || {}).length} Prüffragen, Zweifel: ${zweifel.join(", ") || "keine"}${pruefung?.fehler ? " FEHLER " + pruefung.fehler : ""}`);
}
