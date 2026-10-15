#!/usr/bin/env node
/**
 * Bettet die Fremdbibliotheken in XFact/xfact.html ein.
 *
 * xfact.html ist eine einzige, eigenständige Datei: Sie soll ohne Internet
 * laufen und ohne Build-Schritt bearbeitet werden können. Deshalb stehen die
 * Bibliotheken als Text am Ende der Datei, zwischen den Markierungen
 * "BIBLIOTHEKEN: ANFANG" und "BIBLIOTHEKEN: ENDE". Dieses Skript ersetzt
 * alles dazwischen; der Rest der Datei bleibt unberührt.
 *
 * Aufruf (nach einem Update von pdfjs-dist):
 *   npm run xfact:bibliotheken
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = fileURLToPath(new URL("..", import.meta.url));
const HTML = join(WURZEL, "XFact", "xfact.html");
const PDFJS = join(WURZEL, "node_modules", "pdfjs-dist");

const ANFANG = "<!-- === BIBLIOTHEKEN: ANFANG";
const ENDE = "<!-- === BIBLIOTHEKEN: ENDE === -->";

const version = JSON.parse(await readFile(join(PDFJS, "package.json"), "utf8")).version;
const bibliotheken = [
  { id: "bibliothek-pdfjs", datei: "build/pdf.min.mjs" },
  { id: "bibliothek-pdfjs-worker", datei: "build/pdf.worker.min.mjs" },
];

let block = `${ANFANG} =================================================
     Eingebettete Fremdbibliotheken. NICHT ÄNDERN.
     Dieser Block wird von scripts/xfact-bibliotheken.mjs erzeugt.
     pdf.js ${version} (Apache-Lizenz 2.0, Mozilla Foundation)
     ========================================================================= -->
`;
for (const { id, datei } of bibliotheken) {
  const quelltext = await readFile(join(PDFJS, datei), "utf8");
  // Als <script type="text/plain"> eingebettet: Der Browser führt den Text
  // nicht aus, die App lädt ihn bei Bedarf als Modul. Diese Zeichenfolgen
  // würden das HTML vorzeitig beenden bzw. den Parser verwirren.
  for (const verboten of ["</script", "<!--", "<script"]) {
    if (quelltext.toLowerCase().includes(verboten)) {
      throw new Error(`${datei} enthält "${verboten}" und kann so nicht eingebettet werden.`);
    }
  }
  block += `<script type="text/plain" id="${id}">\n${quelltext}\n</script>\n`;
}
block += ENDE;

const html = await readFile(HTML, "utf8");
const von = html.indexOf(ANFANG);
const bis = html.indexOf(ENDE);
if (von < 0 || bis < von) throw new Error("Markierungen BIBLIOTHEKEN: ANFANG/ENDE nicht gefunden.");

await writeFile(HTML, html.slice(0, von) + block + html.slice(bis + ENDE.length));
const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(`pdf.js ${version} eingebettet, xfact.html ist jetzt ${kb((await readFile(HTML)).length)}.`);
