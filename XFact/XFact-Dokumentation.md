# XFact – Dokumentation

**Aus Ihrer PDF-Rechnung wird eine XRechnung.** Sie müssen dafür Ihr Rechnungsprogramm nicht umbauen.

Version 1 · Lizenz: MIT

---

## 1. Was ist XFact?

XFact ist eine kleine Web-App, die in Ihrem Browser läuft. Sie lesen eine PDF-Rechnung ein. **Eine KI liest die Rechnung** und ordnet ihren Inhalt den Feldern der XRechnung zu, ganz gleich, wie Ihre Rechnung aufgebaut ist. Ein zweites KI-Modell, der **Prüfer**, kontrolliert die erkannten Werte, und XFact rechnet nach. Dann fragt XFact, was für eine gültige XRechnung noch fehlt, und erzeugt daraus eine **XRechnung-Datei (XML)**.

Diese XML-Datei verschicken Sie zusammen mit Ihrem gewohnten PDF an Ihren Kunden.

**Für wen:** Unternehmen in Deutschland, die Rechnungen an Empfänger in Deutschland schreiben. Die Rechnungen entstehen zum Beispiel in Word, Excel oder einem Rechnungsprogramm, das keine E-Rechnung kann.

## 2. Was XFact kann und was nicht

**XFact kann:**
- PDF-Rechnungen mit Textebene einlesen. So sind fast alle PDFs, die aus Word, Excel oder einem Programm erzeugt werden. Ein bestimmtes Layout ist nicht nötig.
- **Alles erkennen, was eine XRechnung enthalten kann**, mit KI: Grundlage ist die Norm selbst, nicht eine Auswahl. Dazu gehören:
  - Kopfdaten und alle Referenzen (Bestellung, Auftrag, Vertrag, Projekt, Lieferschein, Kostenstelle …)
  - Rechnungssteller und Empfänger mit Ansprechpartnern, Registernummern und Kundennummer, Lieferanschrift, Zahlungsempfänger (z.B. Factoring)
  - Positionen mit Artikelnummern, Merkmalen, Listenpreis, Rabatten und Zuschlägen
  - Nachlässe und Zuschläge auf die ganze Rechnung, Anzahlungen
  - jede Zahlungsart, Skonto, Bemerkungen und Anlagen
  - Abschlags-, Schluss- und Korrekturrechnungen sowie Gutschriften
  - Welche Felder es gibt und wie XFact sie behandelt, steht im Anhang.
- **Nichts stillschweigend weglassen:** Was die KI auf der Rechnung findet, aber keinem Feld zuordnen kann, zeigt XFact unter „Nicht übernommen“.
- Kontrollieren: Ein Prüfer bestätigt die erkannten Werte, feste Regeln prüfen IBAN, USt-IdNr., Leitweg-ID, Gläubiger-ID, Telefon und E-Mail, und XFact rechnet jede Position, Nachlässe, Steuer und Summen nach.
- Fehlende Pflichtangaben gezielt nachfragen und sich die Antworten merken, auch pro Kunde.
- Eine **XRechnung 3.0** erzeugen, die den offiziellen Prüfregeln entspricht.
- Mit einer KI Ihrer Wahl arbeiten: voreingestellt OpenRouter, oder eine KI auf Ihrem eigenen Rechner.
- **Von Ihnen angepasst werden.** Farben, Layout, Texte, Regeln: Mit einem KI-Assistenten geht das auch ohne Programmierkenntnisse (Abschnitt 14).

**XFact kann nicht:**
- Ohne KI arbeiten. Sie brauchen einen Zugang zu einem KI-Anbieter oder eine lokale KI.
- Gescannte Rechnungen (Bilder ohne Text) lesen.
- Rechnungen in anderer Währung als Euro, Rechnungen mit Steuervertreter, innergemeinschaftliche Lieferungen und Ausfuhren. XFact ist für Rechnungen innerhalb Deutschlands gemacht; solche Rechnungen erkennt es und sagt es Ihnen.
- Dateien in die XRechnung einbetten. Verweise auf Anlagen übernimmt es.
- ZUGFeRD erzeugen. Das wäre ein PDF mit eingebetteter XML. XFact erzeugt eine separate XML-Datei.
- Rechnungen verschicken oder archivieren.

## 3. In 30 Sekunden

Einmalig: **KI einrichten** (Abschnitt 9).

1. **PDF hineinziehen.** Die KI braucht etwa 10 bis 20 Sekunden.
2. **Prüfen:** Rot markierte Angaben ergänzen, gelb markierte kurz ansehen.
3. **„XML erzeugen“ klicken.** Die Datei wird heruntergeladen und heißt wie Ihr PDF, nur mit `.xml`.

Ab der zweiten Rechnung für denselben Kunden fragt XFact meist nichts mehr nach.

## 4. Bevor Sie loslegen

Beim ersten Start zeigt XFact einige Hinweise und richtet gleich die KI ein. Mit „Verstanden, loslegen“ bestätigen Sie:

- Der Text Ihrer Rechnungen wird an den KI-Anbieter geschickt, den Sie wählen. Ihr API-Schlüssel wird in diesem Browser gespeichert.
- Gemerkte Angaben liegen nur in diesem Browser. Sichern Sie sie regelmäßig über „Daten exportieren“.
- **Die XML-Datei ist die maßgebliche Rechnung.** Sie prüfen die Angaben vor dem Versand und bewahren die XML auf.
- XFact wird ohne Gewähr bereitgestellt.

Die Hinweise finden Sie jederzeit wieder im Menü (☰).

## 5. Schritt für Schritt

### 5.1 Hochladen

Ziehen Sie das PDF in das Fenster oder klicken Sie auf **Datei wählen**. Es wird eine Rechnung pro Datei verarbeitet. Während die KI liest, zählt XFact die Sekunden mit; danach kontrolliert der Prüfer die Werte, das dauert unter einer Sekunde.

| Meldung | Bedeutung |
|---|---|
| „Dieses PDF enthält keinen Text …“ | Das PDF ist vermutlich ein Scan. Erzeugen Sie die Rechnung direkt als PDF aus Ihrem Programm, statt sie auszudrucken und einzuscannen. |
| „Der API-Schlüssel wird nicht akzeptiert.“ | Schlüssel im Menü unter KI prüfen, „Verbindung testen“. |
| „Beim KI-Anbieter ist kein Guthaben mehr vorhanden.“ | Guthaben beim Anbieter aufladen. |
| „Keine Verbindung zur KI …“ | Internetverbindung und Endpunkt prüfen; bei einer lokalen KI: läuft sie, ist CORS eingeschaltet? |
| „Die Antwort der KI war nicht lesbar …“ | Noch einmal versuchen, sonst im Menü ein anderes Modell wählen. |

### 5.2 Prüfen

