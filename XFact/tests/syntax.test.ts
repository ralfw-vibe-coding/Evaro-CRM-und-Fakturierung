import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Script } from "node:vm";

/**
 * Die Tests laufen gegen den Fachlogik-Teil. Damit ein Tippfehler im
 * Ablauf-Teil (Bedienung) nicht erst im Browser auffällt, werden hier alle
 * Skripte von xfact.html und XFactViewer.html übersetzt – ohne sie auszuführen.
 */
for (const [datei, teile] of [["xfact.html", ["xfact-fachlogik", "xfact-ablauf"]], ["XFactViewer.html", ["viewer-fachlogik", "viewer-ablauf"]]] as const) {
  describe(datei, () => {
    const html = readFileSync(join(__dirname, "..", datei), "utf8");
    const skripte = [...html.matchAll(/<script type="module" id="([^"]+)">([\s\S]*?)<\/script>/g)];

    it("hat Fachlogik und Ablauf", () => {
      expect(skripte.map((s) => s[1])).toEqual(teile);
    });

    for (const [, id, code] of skripte) {
      it(`${id}: Syntax ist in Ordnung`, () => {
        expect(() => new Script(code, { filename: `${datei}#${id}` })).not.toThrow();
      });
    }
  });
}
