import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Script } from "node:vm";

/**
 * Die Tests laufen gegen den Fachlogik-Teil. Damit ein Tippfehler im
 * Ablauf-Teil (Bedienung) nicht erst im Browser auffällt, werden hier alle
 * Skripte von xfact.html übersetzt – ohne sie auszuführen.
 */
describe("xfact.html", () => {
  const html = readFileSync(join(__dirname, "..", "xfact.html"), "utf8");
  const skripte = [...html.matchAll(/<script type="module" id="([^"]+)">([\s\S]*?)<\/script>/g)];

  it("hat Fachlogik und Ablauf", () => {
    expect(skripte.map((s) => s[1])).toEqual(["xfact-fachlogik", "xfact-ablauf"]);
  });

  for (const [, id, code] of skripte) {
    it(`${id}: Syntax ist in Ordnung`, () => {
      expect(() => new Script(code, { filename: `xfact.html#${id}` })).not.toThrow();
    });
  }
});
