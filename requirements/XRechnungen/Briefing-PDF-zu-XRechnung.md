# Briefing: XFact – PDF zu XRechnung

Stand: 15.10.2026 · Status: Erkennung auf KI umgestellt (Version 1 im Bau)

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

1. **Läuft im Browser.** Es gibt keinen eigenen Server, kein Konto und keine Anmeldung. Der Text der Rechnung geht an den KI-Anbieter, den der Nutzer wählt; mit einer lokalen KI verlässt er den Rechner nicht.
2. **Die Erkennung macht eine KI, ein Layout wird nicht erwartet.** Eine Sprach-KI bildet den Rechnungstext direkt auf die Felder der XRechnung ab (BT-Nummern, Einheitencodes, Steuerkategorien) und meldet fehlende Pflichtangaben. Der Prüfer **Jev** kontrolliert die erkannten Werte, feste Regeln prüfen das Formale. Ohne KI gibt es keinen Betrieb. (Eine regelbasierte Erkennung wurde gebaut und verworfen: Sie hing am Layout der Beispielrechnungen und scheiterte an INV 706.)
3. **Die Verantwortung liegt beim Nutzer.** Das Tool sagt klar, was es tut und was nicht. Danach lässt es dem Nutzer freie Hand. Es blockiert nur, was eine **ungültige XML** ergäbe. Alles andere sind Hinweise.
4. **Total einfach.** Drei Schritte. Einmalig ist die KI einzurichten (Endpunkt, Modell, Schlüssel); die eigenen Firmendaten liest das Tool aus der ersten Rechnung.
5. **Oberfläche:** klar, sachlich, modern, schlicht. Funktional auf den Punkt, keine Dekoration.
6. **Anpassen ist erwünscht.** Nutzer sollen XFact selbst verändern, auch ohne Programmierkenntnisse mit einem KI-Assistenten. Deshalb ist die ausgelieferte HTML-Datei **zugleich der Quellcode**: lesbar, kommentiert, klar gegliedert. Die Dokumentation erklärt in Abschnitt 14, wie man vorgeht, mit Beispiel-Aufträgen.

## 3. Auslieferung

Aus demselben Quellcode entstehen beide Varianten:

| Variante | Beschreibung |
|---|---|
| **Gehostet** | Dieselbe Datei `xfact.html` als statische Seite auf der Netlify-Site von Evaro, unter einem eigenen Pfad (Vorschlag: `/xfact/`), **ohne Anmeldung** und ohne Backend. Sie wird nicht beworben und nur per Link weitergegeben. Deshalb gibt es kein Impressum und keine Datenschutzerklärung. |
| **Offline** | **Eine einzige HTML-Datei** `xfact.html`, in der alles enthalten ist, auch die PDF-Bibliothek. Herunterladen, doppelklicken, läuft ohne Internet (außer bei eingeschalteter KI). |

Die Seite hat in beiden Varianten einen Link „Offline-Version herunterladen“.

**Namen und Startseite:** Die beiden Apps heißen **XFact Gen** (`xfact.html`, PDF → XRechnung) und **XFact View** (`XFactViewer.html`, XRechnung anzeigen); die Dateinamen bleiben. Die Startseite `XFact/index.html` zeigt den Schriftzug XFact, erklärt kurz, worum es geht, und führt zu beiden Apps und ihren Dokumentationen. Der Schriftzug in den Apps führt zur Startseite zurück. Gehostet wird der Ordner `XFact/` als Ganzes; `index.html` ist dann die Einstiegsseite unter `/xfact/`.

## 4. Erste Nutzung

Vor dem ersten Hochladen zeigt Schritt 1 die Hinweise und gleich darunter die KI-Einrichtung (Texte stehen in `TEXTE.hinweise` und `TEXTE.ki`):

- Der Text der Rechnungen geht an den gewählten KI-Anbieter; der API-Schlüssel liegt im Browser.
- Gemerktes liegt nur in diesem Browser; sichern über „Daten exportieren“.
- Die XML ist die maßgebliche Rechnung; prüfen und aufbewahren ist Sache des Nutzers.
- Ohne Gewähr.

