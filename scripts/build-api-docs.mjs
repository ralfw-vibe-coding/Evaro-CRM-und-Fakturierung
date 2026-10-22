#!/usr/bin/env node
/**
 * Erzeugt aus der OpenAPI-Beschreibung eine vollständige, statische HTML-Seite.
 *
 * Warum nicht einfach ein Renderer aus dem CDN: Die Seite richtet sich
 * ausdrücklich auch an KI-Agenten, und die führen kein JavaScript aus. Eine
 * Seite, die ihren Inhalt erst im Browser zusammensetzt, ist für sie leer —
 * und für jeden, dessen Browser das CDN blockiert, ebenfalls.
 *
 * Läuft als Teil von `npm run build`; das Ergebnis wird mit eingecheckt,
 * damit die Seite auch ohne Build im Repository steht.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const specPath = join(root, "frontend/public/api-docs/openapi.yaml");
const outPath = join(root, "frontend/public/api-docs/index.html");

const spec = YAML.parse(readFileSync(specPath, "utf8"));

const METHODS = ["get", "post", "patch", "put", "delete"];

// ── Hilfen ────────────────────────────────────────────────────────────────

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Folgt einem lokalen $ref. Fremde Dokumente kommen hier nicht vor. */
function deref(node) {
  let current = node;
  const seen = new Set();
  while (current && typeof current === "object" && typeof current.$ref === "string") {
    if (seen.has(current.$ref)) throw new Error(`Zirkulärer $ref: ${current.$ref}`);
    seen.add(current.$ref);
    let target = spec;
    for (const segment of current.$ref.slice(2).split("/")) target = target?.[segment];
    if (target === undefined) throw new Error(`$ref zeigt ins Leere: ${current.$ref}`);
    current = target;
  }
  return current;
}

function refName(node) {
  const match = /^#\/components\/schemas\/(.+)$/.exec(node?.$ref ?? "");
  return match?.[1];
}

function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Die Teilmenge Markdown, die in den Beschreibungen tatsächlich vorkommt:
 * Überschriften, Absätze, Aufzählungen, nummerierte Listen, `code`,
 * **fett**, [Links](…).
 */
function markdown(text) {
  if (!text) return "";

  const inline = (raw) =>
    esc(raw)
      .replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>');

  const html = [];
  let list = null; // "ul" | "ol" | null
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      html.push(`</${list}>`);
      list = null;
    }
  };

  for (const rawLine of String(text).split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      // Die Seite führt bereits h1 je Bereich; Überschriften aus den
      // Beschreibungen setzen daher eine Stufe tiefer an.
      const level = Math.min(heading[1].length + 1, 5);
      html.push(`<h${level} class="md">${inline(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = /^[*-]\s+(.*)$/.exec(line);
    const numbered = /^\d+\.\s+(.*)$/.exec(line);

    if (bullet || numbered) {
      flushParagraph();
      const wanted = bullet ? "ul" : "ol";
      if (list !== wanted) {
        flushList();
        html.push(`<${wanted}>`);
        list = wanted;
      }
      html.push(`<li>${inline((bullet ?? numbered)[1])}</li>`);
      continue;
    }

    // Fortsetzungszeile einer Aufzählung (eingerückt im YAML-Block).
    if (list && /^\s/.test(rawLine)) {
      const last = html.length - 1;
      html[last] = html[last].replace(/<\/li>$/, ` ${inline(line)}</li>`);
      continue;
    }

    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return html.join("\n");
}

/** Kurze Typangabe für die Feldtabellen. */
function typeLabel(schema) {
  const name = refName(schema);
  if (name) return `<a href="#schema-${slug(name)}">${esc(name)}</a>`;

  const node = deref(schema);
  if (!node) return "—";

  if (node.allOf?.length === 1) return typeLabel(node.allOf[0]);
  if (node.enum) return node.enum.map((value) => `<code>${esc(value)}</code>`).join(" | ");

  const type = Array.isArray(node.type) ? node.type.join(" | ") : node.type;
  if (type === "array") return `Liste von ${typeLabel(node.items ?? {})}`;
  if (node.const !== undefined) return `<code>${esc(node.const)}</code>`;

  return esc([type ?? "beliebig", node.format].filter(Boolean).join(", "));
}

/** Tabelle der Eigenschaften eines Objektschemas. */
function propertyTable(schema) {
  const node = deref(schema);
  const properties = node?.properties;
  if (!properties) return "";

  const required = new Set(node.required ?? []);
  const rows = Object.entries(properties).map(([name, raw]) => {
    const child = deref(raw);
    const notes = [
      child?.description,
      child?.deprecated ? "**Veraltet.**" : null,
      child?.default !== undefined ? `Vorgabe: \`${child.default}\`.` : null,
    ].filter(Boolean).join("\n\n");

    return `<tr>
  <td><code>${esc(name)}</code>${required.has(name) ? ' <span class="req">Pflicht</span>' : ""}</td>
  <td>${typeLabel(raw)}</td>
  <td>${markdown(notes) || "—"}</td>
</tr>`;
  });

  return `<table>
<thead><tr><th>Feld</th><th>Typ</th><th>Bedeutung</th></tr></thead>
<tbody>
${rows.join("\n")}
</tbody>
</table>`;
}

