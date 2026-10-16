import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

/**
 * Jedes Skript darf nur Namen verwenden, die es selbst definiert, aus
 * window.XFact bzw. window.XFactViewer holt oder die der Browser kennt.
 * Sonst gibt es erst beim Klicken einen Fehler – so geschehen, als der
 * Ablauf runde() aufrief, das nur in der Fachlogik steht.
 *
 * Geprüft wird mit dem TypeScript-Compiler (checkJs); ausgewertet wird nur
 * die Meldung "Cannot find name …", andere Typfehler zählen nicht.
 */

const DATEIEN = ["xfact.html", "XFactViewer.html"];
// "Cannot find name 'x'", "… Did you mean 'y'?", "… Do you need to install type definitions …"
const NICHT_GEFUNDEN = new Set([2304, 2552, 2580, 2581, 2582]);

/** Die Skripte einer HTML-Datei: { id: code } */
function skripte(datei: string): Record<string, string> {
  const html = readFileSync(join(__dirname, "..", datei), "utf8");
  return Object.fromEntries([...html.matchAll(/<script type="module" id="([^"]+)">([\s\S]*?)<\/script>/g)].map((t) => [t[1], t[2]]));
}

/** Die Namen, die in den Skripten verwendet, aber nirgends definiert sind: { id: [name, …] } */
function freieNamen(quellen: Record<string, string>): Record<string, string[]> {
  const dateiname = (id: string) => `/skripte/${id}.js`;
  // Wie im Browser: was die Fachlogik unter window ablegt, ist für jedes Skript erreichbar
  const dateien = new Map<string, string>([["/skripte/umgebung.d.ts", "interface Window { XFact: any; XFactViewer: any; pdfjsWorker: any }"]]);
  // "export {}" macht jedes Skript zum Modul wie im Browser (type="module"): eigene Namen kollidieren nicht
  for (const [id, code] of Object.entries(quellen)) dateien.set(dateiname(id), `${code}\nexport {};\n`);

  const optionen: ts.CompilerOptions = {
    allowJs: true, checkJs: true, noEmit: true, types: [],
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    lib: ["lib.es2023.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
  };
  const host = ts.createCompilerHost(optionen);
  const lesen = host.readFile.bind(host);
  const vorhanden = host.fileExists.bind(host);
  const quelle = host.getSourceFile.bind(host);
  host.readFile = (f) => dateien.get(f) ?? lesen(f);
  host.fileExists = (f) => dateien.has(f) || vorhanden(f);
  host.getSourceFile = (f, sprache, ...rest) => (dateien.has(f)
    ? ts.createSourceFile(f, dateien.get(f)!, sprache, true)
    : quelle(f, sprache, ...rest));

  const programm = ts.createProgram([...dateien.keys()], optionen, host);
  return Object.fromEntries(Object.keys(quellen).map((id) => {
    const namen = programm.getSemanticDiagnostics(programm.getSourceFile(dateiname(id)))
      .filter((d) => NICHT_GEFUNDEN.has(d.code))
      .map((d) => /'([^']+)'/.exec(ts.flattenDiagnosticMessageText(d.messageText, "\n"))?.[1] ?? String(d.code));
    return [id, [...new Set(namen)]];
  }));
}

describe("keine undefinierten Namen", () => {
  const alle = Object.assign({}, ...DATEIEN.map(skripte));
  const ergebnis = freieNamen(alle);

  for (const id of Object.keys(alle)) {
    it(id, () => {
      expect(ergebnis[id]).toEqual([]);
    });
  }

  it("Gegenprobe: findet einen Aufruf, den es im Skript nicht gibt", () => {
    const { "xfact-ablauf": ablauf } = skripte("xfact.html");
    const mitFehler = freieNamen({ "probe": `${ablauf}\nconst summe = runde(1.234) + gibtEsNicht;` });
    expect(mitFehler.probe).toEqual(["runde", "gibtEsNicht"]);
  });
});
