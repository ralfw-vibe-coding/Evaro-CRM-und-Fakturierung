/**
 * Druckt eine XRechnung (gelesen mit XFactViewer) als PDF-Rechnung, wie ein
 * Rechnungsprogramm sie ausgeben würde: mit allen Angaben, in gewohnten
 * Worten beschriftet ("Ihre Bestellung", "Lieferschein", ...), ohne BT-Nummern.
 * Nur für den Kreis-Test; Werkzeug: pdfmake.
 */
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const pdfmake = require(join(WURZEL, "node_modules/pdfmake"));
const schrift = join(WURZEL, "node_modules/pdfmake/fonts/Roboto");
pdfmake.addFonts({ Roboto: { normal: join(schrift, "Roboto-Regular.ttf"), bold: join(schrift, "Roboto-Medium.ttf"),
  italics: join(schrift, "Roboto-Italic.ttf"), bolditalics: join(schrift, "Roboto-MediumItalic.ttf") } });
pdfmake.setLocalAccessPolicy(() => true);

const euro = (betrag) => `${betrag.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} €`;
const zahl = (wert) => wert.toLocaleString("de-DE", { maximumFractionDigits: 4 });
const datum = (iso) => (iso ? iso.split("-").reverse().join(".") : "");

/** r: die Rechnung, wie XFactViewer.leseXRechnung sie liefert; V: XFactViewer (für Codes) */
export async function alsPdf(r, V) {
  const a = r.absender;
  const e = r.empfaenger;
  const zeilen = (...liste) => liste.flat().filter(Boolean).join("\n");
  const angaben = (paare) => paare.filter(([, w]) => w).map(([n, w]) => [{ text: n, color: "#555" }, w]);
  const art = { 380: "Rechnung", 381: "Gutschrift", 384: "Rechnungskorrektur", 389: "Gutschrift", 326: "Abschlagsrechnung",
    875: "Abschlagsrechnung", 876: "Teilschlussrechnung", 877: "Schlussrechnung" }[r.art] || "Rechnung";
  const mittel = r.zahlung.mittel;
  const zahlungsart = { 58: "Überweisung", 59: "SEPA-Lastschrift", 54: "Kreditkarte", 55: "EC-Karte", 10: "Barzahlung",
    97: "Verrechnung", 68: "Online-Zahlung" }[mittel[0]?.art];

  const kopfdaten = angaben([
    [`${art} Nr.`, r.nummer], ["Datum", datum(r.datum)], ["Kundennummer", e.kennung],
    ["Ihr Zeichen", /keine Angabe/.test(r.kaeuferreferenz) || r.kaeuferreferenz === r.bestellnummer || /^\d{2,12}(-[0-9A-Z]{1,30})?-\d{2}$/.test(r.kaeuferreferenz) ? null : r.kaeuferreferenz],
    ["Leitweg-ID", /^\d{2,12}(-[0-9A-Z]{1,30})?-\d{2}$/.test(r.kaeuferreferenz) ? r.kaeuferreferenz : null],
    ["Ihre Bestellung", r.bestellnummer], ["Unser Auftrag", r.auftragsnummer], ["Vertrag", r.vertrag], ["Projekt", r.projekt],
    ["Lieferschein", r.lieferschein], ["Ihre Wareneingangsmeldung", r.wareneingang], ["Ausschreibung", r.ausschreibung],
    ["Objekt", r.objekt], ["Ihre Kostenstelle", r.buchungsreferenz],
    ["Leistungsdatum", datum(r.leistungsdatum)],
    ["Leistungszeitraum", r.leistungVon ? `${datum(r.leistungVon)} – ${datum(r.leistungBis)}` : null],
    ...r.vorherigeRechnungen.map((v) => [r.art === "384" ? "Korrigiert Rechnung" : "Abschlagsrechnung", `${v.nummer} vom ${datum(v.datum)}`]),
  ]);

  const positionen = r.positionen.map((p) => {
    const details = [
      p.notiz && { text: p.notiz, italics: true },
      p.beschreibung,
      p.artikelnummer && `Art.-Nr. ${p.artikelnummer}`, p.kundenArtikelnummer && `Ihre Art.-Nr. ${p.kundenArtikelnummer}`,
      p.gtin && `EAN ${p.gtin}`, p.ursprungsland && `Ursprungsland ${p.ursprungsland}`,
      ...p.merkmale.map((m) => `${m.name}: ${m.wert}`),
      p.objekt && `Objekt: ${p.objekt}`, p.bestellposition && `Ihre Bestellposition ${p.bestellposition}`,
      p.buchungsreferenz && `Ihre Kostenstelle ${p.buchungsreferenz}`,
      p.von && (p.bis && p.bis !== p.von ? `Leistung ${datum(p.von)} – ${datum(p.bis)}` : `Leistung am ${datum(p.von)}`),
      p.bruttopreis !== null && p.preisnachlass ? `Listenpreis ${euro(p.bruttopreis)} abzgl. ${euro(p.preisnachlass)} je Einheit` : null,
      ...p.nachlaesseZuschlaege.map((n) => `${n.zuschlag ? "zzgl." : "abzgl."} ${n.prozent ? `${zahl(n.prozent)} % ` : ""}${n.grund || ""}: ${n.zuschlag ? "" : "−"}${euro(n.betrag)}`),
    ].filter(Boolean);
    const einheit = V.bedeutung("einheit", p.einheit);
    const preis = p.preisbasis && p.preisbasis !== 1 ? `${euro(p.einzelpreis)} je ${zahl(p.preisbasis)}` : euro(p.einzelpreis);
    const steuer = p.kategorie === "S" ? `${zahl(p.satz)} %` : { Z: "0 %", E: "–", AE: "§ 13b", O: "–" }[p.kategorie];
    return [p.nr, [{ text: p.name, bold: true }, ...details.map((d) => (typeof d === "string" ? { text: d, fontSize: 8, color: "#444" } : { ...d, fontSize: 8 }))],
      { text: zahl(p.menge), alignment: "right" }, einheit, { text: preis, alignment: "right" }, { text: steuer, alignment: "right" },
      { text: euro(p.gesamt), alignment: "right" }];
  });

  const s = r.summen;
  const summenZeilen = [
    ["Summe Positionen", euro(s.positionen)],
    ...r.nachlaesseZuschlaege.map((n) => [`${n.zuschlag ? "zzgl." : "abzgl."} ${n.prozent ? `${zahl(n.prozent)} % ` : ""}${n.grund}${n.kategorie === "S" && n.satz !== null ? ` (${zahl(n.satz)} % USt)` : ""}`,
      `${n.zuschlag ? "" : "−"}${euro(n.betrag)}`]),
    ["Nettobetrag", euro(s.netto)],
    ...r.steuer.map((g) => [g.kategorie === "S" ? `zzgl. ${zahl(g.satz)} % USt auf ${euro(g.basis)}` : `USt 0 % auf ${euro(g.basis)}`, euro(g.betrag)]),
    [{ text: "Gesamtbetrag", bold: true }, { text: euro(s.brutto), bold: true }],
    s.gezahlt ? [r.vorherigeRechnungen.length && r.art !== "384" ? "abzgl. bereits gezahlte Abschläge" : "bereits bezahlt", `−${euro(s.gezahlt)}`] : null,
    s.rundung ? ["Rundung", euro(s.rundung)] : null,
    s.zahlbetrag !== s.brutto ? [{ text: "Zu zahlen", bold: true }, { text: euro(s.zahlbetrag), bold: true }] : null,
  ].filter(Boolean).map(([n, w]) => [typeof n === "string" ? { text: n, alignment: "right" } : { ...n, alignment: "right" },
    typeof w === "string" ? { text: w, alignment: "right" } : { ...w, alignment: "right" }]);

  const steuerHinweise = r.steuer.map((g) => g.befreiungsgrund).filter(Boolean);
  const skonto = (r.zahlung.bedingungen || "").split("\n").map((z) => /^#SKONTO#TAGE=(\d+)#PROZENT=([\d.]+)#/.exec(z)).filter(Boolean)
    .map(([, tage, prozent]) => {
      const bis = new Date(Date.parse(`${r.datum}T00:00:00Z`) + Number(tage) * 86400000).toISOString().slice(0, 10);
      return `Bei Zahlung bis ${datum(bis)} gewähren wir ${zahl(Number(prozent))} % Skonto (${euro(Math.round(s.zahlbetrag * (100 - Number(prozent))) / 100)}).`;
    });
  const freierText = (r.zahlung.bedingungen || "").split("\n").filter((z) => z && !z.startsWith("#"));
  const zahlung = [
    zahlungsart && `Zahlungsart: ${mittel[0]?.info && mittel[0].info !== zahlungsart ? mittel[0].info : zahlungsart}`,
    ...skonto,
    ...freierText,
    r.zahlung.faellig && !freierText.some((t) => t.includes(datum(r.zahlung.faellig))) && `Zahlbar bis ${datum(r.zahlung.faellig)} ohne Abzug.`,
    r.zahlung.verwendungszweck && r.zahlung.verwendungszweck !== r.nummer && `Verwendungszweck: ${r.zahlung.verwendungszweck}`,
    r.zahlung.glaeubigerId && `Gläubiger-ID ${r.zahlung.glaeubigerId}, Mandatsreferenz ${r.zahlung.mandatsreferenz}`,
    ...mittel.filter((m) => m.kundenIban).map((m) => `Der Betrag wird von Ihrem Konto ${m.kundenIban} eingezogen.`),
    ...mittel.filter((m) => m.karte).map((m) => `Belastet wird die Karte mit der Endung ${m.karte}${m.karteninhaber ? ` (Karteninhaber ${m.karteninhaber})` : ""}.`),
    r.zahlungsempfaenger && `Bitte zahlen Sie mit befreiender Wirkung nur an: ${r.zahlungsempfaenger.name}${r.zahlungsempfaenger.kennung ? `, Kennung ${r.zahlungsempfaenger.kennung}` : ""}${r.zahlungsempfaenger.register ? `, ${r.zahlungsempfaenger.register}` : ""}`,
    ...mittel.filter((m) => m.iban).map((m) => `Bankverbindung: IBAN ${m.iban}${m.bic ? `, BIC ${m.bic}` : ""}${m.kontoinhaber && m.kontoinhaber !== a.name ? `, Kontoinhaber ${m.kontoinhaber}` : ""}`),
  ].filter(Boolean);

  const l = r.lieferanschrift;
  const inhalt = [
    { text: zeilen(a.name, a.handelsname && a.handelsname !== a.name ? `(${a.handelsname})` : null), bold: true, fontSize: 13 },
    { text: zeilen([...a.adresse, `${a.plz} ${a.ort}`].join(" · "), a.region, a.kontakt?.name && `Ihre Ansprechpartnerin/Ihr Ansprechpartner: ${a.kontakt.name}`,
      [a.kontakt?.telefon && `Tel. ${a.kontakt.telefon}`, a.adresseElektronisch && `E-Mail ${a.adresseElektronisch}`,
        a.kontakt?.email && a.kontakt.email !== a.adresseElektronisch && `direkt: ${a.kontakt.email}`].filter(Boolean).join(" · ")),
      fontSize: 8, color: "#444", margin: [0, 0, 0, 18] },
    { columns: [
      { width: "*", stack: [
        { text: `${a.name} · ${a.adresse.at(-1) || ""} · ${a.plz} ${a.ort}`, fontSize: 7, color: "#666" },
        { text: zeilen(e.handelsname ? `${e.name} (${e.handelsname})` : e.name, e.kontakt?.name && `z. Hd. ${e.kontakt.name}`, ...e.adresse, `${e.plz} ${e.ort}`, e.region,
          e.land && e.land !== "DE" ? V.landName(e.land) : null), margin: [0, 4, 0, 0] },
        { text: zeilen(e.kontakt?.telefon && `Tel. ${e.kontakt.telefon}`, e.kontakt?.email && `E-Mail ${e.kontakt.email}`,
          e.adresseElektronisch && `Rechnungsempfang: ${e.adresseElektronisch}`, e.ustId && `Ihre USt-IdNr. ${e.ustId}`,
          e.register && `Ihr Register: ${e.register}`), fontSize: 8, color: "#444", margin: [0, 4, 0, 0] },
      ] },
      { width: 220, table: { widths: [95, "*"], body: kopfdaten }, layout: "noBorders", fontSize: 8 },
    ] },
    { text: `${art} ${r.nummer}`, fontSize: 15, bold: true, margin: [0, 18, 0, 4] },
    l ? { text: `Lieferanschrift: ${[l.name, l.kennung && `(${l.kennung})`, ...l.adresse, [l.plz, l.ort].filter(Boolean).join(" "), l.region].filter(Boolean).join(", ")}`, fontSize: 9, margin: [0, 0, 0, 6] } : null,
    { table: { headerRows: 1, widths: [28, "*", 38, 52, 64, 34, 64],
      body: [["Pos.", "Bezeichnung", "Menge", "Einheit", "Preis", "USt", "Betrag"].map((t) => ({ text: t, bold: true })), ...positionen] },
    layout: "lightHorizontalLines", fontSize: 9 },
    { table: { widths: ["*", 90], body: summenZeilen }, layout: "noBorders", fontSize: 9, margin: [0, 8, 0, 8] },
    ...steuerHinweise.map((t) => ({ text: t, fontSize: 9, margin: [0, 0, 0, 4] })),
    ...r.bemerkungen.map((b) => ({ text: b.text, fontSize: 9, margin: [0, 4, 0, 0] })),
    { text: zahlung.join("\n"), fontSize: 9, margin: [0, 8, 0, 0] },
    r.anlagen.length ? { text: `Anlagen: ${r.anlagen.map((d) => [d.kennung, d.beschreibung && d.beschreibung !== d.kennung && `(${d.beschreibung})`, d.link].filter(Boolean).join(" ")).join("; ")}`,
      fontSize: 9, margin: [0, 8, 0, 0] } : null,
  ].filter(Boolean);

  const fuss = zeilen(
    [a.name, a.register, a.rechtliches].filter(Boolean).join(" · "),
    [a.ustId && `USt-IdNr. ${a.ustId}`, a.steuernummer && `Steuernummer ${a.steuernummer}`, a.kennung && `Unsere Lieferantennummer bei Ihnen ${a.kennung}`].filter(Boolean).join(" · "),
  );
  const dokument = pdfmake.createPdf({
    pageSize: "A4", pageMargins: [48, 40, 48, 70], defaultStyle: { font: "Roboto", fontSize: 10 }, content: inhalt,
    footer: (seite, seiten) => ({ text: `${fuss}\nSeite ${seite} von ${seiten}`, fontSize: 7, color: "#555", margin: [48, 10, 48, 0] }),
  });
  return dokument.getBuffer();
}