XFact zeigt Ihre Rechnung **neutral, ohne Ihr Layout**: Kopf, Absender, Empfänger, Positionen, Summen, Zahlung. Jeden Wert können Sie anklicken und ändern.

Markierungen zeigen, was zu tun ist:

| Farbe | Bedeutung | Was Sie tun |
|---|---|---|
| **Rot** | Diese Angabe fehlt. Ohne sie wird die XRechnung ungültig. | Direkt im Feld daneben eintragen. |
| **Gelb** | Bitte prüfen, z.B. „vom Prüfer nicht bestätigt“, „Prüfer meint: Stunde“, „steht so nicht in der Rechnung“, „Prüfziffer stimmt nicht“ oder „bereits am … umgewandelt“. | Prüfen und korrigieren, oder auf **„Stimmt“** klicken, wenn der Wert richtig ist. Gelb hält Sie nicht auf. Was Sie selbst eintippen, prüft XFact ebenfalls auf Prüfziffer, Aufbau und Datum. |
| **Grau** | Aus Ihren gemerkten Angaben ergänzt, z.B. „aus Kundenprofil“. | Nur zur Information. |

Bei den Summen zeigt ein **✓**, dass alles aufgeht. Sonst nennt XFact die Differenz.

**Ändern:** Klicken Sie auf einen Wert, ändern Sie ihn und drücken Sie Enter, oder wechseln Sie mit Tab ins nächste Feld. Mit Escape brechen Sie ab. Die Einheit jeder Position steht als Auswahl in der Tabelle (Stunde, Tag, Pauschale, Stück …). Ändern Sie sie, gilt das für alle Positionen mit derselben Schreibweise, und XFact merkt es sich für Ihre Firma.

**Positionsnummern** zeigt XFact so, wie sie auf der Rechnung stehen, auch mit Lücken (1, 2, 4). Genau diese Nummern stehen auch in der XRechnung.

**Rabatt auf eine Position:** Steht unter einer Position ein Rabatt, der nur sie betrifft, zeigt XFact ihn unter der Beschreibung, z.B. „Willkommensangebot: −23,39 €“. Der Preis bleibt der Preis vor Rabatt, der Betrag der Position ist Preis × Menge minus Rabatt, genau wie auf der Rechnung. In der XRechnung steht der Rabatt als Nachlass dieser Position.

**Skonto:** Nennt die Rechnung Skonto, z.B. „zahlbar bis 30.05.2026 mit 2 % Skonto“, zeigt XFact unter der Zahlung „Skonto 2 % bis 30.05.2026 = 4.716,11 €“. Satz und Datum lassen sich ändern, mit × entfernen Sie die Angabe. Die Frist zählt ab dem Rechnungsdatum. Weicht der Betrag auf der Rechnung vom berechneten ab, wird er gelb. In der XRechnung steht das Skonto in der vorgeschriebenen Form, sodass das Programm Ihres Kunden es erkennt.

**Steuer je Position:** In der Spalte „USt“ wählen Sie für jede Position 19 %, 7 %, Nullsatz (0 %, z.B. Photovoltaik), steuerfrei (z.B. § 19 oder § 4 UStG), § 13b (Reverse Charge) oder nicht steuerbar. Verschiedene Sätze in einer Rechnung sind möglich. Unter „Weitere Angaben“ stellen Sie mit einem Klick die ganze Rechnung gleich ein.

**Artikelnummern, Merkmale, Listenpreis:** Was die Rechnung zu einer Position nennt, steht unter ihrer Beschreibung: Artikelnummer, Artikelnummer des Kunden, EAN, Merkmale wie „Farbe: weiß“, Listenpreis mit Nachlass, Preis je 100 Stück.

**Nachlässe und Zuschläge auf die ganze Rechnung** (z.B. „3 % Treuerabatt“, „Fracht“) stehen unter den Positionen, jeweils mit Steuer. Mit „+ Nachlass“ bzw. „+ Zuschlag“ ergänzen Sie weitere.

**Nicht übernommen:** Ganz oben steht gelb, was die KI auf der Rechnung gefunden, aber keinem Feld zuordnen konnte. Prüfen Sie, ob es nötig ist; wenn ja, tragen Sie es in ein passendes Feld oder als Bemerkung ein. Mit „Stimmt“ nehmen Sie es zur Kenntnis.

**Zahlung:** Unter den Summen stehen Zahlungsart, Fälligkeit, Konten, Skonto, Zahlungsbedingungen und Verwendungszweck. Vorgewählt ist, was die KI erkannt hat.
- **Überweisung:** Fälligkeit („Zahlbar bis“) und Ihre Konten mit IBAN und BIC. Mit „+ Konto“ ergänzen Sie weitere Konten.
- **Lastschrift:** Ihre **Gläubiger-ID**, die **IBAN des Kunden**, von der abgebucht wird, und die **Mandatsreferenz**, dazu optional das Datum des Einzugs. Ihre eigene IBAN braucht die XRechnung dann nicht. Steht die IBAN des Kunden gekürzt auf der Rechnung (z.B. „DE12 **** 3456“), tragen Sie sie einmal vollständig ein; XFact merkt sie sich für diesen Kunden.
- **Kreditkarte oder Debitkarte:** die **letzten 4 Ziffern** der Karte des Kunden, optional Karteninhaber und Datum der Belastung. Mehr als die letzten 4 Ziffern übernimmt XFact nie.
- **Bar, Verrechnung, Online-Zahlung (z.B. PayPal), sonstige:** nur die Angaben, die die Rechnung macht.
- **Zahlungsempfänger:** Ist an eine andere Stelle zu zahlen, z.B. eine Factoring-Gesellschaft, steht sie hier.
- **Bereits gezahlt:** Anzahlungen und abgezogene Abschläge; die Summen zeigen dann den Zahlbetrag.

Unter der Rechnung stehen **Weitere Angaben**, die im Rechnungsbild keinen Platz haben:
- **Umsatzsteuer für alle Positionen** mit einem Klick, dazu der **Hinweis zur Steuer**, wenn Positionen steuerfrei, nach § 13b oder nicht steuerbar sind. Für Kleinunternehmer setzt „§ 19 UStG“ den üblichen Satz ein.
- **Leistungsdatum oder Leistungszeitraum der ganzen Rechnung.** Mit **„= Rechnungsdatum“** übernehmen Sie das Rechnungsdatum. Ein Datum für die ganze Rechnung genügt, wenn die Positionen keines haben.
- **Referenzen**, die die Rechnung nennt: Referenz des Kunden („Ihr Zeichen“), Leitweg-ID, Bestellnummer, eigene Auftragsnummer, Vertrag, Projekt, Lieferschein und weitere. Unter „Weitere Angaben ergänzen“ finden Sie die übrigen. Hält die KI den Empfänger für eine Behörde und fehlt die Leitweg-ID, steht dort gelb „Empfänger ist vermutlich eine Behörde – dann meist Pflicht“. Die Leitweg-ID steht in der Bestellung oder dem Auftrag der Behörde. Braucht sie keine, klicken Sie auf „Stimmt“. Eine eingetragene Leitweg-ID prüft XFact auf Aufbau und Prüfziffer.
- **Bezieht sich auf Rechnung:** bei Korrekturen, Gutschriften und Schlussrechnungen die frühere Rechnung.
- **Bemerkungen, Anlagen, Lieferanschrift.**
- Die **Rechnungsart** (Rechnung, Gutschrift, Korrektur, Abschlags- oder Schlussrechnung) wählen Sie oben neben der Rechnungsnummer.

