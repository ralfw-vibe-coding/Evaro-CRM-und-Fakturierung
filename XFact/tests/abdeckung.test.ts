import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ladeFachlogik } from "./fachlogik";

/**
 * Die Liste STANDARD in xfact.html enthält jedes Feld der Norm genau einmal,
 * und der Anhang der Dokumentation stimmt mit ihr überein.
 * Den Anhang neu schreiben: node XFact/tests/abdeckung.mjs
 */

const X = ladeFachlogik();

describe("Abdeckung der Norm", () => {
  it("jedes Feld BT-1 … BT-165 (ohne BT-4) genau einmal", () => {
    const nummern = X.STANDARD.map(([nr]: string[]) => nr);
    const soll = Array.from({ length: 165 }, (_, i) => `BT-${i + 1}`).filter((nr) => nr !== "BT-4");
    expect([...nummern].sort()).toEqual([...soll].sort());
    expect(X.STANDARD.every(([, , umsetzung]: string[]) => ["ki", "xfact", "nein"].includes(umsetzung))).toBe(true);
    // Was XFact nicht unterstützt, hat einen Grund
    expect(X.STANDARD.filter(([, , u, grund]: string[]) => u === "nein" && !grund)).toEqual([]);
  });

  it("jedes Feld, das die KI liest, steht im Antwortschema", () => {
    const schema = JSON.stringify(X.KI_SCHEMA);
    const ohne = X.STANDARD.filter(([nr, , u]: string[]) => u === "ki" && !new RegExp(`\\b${nr}\\b`).test(schema)).map(([nr]: string[]) => nr);
    expect(ohne).toEqual([]);
  });

  it("der Anhang der Dokumentation ist aktuell", () => {
    const doku = readFileSync(join(__dirname, "..", "XFact-Dokumentation.md"), "utf8");
    const fehlt = X.STANDARD.filter(([nr, name]: string[]) => !doku.includes(`| ${nr} | ${name} |`)).map(([nr]: string[]) => nr);
    expect(fehlt).toEqual([]);
  });
});