Darunter: Endpunkt (voreingestellt OpenRouter), Modell (voreingestellt `google/gemini-3.8-flash`), API-Schlüssel, Häkchen „vom Prüfer Jev kontrollieren lassen“, Hinweis für lokale KIs, Knöpfe **„Verbindung testen“** und **„Verstanden, loslegen“**. Erst danach erscheint die Ablagefläche. Im Menü lassen sich die KI-Einstellungen jederzeit ändern; die Hinweise stehen dort ebenfalls.

## 5. Ablauf

### Schritt 1: Hochladen

- PDF hineinziehen oder über „Datei wählen“ öffnen. Es wird **eine Rechnung pro Datei** verarbeitet.
- Während die KI liest, zeigt das Tool einen Fortschritt mit mitlaufenden Sekunden (typisch 10 bis 20 s), danach „Der Prüfer kontrolliert …“ (unter 1 s). Die Ablagefläche ist so lange gesperrt.
- Fehlermeldungen in Klartext:
  - **Keine Textebene:** „Dieses PDF enthält keinen Text, vermutlich ist es ein Scan. Scans werden nicht unterstützt.“
  - **KI-Fehler:** Schlüssel falsch (401), kein Guthaben (402), Modell unbekannt (404), ausgelastet (429), keine Verbindung, Zeitüberschreitung (180 s), unlesbare Antwort.
  - **Prüfer nicht erreichbar:** kein Abbruch, aber ein gelber Hinweis „Werte sind ungeprüft“.

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
  - **Gelb (unsicher):** Bitte prüfen. Beispiele: schwach erkannt, oder KI und Regeln widersprechen sich. Eine eigene Eingabe hebt die Zweifel an der KI auf; die formalen Regeln (Prüfziffer, Aufbau, Datum, Rechenkontrolle) prüfen sie trotzdem. Nur „Stimmt“ hebt jeden gelben Hinweis auf.
  - **Grau (ergänzt):** „aus Kundenprofil ergänzt“ bzw. „aus Firmenprofil ergänzt“, damit sichtbar ist, woher ein Wert stammt.
- **Rechenkontrolle** bei den Summen: ✓ oder ein Hinweis, wo die Differenz entsteht.

**Unter der Rechnung** stehen „Weitere Angaben“, also alles, was im Rechnungsbild keinen Platz hat:
- **Umsatzsteuer** je Position (Auswahl in der Tabelle) und für alle Positionen mit einem Klick (Abschnitt 7)
- **Einheiten zuordnen:** „Pausch.“ = [Pauschale ▾]
- **Käuferreferenz bzw. Leitweg-ID** (optional, bei Behörden Pflicht). Hält die KI den Empfänger für eine öffentliche Stelle (`kaeufer.oeffentlich`) und fehlt die Leitweg-ID, ist das Feld gelb, nicht rot: Nicht jede öffentliche Stelle verlangt sie, und die KI kann sich irren. „Stimmt“ hebt den Hinweis auf.
- **Leistungsdatum fehlt** → Schnellknopf „= Rechnungsdatum“

Unten steht **ein** Häkchen **„Ergänzte Angaben merken“** (standardmäßig gesetzt) mit der Liste dessen, was gemerkt wird. Das ist eine bewusste Vereinfachung gegenüber einem Häkchen pro Feld. Gemerkt wird je nach Angabe im Firmenprofil, im Kundenprofil oder in der Einheitenzuordnung. **Gemerktes füllt nur Lücken**: Es ergänzt nur, was im PDF fehlt, und es wird auch nur gemerkt, was im PDF fehlte.

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

### 6.0 Grundlage ist die Norm, nicht die Beispielrechnungen

Was eine XRechnung enthalten kann, legt die Norm EN 16931 mit der XRechnung 3.0 fest: 164 Felder (BT-1 … BT-165 ohne BT-4) und die Codelisten für Rechnungsarten, Zahlungsarten, Steuerkategorien und Einheiten. XFact leitet seine Abdeckung daraus ab, nicht aus vorgelegten Rechnungen. (Anlass: Bis zum 16.10.2026 wurde das Antwortschema an Beispielrechnungen entlang erweitert; Kreditkarte, Skonto und Rabatte je Position fielen erst auf, als der Nutzer Rechnungen damit vorlegte. Das war der falsche Weg.)

