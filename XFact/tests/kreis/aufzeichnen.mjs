#!/usr/bin/env node
/**
 * Kreis-Test, Aufzeichnung: Musterrechnung → XRechnung → PDF → XFact (echte KI
 * und Prüfer) → XRechnung. Speichert je Muster das PDF und die Antworten von
 * KI und Prüfer; der Test kreis.test.ts vergleicht danach ohne Netz Feld für Feld.
 *
 * Aufruf: node XFact/tests/kreis/aufzeichnen.mjs <datei-mit-openrouter-schlüssel> [Mustername …]
 * Der Schlüssel wird nicht gespeichert.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";
import { DOMParser } from "@xmldom/xmldom";
import { MUSTER, musterAntwort } from "./muster.mjs";
import { alsPdf } from "./als-pdf.mjs";
import { vergleiche } from "./vergleich.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..", "..");
const pdfjs = await import(join(WURZEL, "node_modules/pdfjs-dist/legacy/build/pdf.mjs"));

function lade(datei, id, umgebung) {
  const code = new RegExp(`<script type="module" id="${id}">([\\s\\S]*?)</script>`).exec(readFileSync(join(HIER, "..", "..", datei), "utf8"))[1];
  umgebung.window = umgebung;
  createContext(umgebung);
  runInContext(code, umgebung);
  return umgebung;
}
const X = lade("xfact.html", "xfact-fachlogik", { console, setTimeout, clearTimeout, AbortController, URL, fetch }).XFact;
const V = lade("XFactViewer.html", "viewer-fachlogik", { console, DOMParser }).XFactViewer;

const einstellungen = { endpunkt: X.KI.endpunkt, modell: X.KI.modell, schluessel: readFileSync(process.argv[2], "utf8").trim(), jev: true };
const namen = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(MUSTER);
mkdirSync(join(HIER, "pdf"), { recursive: true });
mkdirSync(join(HIER, "antworten"), { recursive: true });

for (const name of namen) {
  const original = X.erzeugeXml(X.baueRechnung(X.befundAusKi(musterAntwort(name, X.KI_SCHEMA), ""), {}));
  const pdf = await alsPdf(V.leseXRechnung(original, DOMParser), V);
  writeFileSync(join(HIER, "pdf", `${name}.pdf`), pdf);
  const text = X.alsLayoutText(await X.lesePdf(new Uint8Array(pdf), pdfjs));
  const t0 = Date.now();
  const befund = await X.frageKi(text, einstellungen);
  const t1 = Date.now();
  const pruefung = await X.frageJev(X.baueRechnung(befund, {}), text, einstellungen);
  writeFileSync(join(HIER, "antworten", `${name}.json`), JSON.stringify({ modell: X.KI.modell, befund, pruefung }, null, 1));

  const neu = X.erzeugeXml(X.baueRechnung(befund, {}));
  const { abweichungen, fehlend, zusaetzlich } = vergleiche(V.felderDerRechnung(V.leseXRechnung(original, DOMParser)), V.felderDerRechnung(V.leseXRechnung(neu, DOMParser)));
  const zweifel = Object.entries(pruefung?.felder || {}).filter(([id, f]) => {
    const a = pruefung.antworten[id];
    return a && (f.art === "noul" ? a.noul < X.KI.jevSchwelle : a.choice !== f.erwartet);
  }).map(([id]) => id);
  console.log(`\n${name}: KI ${((t1 - t0) / 1000).toFixed(1)} s · ${abweichungen.length} abweichend, ${fehlend.length} fehlend, ${zusaetzlich.length} zusätzlich · Prüfer-Zweifel: ${zweifel.join(", ") || "keine"}`);
  for (const [feld, soll, ist] of abweichungen) console.log(`  ≠ ${feld}: ${JSON.stringify(soll)} → ${JSON.stringify(ist)}`);
  for (const [feld, soll] of fehlend) console.log(`  − ${feld}: ${JSON.stringify(soll)}`);
  for (const [feld, ist] of zusaetzlich) console.log(`  + ${feld}: ${JSON.stringify(ist)}`);
  if (befund.nichtZugeordnet.length) console.log(`  nicht zugeordnet: ${befund.nichtZugeordnet.map((n) => n.text).join(" | ")}`);
}
