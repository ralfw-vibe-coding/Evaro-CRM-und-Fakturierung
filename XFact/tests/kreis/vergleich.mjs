/**
 * Vergleicht zwei XRechnungen Feld für Feld (Listen von XFactViewer.felderDerRechnung).
 *
 * Nicht verglichen werden Felder, deren Text frei formuliert sein darf: die
 * Zahlungsbedingungen außer dem Skonto (BT-20) und die Zahlungsart als Text
 * (BT-82). Texte gelten als gleich, wenn sie sich nur in Leerraum und Groß-/
 * Kleinschreibung unterscheiden.
 */
export const FREI = ["BT-82"];

const rein = (wert) => (typeof wert === "string" ? wert.replace(/\s+/g, " ").trim().toLowerCase() : wert);
/** Von den Zahlungsbedingungen zählt nur das Skonto im Format der XRechnung */
const nurSkonto = (text) => String(text).split("\n").filter((z) => z.startsWith("#SKONTO")).join("\n") || null;

export function vergleiche(soll, ist) {
  // Bezeichnung und Beschreibung einer Position zählen zusammen: wo der Schnitt liegt, ist Auslegung
  // Ebenso die Anschriftzeilen (Straße, Zusatz, dritte Zeile): Zusatz oder dritte Zeile ist oft nicht zu unterscheiden.
  // Und Registernummer und rechtliche Angaben des Rechnungsstellers: das Registergericht passt zu beidem.
  const zeilen = [["BT-35", "BT-36", "BT-162"], ["BT-50", "BT-51", "BT-163"], ["BT-75", "BT-76", "BT-165"], ["BT-30", "BT-33"]];
  const zusammen = (f) => {
    const g = { ...f };
    for (const [eins, ...weitere] of zeilen) {
      const teile = [eins, ...weitere].map((k) => f[k]).filter(Boolean);
      for (const k of [eins, ...weitere]) delete g[k];
      if (teile.length) g[`${eins}+`] = teile.join(" ").replace(/[·,]/g, " ");
    }
    for (const k of Object.keys(f).filter((k) => k.endsWith("/BT-153"))) {
      const b = k.replace("BT-153", "BT-154");
      g[k] = [f[k], f[b]].filter(Boolean).join(" ");
      delete g[b];
    }
    return g;
  };
  const norm = (f) => Object.fromEntries(Object.entries(zusammen(f))
    .map(([k, w]) => [k, k === "BT-20" ? nurSkonto(w) : w])
    .filter(([k, w]) => w !== null && !FREI.includes(k)));
  const a = norm(soll);
  const b = norm(ist);
  const abweichungen = [];
  const fehlend = [];
  const zusaetzlich = [];
  for (const [feld, wert] of Object.entries(a)) {
    if (!(feld in b)) fehlend.push([feld, wert]);
    else if (rein(wert) !== rein(b[feld])) abweichungen.push([feld, wert, b[feld]]);
  }
  for (const [feld, wert] of Object.entries(b)) if (!(feld in a)) zusaetzlich.push([feld, wert]);
  return { abweichungen, fehlend, zusaetzlich };
}
