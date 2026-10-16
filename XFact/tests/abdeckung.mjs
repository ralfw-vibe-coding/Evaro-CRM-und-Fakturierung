#!/usr/bin/env node
/**
 * Schreibt den Anhang "Welche Felder der XRechnung XFact abdeckt" der
 * Dokumentation neu, aus der Liste STANDARD in xfact.html.
 * Aufruf: node XFact/tests/abdeckung.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";

const HIER = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(HIER, "..", "xfact.html"), "utf8");
const code = /<script type="module" id="xfact-fachlogik">([\s\S]*?)<\/script>/.exec(html)[1];
const umgebung = { console, setTimeout, clearTimeout, AbortController, URL };
umgebung.window = umgebung;
createContext(umgebung);
runInContext(code, umgebung);

export const UEBERSCHRIFT = "## Anhang: Welche Felder der XRechnung XFact abdeckt";
const wie = { ki: "liest XFact aus der Rechnung", xfact: "setzt XFact selbst", nein: "nicht unterstützt" };

export function anhang(STANDARD) {
  const zaehle = (u) => STANDARD.filter((e) => e[2] === u).length;
  return [
    UEBERSCHRIFT, "",
    `Die Norm EN 16931 (mit XRechnung 3.0) kennt ${STANDARD.length} Felder (BT). Davon liest XFact ${zaehle("ki")} aus der Rechnung, ${zaehle("xfact")} setzt es selbst, ${zaehle("nein")} unterstützt es bewusst nicht. Diese Liste steht als Abschnitt STANDARD in xfact.html und wird von dort hierher übernommen.`, "",
    "| Feld | Bedeutung | XFact | Hinweis |", "|---|---|---|---|",
    ...STANDARD.map(([nr, name, umsetzung, hinweis]) => `| ${nr} | ${name} | ${wie[umsetzung]} | ${hinweis || ""} |`),
    "",
  ].join("\n");
}

const datei = join(HIER, "..", "XFact-Dokumentation.md");
const doku = readFileSync(datei, "utf8");
const neu = anhang(umgebung.XFact.STANDARD);
const stelle = doku.indexOf(UEBERSCHRIFT);
writeFileSync(datei, (stelle >= 0 ? doku.slice(0, stelle) : `${doku.trimEnd()}\n\n`) + neu);
console.log("Anhang geschrieben:", umgebung.XFact.STANDARD.length, "Felder");
