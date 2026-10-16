import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { ladeFachlogik } from "./fachlogik";

/** PDF lesen: Text so, wie ihn die KI bekommt. */

const XFact = ladeFachlogik();
const BEISPIELE = join(__dirname, "../../requirements/XRechnungen/Beispiel-PDFs");

describe("PDF lesen", () => {
  it("liest eine Beispielrechnung als spaltentreuen Text", async () => {
    const pdf = await XFact.lesePdf(new Uint8Array(readFileSync(join(BEISPIELE, "INV 753 Berg GmbH & Co. KG.pdf"))), pdfjs);
    expect(XFact.hatText(pdf)).toBe(true);
    const text = XFact.alsLayoutText(pdf);
    expect(text).toMatch(/Rechnung Nr\. 0000000753/);
    expect(text).toMatch(/Berg GmbH & Co\. KG\s+Work With Ease EOOD/);
  });

  it("entfernt doppelt gedruckte Textstücke (Fettschrift mancher Programme)", () => {
    const stueck = (text: string, x: number, y: number) => ({ text, x, x2: x + 30, y, groesse: 10 });
    const ohne = XFact.ohneDoppelte([stueck("Total", 345, 535), stueck("Total", 345.4, 535.2), stueck("600,00", 523, 535), stueck("Total", 345, 700)]);
    expect(ohne.map((s: any) => `${s.text}@${s.y}`)).toEqual(["Total@535", "600,00@535", "Total@700"]);
  });
});