/** Request-Body, inklusive der oneOf/anyOf-Varianten. */
function requestBody(operation) {
  const schema = operation.requestBody?.content?.["application/json"]?.schema;
  if (!schema) return "";

  const node = deref(schema);
  const variants = node.oneOf ?? node.anyOf;

  let body;
  if (variants) {
    // Die Felder können am Elternschema hängen, während oneOf/anyOf nur die
    // zulässigen Pflichtkombinationen aufzählt. Dann gehören beide Teile auf
    // die Seite — sonst stünde die Variante ohne ein einziges Feld da.
    const shared = propertyTable(schema);
    const kind = node.oneOf ? "Genau eine dieser Formen" : "Mindestens eine dieser Formen";
    body = shared + `<p class="variants">${kind}:</p>` + variants
      .map((variant, index) => {
        const child = deref(variant);
        const title = child.title ?? `Variante ${index + 1}`;
        const keys = (child.required ?? []).map((key) => `<code>${esc(key)}</code>`).join(", ");
        return `<div class="variant">
  <h4>${esc(title)}</h4>
  ${keys ? `<p class="keys">erkannt an ${keys}</p>` : ""}
  ${propertyTable(variant)}
</div>`;
      })
      .join("\n");
  } else {
    body = propertyTable(schema);
  }

  const example = operation.requestBody.content["application/json"].example;
  const exampleHtml = example
    ? `<p class="label">Beispiel</p><pre><code>${esc(JSON.stringify(example, null, 2))}</code></pre>`
    : "";

  return `<h3>Request-Body</h3>${body}${exampleHtml}`;
}

function responses(operation) {
  const rows = Object.entries(operation.responses ?? {}).map(([status, raw]) => {
    const response = deref(raw);
    const schema = response.content?.["application/json"]?.schema;
    const name = refName(schema);
    const shape = name
      ? `<a href="#schema-${slug(name)}">${esc(name)}</a>`
      : schema
        ? Object.keys(deref(schema).properties ?? {}).map((key) => `<code>${esc(key)}</code>`).join(", ") || "—"
        : "—";
    const code = Number(status);
    const tone = code < 300 ? "ok" : code < 500 ? "warn" : "bad";
    return `<tr>
  <td><span class="status ${tone}">${esc(status)}</span></td>
  <td>${markdown(response.description) || "—"}</td>
  <td>${shape}</td>
</tr>`;
  });

  return `<h3>Antworten</h3>
<table>
<thead><tr><th>Status</th><th>Bedeutung</th><th>Inhalt</th></tr></thead>
<tbody>
${rows.join("\n")}
</tbody>
</table>`;
}

// ── Seite zusammensetzen ──────────────────────────────────────────────────

const operations = [];
for (const [path, entry] of Object.entries(spec.paths ?? {})) {
  for (const method of METHODS) {
    if (entry[method]) operations.push({ path, method, operation: entry[method] });
  }
}

