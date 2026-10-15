# Briefing: XFact – PDF zu XRechnung

Stand: 15.10.2026 · Status: Entwurf, Antworten zu den offenen Punkten eingearbeitet

## 1. Worum es geht

**XFact** ist ein kleines Werkzeug im Browser. Es macht aus einer PDF-Rechnung eine XRechnung (XML).

Es ist ein **Experiment**, Open Source unter der MIT-Lizenz: Jeder darf es nutzen, verändern und weitergeben.

Was XFact aus Nutzersicht kann, beschreibt die [Dokumentation](../../XFact/XFact-Dokumentation.md). Sie gehört zum Lieferumfang und wird bei jeder Änderung am Verhalten mit angepasst. Ausgeliefert werden **nur die HTML-Datei und die Dokumentation**. Beide müssen ohne dieses Briefing verständlich sein, die Dokumentation verweist deshalb nicht hierher.

**Für wen:** Deutsche Unternehmen, die Rechnungen an deutsche Empfänger schreiben und ihr Rechnungsprogramm nicht umbauen können oder wollen. Das sind typischerweise Rechnungen aus Word, Excel oder einfachen Programmen.

**Ablauf aus Sicht des Nutzers:**
1. Rechnung wie bisher als PDF erzeugen.
2. PDF ins Tool ziehen.
3. Prüfen, Fehlendes ergänzen.
4. XML herunterladen und zusammen mit dem PDF verschicken.

**Nicht Ziel:**
- Archivierung, Unveränderlichkeit, Rechnungsverwaltung
- Versand von Rechnungen
- ZUGFeRD (XML im PDF)
- gescannte PDFs ohne Textebene, also kein OCR
- Empfänger oder Rechnungssteller außerhalb Deutschlands
- Gutschriften, Storno- und Abschlagsrechnungen

## 2. Grundsätze

1. **Läuft vollständig im Browser.** Es gibt keinen Server, kein Konto und keine Anmeldung. Rechnungen verlassen den Rechner nur, wenn der Nutzer KI einschaltet.
2. **Ohne KI als Standard, KI optional.** Die Erkennung funktioniert ohne KI. Wer mehr Genauigkeit will, schaltet eine KI seiner Wahl zu.
3. **Die Verantwortung liegt beim Nutzer.** Das Tool sagt klar, was es tut und was nicht. Danach lässt es dem Nutzer freie Hand. Es blockiert nur, was eine **ungültige XML** ergäbe. Alles andere sind Hinweise.
4. **Total einfach.** Drei Schritte, keine Einrichtung vorab. Die eigenen Firmendaten liest das Tool aus der ersten Rechnung.
5. **Oberfläche:** klar, sachlich, modern, schlicht. Funktional auf den Punkt, keine Dekoration.
6. **Anpassen ist erwünscht.** Nutzer sollen XFact selbst verändern, auch ohne Programmierkenntnisse mit einem KI-Assistenten. Deshalb ist die ausgelieferte HTML-Datei **zugleich der Quellcode**: lesbar, kommentiert, klar gegliedert. Die Dokumentation erklärt in Abschnitt 14, wie man vorgeht, mit Beispiel-Aufträgen.

## 3. Auslieferung

Aus demselben Quellcode entstehen beide Varianten:

| Variante | Beschreibung |
|---|---|
| **Gehostet** | Dieselbe Datei `xfact.html` als statische Seite auf der Netlify-Site von Evaro, unter einem eigenen Pfad (Vorschlag: `/xfact/`), **ohne Anmeldung** und ohne Backend. Sie wird nicht beworben und nur per Link weitergegeben. Deshalb gibt es kein Impressum und keine Datenschutzerklärung. |
| **Offline** | **Eine einzige HTML-Datei** `xfact.html`, in der alles enthalten ist, auch die PDF-Bibliothek. Herunterladen, doppelklicken, läuft ohne Internet (außer bei eingeschalteter KI). |

Die Seite hat in beiden Varianten einen Link „Offline-Version herunterladen“.

## 4. Erste Nutzung

Vor dem ersten Hochladen erscheint ein Hinweisfenster. Textentwurf:

