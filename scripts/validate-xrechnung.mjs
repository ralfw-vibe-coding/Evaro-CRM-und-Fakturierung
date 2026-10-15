#!/usr/bin/env node
/**
 * Prüft XRechnung-XML mit dem offiziellen KoSIT-Validator.
 *
 * Reines Entwicklungswerkzeug: die App im Betrieb braucht den Validator nicht.
 * Beim ersten Lauf werden Validator und Konfiguration nach .kosit/ geladen
 * (gitignored, rund 11 MB). Danach läuft die Prüfung offline.
 *
 * Aufruf:
 *   node scripts/validate-xrechnung.mjs <datei.xml> [...]
 *   node scripts/validate-xrechnung.mjs              # prüft die Referenzdateien
 *
 * Option:
 *   --allow-warnings   Warnungen nicht als Fehlschlag werten
 *
 * Abnahmekriterium 1 verlangt "keine Fehler und keine Warnungen", deshalb
 * lassen Warnungen den Lauf standardmässig scheitern.
 */

import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, rm, access } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { join, basename } from "node:path";

// Versionen bewusst festgenagelt — ein Validator-Wechsel soll eine sichtbare
// Änderung sein, kein stiller Seiteneffekt.
const VALIDATOR_VERSION = "1.6.3";
const CONFIG_VERSION = "2026-08-31";
const CONFIG_NAME = `xrechnung-3.0.2-validator-configuration-${CONFIG_VERSION}`;

const VALIDATOR_URL = `https://github.com/itplr-kosit/validator/releases/download/v${VALIDATOR_VERSION}/validator-${VALIDATOR_VERSION}-standalone.jar`;
const CONFIG_URL = `https://github.com/itplr-kosit/validator-configuration-xrechnung/releases/download/v${CONFIG_VERSION}/${CONFIG_NAME}.zip`;

const HOME = ".kosit";
const JAR = join(HOME, `validator-${VALIDATOR_VERSION}-standalone.jar`);
const CONF = join(HOME, "xr-conf");
const REPORTS = join(HOME, "reports");

const REFERENCES = "requirements/XRechnungen/Beispiel-XML";

const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );

function run(command, args) {
  return new Promise((resolve) => {
    // Array-Argumente, nicht Shell: der Projektpfad enthält Leerzeichen.
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("error", (err) => resolve({ code: -1, out: err.message }));
    child.on("close", (code) => resolve({ code, out }));
  });
}

async function download(url, target) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} für ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(target));
}

async function ensureValidator() {
  if ((await exists(JAR)) && (await exists(CONF))) return;

  console.log("Validator wird einmalig geladen (rund 11 MB) …");
  await mkdir(HOME, { recursive: true });

  if (!(await exists(JAR))) {
    await download(VALIDATOR_URL, JAR);
    console.log(`  ${basename(JAR)}`);
  }

  if (!(await exists(CONF))) {
    const zip = join(HOME, `${CONFIG_NAME}.zip`);
    await download(CONFIG_URL, zip);
    const unzip = await run("unzip", ["-oq", zip, "-d", CONF]);
    if (unzip.code !== 0) {
      throw new Error(`Entpacken fehlgeschlagen. Ist "unzip" vorhanden?\n${unzip.out}`);
    }
    await rm(zip, { force: true });
    console.log(`  Konfiguration ${CONFIG_VERSION}`);
  }
}

/** Der Bericht listet Befunde als <rep:message level="…">. Gültig = keine Meldung. */
async function readReport(path) {
  const xml = await readFile(path, "utf8");
  const findings = [];
  for (const m of xml.matchAll(/<rep:message([^>]*)>([\s\S]*?)<\/rep:message>/g)) {
    const level = /level="([^"]+)"/.exec(m[1])?.[1] ?? "unbekannt";
    const text = m[2]
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .split(/\s+/)
      .join(" ")
      .trim();
    findings.push({ level, text });
  }
  return findings;
}

async function main() {
  const args = process.argv.slice(2);
  const allowWarnings = args.includes("--allow-warnings");
  let files = args.filter((a) => !a.startsWith("--"));

  if (files.length === 0) {
    files = (await readdir(REFERENCES))
      .filter((f) => f.endsWith(".xml"))
      .map((f) => join(REFERENCES, f));
    console.log(`Keine Dateien angegeben — prüfe die ${files.length} Referenzdateien.\n`);
  }

  const java = await run("java", ["-version"]);
  if (java.code !== 0) {
    console.error("Java fehlt. Der KoSIT-Validator braucht Java 11 oder neuer.");
    process.exit(2);
  }

  await ensureValidator();
  await rm(REPORTS, { recursive: true, force: true });
  await mkdir(REPORTS, { recursive: true });

  // Alle Dateien in einem Aufruf: eine JVM statt einer pro Datei.
  const result = await run("java", [
    "-jar",
    JAR,
    "-s",
    join(CONF, "scenarios.xml"),
    "-r",
    CONF,
    "-o",
    REPORTS,
    ...files,
  ]);

  if (result.code === -1) {
    console.error(`Validator nicht startbar: ${result.out}`);
    process.exit(2);
  }

  let errors = 0;
  let warnings = 0;

  // Der Validator kodiert Dateinamen im Berichtsnamen ("INV%20753…", Umlaute
  // zerlegt). Deshalb über den dekodierten Namen zuordnen.
  const berichtsname = (name) => decodeURIComponent(name).normalize("NFC");
  const berichte = new Map((await readdir(REPORTS)).map((name) => [berichtsname(name), join(REPORTS, name)]));

  for (const file of files) {
    const report = berichte.get(`${basename(file).replace(/\.xml$/i, "")}-report.xml`.normalize("NFC"));
    if (!report) {
      console.log(`✗ ${basename(file)} — kein Bericht erzeugt`);
      errors += 1;
      continue;
    }
    const findings = await readReport(report);
    const err = findings.filter((f) => f.level === "error");
    const warn = findings.filter((f) => f.level === "warning");
    errors += err.length;
    warnings += warn.length;

    if (findings.length === 0) {
      console.log(`✓ ${basename(file)}`);
      continue;
    }
    console.log(`✗ ${basename(file)} — ${err.length} Fehler, ${warn.length} Warnungen`);
    for (const f of findings) console.log(`    [${f.level}] ${f.text}`);
  }

  const failed = errors > 0 || (warnings > 0 && !allowWarnings);
  console.log(
    `\n${files.length} Datei(en): ${errors} Fehler, ${warnings} Warnungen` +
      (failed ? "" : " — in Ordnung"),
  );
  if (failed) console.log(`Berichte: ${REPORTS}/`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(`\nPrüfung fehlgeschlagen: ${err.message}`);
  process.exit(2);
});