Darunter sehen Sie, was für die XRechnung noch fehlt, und das Häkchen **„Ergänzte Angaben merken“**. Es ist vorausgewählt. Darunter steht genau, was XFact sich merken wird, z.B. „Berg GmbH & Co. KG: E-Mail für Rechnungen rechnung@berg.de“.

Sobald nichts mehr rot ist, wird **XML erzeugen** aktiv.

### 5.3 Fertig

- Die XML-Datei wird automatisch heruntergeladen. Bei Bedarf gibt es **Erneut herunterladen**.
- **Online prüfen** öffnet einen kostenlosen XRechnung-Prüfdienst (rechnungsapi.de). Dort laden Sie die XML hoch und sehen, ob sie gültig ist. Beachten Sie: Damit geben Sie die Rechnung an eine fremde Website.
- **Nächste Rechnung** bringt Sie zurück zum Anfang.

## 6. Welche Angaben XFact nachfragt und warum

Eine XRechnung verlangt einige Angaben, die auf vielen PDF-Rechnungen fehlen. XFact fragt sie einmal ab und merkt sie sich.

| Angabe | Warum | Gemerkt für |
|---|---|---|
| **E-Mail des Kunden für Rechnungen** | Die XRechnung braucht eine elektronische Adresse des Empfängers. | diesen Kunden |
| **Ihre E-Mail, Ihr Ansprechpartner, Ihre Telefonnummer** | Pflicht in der XRechnung, damit der Empfänger bei Fragen jemanden erreicht | Ihre Firma |
| **Käuferreferenz bzw. Leitweg-ID** | Behörden verlangen ihre Leitweg-ID; ohne sie lehnt ihr Rechnungsportal die Rechnung ab, auch wenn die XRechnung sonst gültig ist. XFact fragt danach, wenn der Empfänger vermutlich eine Behörde ist. Bei Firmen ist es optional, z.B. eine Bestellnummer. | diesen Kunden |
| **Lastschrift:** Gläubiger-ID | Pflicht, wenn der Betrag eingezogen wird | Ihre Firma |
| **Lastschrift:** IBAN des Kunden, Mandatsreferenz | Die IBAN ist Pflicht, die Mandatsreferenz hilft dem Kunden bei der Zuordnung. | diesen Kunden |
| **Kreditkarte:** letzte 4 Ziffern | Pflicht, wenn der Betrag einer Kreditkarte belastet wird | diesen Kunden |
| **Einheit**, z.B. „Std“, „Pausch.“ | Die XRechnung verwendet genormte Einheiten. Die KI ordnet sie zu; korrigieren Sie eine Zuordnung, gilt das künftig. | Ihre Firma |
| **Leistungsdatum** | Steuerlich vorgeschrieben. Fehlt es, genügt ein Klick auf „= Rechnungsdatum“, wenn beides gleich ist. | diese Rechnung |
| **Umsatzsteuer** | Nur wenn die KI sie nicht eindeutig erkennt, siehe Abschnitt 7 | diese Rechnung |

Ihre eigenen Firmendaten liest XFact aus Ihrer ersten Rechnung. Eine Einrichtung der Firmendaten vorab ist nicht nötig.

## 7. Umsatzsteuer

XFact ordnet jede Position einzeln zu; verschiedene Fälle in einer Rechnung sind möglich, außer „nicht steuerbar“, das die XRechnung nur allein erlaubt.

| Fall | Woran XFact ihn erkennt | Was XFact zusätzlich braucht |
|---|---|---|
| **19 % und/oder 7 %** | ausgewiesene Umsatzsteuer | — |
| **Nullsatz** (z.B. Photovoltaik nach § 12 Abs. 3 UStG) | 0 % mit Hinweis auf den Nullsatz | — |
| **steuerfrei** (Kleinunternehmer nach § 19 UStG, Befreiungen nach § 4 UStG) | Hinweistext, keine Umsatzsteuer | den **Hinweis zur Steuerbefreiung**; für § 19 setzt ein Klick den üblichen Satz ein |
| **§ 13b UStG, Steuerschuldnerschaft des Leistungsempfängers** (z.B. Bauleistungen an Baufirmen, Gebäudereinigung) | Hinweistext, z.B. „Reverse Charge“, 0 % Umsatzsteuer | die **USt-IdNr. des Empfängers** oder dessen Registernummer (z.B. HRB) |
| **nicht steuerbar** (z.B. echter Schadenersatz) | Hinweistext | den Grund; ohne Angabe „Nicht steuerbar“. Die XRechnung enthält dann keine USt-IdNr. |

Den Fall erkennt die KI aus der Rechnung, der Prüfer kontrolliert ihn für jede Position. Für Ihr eigenes Unternehmen genügt **USt-IdNr. oder Steuernummer**. Innergemeinschaftliche Lieferungen und Ausfuhren unterstützt XFact nicht; dann ist die Steuer der Position rot.

## 8. Was XFact sich merkt

Wenn Sie „XML erzeugen“ klicken und das Häkchen „Ergänzte Angaben merken“ gesetzt ist, merkt sich XFact, was Sie ergänzt haben:

- **Für Ihre Firma:** E-Mail, Telefon, Ansprechpartner, USt-IdNr. bzw. Steuernummer und Gläubiger-ID, falls sie nicht auf der Rechnung stehen. Dazu Einheiten, deren Zuordnung Sie geändert haben (z.B. „Fahrt“ = Stück). Arbeiten Sie für mehrere Firmen, z.B. als Buchhalter, legt XFact je Firma ein eigenes Profil an. Erkannt wird die Firma an ihrer USt-IdNr. oder Steuernummer.
- **Für jeden Kunden:** E-Mail für Rechnungen, USt-IdNr., Leitweg-ID, für Lastschriften IBAN und Mandatsreferenz, für Kreditkarten die letzten 4 Ziffern. Erkannt wird der Kunde an seiner USt-IdNr., sonst an Name und PLZ.
- **Logbuch:** Datum, Dateiname, Rechnungsnummer, Kunde und Betrag jeder umgewandelten Rechnung. Das wird immer eingetragen, auch ohne Häkchen.