> **Bevor Sie loslegen**
> - Ihre Rechnungen werden **nur in diesem Browser** verarbeitet und nicht hochgeladen.
> - Wenn Sie KI zuschalten, wird der Text Ihrer Rechnung an den von Ihnen gewählten Anbieter geschickt. Ihr API-Schlüssel wird in diesem Browser gespeichert.
> - Gemerkte Angaben (Ihre Firma, Kunden, Einstellungen) liegen nur in diesem Browser. Sichern Sie sie über „Daten exportieren“.
> - **Die XML-Datei ist die maßgebliche Rechnung.** Prüfen Sie die Angaben vor dem Versand und bewahren Sie die XML auf.
> - Das Tool wird ohne Gewähr bereitgestellt.
>
> [ Verstanden ]

Die Bestätigung wird gemerkt. Über „Hinweise“ im Menü lässt sich der Text jederzeit wieder aufrufen.

## 5. Ablauf

### Schritt 1: Hochladen

- PDF hineinziehen oder über „Datei wählen“ öffnen. Es wird **eine Rechnung pro Datei** verarbeitet.
- Ist KI eingeschaltet, zeigt das Tool während der Abfrage einen Fortschritt.
- Fehlermeldungen in Klartext:
  - **Keine Textebene:** „Dieses PDF enthält keinen Text, vermutlich ist es ein Scan. Scans werden nicht unterstützt.“
  - **Keine Rechnung erkannt:** „Keine Rechnungsnummer und keine Summen gefunden.“ Danach geht es trotzdem weiter zu Schritt 2, mit leeren Feldern.

### Schritt 2: Prüfen

Die erkannten Daten werden **neutral, wie eine schlichte Rechnung** angezeigt. Die Anzeige spiegelt das PDF, nur ohne Corporate Design:

```
Rechnung 2026-0153                                    12.09.2026
Leistungsdatum 07.09.2026

Von  Muster Handwerk GmbH, Hauptstr. 1, 20095 Hamburg
     USt-IdNr. DE123456789 · Tel. 040 123456 · info@muster.de
An   Berg GmbH & Co. KG, Alte Ziegelei 21, 51491 Overath
     ⚠ E-Mail für Rechnungen fehlt  [____________________]

Pos  Datum       Beschreibung              Menge  Einheit   Preis    Gesamt
1    07.09.2026  Montage Küche                 8  Std       65,00    520,00
2    07.09.2026  Material lt. Aufstellung      1  Pausch.  257,00    257,00

                                   Netto                   777,00
                                   USt 19 %                147,63
                                   Gesamt                  924,63  ✓

Zahlbar bis 26.09.2026 · IBAN DE12 3456 … · BIC …
```

**Regeln für die Anzeige:**
- **Jeder Wert ist direkt editierbar.** Ein Klick macht ihn zum Eingabefeld.
- **Hinweise stehen dort, wo das Problem ist**, wenn möglich mit Eingabefeld:
  - **Rot (fehlt):** Ohne diese Angabe wird die XML ungültig. Beispiele: Kunden-E-Mail, Leistungsdatum, Einheit ohne Code.
  - **Gelb (unsicher):** Bitte prüfen. Beispiele: schwach erkannt, oder KI und Regeln widersprechen sich.
  - **Grau (ergänzt):** „aus Kundenprofil ergänzt“ bzw. „aus Firmenprofil ergänzt“, damit sichtbar ist, woher ein Wert stammt.
- **Rechenkontrolle** bei den Summen: ✓ oder ein Hinweis, wo die Differenz entsteht.

**Unter der Rechnung** stehen „Weitere Angaben“, also alles, was im Rechnungsbild keinen Platz hat:
- **Steuerfall**, wenn er nicht eindeutig ist (Abschnitt 7)
- **Einheiten zuordnen:** „Pausch.“ = [Pauschale ▾]
- **Käuferreferenz bzw. Leitweg-ID** (optional, bei Behörden Pflicht)
- **Leistungsdatum fehlt** → Schnellknopf „= Rechnungsdatum“