- **Liste STANDARD** in `xfact.html`: jedes Feld mit seiner Behandlung – „ki“ (die KI liest es, 130 Felder), „xfact“ (XFact setzt es selbst, 14), „nein“ (bewusst nicht, mit Grund, 20: Fremdwährung, Steuervertreter, Steuerfälligkeit, Code-Felder neben Texten, Warenklassifizierung, eingebettete Dateien). Daraus der Anhang der Dokumentation (`node XFact/tests/abdeckung.mjs`).
- **Antwortschema der KI** enthält jedes „ki“-Feld (Test `abdeckung.test.ts`) und ist nach den Bereichen einer Rechnung gegliedert: Kopf und Referenzen, Rechnungssteller, Empfänger, Zahlungsempfänger, Lieferung, Zahlung, Nachlässe und Zuschläge, Positionen, Steuer, Summen.
- **Sicherheitsnetz:** Die KI meldet unter `nichtZugeordnet` jede Angabe, die sie keinem Feld zuordnen konnte; die Prüfansicht zeigt sie gelb unter „Nicht übernommen“. Nicht gemeldet werden Angaben ohne Feld und ohne Bedeutung für die Rechnung (Internetadresse, Name der Bank, Seitenzahlen).
- **Prüfregeln aus der KoSIT-Konfiguration** (Schematron EN 16931 und XRechnung 3.0.2) bestimmen, was rot (Fehler) und gelb (Warnung) ist, z.B. Mandatsreferenz bei Lastschrift (PEPPOL-R061, Fehler), Position im Leistungszeitraum (PEPPOL-R110/111), Nettopreis = Bruttopreis − Nachlass (PEPPOL-R046), „nicht steuerbar“ nur allein und ohne USt-IdNr. (BR-O-02, BR-O-11), Nullsatz ohne Befreiungsgrund (BR-Z-10); nur gelb: Menge × Preis (PEPPOL-R120), Telefon und E-Mail (BR-DE-27/28), Korrektur ohne Bezug (BR-DE-26).
- **Eigenheiten der Syntax CII**, die XFact berücksichtigt: nur eine vorausgegangene Rechnung (weitere als Bemerkung), nur eine Anlage mit Beschreibung (CII-SR-475), keine leeren Elemente (PEPPOL-R008).

**Kreis-Test** (`XFact/tests/kreis/`): sechs Musterrechnungen, die zusammen jedes „ki“-Feld enthalten, werden zur XRechnung, als PDF gedruckt (`als-pdf.mjs`, wie ein Rechnungsprogramm, mit gewohnten Beschriftungen), von XFact mit echter KI und Prüfer gelesen und wieder zur XRechnung. Beide werden mit XFactViewer gelesen und Feld für Feld verglichen (`vergleich.mjs`). Ergebnis am 16.10.2026: in allen sechs Rechnungen kein Feld abweichend, fehlend oder zusätzlich; alle XMLs KoSIT-gültig ohne Warnungen; höchstens ein Grenzfall des Prüfers je Rechnung (Wert knapp unter 0,5). Abweichungen, die nur Auslegung sind, gleicht der Vergleich aus: Bezeichnung und Beschreibung einer Position zusammen, Anschriftzeilen zusammen, freie Texte (BT-20 außer Skonto, BT-82). Neu aufzeichnen: `node XFact/tests/kreis/aufzeichnen.mjs <schlüsseldatei>`.

### 6.1 Arbeitsteilung

