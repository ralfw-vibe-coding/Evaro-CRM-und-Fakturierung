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