const byTag = new Map((spec.tags ?? []).map((tag) => [tag.name, { tag, items: [] }]));
for (const item of operations) {
  for (const name of item.operation.tags ?? ["Weitere"]) {
    if (!byTag.has(name)) byTag.set(name, { tag: { name }, items: [] });
    byTag.get(name).items.push(item);
  }
}

function operationSection({ path, method, operation }) {
  const id = operation.operationId ? `op-${slug(operation.operationId)}` : `op-${slug(method + path)}`;
  const auth =
    operation.security?.length === 0
      ? "keine — offen zugänglich"
      : operation.security
        ? operation.security.map((s) => `<code>${esc(Object.keys(s)[0])}</code>`).join(" oder ")
        : "<code>apiKey</code> oder <code>bearerAuth</code>";

  const parameters = (operation.parameters ?? []).map((raw) => {
    const parameter = deref(raw);
    return `<tr>
  <td><code>${esc(parameter.name)}</code>${parameter.required ? ' <span class="req">Pflicht</span>' : ""}</td>
  <td>${esc(parameter.in)}</td>
  <td>${markdown(parameter.description) || "—"}</td>
</tr>`;
  });

  return `<section class="op" id="${id}">
  <h2>
    <span class="method ${esc(method)}">${esc(method.toUpperCase())}</span>
    <code class="path">${esc(path)}</code>
  </h2>
  <p class="summary">${esc(operation.summary ?? "")}</p>
  <p class="meta">
    <span>operationId <code>${esc(operation.operationId ?? "—")}</code></span>
    <span>Anmeldung: ${auth}</span>
  </p>
  ${markdown(operation.description)}
  ${parameters.length ? `<h3>Query-Parameter</h3><table><thead><tr><th>Name</th><th>Ort</th><th>Bedeutung</th></tr></thead><tbody>${parameters.join("\n")}</tbody></table>` : ""}
  ${requestBody(operation)}
  ${responses(operation)}
</section>`;
}

const tagSections = [...byTag.values()]
  .filter((group) => group.items.length > 0)
  .map(
    (group) => `<section class="tag" id="tag-${slug(group.tag.name)}">
  <h1>${esc(group.tag.name)}</h1>
  ${markdown(group.tag.description)}
  ${group.items.map(operationSection).join("\n")}
</section>`,
  );

const schemaSections = Object.entries(spec.components?.schemas ?? {}).map(
  ([name, schema]) => `<section class="schema" id="schema-${slug(name)}">
  <h2>${esc(name)}</h2>
  ${markdown(schema.description)}
  ${propertyTable(schema) || `<p class="muted">${typeLabel(schema)}</p>`}
</section>`,
);

const securitySections = Object.entries(spec.components?.securitySchemes ?? {}).map(
  ([name, scheme]) => `<div class="auth">
  <h3><code>${esc(name)}</code></h3>
  <p class="muted">${esc(scheme.type === "apiKey" ? `Header ${scheme.name}` : `${scheme.scheme} ${scheme.bearerFormat ?? ""}`.trim())}</p>
  ${markdown(scheme.description)}
</div>`,
);