**Ihre Rechnungen selbst speichert XFact nicht.**

**Gemerktes füllt nur Lücken.** Bei der nächsten Rechnung ergänzt XFact nur, was im PDF fehlt. Solche Angaben sind grau markiert: „aus Kundenprofil“ bzw. „aus Firmenprofil“. Was auf der Rechnung steht, gewinnt immer.

**Doppelt umgewandelt?** Wandeln Sie eine Rechnungsnummer ein zweites Mal um, zeigt XFact gelb: „bereits am … umgewandelt“. Verhindert wird es nicht.

Über das **Menü (☰)** sehen Sie alles Gemerkte. Dort können Sie Angaben ändern und einzelne Firmen, Kunden oder Einheiten löschen. Zum Löschen klicken Sie zweimal: Der Mülleimer wird erst zu „?“.

### Daten sichern, umziehen, löschen

Im Menü finden Sie:
- **Daten exportieren:** eine Datei `xfact-daten-JJJJ-MM-TT.json` mit allen gemerkten Angaben. Ein KI-Schlüssel ist darin nicht enthalten.
- **Daten importieren:** stellt eine exportierte Datei wieder her, zum Beispiel auf einem neuen Rechner. Die vorhandenen Angaben werden dabei ersetzt, nach einer Rückfrage.
- **Alle Daten löschen:** zweimal klicken

> **Wichtig:** Leeren Sie Ihren Browser-Speicher oder wechseln Sie Browser oder Rechner, sind die gemerkten Angaben weg. Exportieren Sie deshalb regelmäßig.

## 9. KI einrichten

Ohne KI geht es nicht: Die KI liest Ihre Rechnung und ordnet sie der XRechnung zu. Beim ersten Start richten Sie sie ein, später ändern Sie die Einstellungen im **Menü (☰) unter KI**.

**Was dabei passiert:**
- XFact schickt **nur den Text** Ihrer Rechnung an den gewählten Anbieter, kein Bild und keine weiteren Daten.
- Die KI liefert die Felder der XRechnung zurück, dazu eine Liste, was auf der Rechnung fehlt.
- Die KI bekommt alle Felder, die eine XRechnung haben kann, und ordnet die Rechnung Bereich für Bereich zu: Briefkopf und Fußzeile, Anschrift, Kopfdaten, jede Position, Nachlässe und Zuschläge, Summen, Steuer, Zahlung. Was sie nirgends unterbringen kann, meldet sie; XFact zeigt es unter „Nicht übernommen“.
- Danach kontrolliert der **Prüfer Jev** jeden erkannten Wert gegen den Rechnungstext („Steht das wirklich da?“), außerdem Einheit und Steuer jeder Position und die Zahlungsart. Was er nicht bestätigt, ist gelb. Jev ist ein Entscheidungsmodell, kein zweites Sprachmodell; die Prüfung kostet etwa 0,02 Cent je Rechnung und läuft nur über OpenRouter.
- Die KI schätzt außerdem ein, ob der Empfänger eine Behörde ist. Dann fragt XFact nach der Leitweg-ID.
- Zusätzlich prüfen feste Regeln: IBAN-Prüfziffer, Aufbau der USt-IdNr., Aufbau und Prüfziffer von Leitweg-ID und Gläubiger-ID, Telefon und E-Mail, gültige Daten, Rechenwerte, und ob Rechnungsnummer, IBAN, USt-IdNr. und Referenzen wörtlich in der Rechnung stehen.

### Mit OpenRouter (voreingestellt)

