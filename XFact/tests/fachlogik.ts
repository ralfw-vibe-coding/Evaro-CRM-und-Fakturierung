import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createContext, runInContext } from "node:vm";

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
  const umgebung: any = { console };
  umgebung.window = umgebung;
  createContext(umgebung);
  runInContext(treffer[1], umgebung, { filename: "xfact.html#xfact-fachlogik" });
  return umgebung.XFact;
}

/**
 * Baut ein "gelesenes PDF" aus Textzeilen, wie es lesePdf() liefert.
 * Jede Zeile ist ein Text (bei x = 50) oder eine Liste von Stücken [x, text].
 * Die Zeilen liegen 14 pt auseinander, die Schrift ist 10 pt groß.
 */
export function pdfAus(XFact: any, ...zeilen: (string | [number, string][])[]) {
  const stuecke = zeilen.flatMap((zeile, i) => {
    const teile = typeof zeile === "string" ? [[50, zeile] as [number, string]] : zeile;
    return teile.map(([x, text]) => ({ text, x, x2: x + text.length * 5, y: 40 + i * 14, groesse: 10 }));
  });
  return { seiten: [{ breite: 595, hoehe: 842, zeilen: XFact.zuZeilen(stuecke) }] };
}