| Wer | Was | Wie |
|---|---|---|
| **Sprach-KI** (ein Aufruf je Rechnung) | liest den ganzen Text und füllt die Felder der XRechnung: Kopf, beide Parteien, Zahlung, Positionen, Steuer, Summen; leitet ab, was eindeutig ist (Einheitencode, Steuerkategorie, Fälligkeit aus Zahlungsziel, Leistungsdatum aus Beschreibung oder Zeitraum); schätzt ein, ob der Empfänger eine öffentliche Stelle ist (dann wird nach der Leitweg-ID gefragt); meldet unter „fehlt“ fehlende Pflichtangaben | `frageKi`: Anweisung `KI_ANWEISUNG`, Antwortschema `KI_SCHEMA` (`response_format: json_schema`, `strict`), Eingabe ist nur der Text aus „PDF lesen“ |
| **Prüfer Jev** (ein Aufruf, alle Fragen parallel) | „Steht in der Rechnung, dass X der Wert Y ist?“ für Nummer, Daten, Namen, PLZ/Ort, USt-IdNrn., IBAN, Ansprechpartner, Referenzen, Kennungen, Registernummern, Menge/Preis/Betrag/Rabatt/Artikelnummer je Position, Nachlässe und Zuschläge, bei Lastschrift Gläubiger-ID, Kunden-IBAN und Mandat; Auswahlfragen für Einheit und Steuer je Position und die Zahlungsart; Beträge im deutschen Format | `frageJev` über die Decisions-Schnittstelle von OpenRouter (`typesafe/jev-1.13`); Wert unter 0,5 oder andere Wahl ergibt gelb |
| **Feste Regeln** | IBAN-Prüfziffer und -Länge, Aufbau der USt-IdNr. je Land, Aufbau und Prüfziffer von Leitweg-ID und Gläubiger-ID (ISO 7064 Mod 97-10), gültige Daten, Fälligkeit nicht vor Rechnungsdatum, Zeitraum nicht verkehrt herum, Einheitencode aus der Liste, Rechnungsnummer/IBAN/USt-IdNr. wörtlich im Text, Menge × Preis, Summen gegen die von der KI gelesenen Summen | Abschnitte REGELN und PRÜFUNGEN |

Die Antwort der KI wird zum **Befund** vereinheitlicht (`befundAusKi`: leere Texte → null, Zahlen als Zahl, USt-IdNr. und IBAN ohne Leerzeichen); daraus und aus den Ergänzungen des Nutzers baut `baueRechnung` die Rechnung, mit der Prüfansicht, Gedächtnis und XML-Erzeugung arbeiten.

**Vorgaben für das Schema:** Alle Felder sind Pflicht, ohne „Text oder null“-Typen; fehlende Texte kommen als `""`, fehlende Zahlen als `0`. Manche Anbieter (Anthropic) lehnen sonst ab.

**Text für die KI:** `alsLayoutText` setzt die Zeilen so, dass Spalten ungefähr untereinander stehen; doppelt gedruckte Textstücke (Fettschrift mancher Programme) werden vorher entfernt.

### 6.2 Modelltest (15.10.2026)

8 echte Rechnungen (die 5 Beispiel-PDFs, dazu INV 706 mit fremdem Layout, INV 740, INV 741), je 322 Prüfpunkte: Kopf, beide Parteien, IBAN/BIC, jede Position mit Menge, Einheitencode, Preis, Betrag, Steuerkategorie, Satz und Leistungsdatum, Steuerblock, Summen, Meldung der fehlenden Käufer-E-Mail.

| Modell | richtig | Ø s | Cent/Rg |
|---|---|---|---|
| google/gemini-3.8-flash (**Voreinstellung**) | 322/322 | 11,4 | 1,0 |
| openai/gpt-6.1-sol | 322/322 | 19,1 | 1,2 |
| anthropic/claude-opus-5.5 | 322/322 | 18,1 | 5,0 |
| anthropic/claude-sonnet-5.5 | 321/322 | 9,6 | 2,6 |
| openai/gpt-6-luna | 321/322 | 14,7 | 0,08 |
| deepseek/deepseek-v4.1-flash | 321/322 | 31,1 | 0,9 |
| google/gemini-4-argon | 320/322 | 13,4 | 1,8 |
| anthropic/claude-haiku-5.5 | 319/322 | 9,3 | 0,17 |

Die Abweichungen waren Kleinigkeiten (Positionsnamen anders getrennt, Telefon anders geschrieben); kein Betrag, Datum, Code oder keine Steuerkategorie war falsch.

**Prüfer Jev:** In die richtigen Ergebnisse wurden 63 typische Fehler eingebaut (vertauschte Ziffern in Nummer und IBAN, Fälligkeit statt Rechnungsdatum, Absender als Empfänger, USt-IdNr. der falschen Partei, Menge × 10, falscher Preis, falsche PLZ). Jev fand **63 von 63** und bestätigte 142 von 143 richtigen Werten, für 0,02 Cent und 0,6 s je Rechnung. Der eine Fehlalarm kam von einer Zählfrage („mehr als 7 Positionen?“); solche Fragen werden nicht gestellt.