Jede ergänzte Angabe hat ein Häkchen **„merken“**, das standardmäßig gesetzt ist. Gemerkt wird je nach Angabe im Firmenprofil, im Kundenprofil oder in der Einheitenzuordnung.

Der Knopf **„XML erzeugen“** ist aktiv, sobald kein roter Hinweis mehr offen ist. Gelbe Hinweise blockieren nicht.

### Schritt 3: Fertig

- Die XML wird **automatisch heruntergeladen**. Sie heißt **wie das Original**: `Rechnung 0153 Berg.pdf` → `Rechnung 0153 Berg.xml`.
- Das Tool schreibt einen Eintrag ins Logbuch.
- Die Seite zeigt:
  - ✓ „Rechnung 0153 Berg.xml“ wurde heruntergeladen. Dazu ein Knopf „Erneut herunterladen“.
  - **„Online prüfen“**, ein Link zu https://www.rechnungsapi.de/xrechnung-validator-online-kostenlos mit dem Hinweis: „Dort laden Sie die XML auf eine fremde Website hoch.“
  - **„Nächste Rechnung“**, zurück zu Schritt 1.
  - Kurzer Hinweis: „Verschicken Sie XML und PDF als zwei Anhänge einer E-Mail. Bewahren Sie die XML auf.“

## 6. Erkennung

### 6.1 Ohne KI (Standard)

Grundlage sind die Textbausteine aus dem PDF mit ihren Koordinaten (pdf.js). Daraus werden Zeilen und Spalten rekonstruiert.

| Was | Wie |
|---|---|
| Rechnungsnummer, Datum | über Beschriftungen mit Synonymlisten, z.B. „Rechnungsnummer“, „Rechnung Nr.“, „Rg.-Nr.“, „Belegnummer“ |
| USt-IdNr., Steuernummer, IBAN, BIC, E-Mail, Telefon | über feste Muster. Die IBAN wird zusätzlich per Prüfziffer geprüft. |
| Rechnungssteller und -empfänger | Ist ein Firmenprofil vorhanden: Der Block mit der eigenen USt-IdNr., Steuernummer oder IBAN gehört zum Steller, der andere Adressblock zum Empfänger. Bei der ersten Rechnung gilt: Anschriftfeld oben links = Empfänger, Briefkopf und Fußzeile = Steller. |
| Positionen | Kopfzeile der Tabelle an Spaltenbegriffen erkennen („Menge“, „Einzelpreis“, „Gesamt“ …). Die Spalten werden über die x-Position zugeordnet, mehrzeilige Beschreibungen zusammengefügt. |
| Summen, Steuer | über Beschriftungen („Netto“, „zzgl. 19 % USt“, „Gesamtbetrag“ …) |
| Zahlen und Daten | deutsche Schreibweise: `1.080,50`, `7.9.2026`, `07.09.26` |

**Lernen pro Firma:** Korrigiert der Nutzer eine Erkennung, merkt sich das Firmenprofil die verwendete Beschriftung, z.B. „Belegnr.“ = Rechnungsnummer, oder die Spaltenüberschriften. Weil eine Firma immer dieselbe Vorlage nutzt, wird die Erkennung ab der zweiten Rechnung besser.

### 6.2 Mit KI (optional)

**Einstellungen:**

| Feld | Vorbelegung |
|---|---|
| KI verwenden | aus |
| Endpunkt | `https://openrouter.ai/api/v1` (OpenAI-kompatibel) |
| Modell | `anthropic/claude-sonnet-5.5` (Begründung siehe Modelltest unten) |
| API-Schlüssel | leer |
| Knopf „Verbindung testen“ | |

**Was an die KI geht:**
- **Nur der Text** des PDFs, mit Zeilenstruktur, kein Bild.
- Die Antwort ist JSON nach dem Rechnungsschema des Tools. Das Schema wird mitgeschickt (`response_format: json_schema`, `strict: true`).
- Unterstützt ein Modell kein Schema, wird das JSON aus dem Antworttext gelesen.