const toc = [...byTag.values()]
  .filter((group) => group.items.length > 0)
  .map(
    (group) => `<li><a href="#tag-${slug(group.tag.name)}">${esc(group.tag.name)}</a>
  <ul>${group.items
    .map(
      ({ path, method, operation }) =>
        `<li><a href="#op-${slug(operation.operationId)}"><span class="method ${esc(method)}">${esc(method.toUpperCase())}</span> ${esc(path)}</a></li>`,
    )
    .join("")}</ul></li>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(spec.info.title)}</title>
<meta name="description" content="${esc(spec.info.summary ?? "")}" />
<link rel="icon" href="/favicon.ico" />
<link rel="alternate" type="application/yaml" href="/api-docs/openapi.yaml" title="OpenAPI 3.1" />
<style>
:root {
  color-scheme: light;
  --brand: #d81b78;
  --bg: #fff;
  --fg: #18181b;
  --muted: #52525b;
  --border: #e4e4e7;
  --soft: #fafafa;
  --code-bg: #f4f4f5;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font: 16px/1.65 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
}
code {
  background: var(--code-bg);
  border-radius: .25rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .875em;
  padding: .1em .35em;
}
pre {
  background: var(--code-bg);
  border-radius: .4rem;
  overflow-x: auto;
  padding: .875rem 1rem;
}
pre code { background: none; padding: 0; }
a { color: var(--brand); }

header { border-bottom: 1px solid var(--border); padding: 2.5rem 16px 2rem; }
.wrap { margin: 0 auto; max-width: 62rem; }
header h1 { font-size: 1.75rem; letter-spacing: -.02em; margin: 0 0 .25rem; }
header h1 span { color: var(--brand); }
.lede { color: var(--muted); margin: 0 0 1.5rem; max-width: 44rem; }
.links { display: flex; flex-wrap: wrap; gap: .5rem; }
.links a {
  border: 1px solid var(--border); border-radius: .4rem; color: inherit;
  font-size: .875rem; padding: .4rem .75rem; text-decoration: none;
}
.links a:hover { border-color: var(--brand); color: var(--brand); }
.links a.primary { background: var(--brand); border-color: var(--brand); color: #fff; }

main { margin: 0 auto; max-width: 62rem; padding: 2.5rem 16px 5rem; }

nav.toc {
  background: var(--soft); border: 1px solid var(--border);
  border-radius: .5rem; margin-bottom: 3rem; padding: 1.25rem 1.5rem;
}
nav.toc h2 { font-size: .8rem; letter-spacing: .06em; margin: 0 0 .75rem; text-transform: uppercase; color: var(--muted); }
nav.toc ul { list-style: none; margin: 0; padding: 0; }
nav.toc > ul > li { margin-bottom: .75rem; }
nav.toc > ul > li > a { font-weight: 600; text-decoration: none; }
nav.toc ul ul { margin: .35rem 0 0; }
nav.toc ul ul li { margin: .15rem 0; }
nav.toc ul ul a { color: var(--muted); font-size: .875rem; text-decoration: none; }
nav.toc ul ul a:hover { color: var(--brand); }

section.tag { margin-bottom: 4rem; }
section.tag > h1 {
  border-bottom: 2px solid var(--brand); font-size: 1.4rem;
  margin: 0 0 1rem; padding-bottom: .5rem;
}

section.op {
  border: 1px solid var(--border); border-radius: .5rem;
  margin: 2rem 0; padding: 1.5rem;
}
section.op > h2 {
  align-items: center; display: flex; flex-wrap: wrap; gap: .6rem;
  font-size: 1rem; margin: 0 0 .5rem;
}
.path { font-size: 1rem; }
.summary { font-size: 1.05rem; font-weight: 600; margin: 0 0 .5rem; }
.meta {
  color: var(--muted); display: flex; flex-wrap: wrap; gap: 1.25rem;
  font-size: .8rem; margin: 0 0 1rem;
}

.method {
  border-radius: .25rem; color: #fff; font-family: ui-monospace, Menlo, monospace;
  font-size: .72rem; font-weight: 700; letter-spacing: .04em; padding: .2em .5em;
}
.method.get { background: #0369a1; }
.method.post { background: #15803d; }
.method.patch { background: #b45309; }
.method.put { background: #b45309; }
.method.delete { background: #b91c1c; }

h3 { font-size: .8rem; letter-spacing: .06em; margin: 1.75rem 0 .6rem; text-transform: uppercase; color: var(--muted); }
h3.md, h4.md, h5.md {
  color: var(--fg); letter-spacing: -.01em; text-transform: none;
}
h3.md { font-size: 1.25rem; margin: 2.25rem 0 .75rem; }
h4.md { font-size: 1.05rem; margin: 1.75rem 0 .5rem; }
h5.md { font-size: .95rem; margin: 1.5rem 0 .4rem; }
h4 { font-size: .95rem; margin: 0 0 .35rem; }

table { border-collapse: collapse; font-size: .9rem; margin: .5rem 0 0; width: 100%; }
th, td { border-bottom: 1px solid var(--border); padding: .55rem .6rem; text-align: left; vertical-align: top; }
th { color: var(--muted); font-size: .75rem; letter-spacing: .05em; text-transform: uppercase; }
td p { margin: 0 0 .4rem; }
td p:last-child { margin-bottom: 0; }
td ul, td ol { margin: .2rem 0; padding-left: 1.1rem; }

.req { color: var(--brand); font-size: .7rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.status { font-family: ui-monospace, Menlo, monospace; font-weight: 700; }
.status.ok { color: #15803d; }
.status.warn { color: #b45309; }
.status.bad { color: #b91c1c; }

.variants { color: var(--muted); font-size: .875rem; margin: .5rem 0; }
.variant { border-left: 3px solid var(--border); margin: 1rem 0; padding-left: 1rem; }
.variant .keys { color: var(--muted); font-size: .8rem; margin: 0 0 .4rem; }
.label { color: var(--muted); font-size: .75rem; letter-spacing: .05em; margin: 1.25rem 0 .35rem; text-transform: uppercase; }

.auth { border-left: 3px solid var(--brand); margin: 1.25rem 0; padding-left: 1rem; }
.auth h3 { margin-top: 0; text-transform: none; letter-spacing: 0; font-size: .95rem; color: var(--fg); }
.muted { color: var(--muted); }

section.schema {
  border-top: 1px solid var(--border); margin: 0; padding: 1.75rem 0 .5rem;
}
section.schema h2 {
  font-family: ui-monospace, Menlo, monospace; font-size: 1rem; margin: 0 0 .5rem;
}
footer {
  border-top: 1px solid var(--border); color: var(--muted);
  font-size: .85rem; margin-top: 4rem; padding-top: 1.5rem;
}

/* Auf dem Telefon stehen die Spalten untereinander. Seitliches Scrollen
   in einer Tabelle mit langen Beschreibungen liest sich schlechter als
   drei kurze Zeilen pro Feld. */
@media (max-width: 640px) {
  table, thead, tbody, tr, td { display: block; width: 100%; }
  thead { display: none; }
  tr { border-bottom: 1px solid var(--border); padding: .7rem 0; }
  tr:last-child { border-bottom: 0; }
  td { border: 0; padding: .1rem 0; }
  td:first-child { font-weight: 600; }
  td:nth-child(2) { color: var(--muted); font-size: .85rem; }
  section.op { padding: 1.1rem; }
  code { overflow-wrap: anywhere; }
}
</style>
</head>
<body>

<header>
  <div class="wrap">
    <h1><span>Evaro</span> API</h1>
    <p class="lede">${esc(spec.info.summary ?? "")} Es ist dieselbe Schnittstelle, über die die Weboberfläche selbst arbeitet.</p>
    <div class="links">
      <a class="primary" href="/api-docs/openapi.yaml">OpenAPI 3.1 (YAML)</a>
      <a href="/llms.txt">llms.txt — Kurzfassung für Agenten</a>
      <a href="/">Zur Anwendung</a>
    </div>
  </div>
</header>

<main>

${markdown(spec.info.description)}

<h3>Server</h3>
<ul>
${(spec.servers ?? []).map((server) => `<li><code>${esc(server.url)}</code> — ${esc(server.description ?? "")}</li>`).join("\n")}
</ul>

<h3>Anmeldeverfahren</h3>
${securitySections.join("\n")}

<nav class="toc">
  <h2>Inhalt</h2>
  <ul>
${toc}
    <li><a href="#schemata">Datentypen</a></li>
  </ul>
</nav>

${tagSections.join("\n")}

<section id="schemata">
  <h1 style="border-bottom:2px solid var(--brand);font-size:1.4rem;margin:0 0 1rem;padding-bottom:.5rem;">Datentypen</h1>
${schemaSections.join("\n")}
</section>

<footer>
  <p>
    Erzeugt aus <a href="/api-docs/openapi.yaml">openapi.yaml</a> —
    ${operations.length} Operationen auf ${Object.keys(spec.paths ?? {}).length} Pfaden,
    ${Object.keys(spec.components?.schemas ?? {}).length} Datentypen.
    Die YAML-Datei ist maßgeblich; diese Seite wird daraus beim Bauen erzeugt.
  </p>
</footer>

</main>
</body>
</html>
`;

writeFileSync(outPath, html, "utf8");
console.log(
  `api-docs: ${operations.length} Operationen, ${schemaSections.length} Datentypen → ${(html.length / 1024).toFixed(0)} KB`,
);