**Gesamtkette:** INV 706, 740 und 741 laufen mit dem Code aus `xfact.html` (Node, echter OpenRouter) ohne Rot bis zur XML, die der KoSIT-Validator annimmt.

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
- **Rabatt auf eine Position** (z.B. eine Rabattzeile direkt unter der Position): als Nachlass der Position (BG-27, BT-136 Betrag, BT-139 Grund, Ersatz „Rabatt“ nach BR-42). Der Preis bleibt der Preis vor Rabatt; Betrag = Menge × Preis − Rabatt. Preise mit bis zu 4 Nachkommastellen bleiben erhalten; Positionsbeträge werden erst beim Summieren und in der XML auf Cent gerundet (BR-CO-10).
- Rabatte oder Zuschläge auf Summenebene werden **nicht** unterstützt. Taucht so etwas auf, gibt es einen roter Hinweis.

**Zahlung:**
- **SEPA-Überweisung** (`58`, BG-17): Fälligkeitsdatum, IBAN und BIC des Rechnungsstellers.
- **Kreditkarte** (`54`, BG-18): letzte 4 Ziffern der Karte des Kunden (BT-87, Pflicht; nach BR-51 höchstens die ersten 6 und letzten 4 Ziffern, KoSIT prüft die Länge). Keine eigene Bankverbindung (BR-DE-24-b), Fälligkeit optional; BT-20 nennt die Belastung. Gemerkt im Kundenprofil.
- **SEPA-Lastschrift** (`59`, BG-19): Gläubiger-ID (BT-90, Pflicht nach BR-DE-30), IBAN des Kunden (BT-91, Pflicht nach BR-DE-31), Mandatsreferenz (BT-89, optional). Keine eigene Bankverbindung (BR-DE-25-b), Fälligkeit optional; die Zahlungsbedingungen (BT-20) nennen den Einzug (BR-CO-25). Die KI erkennt die Zahlungsart; eine maskierte Kunden-IBAN wird nicht übernommen. Gemerkt: Gläubiger-ID im Firmenprofil, IBAN und Mandatsreferenz im Kundenprofil.
- **Skonto** erkennt die KI je Stufe (Satz, Frist, ggf. Datum und Betrag). In BT-20 steht es im Format der XRechnung, je Stufe eine Zeile `#SKONTO#TAGE=8#PROZENT=2.00#`, darunter „Zahlbar bis …“. Die Frist zählt ab dem Rechnungsdatum (BT-2); steht ein Datum auf der Rechnung, wird daraus gerechnet. Ohne Frist rot, abweichender Skontobetrag gelb. Satz und Datum sind in der Prüfansicht änderbar, die Stufe lässt sich entfernen.
- **Positionsnummer** (BT-126) wie auf der Rechnung, auch mit Lücken; nur wenn eine Nummer doppelt vorkommt, wird durchgezählt. Der Prüfer fragt nach der Position mit dieser Nummer, bei gleichen Bezeichnungen mit dem Anfang der Beschreibung.

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
| Kundenprofile | E-Mail, USt-IdNr., Leitweg-ID, für Lastschrift IBAN und Mandatsreferenz, für Karten die letzten 4 Ziffern | USt-IdNr., sonst Name + PLZ |
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

Es gibt nur **eine Seite** mit den drei Schritten. Oben rechts ist ein Menü (gebaut: KI, Firmen mit Einheiten und Kunden, Logbuch, Datensicherung, Hinweise; noch offen: Hilfe, Offline-Version):
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
  - **REGELN** (formale Regeln als Daten)
  - **PRÜFUNGEN**
  - **KI** (Voreinstellungen, Anweisung, Schema, Prüfer)
  - **RECHNUNG** (Befund + Ergänzungen → Rechnung)
  - **XML-ERZEUGUNG**
  - **PDF LESEN**
  - **GEDÄCHTNIS**
  - **ABLAUF**
  - **BIBLIOTHEKEN**