**Vorgaben für das Schema**, damit es bei allen Anbietern funktioniert:
- **Alle Felder sind Pflicht**, und es gibt keine „Text oder null“-Typen. Fehlende Texte kommen als `""`, fehlende Zahlen als `0`.
- Hintergrund: Anthropic lehnt Schemas mit vielen optionalen Feldern oder vielen „oder null“-Typen ab. Im Test kam bei 40 bzw. 47 solcher Felder die Fehlermeldung „HTTP 400“.

**Modelltest (15.10.2026)** mit den 5 Beispielrechnungen. Geprüft wurden je Modell 203 Felder (Kopf, beide Parteien, Bank, alle Positionen mit Datum, Menge, Einheit, Preis und Betrag, Summen, Steuerfall). Eingabe war der Text aus `pdftotext -layout`.

| Modell | Felder richtig | Ø Sekunden | $ pro Rechnung |
|---|---|---|---|
| anthropic/claude-sonnet-5.5 | 203/203 | 6,8 | 0,016 |
| anthropic/claude-haiku-5.5 | 203/203 | 12,8 | 0,0008 |
| openai/gpt-6-luna | 203/203 | 12,3 | 0,0007 |
| openai/gpt-6.1-sol | 203/203 | 12,9 | 0,010 |
| google/gemini-3.8-flash | 203/203 | 13,2 | 0,007 |
| google/gemini-4-argon | 203/203 | 10,3 | 0,011 |
| deepseek/deepseek-v4.1-flash | 203/203 | 9,9 | 0,002 |
| google/gemini-3.5-flash-lite | 202/203 | 3,3 | 0,003 |
| mistralai/mistral-large-4-0 | 202/203 | 45,1 | 0,009 |
| qwen/qwen3.8-flash | 171/174 (eine Rechnung abgebrochen: Rate-Limit) | 143,5 | 0,004 |

**Was der Test zeigt:**
- **Voreinstellung Sonnet 5.5:** Es ist leistungsfähig, im Test das schnellste fehlerfreie Modell, und 1,6 Cent pro Rechnung sind kein Thema. Wer sparen will, nimmt Haiku 5.5 oder GPT-6 Luna. Beide waren im Test genauso fehlerfrei, kosten aber unter 0,1 Cent.
- **Die Aussagekraft ist begrenzt:** Alle 5 Rechnungen haben dasselbe Layout und denselben Steuerfall. Eine Neubewertung mit dem Testsatz aus Abschnitt 12 steht noch aus.
- **Typische KI-Fehler** im Test: eine erfundene Ziffer in der IBAN (Mistral) und eine übersehene USt-IdNr., weil sie als „USt-Nr.“ beschriftet war (Gemini Flash-Lite). Die festen Prüfungen aus 6.1 (IBAN-Prüfziffer, Rechenkontrolle) sind deshalb **auch mit KI Pflicht**.

**Zusammenspiel mit der regelbasierten Erkennung:**
- Regeln und KI laufen beide.
- Stimmen sie überein, gilt das Feld als sicher. Weichen sie ab, erscheint ein gelber Hinweis mit beiden Werten zur Auswahl.
- KI-Werte durchlaufen dieselbe Rechenkontrolle.

**Andere Endpunkte**, z.B. LM Studio unter `http://localhost:1234/v1`:
- In der Hilfe steht, dass CORS in LM Studio eingeschaltet sein muss.
- Der Browser fragt eventuell nach, ob die Seite auf das lokale Netz zugreifen darf.

## 7. Fachlicher Umfang (Version 1)

**Rechnungssteller und -empfänger:** immer in Deutschland. Der Ländercode ist fest `DE`. Ein ausländischer Empfänger löst den Hinweis „nicht unterstützt“ aus.

**Steuerfälle:**

| Fall | Kategorie | Erkennung |
|---|---|---|
| 19 % und/oder 7 %, auch gemischt | `S` | Steuerzeilen in den Summen. Pro Satz entsteht ein eigener Steuerblock. |
| Steuerschuldnerschaft des Leistungsempfängers, §13b (z.B. Bauleistungen) | `AE` | Hinweistext auf der Rechnung, 0 % USt. Nötig ist die **USt-IdNr. des Empfängers** (BT-48) oder dessen Registernummer, z.B. HRB (BT-47). Eine Steuernummer des Empfängers reicht nicht, weil XRechnung dafür kein Feld hat (Regel BR-AE-02). |
| Kleinunternehmer, §19 UStG | `E` | Hinweistext „§ 19 UStG“, kein USt-Ausweis. Begründungstext wird übernommen. |