1. Konto bei [openrouter.ai](https://openrouter.ai) anlegen, Guthaben aufladen, API-Schlüssel erzeugen.
2. In XFact den Schlüssel eintragen und **Verbindung testen** klicken.

Voreingestellt ist das Modell `google/gemini-3.8-flash`. In unseren Tests hat es alle Rechnungen fehlerfrei gelesen, bei etwa 1 Cent und 10 bis 15 Sekunden pro Rechnung. Ebenfalls fehlerfrei, aber teurer oder langsamer, waren `openai/gpt-6.1-sol` und `anthropic/claude-opus-5.5`; schneller ist `anthropic/claude-sonnet-5.5` (rund 2,5 Cent). Sie können jedes Modell eintragen, das OpenRouter anbietet und das strukturierte Ausgabe (JSON-Schema) beherrscht.

### Mit einer KI auf Ihrem Rechner (z.B. LM Studio)

Dabei verlässt Ihre Rechnung den Rechner überhaupt nicht. Die Kontrolle durch den Prüfer Jev entfällt dann; die festen Regeln prüfen weiter.

1. In LM Studio ein Modell laden und den lokalen Server starten. Nehmen Sie ein möglichst großes Modell, das strukturierte Ausgabe beherrscht.
2. In den Server-Einstellungen von LM Studio **CORS aktivieren**.
3. In XFact unter **Menü → KI** den Endpunkt auf `http://localhost:1234/v1` setzen, den Modellnamen aus LM Studio eintragen und das Schlüsselfeld leer lassen.
4. **Verbindung testen.** Fragt Ihr Browser, ob die Seite auf Ihr lokales Netzwerk zugreifen darf, erlauben Sie das.

Jeder andere Anbieter mit OpenAI-kompatibler Schnittstelle funktioniert ebenso.

> Ihr API-Schlüssel wird im Browser gespeichert. Nutzen Sie XFact nicht mit Schlüssel auf Rechnern, die andere mitbenutzen.

## 10. Offline-Version

Über **Menü → Offline-Version** laden Sie XFact als **eine einzige HTML-Datei** herunter. Ein Doppelklick öffnet sie im Browser. Für die KI über OpenRouter brauchen Sie Internet; ganz ohne Internet geht es mit einer KI auf Ihrem Rechner (Abschnitt 9).

Je nach Browser werden gemerkte Angaben bei einer lokal geöffneten Datei anders gespeichert als auf der Website. Nutzen Sie Export und Import, wenn Sie zwischen beiden wechseln.

## 11. Versand und Aufbewahrung

- Schicken Sie **XML und PDF als zwei Anhänge in einer E-Mail**, eine Rechnung pro E-Mail. Packen Sie die Dateien nicht in ein ZIP.
- **Bewahren Sie die XML auf.** Sie ist die maßgebliche Rechnung. Das PDF ist nur eine lesbare Kopie.
- Schreiben Sie die Rechnung immer **zuerst** in Ihrem Programm, wandeln Sie sie um und verschicken Sie sie erst dann. Eine bereits verschickte Rechnung umzuwandeln und erneut zu senden, erzeugt eine zweite Rechnung.
- Behörden nehmen XRechnungen meist nur über ihre Portale oder über Peppol an, nicht per E-Mail.

## 12. Häufige Fragen

**Ist meine XRechnung damit garantiert gültig?**
XFact erzeugt die Datei nach den offiziellen Regeln und blockiert alles, was sie ungültig machen würde. Für die Richtigkeit der Inhalte sind Sie verantwortlich. Mit „Online prüfen“ können Sie zusätzlich eine unabhängige Prüfung machen.

**Die KI erkennt etwas falsch.**
Korrigieren Sie den Wert in der Prüfansicht. Passiert es öfter, wählen Sie im Menü ein anderes, größeres Modell. Wer XFact anpasst, kann auch die Anweisung an die KI ergänzen (Abschnitt 14).

**Was kostet das?**
Mit der Voreinstellung etwa 1 Cent je Rechnung für die KI und 0,02 Cent für den Prüfer, abgerechnet über Ihr OpenRouter-Konto. Mit einer KI auf Ihrem Rechner nichts.

**Die Summen stimmen nicht (kein ✓).**
Meist ist ein Wert falsch erkannt. XFact zeigt, wo die Differenz entsteht. Liegt der Rechenfehler in der Original-Rechnung, korrigieren Sie zuerst das PDF.

**Ich habe XFact auf einem neuen Rechner und alles ist weg.**
Die gemerkten Angaben liegen im Browser. Importieren Sie Ihren letzten Export.

**Brauche ich als Kleinunternehmer eine XRechnung?**
Kleinunternehmer nach §19 UStG müssen keine E-Rechnung ausstellen. Wenn Ihr Kunde trotzdem eine möchte, erzeugt XFact sie.

**Muss ich überhaupt E-Rechnungen schreiben?**
In Deutschland gilt für Rechnungen zwischen Unternehmen: ab 2027 bei mehr als 800.000 € Vorjahresumsatz, ab 2028 für alle (außer Kleinunternehmer). Im Zweifel fragen Sie Ihren Steuerberater.

## 13. Verantwortung und Lizenz

XFact ist Open Source unter der **MIT-Lizenz**. Sie dürfen es nutzen, verändern und weitergeben. Es wird **ohne Gewähr** bereitgestellt. Die Verantwortung für Ihre Rechnungen und deren Inhalt bleibt bei Ihnen.

Wer XFact verändert und weitergibt, passt bitte diese Dokumentation mit an.

## 14. XFact anpassen

**Ausdrücklich erwünscht.** XFact gehört Ihnen. Gefallen Ihnen die Farben nicht, passt das Layout nicht zu Ihren Rechnungen oder soll eine Regel anders funktionieren, dann ändern Sie es. Programmieren müssen Sie dafür nicht können. Ein KI-Assistent übernimmt das, Sie sagen ihm in normaler Sprache, was Sie wollen.

### Was Sie brauchen

- **Die Offline-Version** `xfact.html` (Menü → Offline-Version). Sie ist die ganze App in einer Datei, und ihr Programmcode ist lesbar und kommentiert.
- **Diese Dokumentation** als `XFact-Dokumentation.md`
- **Einen KI-Assistenten, der Dateien bearbeiten kann**, zum Beispiel Claude Code. Andere Assistenten wie Cursor, Codex oder Gemini CLI funktionieren ähnlich.

### So ist xfact.html aufgebaut

Am Anfang der Datei steht eine Übersicht. Darunter folgen deutlich markierte Abschnitte:

| Abschnitt | Was darin steht |
|---|---|
| **FARBEN UND SCHRIFTEN** | alle Farben, Schriften und Abstände an einer Stelle |
| **LAYOUT** | Aussehen der Bausteine: Karten, Knöpfe, Ablagefläche |
| **SEITE** | Aufbau der Oberfläche: Kopfzeile, die drei Schritte, Fußzeile |
| **TEXTE** | Hinweise beim Start, Meldungen, Beschriftungen |
| **STANDARD** | alle Felder der Norm und wie XFact sie behandelt; Grundlage für Antwortschema, XML und Tests |
| **REGELN** | formale Regeln: Aufbau von USt-IdNr., IBAN, Leitweg-ID und Gläubiger-ID, erlaubte Einheiten, unterstützte Steuerfälle |
| **PRÜFUNGEN** | was rot oder gelb markiert wird |
| **KI** | Voreinstellungen für Anbieter und Modell, **die Anweisung an die KI**, das Antwortschema, die Fragen an den Prüfer |
| **RECHNUNG** | wie aus dem Ergebnis der KI und Ihren Ergänzungen die Rechnung wird |
| **XML-ERZEUGUNG** | wie aus den Rechnungsdaten die XRechnung entsteht |
| **PDF LESEN** | wie der Text aus dem PDF geholt wird, den die KI bekommt |
| **GEDÄCHTNIS** | was sich XFact merkt: Firmen, Kunden, Einheiten, Logbuch |
| **ABLAUF** | die drei Schritte und was bei einem Klick passiert |
| **BIBLIOTHEKEN** | eingebettete Fremdbibliotheken, z.B. zum Lesen von PDFs. **Nicht ändern.** |

### Los geht's

1. Legen Sie einen neuen Ordner an, zum Beispiel `XFact anpassen`, und kopieren Sie beide Dateien hinein.
2. **Sichern Sie die Originaldatei**, z.B. als `xfact-original.html`. Dann können Sie jederzeit zurück.
3. **Exportieren Sie Ihre gemerkten Angaben** (Menü → Daten exportieren). Eine geänderte Datei sieht unter Umständen die bisher gemerkten Angaben nicht. Dann importieren Sie sie einfach.
4. Starten Sie den KI-Assistenten in diesem Ordner. Bei Claude Code geht das im Terminal mit `claude` oder in der Claude-App, indem Sie den Ordner auswählen.

### Der erste Auftrag: kennenlernen, noch nichts ändern

```text
In diesem Ordner liegt XFact: xfact.html ist eine Web-App, die PDF-Rechnungen
in XRechnungen umwandelt, XFact-Dokumentation.md beschreibt, was sie kann.

Lies zuerst die Dokumentation. Verschaffe dir dann einen Überblick über
xfact.html: Wo stehen Farben und Layout, wo die Anweisung an die KI, wo die
Prüfungen, wo die XML-Erzeugung? Den Abschnitt BIBLIOTHEKEN musst du nicht lesen.

Ändere noch nichts. Fasse mir den Aufbau in ein paar Sätzen zusammen.
Ich bin kein Programmierer, erkläre es bitte einfach.
```

Danach kennt der Assistent die App, und Sie können Änderungen in Auftrag geben.

### Beispiele für Änderungen

**Farben**
```text
Die Akzentfarbe soll unser Firmengrün #2F6F4F sein statt Blau.
Ändere nur die Farbdefinitionen. Sag mir danach, was du geändert hast.
```

**Layout**
```text
In der Prüfansicht ist die Spalte „Beschreibung“ zu schmal, meine Positionstexte
sind lang. Mach sie breiter und lass die Zahlenspalten dafür schmaler werden.
```

**Texte**
```text
Formuliere die Hinweise beim ersten Start kürzer und per Du statt per Sie.
Zeig mir den neuen Text, bevor du ihn einbaust.
```

**Die Anweisung an die KI**
```text
Auf meinen Rechnungen steht das Leistungsdatum immer als „ausgeführt am“ unter
der Positionstabelle und gilt für alle Positionen. Ergänze das in der Anweisung
an die KI (KI_ANWEISUNG), ohne den Rest zu verändern.
```

**Eine Prüfregel**
```text
Bei uns ist das Zahlungsziel immer 14 Tage. Steht auf der Rechnung kein
Fälligkeitsdatum, soll XFact Rechnungsdatum + 14 Tage vorschlagen und das
Feld gelb markieren, damit ich es sehe.
```

**Voreinstellung der KI**
```text
Stelle als KI-Modell anthropic/claude-sonnet-5.5 voreingestellt ein statt Gemini.
```

**Nach jeder Änderung**
```text
Passe die Dokumentation an die Änderung an, damit sie wieder stimmt.
```

### Tipps

- **Eine Änderung pro Auftrag.** Kleine Schritte sind leichter zu prüfen und bei Bedarf zurückzunehmen.
- **Sofort ausprobieren:** `xfact.html` im Browser öffnen bzw. neu laden und eine Ihrer Rechnungen durchspielen.
- **Bei Änderungen an der Anweisung an die KI, an Prüfungen oder an der XML-Erzeugung:** Erzeugen Sie danach eine XML und lassen Sie sie mit „Online prüfen“ kontrollieren. Die XRechnung hat strenge Regeln, bis hin zur Reihenfolge der Elemente in der Datei. Sagen Sie dem Assistenten ausdrücklich, dass die erzeugte XML gültig bleiben muss.
- **Fragen statt raten:** „Was müsste ich ändern, damit …?“ ist ein guter Auftrag. Der Assistent erklärt, und Sie entscheiden.
- **Klappt etwas nicht**, sagen Sie dem Assistenten, was Sie sehen: „Nach der Änderung bleibt die Seite leer.“ Oder Sie kehren zu `xfact-original.html` zurück.

### Weitergeben

Ihre angepasste Version dürfen Sie weitergeben (MIT-Lizenz). Geben Sie `xfact.html` und `XFact-Dokumentation.md` immer gemeinsam weiter, und lassen Sie die Dokumentation vorher an Ihre Änderungen anpassen.

## Anhang: Welche Felder der XRechnung XFact abdeckt

Die Norm EN 16931 (mit XRechnung 3.0) kennt 164 Felder (BT). Davon liest XFact 130 aus der Rechnung, 14 setzt es selbst, 20 unterstützt es bewusst nicht. Diese Liste steht als Abschnitt STANDARD in xfact.html und wird von dort hierher übernommen.

| Feld | Bedeutung | XFact | Hinweis |
|---|---|---|---|
| BT-1 | Rechnungsnummer | liest XFact aus der Rechnung |  |
| BT-2 | Rechnungsdatum | liest XFact aus der Rechnung |  |
| BT-3 | Rechnungsart | liest XFact aus der Rechnung |  |
| BT-5 | Währung | setzt XFact selbst | immer EUR; Rechnungen in anderer Währung lehnt XFact ab |
| BT-6 | Umsatzsteuer-Buchungswährung | nicht unterstützt | nur bei Rechnungen in fremder Währung |
| BT-7 | Steuerfälligkeitsdatum | nicht unterstützt | in Deutschland nicht üblich; maßgeblich ist das Leistungsdatum |
| BT-8 | Code für das Steuerfälligkeitsdatum | nicht unterstützt | in Deutschland nicht üblich |
| BT-9 | Fälligkeitsdatum | liest XFact aus der Rechnung |  |
| BT-10 | Käuferreferenz bzw. Leitweg-ID | liest XFact aus der Rechnung | ohne Angabe „keine Angabe“ |
| BT-11 | Projekt | liest XFact aus der Rechnung |  |
| BT-12 | Vertrag | liest XFact aus der Rechnung |  |
| BT-13 | Bestellnummer | liest XFact aus der Rechnung |  |
| BT-14 | Auftragsnummer des Verkäufers | liest XFact aus der Rechnung |  |
| BT-15 | Wareneingangsmeldung | liest XFact aus der Rechnung |  |
| BT-16 | Lieferschein | liest XFact aus der Rechnung |  |
| BT-17 | Ausschreibung bzw. Los | liest XFact aus der Rechnung |  |
| BT-18 | Objektkennung (z.B. Zähler, Abonnement) | liest XFact aus der Rechnung |  |
| BT-19 | Buchungsreferenz des Käufers (z.B. Kostenstelle) | liest XFact aus der Rechnung |  |
| BT-20 | Zahlungsbedingungen, Skonto | liest XFact aus der Rechnung |  |
| BT-21 | Betreff-Code einer Bemerkung | nicht unterstützt | der Text der Bemerkung genügt |
| BT-22 | Bemerkung | liest XFact aus der Rechnung |  |
| BT-23 | Geschäftsprozess | setzt XFact selbst |  |
| BT-24 | Kennung der Spezifikation (XRechnung 3.0) | setzt XFact selbst |  |
| BT-25 | Vorausgegangene Rechnung | liest XFact aus der Rechnung | die Syntax CII kennt nur eine; weitere schreibt XFact als Bemerkung |
| BT-26 | Datum der vorausgegangenen Rechnung | liest XFact aus der Rechnung |  |
| BT-27 | Name des Rechnungsstellers | liest XFact aus der Rechnung |  |
| BT-28 | Handelsname des Rechnungsstellers | liest XFact aus der Rechnung |  |
| BT-29 | Kennung des Rechnungsstellers | liest XFact aus der Rechnung | ohne Schema; nur mit Steuernummer setzt XFact sie als Kennung (BR-CO-26) |
| BT-30 | Registernummer des Rechnungsstellers | liest XFact aus der Rechnung | ohne Schema |
| BT-31 | USt-IdNr. des Rechnungsstellers | liest XFact aus der Rechnung |  |
| BT-32 | Steuernummer des Rechnungsstellers | liest XFact aus der Rechnung |  |
| BT-33 | Weitere rechtliche Angaben (Sitz, Registergericht, Geschäftsführung) | liest XFact aus der Rechnung |  |
| BT-34 | Elektronische Adresse des Rechnungsstellers | liest XFact aus der Rechnung | die E-Mail-Adresse |
| BT-35 | Straße des Rechnungsstellers | liest XFact aus der Rechnung |  |
| BT-36 | Anschriftzusatz des Rechnungsstellers | liest XFact aus der Rechnung |  |
| BT-162 | Weitere Anschriftzeile des Rechnungsstellers | liest XFact aus der Rechnung |  |
| BT-37 | Ort des Rechnungsstellers | liest XFact aus der Rechnung |  |
| BT-38 | PLZ des Rechnungsstellers | liest XFact aus der Rechnung |  |
| BT-39 | Region des Rechnungsstellers | liest XFact aus der Rechnung |  |
| BT-40 | Land des Rechnungsstellers | liest XFact aus der Rechnung |  |
| BT-41 | Ansprechpartner des Rechnungsstellers | liest XFact aus der Rechnung |  |
| BT-42 | Telefon des Rechnungsstellers | liest XFact aus der Rechnung |  |
| BT-43 | E-Mail des Ansprechpartners | liest XFact aus der Rechnung | ohne eigene Angabe die E-Mail des Rechnungsstellers |
| BT-44 | Name des Empfängers | liest XFact aus der Rechnung |  |
| BT-45 | Handelsname des Empfängers | liest XFact aus der Rechnung |  |
| BT-46 | Kennung des Empfängers (z.B. Kundennummer) | liest XFact aus der Rechnung | ohne Schema |
| BT-47 | Registernummer des Empfängers | liest XFact aus der Rechnung | ohne Schema |
| BT-48 | USt-IdNr. des Empfängers | liest XFact aus der Rechnung |  |
| BT-49 | Elektronische Adresse des Empfängers | liest XFact aus der Rechnung | meist nicht auf der Rechnung; XFact fragt und merkt sie sich je Kunde |
| BT-50 | Straße des Empfängers | liest XFact aus der Rechnung |  |
| BT-51 | Anschriftzusatz des Empfängers | liest XFact aus der Rechnung |  |
| BT-163 | Weitere Anschriftzeile des Empfängers | liest XFact aus der Rechnung |  |
| BT-52 | Ort des Empfängers | liest XFact aus der Rechnung |  |
| BT-53 | PLZ des Empfängers | liest XFact aus der Rechnung |  |
| BT-54 | Region des Empfängers | liest XFact aus der Rechnung |  |
| BT-55 | Land des Empfängers | liest XFact aus der Rechnung |  |
| BT-56 | Ansprechpartner beim Empfänger | liest XFact aus der Rechnung |  |
| BT-57 | Telefon des Ansprechpartners beim Empfänger | liest XFact aus der Rechnung |  |
| BT-58 | E-Mail des Ansprechpartners beim Empfänger | liest XFact aus der Rechnung |  |
| BT-59 | Name des Zahlungsempfängers (z.B. Factoring) | liest XFact aus der Rechnung |  |
| BT-60 | Kennung des Zahlungsempfängers | liest XFact aus der Rechnung | ohne Schema |
| BT-61 | Registernummer des Zahlungsempfängers | liest XFact aus der Rechnung | ohne Schema |
| BT-62 | Name des Steuervertreters | nicht unterstützt | nur für Rechnungssteller im Ausland; XFact ist für deutsche Rechnungssteller |
| BT-63 | USt-IdNr. des Steuervertreters | nicht unterstützt | wie BT-62 |
| BT-64 | Straße des Steuervertreters | nicht unterstützt | wie BT-62 |
| BT-65 | Anschriftzusatz des Steuervertreters | nicht unterstützt | wie BT-62 |
| BT-164 | Weitere Anschriftzeile des Steuervertreters | nicht unterstützt | wie BT-62 |
| BT-66 | Ort des Steuervertreters | nicht unterstützt | wie BT-62 |
| BT-67 | PLZ des Steuervertreters | nicht unterstützt | wie BT-62 |
| BT-68 | Region des Steuervertreters | nicht unterstützt | wie BT-62 |
| BT-69 | Land des Steuervertreters | nicht unterstützt | wie BT-62 |
| BT-70 | Name des Warenempfängers | liest XFact aus der Rechnung |  |
| BT-71 | Kennung des Lieferorts | liest XFact aus der Rechnung | ohne Schema |
| BT-72 | Liefer- bzw. Leistungsdatum | liest XFact aus der Rechnung |  |
| BT-73 | Beginn des Abrechnungszeitraums | liest XFact aus der Rechnung |  |
| BT-74 | Ende des Abrechnungszeitraums | liest XFact aus der Rechnung |  |
| BT-75 | Straße der Lieferanschrift | liest XFact aus der Rechnung |  |
| BT-76 | Anschriftzusatz der Lieferanschrift | liest XFact aus der Rechnung |  |
| BT-165 | Weitere Anschriftzeile der Lieferanschrift | liest XFact aus der Rechnung |  |
| BT-77 | Ort der Lieferanschrift | liest XFact aus der Rechnung |  |
| BT-78 | PLZ der Lieferanschrift | liest XFact aus der Rechnung |  |
| BT-79 | Region der Lieferanschrift | liest XFact aus der Rechnung |  |
| BT-80 | Land der Lieferanschrift | liest XFact aus der Rechnung |  |
| BT-81 | Zahlungsart | liest XFact aus der Rechnung | Überweisung, Lastschrift, Kredit-/Debitkarte, bar, Verrechnung, Online-Zahlung, sonstige |
| BT-82 | Zahlungsart als Text | liest XFact aus der Rechnung |  |
| BT-83 | Verwendungszweck | liest XFact aus der Rechnung | ohne Angabe die Rechnungsnummer |
| BT-84 | IBAN des Rechnungsstellers | liest XFact aus der Rechnung | auch mehrere Konten |
| BT-85 | Kontoinhaber | liest XFact aus der Rechnung | ohne Angabe der Name des Rechnungsstellers |
| BT-86 | BIC | liest XFact aus der Rechnung |  |
| BT-87 | Kartennummer (nur die letzten 4 Ziffern) | liest XFact aus der Rechnung |  |
| BT-88 | Karteninhaber | liest XFact aus der Rechnung |  |
| BT-89 | Mandatsreferenz | liest XFact aus der Rechnung |  |
| BT-90 | Gläubiger-ID | liest XFact aus der Rechnung |  |
| BT-91 | IBAN des Kunden (Lastschrift) | liest XFact aus der Rechnung |  |
| BT-92 | Betrag eines Nachlasses auf die Rechnung | liest XFact aus der Rechnung |  |
| BT-93 | Grundbetrag des Nachlasses | liest XFact aus der Rechnung |  |
| BT-94 | Prozentsatz des Nachlasses | liest XFact aus der Rechnung |  |
| BT-95 | Steuerkategorie des Nachlasses | liest XFact aus der Rechnung |  |
| BT-96 | Steuersatz des Nachlasses | liest XFact aus der Rechnung |  |
| BT-97 | Grund des Nachlasses | liest XFact aus der Rechnung |  |
| BT-98 | Code für den Grund des Nachlasses | nicht unterstützt | der Grund als Text genügt |
| BT-99 | Betrag eines Zuschlags auf die Rechnung (z.B. Fracht) | liest XFact aus der Rechnung |  |
| BT-100 | Grundbetrag des Zuschlags | liest XFact aus der Rechnung |  |
| BT-101 | Prozentsatz des Zuschlags | liest XFact aus der Rechnung |  |
| BT-102 | Steuerkategorie des Zuschlags | liest XFact aus der Rechnung |  |
| BT-103 | Steuersatz des Zuschlags | liest XFact aus der Rechnung |  |
| BT-104 | Grund des Zuschlags | liest XFact aus der Rechnung |  |
| BT-105 | Code für den Grund des Zuschlags | nicht unterstützt | der Grund als Text genügt |
| BT-106 | Summe der Positionen | setzt XFact selbst | berechnet und mit der Rechnung verglichen |
| BT-107 | Summe der Nachlässe | setzt XFact selbst | berechnet |
| BT-108 | Summe der Zuschläge | setzt XFact selbst | berechnet |
| BT-109 | Nettobetrag | setzt XFact selbst | berechnet und mit der Rechnung verglichen |
| BT-110 | Umsatzsteuer | setzt XFact selbst | berechnet und mit der Rechnung verglichen |
| BT-111 | Umsatzsteuer in Buchungswährung | nicht unterstützt | nur bei fremder Währung |
| BT-112 | Gesamtbetrag | setzt XFact selbst | berechnet und mit der Rechnung verglichen |
| BT-113 | Bereits gezahlt (Anzahlungen, Abschläge) | liest XFact aus der Rechnung |  |
| BT-114 | Rundung | liest XFact aus der Rechnung |  |
| BT-115 | Zahlbetrag | setzt XFact selbst | berechnet und mit der Rechnung verglichen |
| BT-116 | Steuerbasis je Satz | setzt XFact selbst | berechnet |
| BT-117 | Steuerbetrag je Satz | setzt XFact selbst | berechnet und mit der Rechnung verglichen |
| BT-118 | Steuerkategorie | liest XFact aus der Rechnung | S, Z, E, AE, O; K, G, L, M betreffen Empfänger im Ausland bzw. Sondergebiete und werden abgelehnt |
| BT-119 | Steuersatz | liest XFact aus der Rechnung |  |
| BT-120 | Grund der Steuerbefreiung | liest XFact aus der Rechnung | ohne Angabe ein Standardtext, bei § 19 UStG der übliche Hinweis |
| BT-121 | Code für den Grund der Steuerbefreiung | setzt XFact selbst | VATEX-EU-AE bzw. VATEX-EU-O |
| BT-122 | Kennung einer Anlage | liest XFact aus der Rechnung |  |
| BT-123 | Beschreibung einer Anlage | liest XFact aus der Rechnung | in CII nur bei einer Anlage; bei weiteren steht sie mit der Kennung |
| BT-124 | Link zu einer Anlage | liest XFact aus der Rechnung |  |
| BT-125 | Eingebettete Datei | nicht unterstützt | Dateien kann eine PDF-Rechnung nicht mitliefern |
| BT-126 | Positionsnummer | liest XFact aus der Rechnung |  |
| BT-127 | Bemerkung zur Position | liest XFact aus der Rechnung |  |
| BT-128 | Objektkennung der Position | liest XFact aus der Rechnung |  |
| BT-129 | Menge | liest XFact aus der Rechnung |  |
| BT-130 | Einheit | liest XFact aus der Rechnung |  |
| BT-131 | Nettobetrag der Position | liest XFact aus der Rechnung |  |
| BT-132 | Position der Bestellung | liest XFact aus der Rechnung |  |
| BT-133 | Buchungsreferenz der Position | liest XFact aus der Rechnung |  |
| BT-134 | Leistungsbeginn der Position | liest XFact aus der Rechnung |  |
| BT-135 | Leistungsende der Position | liest XFact aus der Rechnung |  |
| BT-136 | Betrag eines Nachlasses auf die Position | liest XFact aus der Rechnung |  |
| BT-137 | Grundbetrag des Nachlasses | liest XFact aus der Rechnung |  |
| BT-138 | Prozentsatz des Nachlasses | liest XFact aus der Rechnung |  |
| BT-139 | Grund des Nachlasses | liest XFact aus der Rechnung |  |
| BT-140 | Code für den Grund des Nachlasses | nicht unterstützt | der Grund als Text genügt |
| BT-141 | Betrag eines Zuschlags auf die Position | liest XFact aus der Rechnung |  |
| BT-142 | Grundbetrag des Zuschlags | liest XFact aus der Rechnung |  |
| BT-143 | Prozentsatz des Zuschlags | liest XFact aus der Rechnung |  |
| BT-144 | Grund des Zuschlags | liest XFact aus der Rechnung |  |
| BT-145 | Code für den Grund des Zuschlags | nicht unterstützt | der Grund als Text genügt |
| BT-146 | Nettopreis | liest XFact aus der Rechnung |  |
| BT-147 | Preisnachlass | liest XFact aus der Rechnung |  |
| BT-148 | Bruttopreis | liest XFact aus der Rechnung |  |
| BT-149 | Preisbasismenge (z.B. je 100 Stück) | liest XFact aus der Rechnung |  |
| BT-150 | Einheit der Preisbasismenge | setzt XFact selbst | dieselbe wie BT-130 |
| BT-151 | Steuerkategorie der Position | liest XFact aus der Rechnung |  |
| BT-152 | Steuersatz der Position | liest XFact aus der Rechnung |  |
| BT-153 | Bezeichnung | liest XFact aus der Rechnung |  |
| BT-154 | Beschreibung | liest XFact aus der Rechnung |  |
| BT-155 | Artikelnummer des Verkäufers | liest XFact aus der Rechnung |  |
| BT-156 | Artikelnummer des Käufers | liest XFact aus der Rechnung |  |
| BT-157 | GTIN bzw. EAN | liest XFact aus der Rechnung |  |
| BT-158 | Warenklassifizierung (z.B. Zolltarifnummer) | nicht unterstützt | braucht ein Schema, das auf PDF-Rechnungen fehlt |
| BT-159 | Ursprungsland | liest XFact aus der Rechnung |  |
| BT-160 | Name eines Artikelmerkmals (z.B. Farbe) | liest XFact aus der Rechnung |  |
| BT-161 | Wert eines Artikelmerkmals | liest XFact aus der Rechnung |  |