- Code und Kommentare sind deutsch benannt bzw. kommentiert, wo das dem Verständnis dient.
- **pdf.js läuft ohne Hintergrund-Worker** im Hauptprogramm. Unter `file://` erlauben Browser keinen Worker aus eingebettetem Code (in Chrome geprüft).
- **Bibliotheken:** pdf.js samt Worker steht eingebettet am **Ende** der Datei, im Abschnitt BIBLIOTHEKEN, minifiziert und mit dem Vermerk „nicht ändern“. Ein kleines Skript in `scripts/` setzt diesen Block bei einem Update von pdf.js neu ein.
- Die Oberfläche ist schlicht und nutzt eigene CSS-Variablen. Die Symbole sind eingebettete SVGs, z.B. im Stil von Lucide, wenige und inline.

**Hosting:** Der Evaro-Build kopiert `XFact/xfact.html` nach `frontend/dist/xfact/index.html`. Bei der Umsetzung ist zu prüfen, dass Anmeldung und SPA-Weiterleitung von Evaro diesen Pfad nicht abfangen.

**Tests:**
- Der Code ist in zwei Skriptteile getrennt: **Fachlogik** (`<script id="xfact-fachlogik">`, ohne Zugriff auf die Seite) und **Ablauf** (Bedienung). Die Fachlogik stellt ihre Funktionen unter `window.XFact` bereit.
- vitest lädt den Fachlogik-Teil direkt aus `xfact.html` (`XFact/tests/fachlogik.ts`). Getestet wird also genau der ausgelieferte Code, ohne Browser-Umgebung.
  - Die Tests laufen **ohne Netz**: KI und Prüfer bekommen statt `fetch` eine Fassung, die die Anfrage festhält und eine Antwort liefert.
  - Echte Antworten von KI und Prüfer zu den 5 Beispiel-PDFs liegen in `XFact/tests/ki-antworten/`. Neu aufzeichnen: `node XFact/tests/aufzeichnen.mjs <datei-mit-openrouter-schlüssel>` (benutzt genau `frageKi`/`frageJev` aus `xfact.html`; der Schlüssel wird nicht gespeichert).
- Der Ablauf-Teil wird nicht ausgeführt, aber geprüft: `syntax.test.ts` übersetzt alle Skripte, `namen.test.ts` meldet Namen, die ein Skript verwendet, aber weder selbst definiert noch aus `window.XFact` holt (TypeScript-Compiler mit `checkJs`, nur die Meldung „Cannot find name“). Beides gilt auch für `XFactViewer.html`.
- Ein Testskript prüft die erzeugten XMLs mit dem KoSIT-Validator. Das vorhandene `scripts/validate-xrechnung.mjs` wird wiederverwendet. Es ist nur ein Werkzeug für die Entwicklung (Java) und wird nicht ausgeliefert.

## 12. Abnahme

1. **Testsatz:** mindestens 8 PDF-Rechnungen deutscher Steller, verteilt auf mindestens drei Arten (Word, Excel, Rechnungsprogramm). Abgedeckt sind 19 %, 7 %, gemischt, §13b und §19. Die vorhandenen Beispiel-PDFs passen nicht, weil der Steller in Bulgarien sitzt. Fehlende Testrechnungen werden synthetisch erzeugt.
2. **Erkennung:** Mit der voreingestellten KI sind bei jeder Testrechnung alle Werte aus dem PDF ohne Korrektur richtig erkannt; der Nutzer gibt nur ein, was nicht im PDF steht (Abschnitt 7, Tabelle „Pflichtangaben“).
3. **Prüfer:** Absichtlich eingebaute Fehler werden gelb markiert; richtige Werte nicht.
4. **Gültigkeit:** Jede erzeugte XML wird vom KoSIT-Validator (XRechnung 3.0.x) als `ACCEPTABLE` bewertet, ohne Warnungen.
5. **Wiedererkennung:** Bei der **zweiten** Rechnung desselben Kunden kommen keine Rückfragen mehr zu Angaben, die bei der ersten gemerkt wurden.
6. **Offline-Datei:** Die HTML-Datei läuft ohne Internetverbindung in Chrome, Firefox und Safari. Prüfen: Bleiben gemerkte Angaben bei `file://` erhalten? Wenn nicht, muss das in den Hinweisen stehen.
7. **Daten sichern:** Export, „Alle Daten löschen“ und Import stellen den vorherigen Zustand vollständig wieder her.
8. **Dokumentation:** [XFact-Dokumentation.md](../../XFact/XFact-Dokumentation.md) stimmt mit dem tatsächlichen Verhalten überein und ist in der App unter „Hilfe“ erreichbar.
9. **Anpassbarkeit:** In einer frischen Claude-Code-Sitzung, die nur `xfact.html` und die Dokumentation kennt, führen drei Beispiel-Aufträge aus Abschnitt 14 der Dokumentation (Farbe, Anweisung an die KI, Prüfregel) zu einer funktionierenden App. Erzeugte XMLs bleiben gültig.