Ist keiner dieser Fälle erkennbar, kommt eine Rückfrage unter „Weitere Angaben“. Bleibt der Fall offen, ist das ein roter Hinweis.

**Steuernummer des Stellers:** XRechnung verlangt USt-IdNr. **oder** Steuernummer. Viele kleine Firmen haben nur die Steuernummer, deshalb werden beide unterstützt (`schemeID` `VA` bzw. `FC`). Hat der Steller **nur eine Steuernummer**, steht sie zusätzlich als Verkäuferkennung (BT-29) in der XML. Regel BR-CO-26 verlangt eine Kennung, eine Registernummer oder eine USt-IdNr., und die Steuernummer allein (BT-32) reicht dafür nicht. Das hat der KoSIT-Validator gezeigt.

**Positionen:**
- Negative Positionen wie „abzgl. Rabatt“ sind erlaubt.
- Rabatte oder Zuschläge auf Summenebene werden **nicht** unterstützt. Taucht so etwas auf, gibt es einen roter Hinweis.

**Zahlung:**
- Fälligkeitsdatum und Bankverbindung, Zahlungsart SEPA-Überweisung (`58`).
- Skontotexte werden als Freitext übernommen. Ein Text, der mit `#` beginnt, wird entschärft, weil XRechnung ihn sonst als strukturiertes Skonto auswertet.

**Pflichtangaben, die meist nicht im PDF stehen**, und wo sie gemerkt werden:

| Angabe | BT | gemerkt in |
|---|---|---|
| E-Mail des Kunden für Rechnungen | BT-49 | Kundenprofil |
| eigene E-Mail als elektronische Adresse | BT-34 | Firmenprofil |
| eigener Ansprechpartner, Telefon, E-Mail | BT-41..43 | Firmenprofil |
| Käuferreferenz bzw. Leitweg-ID (Ersatzwert `keine Angabe`) | BT-10 | Kundenprofil |
| Einheitencode, z.B. Std → `HUR` | BT-130 | Einheitenzuordnung |

## 8. Ausgabe

- XRechnung 3.0 in **CII-Syntax**. Mapping, Formate und Elementreihenfolge wie in [Anforderung-XRechnung.md](Anforderung-XRechnung.md), mit diesen Unterschieden:
  - mehrere Steuerblöcke (BG-23), einer pro Kategorie und Satz
  - Kategorie `E` (§19) zusätzlich zu `S` und `AE`
  - Steuernummer (`FC`) als Alternative zur USt-IdNr.
  - keine Felder, die es nur in Evaro gibt
- **Generator:** angelehnt an `frontend/src/shell/portals/invoice-xrechnung.ts`, aber auf einem eigenen, neutralen Rechnungsmodell. Eine direkte Abhängigkeit zu Evaro gibt es nicht.
- **Dateiname:** wie das Original, nur mit der Endung `.xml`.

## 9. Gedächtnis, Logbuch, Datenexport

**Gespeichert wird im Browser** (IndexedDB oder localStorage):

| Bereich | Inhalt | Schlüssel |
|---|---|---|
| Firmenprofile | eigene Stammdaten, Ansprechpartner, Bank, gelernte Beschriftungen | USt-IdNr. bzw. Steuernummer. Mehrere Profile entstehen automatisch, z.B. bei Buchhaltern mit mehreren Mandanten. |
| Kundenprofile | E-Mail, Leitweg-ID bzw. Referenz, Steuerfall | USt-IdNr., sonst Name + PLZ |
| Einheitenzuordnung | Beschriftung → Code | je Firmenprofil |
| Einstellungen | KI an oder aus, Endpunkt, Modell, Schlüssel, Hinweise bestätigt | |
| Logbuch | Zeitpunkt, Dateiname, Rechnungsnummer, Kunde, Bruttobetrag | |

**Rechnungen selbst werden nicht gespeichert.**

