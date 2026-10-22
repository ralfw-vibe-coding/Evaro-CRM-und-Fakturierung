import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import YAML from "yaml";

/**
 * Die veröffentlichte OpenAPI-Beschreibung ist das, woran sich fremde Clients
 * und KI-Agenten halten. Eine Route, die hinzukommt, verschwindet oder eine
 * Methode mehr versteht, muss dort nachgezogen werden — sonst beschreibt die
 * Spezifikation irgendwann eine API, die es so nicht mehr gibt, und zwar ohne
 * dass es jemandem auffällt.
 *
 * Dieser Test vergleicht beides: die Portale sind die Wahrheit, die YAML-Datei
 * muss ihr folgen.
 */

const portalsDir = dirname(fileURLToPath(import.meta.url)).replace(/\/__tests$/, "");
const specPath = join(portalsDir, "../../../../frontend/public/api-docs/openapi.yaml");

const HTTP_METHODS = ["get", "post", "patch", "put", "delete"] as const;

interface Portal {
  file: string;
  path: string;
  methods: string[];
}

/**
 * Liest Route und erlaubte Methoden aus einem Portal. Beides steht dort
 * wörtlich: der Pfad in `config.path`, die Methoden in dem
 * `methodNotAllowed([...])`, mit dem jedes Portal endet.
 */
function readPortal(file: string): Portal | null {
  const source = readFileSync(join(portalsDir, file), "utf8");

  const path = /path:\s*"([^"]+)"/.exec(source)?.[1];
  if (!path) return null;

  const allowed = /methodNotAllowed\(\[([^\]]*)\]\)/.exec(source)?.[1];
  const methods = [...(allowed ?? "").matchAll(/"([A-Z]+)"/g)].map((m) => m[1].toLowerCase());

  return { file, path, methods: methods.sort() };
}

const portals = readdirSync(portalsDir)
  .filter((file) => file.endsWith(".mts"))
  .map(readPortal)
  .filter((portal): portal is Portal => portal !== null);

const spec = YAML.parse(readFileSync(specPath, "utf8"));

function specMethods(path: string): string[] {
  const entry = spec.paths?.[path];
  if (!entry) return [];
  return HTTP_METHODS.filter((method) => entry[method]).sort();
}

describe("openapi.yaml beschreibt die tatsächlichen Portale", () => {
  it("findet überhaupt Portale und eine lesbare Spezifikation", () => {
    // Griffe ins Leere würden jede Zusicherung unten wertlos machen.
    expect(portals.length).toBeGreaterThan(10);
    portals.forEach((portal) => expect(portal.methods.length).toBeGreaterThan(0));
    expect(spec.openapi).toMatch(/^3\./);
  });

  it.each(portals.map((portal) => [portal.path, portal]))(
    "%s steht mit allen Methoden in der Spezifikation",
    (_path, portal) => {
      expect(specMethods(portal.path)).toEqual(portal.methods);
    },
  );

  it("beschreibt keine Pfade, die es nicht gibt", () => {
    const real = new Set(portals.map((portal) => portal.path));
    expect(Object.keys(spec.paths ?? {}).filter((path) => !real.has(path))).toEqual([]);
  });

  it("gibt jeder Operation eine eindeutige operationId", () => {
    // Agenten und Codegeneratoren adressieren Operationen darüber; doppelte
    // oder fehlende IDs brechen sie still.
    const ids = Object.values(spec.paths ?? {}).flatMap((entry) =>
      HTTP_METHODS.filter((method) => (entry as Record<string, unknown>)[method]).map(
        (method) => ((entry as Record<string, { operationId?: string }>)[method]).operationId,
      ),
    );
    expect(ids.filter((id) => !id)).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
