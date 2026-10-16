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
- Rechnungsdaten erkennen, mit KI: Nummer, Datum, Absender, Empfänger, Positionen, Summen, Steuer, Bankverbindung, dazu Einheiten und Steuerfall in der Sprache der XRechnung.
- Kontrollieren: Ein Prüfer bestätigt die erkannten Werte, feste Regeln prüfen IBAN, USt-IdNr., Leitweg-ID und Gläubiger-ID, und XFact rechnet Positionen, Netto, Umsatzsteuer und Gesamtbetrag nach.
- Fehlende Pflichtangaben gezielt nachfragen und sich die Antworten merken, auch pro Kunde.
- Eine **XRechnung 3.0** erzeugen, die den offiziellen Prüfregeln entspricht.
- Mit einer KI Ihrer Wahl arbeiten: voreingestellt OpenRouter, oder eine KI auf Ihrem eigenen Rechner.
- **Von Ihnen angepasst werden.** Farben, Layout, Texte, Regeln: Mit einem KI-Assistenten geht das auch ohne Programmierkenntnisse (Abschnitt 14).

**XFact kann nicht:**
- Ohne KI arbeiten. Sie brauchen einen Zugang zu einem KI-Anbieter oder eine lokale KI.
- Gescannte Rechnungen (Bilder ohne Text) lesen.
- Rechnungen an Empfänger im Ausland oder von Absendern im Ausland.
- Gutschriften, Storno- und Abschlagsrechnungen, Rabatte auf die Gesamtsumme.
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

**Zahlung:** Unter den Summen wählen Sie **Überweisung**, **Lastschrift** oder **Kreditkarte**. Vorgewählt ist, was die KI auf der Rechnung erkannt hat, z.B. „Der Betrag wird von Ihrem Konto eingezogen“.
- **Überweisung:** Fälligkeit („Zahlbar bis“), Ihre IBAN und BIC.
- **Lastschrift:** Ihre **Gläubiger-ID**, die **IBAN des Kunden**, von der abgebucht wird, die **Mandatsreferenz** (optional) und das Datum des Einzugs (optional). Ihre eigene IBAN und eine Fälligkeit braucht die XRechnung dann nicht. Steht die IBAN des Kunden gekürzt auf der Rechnung (z.B. „DE12 **** 3456“), tragen Sie sie einmal vollständig ein; XFact merkt sie sich für diesen Kunden.
- **Kreditkarte:** die **letzten 4 Ziffern** der Kreditkarte des Kunden und das Datum der Belastung (optional). Die XRechnung verlangt die Ziffern; mehr als die letzten 4 übernimmt XFact nie. Stehen sie nicht auf der Rechnung, finden Sie sie in Ihrem Zahlungsdienst. XFact merkt sie sich für diesen Kunden.

Unter der Rechnung stehen **Weitere Angaben**, die im Rechnungsbild keinen Platz haben:
- **Steuer:** normal mit 19 % / 7 %, Steuerschuldnerschaft des Leistungsempfängers (§ 13b) oder Kleinunternehmer (§ 19). Vorgewählt ist, was die KI auf der Rechnung erkannt hat.
- **Leistungsdatum für Positionen ohne Datum:** Mit **„= Rechnungsdatum“** übernehmen Sie das Rechnungsdatum.
- **Referenz / Bestellnummer** des Kunden und **Leitweg-ID** (nur bei Behörden), beides optional. Hält die KI den Empfänger für eine Behörde und fehlt die Leitweg-ID, steht dort gelb „Empfänger ist vermutlich eine Behörde – dann meist Pflicht“. Die Leitweg-ID steht in der Bestellung oder dem Auftrag der Behörde. Braucht sie keine, klicken Sie auf „Stimmt“. Eine eingetragene Leitweg-ID prüft XFact auf Aufbau und Prüfziffer.

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
| **Steuerfall** | Nur wenn ihn die KI nicht eindeutig erkennt, siehe Abschnitt 7 | diese Rechnung |

Ihre eigenen Firmendaten liest XFact aus Ihrer ersten Rechnung. Eine Einrichtung der Firmendaten vorab ist nicht nötig.

## 7. Steuerfälle

| Fall | Woran XFact ihn erkennt | Was XFact zusätzlich braucht |
|---|---|---|
| **19 % und/oder 7 %**, auch gemischt | ausgewiesene Umsatzsteuer | — |
| **§13b UStG, Steuerschuldnerschaft des Leistungsempfängers** (z.B. Bauleistungen an Baufirmen, Gebäudereinigung) | Hinweistext auf der Rechnung, z.B. „Reverse Charge“, 0 % Umsatzsteuer | die **USt-IdNr. des Empfängers** oder dessen Registernummer (z.B. HRB). Eine Steuernummer des Empfängers reicht hier nicht. |
| **§19 UStG, Kleinunternehmer** | Hinweistext „§ 19 UStG“, keine Umsatzsteuer ausgewiesen | — |

Den Fall erkennt die KI aus der Rechnung, der Prüfer kontrolliert ihn. Für Ihr eigenes Unternehmen genügt **USt-IdNr. oder Steuernummer**. Andere Fälle (z.B. innergemeinschaftliche Lieferung von Waren) unterstützt XFact nicht; dann ist der Steuerfall rot.

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
- Danach kontrolliert der **Prüfer Jev** jeden erkannten Wert gegen den Rechnungstext („Steht das wirklich da?“), außerdem Einheit und Steuerfall. Was er nicht bestätigt, ist gelb. Jev ist ein Entscheidungsmodell, kein zweites Sprachmodell; die Prüfung kostet etwa 0,02 Cent je Rechnung und läuft nur über OpenRouter.
- Die KI schätzt außerdem ein, ob der Empfänger eine Behörde ist. Dann fragt XFact nach der Leitweg-ID.
- Zusätzlich prüfen feste Regeln: IBAN-Prüfziffer, Aufbau der USt-IdNr., Aufbau und Prüfziffer von Leitweg-ID und Gläubiger-ID, gültige Daten, Rechenwerte, und ob Rechnungsnummer, IBAN und USt-IdNr. wörtlich in der Rechnung stehen.

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