**Logbuch:**
- Liste, neueste zuerst.
- Wird eine Rechnungsnummer derselben Firma erneut umgewandelt, erscheint in Schritt 2 ein gelber Hinweis: „Diese Rechnung wurde am … bereits umgewandelt.“ Gesperrt wird nichts.

**Export und Import:**
- Über das Menü ist jederzeit „Daten exportieren“ möglich. Das ergibt eine JSON-Datei mit allem außer dem API-Schlüssel. Wer den Schlüssel mitnehmen will, setzt ein eigenes Häkchen.
- „Daten importieren“ ersetzt alle gemerkten Angaben, nach einer Rückfrage.
- „Alle Daten löschen“ funktioniert mit einer Bestätigung im Stil des Tech-Stacks: Das Mülleimer-Symbol wird zu „?“, ein zweiter Klick löscht.

## 10. Bedienung

Es gibt nur **eine Seite** mit den drei Schritten. Oben rechts ist ein Menü:
- Meine Firma(en)
- Kunden
- Einheiten
- KI
- Logbuch
- Daten exportieren / importieren / löschen
- Hinweise
- Hilfe (zeigt die Dokumentation, auch in der Offline-Datei enthalten)
- Offline-Version

Firmen, Kunden und Einheiten sind einfache Listen, in denen man bearbeiten und löschen kann.

## 11. Technik

**Ort:** Verzeichnis `XFact/` im Evaro-Repository, auf derselben Ebene wie `frontend/` und `backend/`. Es gibt keine Abhängigkeit zum Evaro-Code.

```
XFact/
  xfact.html               die App, ausgeliefert und zugleich Quellcode
  XFact-Dokumentation.md   die Dokumentation, ausgeliefert
  LICENSE                  MIT
  tests/                   Tests, nur für die Entwicklung
```

**Kein Build-Schritt für den App-Code.** `xfact.html` wird direkt bearbeitet, auch von Nutzern. Deshalb gibt es eine bewusste **Abweichung vom Evaro-Tech-Stack**: kein React, kein shadcn, kein TypeScript-Build, sondern HTML, CSS und modernes JavaScript (ES-Module im `<script type="module">`).

Begründung: Aus React- und Tailwind-Code entsteht beim Bauen eine Datei, die man nicht mehr sinnvoll bearbeiten kann, und Änderungen daran fließen nicht in den Quellcode zurück.

**Gliederung von `xfact.html`:**
- Am Anfang steht ein Kommentar mit Name, Lizenzhinweis und einer Übersicht der Abschnitte.
- Die Abschnitte sind mit gut sichtbaren Kommentaren markiert, genau wie in der Dokumentation (Abschnitt 14) beschrieben:
  - **FARBEN UND SCHRIFTEN** (CSS-Variablen)
  - **LAYOUT**
  - **SEITE**
  - **TEXTE**
  - **ERKENNUNGSREGELN** (Synonymlisten, Einheiten, Steuerhinweise als Daten, nicht im Code verstreut)
  - **PRÜFUNGEN**
  - **KI**
  - **XML-ERZEUGUNG**
  - **PDF LESEN**
  - **ERKENNUNG**
  - **ABLAUF**
  - **BIBLIOTHEKEN**
- Code und Kommentare sind deutsch benannt bzw. kommentiert, wo das dem Verständnis dient.
- **pdf.js läuft ohne Hintergrund-Worker** im Hauptprogramm. Unter `file://` erlauben Browser keinen Worker aus eingebettetem Code (in Chrome geprüft).
- **Bibliotheken:** pdf.js samt Worker steht eingebettet am **Ende** der Datei, im Abschnitt BIBLIOTHEKEN, minifiziert und mit dem Vermerk „nicht ändern“. Ein kleines Skript in `scripts/` setzt diesen Block bei einem Update von pdf.js neu ein.
- Die Oberfläche ist schlicht und nutzt eigene CSS-Variablen. Die Symbole sind eingebettete SVGs, z.B. im Stil von Lucide, wenige und inline.