## 13. Entscheidungen

| Frage | Entscheidung |
|---|---|
| Name | **XFact** |
| Erkennung | nur mit KI; kein Betrieb ohne KI. Regelbasierte Erkennung verworfen |
| KI-Voreinstellung | `google/gemini-3.8-flash` (Modelltest in 6.2) |
| Prüfer | Jev (`typesafe/jev-1.13`) kontrolliert die KI-Werte, nur über OpenRouter; abschaltbar |
| Impressum, Datenschutzerklärung | entfällt, weil die Seite nicht öffentlich beworben wird |
| Lizenz | Open Source, MIT |
| Repository | bleibt im Evaro-Repo, weil es ein Experiment ist |
| Abdeckung | aus der Norm abgeleitet (Abschnitt 6.0), nicht aus Beispielrechnungen; jedes Feld unterstützt oder bewusst nicht, mit Grund |
| Umsatzsteuer | je Position: S (beliebige Sätze, gemischt), Z, E, AE, O; nicht K, G, L, M (Empfänger im Ausland bzw. Sondergebiete) |
| Zahlungsarten | Überweisung (58), Lastschrift (59), Kreditkarte (54), Debitkarte (55), bar (10), Verrechnung (97), online (68), sonstige (ZZZ) |
| Ort im Repo | `XFact/` neben `frontend/` und `backend/` |
| Merken | ein Häkchen für alle ergänzten Angaben statt eines pro Feld; Gemerktes füllt nur Lücken |
| Speicher | `localStorage` (Schlüssel `xfact.gedaechtnis`); Kunden je Firma; Logbuch höchstens 1000 Einträge. Unter `file://` in Chrome geprüft: bleibt erhalten |

## 14. Offene Punkte

1. **Breiterer Testsatz** mit fremden Layouts und deutschen Rechnungsstellern (Abschnitt 12, Punkt 1), auch um die Modellwahl zu bestätigen. Bisher: 8 Rechnungen eines Absenders mit zwei Layouts.
2. **Menü:** „Hilfe“ (Dokumentation in der App) und „Offline-Version herunterladen“ fehlen noch; ebenso das Ausliefern unter `/xfact/` auf der Netlify-Site.
3. **Firefox und Safari** sind noch nicht geprüft, insbesondere `file://`.
4. **Lokale KI** (LM Studio): angebunden und getestet ist nur die Anfrage; welches lokale Modell gut genug ist, ist offen.
5. **Offizielle KoSIT-Testsuite** (xrechnung-testsuite auf GitHub) als zweite Quelle für den Kreis-Test: ihre CII-Beispiele als PDF drucken und durch XFact schicken. Braucht einen Download; noch nicht gemacht.
6. **Prüfansicht bei sehr vielen Feldern:** Seltene Angaben stehen unter „Weitere Angaben ergänzen“; ob das für Nutzer übersichtlich genug ist, ist mit echten Rechnungen zu prüfen.
7. **XFactViewer** (`XFact/XFactViewer.html`, eigene Dokumentation `XFactViewer-Dokumentation.md`): zeigt XRechnungen lesbar an, ohne KI, vollständig im Browser. Gebaut ist Schritt 1: Syntax CII, Codes übersetzt, Nachrechnen, BT-Nummern, Anhänge speichern, Drucken; getestet mit den XMLs aus XFact (hin und zurück) und einer handgeschriebenen XRechnung. Offen: Syntax UBL, XML aus ZUGFeRD-/Factur-X-PDFs holen, Tests mit der offiziellen KoSIT-Testsuite, Ausliefern neben XFact.
