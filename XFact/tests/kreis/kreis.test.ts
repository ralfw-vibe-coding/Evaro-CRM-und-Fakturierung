import { describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ladeFachlogik, ladeViewer } from "../fachlogik";
// @ts-ignore – reines JavaScript, auch von den Skripten benutzt
import { MUSTER, musterAntwort } from "./muster.mjs";
// @ts-ignore
import { vergleiche } from "./vergleich.mjs";

/**
 * Kreis-Test: Jede Musterrechnung wird zur XRechnung, als PDF gedruckt, von
 * XFact mit KI und Prüfer gelesen und wieder zur XRechnung. Beide XRechnungen
 * müssen Feld für Feld übereinstimmen.
 *
 * Die Antworten von KI und Prüfer sind aufgezeichnet (antworten/), die PDFs
 * liegen in pdf/. Neu aufzeichnen:
 *   node XFact/tests/kreis/aufzeichnen.mjs <datei-mit-openrouter-schlüssel>
 * Die XML-Dateien landen in .kosit/generated/kreis/ für den KoSIT-Validator.
 */

const X = ladeFachlogik();
const V = ladeViewer();
const AUSGABE = join(__dirname, "../../../.kosit/generated/kreis");
mkdirSync(AUSGABE, { recursive: true });

const felder = (xml: string) => V.felderDerRechnung(V.leseXRechnung(xml));
const original = (name: string) => X.erzeugeXml(X.baueRechnung(X.befundAusKi(musterAntwort(name, X.KI_SCHEMA), ""), {}));
const aufgezeichnet = (name: string) => JSON.parse(readFileSync(join(__dirname, "antworten", `${name}.json`), "utf8"));

describe("Kreis: XRechnung → PDF → XFact → XRechnung", () => {
  for (const name of Object.keys(MUSTER)) {
    it(name, () => {
      const xml = original(name);
      writeFileSync(join(AUSGABE, `${name}.xml`), xml);
      const { befund, pruefung } = aufgezeichnet(name);
      const r = X.baueRechnung(befund, {});
      expect(X.pruefeRechnung(r)).toEqual([]);
      expect(vergleiche(felder(xml), felder(X.erzeugeXml(r)))).toEqual({ abweichungen: [], fehlend: [], zusaetzlich: [] });
      // Nichts, was die KI nicht zuordnen konnte, keine Rechen- oder Formfehler
      const hinweise = X.hinweiseZurRechnung(r, befund, new Set(), pruefung).filter((h: any) => h.stufe !== "ok");
      const vomPruefer = (h: any) => h.text === X.TEXTE.pruefer.nichtBestaetigt || h.text.startsWith("Prüfer meint");
      expect(hinweise.filter((h: any) => !vomPruefer(h))).toEqual([]);
      // Der Prüfer ist ein Urteil mit Schwelle: bei rund 50 Fragen ist ein Grenzfall knapp darunter möglich, mehr nicht
      expect(hinweise.filter(vomPruefer).length).toBeLessThanOrEqual(1);
    });
  }

  it("die Muster enthalten zusammen jedes Feld der Norm, das XFact aus einer Rechnung liest", () => {
    const gesehen = new Set(Object.keys(MUSTER).flatMap((name) => Object.keys(felder(original(name))).map((k) => k.split("/").pop())));
    const gelesen = X.STANDARD.filter(([, , umsetzung]: string[]) => umsetzung === "ki").map(([nr]: string[]) => nr);
    expect(gelesen.filter((nr: string) => !gesehen.has(nr))).toEqual([]);
  });
});