**Hosting:** Der Evaro-Build kopiert `XFact/xfact.html` nach `frontend/dist/xfact/index.html`. Bei der Umsetzung ist zu prüfen, dass Anmeldung und SPA-Weiterleitung von Evaro diesen Pfad nicht abfangen.

**Tests:**
- Der Code ist in zwei Skriptteile getrennt: **Fachlogik** (`<script id="xfact-fachlogik">`, ohne Zugriff auf die Seite) und **Ablauf** (Bedienung). Die Fachlogik stellt ihre Funktionen unter `window.XFact` bereit.
- vitest lädt den Fachlogik-Teil direkt aus `xfact.html` (`XFact/tests/fachlogik.ts`) und liest die Beispiel-PDFs mit pdf.js aus `node_modules`. Getestet wird also genau der ausgelieferte Code, ohne Browser-Umgebung.
- Ein Testskript prüft die erzeugten XMLs mit dem KoSIT-Validator. Das vorhandene `scripts/validate-xrechnung.mjs` wird wiederverwendet. Es ist nur ein Werkzeug für die Entwicklung (Java) und wird nicht ausgeliefert.

## 12. Abnahme

1. **Testsatz:** mindestens 8 PDF-Rechnungen deutscher Steller, verteilt auf mindestens drei Arten (Word, Excel, Rechnungsprogramm). Abgedeckt sind 19 %, 7 %, gemischt, §13b und §19. Die vorhandenen Beispiel-PDFs passen nicht, weil der Steller in Bulgarien sitzt. Fehlende Testrechnungen werden synthetisch erzeugt.
2. **Ohne KI:** Bei jeder Testrechnung kommt der Nutzer nur mit den Eingaben aus Abschnitt 7 (Tabelle „Pflichtangaben“) und eventuell einigen Korrekturen zu einer gültigen XML.
3. **Mit KI:** Bei jeder Testrechnung sind alle Werte aus dem PDF ohne Korrektur richtig erkannt.
4. **Gültigkeit:** Jede erzeugte XML wird vom KoSIT-Validator (XRechnung 3.0.x) als `ACCEPTABLE` bewertet, ohne Warnungen.
5. **Wiedererkennung:** Bei der **zweiten** Rechnung desselben Kunden kommen keine Rückfragen mehr zu Angaben, die bei der ersten gemerkt wurden.
6. **Offline-Datei:** Die HTML-Datei läuft ohne Internetverbindung in Chrome, Firefox und Safari. Prüfen: Bleiben gemerkte Angaben bei `file://` erhalten? Wenn nicht, muss das in den Hinweisen stehen.
7. **Daten sichern:** Export, „Alle Daten löschen“ und Import stellen den vorherigen Zustand vollständig wieder her.
8. **Dokumentation:** [XFact-Dokumentation.md](../../XFact/XFact-Dokumentation.md) stimmt mit dem tatsächlichen Verhalten überein und ist in der App unter „Hilfe“ erreichbar.
9. **Anpassbarkeit:** In einer frischen Claude-Code-Sitzung, die nur `xfact.html` und die Dokumentation kennt, führen drei Beispiel-Aufträge aus Abschnitt 14 der Dokumentation (Farbe, Erkennungsregel, Prüfregel) zu einer funktionierenden App. Erzeugte XMLs bleiben gültig.

## 13. Entscheidungen

| Frage | Entscheidung |
|---|---|
| Name | **XFact** |
| KI-Voreinstellung | ein leistungsfähiges Modell: `anthropic/claude-sonnet-5.5` (Modelltest in 6.2) |
| Impressum, Datenschutzerklärung | entfällt, weil die Seite nicht öffentlich beworben wird |
| Lizenz | Open Source, MIT |
| Repository | bleibt im Evaro-Repo, weil es ein Experiment ist |
| Steuerfälle Version 1 | 19 %, 7 % (auch gemischt), §13b und §19 (Abschnitt 7) |
| Ort im Repo | `XFact/` neben `frontend/` und `backend/` |

## 14. Offene Punkte

1. **Testsatz für die Modellwahl:** Die Voreinstellung wird mit den Testrechnungen aus Abschnitt 12 noch einmal geprüft, sobald es sie gibt.
