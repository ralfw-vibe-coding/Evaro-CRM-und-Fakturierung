# XFact – Dokumentation

**Aus Ihrer PDF-Rechnung wird eine XRechnung.** Sie müssen dafür Ihr Rechnungsprogramm nicht umbauen.

Version 1 · Lizenz: MIT

---

## 1. Was ist XFact?

XFact ist eine kleine Web-App, die vollständig in Ihrem Browser läuft. Sie lesen eine PDF-Rechnung ein. XFact erkennt die Rechnungsdaten, fragt nach, was für eine gültige XRechnung fehlt, und erzeugt daraus eine **XRechnung-Datei (XML)**.

Diese XML-Datei verschicken Sie zusammen mit Ihrem gewohnten PDF an Ihren Kunden.

**Für wen:** Unternehmen in Deutschland, die Rechnungen an Empfänger in Deutschland schreiben. Die Rechnungen entstehen zum Beispiel in Word, Excel oder einem Rechnungsprogramm, das keine E-Rechnung kann.

## 2. Was XFact kann und was nicht

**XFact kann:**
- PDF-Rechnungen mit Textebene einlesen. So sind fast alle PDFs, die aus Word, Excel oder einem Programm erzeugt werden.
- Rechnungsdaten erkennen: Nummer, Datum, Absender, Empfänger, Positionen, Summen, Steuer, Bankverbindung.
- Nachrechnen: Stimmen Positionen, Netto, Umsatzsteuer und Gesamtbetrag?
- Fehlende Pflichtangaben gezielt nachfragen und sich die Antworten merken, auch pro Kunde.
- Eine **XRechnung 3.0** erzeugen, die den offiziellen Prüfregeln entspricht.
- Mit oder ohne KI arbeiten. KI ist optional und Ihre Entscheidung.
- Ohne Internet laufen, mit der Offline-Version.
- **Von Ihnen angepasst werden.** Farben, Layout, Texte, Regeln: Mit einem KI-Assistenten geht das auch ohne Programmierkenntnisse (Abschnitt 14).

**XFact kann nicht:**
- Gescannte Rechnungen (Bilder ohne Text) lesen.
- Rechnungen an Empfänger im Ausland oder von Absendern im Ausland.
- Gutschriften, Storno- und Abschlagsrechnungen, Rabatte auf die Gesamtsumme.
- ZUGFeRD erzeugen. Das wäre ein PDF mit eingebetteter XML. XFact erzeugt eine separate XML-Datei.
- Rechnungen verschicken oder archivieren.

## 3. In 30 Sekunden

1. **PDF hineinziehen.**
2. **Prüfen:** Rot markierte Angaben ergänzen, gelb markierte kurz ansehen.
3. **„XML erzeugen“ klicken.** Die Datei wird heruntergeladen und heißt wie Ihr PDF, nur mit `.xml`.

Ab der zweiten Rechnung für denselben Kunden fragt XFact meist nichts mehr nach.

## 4. Bevor Sie loslegen

Beim ersten Start zeigt XFact einige Hinweise, die Sie mit „Verstanden“ bestätigen:

- Ihre Rechnungen werden **nur in Ihrem Browser** verarbeitet und nicht hochgeladen.
- Schalten Sie KI zu, wird der Text Ihrer Rechnung an den KI-Anbieter geschickt, den Sie gewählt haben.
- Gemerkte Angaben liegen nur in diesem Browser. Sichern Sie sie regelmäßig über „Daten exportieren“.
- **Die XML-Datei ist die maßgebliche Rechnung.** Sie prüfen die Angaben vor dem Versand und bewahren die XML auf.
- XFact wird ohne Gewähr bereitgestellt.

Die Hinweise finden Sie jederzeit wieder im Menü unter **Hinweise**.

## 5. Schritt für Schritt

### 5.1 Hochladen

Ziehen Sie das PDF in das Fenster oder klicken Sie auf **Datei wählen**. Es wird eine Rechnung pro Datei verarbeitet.

| Meldung | Bedeutung |
|---|---|
| „Dieses PDF enthält keinen Text …“ | Das PDF ist vermutlich ein Scan. Erzeugen Sie die Rechnung direkt als PDF aus Ihrem Programm, statt sie auszudrucken und einzuscannen. |
| „Keine Rechnungsnummer und keine Summen gefunden.“ | XFact hat das PDF nicht als Rechnung erkannt. Sie können die Angaben im nächsten Schritt trotzdem selbst eintragen. |

### 5.2 Prüfen

XFact zeigt Ihre Rechnung **neutral, ohne Ihr Layout**: Kopf, Absender, Empfänger, Positionen, Summen, Zahlung. Jeden Wert können Sie anklicken und ändern.

Markierungen zeigen, was zu tun ist:

| Farbe | Bedeutung | Was Sie tun |
|---|---|---|
| **Rot** | Diese Angabe fehlt. Ohne sie wird die XRechnung ungültig. | Direkt im Feld daneben eintragen. |
| **Gelb** | Unsicher erkannt, oder es gibt einen Hinweis, z.B. „Diese Rechnung wurde bereits umgewandelt“. | Prüfen und korrigieren, oder auf **„Stimmt“** klicken, wenn der Wert richtig ist. Gelb hält Sie nicht auf. |
| **Grau** | Aus Ihren gemerkten Angaben ergänzt, z.B. „aus Kundenprofil“. | Nur zur Information. |

Bei den Summen zeigt ein **✓**, dass alles aufgeht. Sonst nennt XFact die Differenz.

**Ändern:** Klicken Sie auf einen Wert, ändern Sie ihn und drücken Sie Enter, oder wechseln Sie mit Tab ins nächste Feld. Mit Escape brechen Sie ab. Kennt XFact eine Einheit nicht, wählen Sie direkt in der Tabelle aus, was sie bedeutet, z.B. „Fahrt“ = Stück.

Unter der Rechnung stehen **Weitere Angaben**, die im Rechnungsbild keinen Platz haben:
- **Steuer:** normal mit 19 % / 7 %, Steuerschuldnerschaft des Leistungsempfängers (§ 13b) oder Kleinunternehmer (§ 19). XFact wählt vor, was auf der Rechnung steht.
- **Leistungsdatum für Positionen ohne Datum:** Mit **„= Rechnungsdatum“** übernehmen Sie das Rechnungsdatum.
- **Referenz / Bestellnummer** des Kunden und **Leitweg-ID** (nur bei Behörden), beides optional.

Darunter sehen Sie, was für die XRechnung noch fehlt. Neben jeder ergänzten Angabe steht das Häkchen **„merken“**. Es ist vorausgewählt.

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
| **Käuferreferenz bzw. Leitweg-ID** | Behörden verlangen ihre Leitweg-ID. Bei Firmen ist es optional, z.B. eine Bestellnummer. | diesen Kunden |
| **Einheit**, z.B. „Std“, „Pausch.“ | Die XRechnung verwendet genormte Einheiten. Sie ordnen Ihre Schreibweise einmal zu. | Ihre Firma |
| **Leistungsdatum** | Steuerlich vorgeschrieben. Fehlt es, genügt ein Klick auf „= Rechnungsdatum“, wenn beides gleich ist. | diese Rechnung |
| **Steuerfall** | Nur wenn er nicht eindeutig auf der Rechnung steht, siehe Abschnitt 7 | diesen Kunden |

Ihre eigenen Firmendaten liest XFact aus Ihrer ersten Rechnung. Eine Einrichtung vorab ist nicht nötig.

## 7. Steuerfälle

| Fall | Woran XFact ihn erkennt | Was XFact zusätzlich braucht |
|---|---|---|
| **19 % und/oder 7 %**, auch gemischt | Steuerzeilen bei den Summen | — |
| **§13b UStG, Steuerschuldnerschaft des Leistungsempfängers** (z.B. Bauleistungen an Baufirmen, Gebäudereinigung) | Hinweistext auf der Rechnung, 0 % Umsatzsteuer | die **USt-IdNr. des Empfängers** oder dessen Registernummer (z.B. HRB). Eine Steuernummer des Empfängers reicht hier nicht. |
| **§19 UStG, Kleinunternehmer** | Hinweistext „§ 19 UStG“, keine Umsatzsteuer ausgewiesen | — |

Für Ihr eigenes Unternehmen genügt **USt-IdNr. oder Steuernummer**.

## 8. Was XFact sich merkt

**Gemerkt werden:**
- **Ihre Firma bzw. Firmen:** Stammdaten, Ansprechpartner, Bankverbindung, gelernte Beschriftungen Ihrer Rechnungsvorlage. Arbeiten Sie für mehrere Firmen, z.B. als Buchhalter, legt XFact automatisch je Firma ein eigenes Profil an.
- **Kunden:** E-Mail für Rechnungen, Leitweg-ID oder Referenz, Steuerfall
- **Einheiten:** Ihre Schreibweise und die genormte Einheit
- **Einstellungen:** KI an oder aus, Anbieter, Modell, Schlüssel
- **Logbuch:** Datum, Dateiname, Rechnungsnummer, Kunde und Betrag jeder umgewandelten Rechnung

**Ihre Rechnungen selbst speichert XFact nicht.**

XFact lernt mit: Korrigieren Sie eine Erkennung, merkt sich XFact zum Beispiel, dass bei Ihnen „Belegnr.“ die Rechnungsnummer ist. Ab der nächsten Rechnung klappt die Erkennung dann besser.

### Daten sichern, umziehen, löschen

Im Menü finden Sie:
- **Daten exportieren:** eine Datei mit allen gemerkten Angaben. Der API-Schlüssel ist nur enthalten, wenn Sie das ausdrücklich ankreuzen.
- **Daten importieren:** stellt eine exportierte Datei wieder her, zum Beispiel auf einem neuen Rechner. Die vorhandenen Angaben werden dabei ersetzt.
- **Alle Daten löschen:** nach einer Rückfrage

> **Wichtig:** Leeren Sie Ihren Browser-Speicher oder wechseln Sie Browser oder Rechner, sind die gemerkten Angaben weg. Exportieren Sie deshalb regelmäßig.

## 9. KI zuschalten (optional)

Ohne KI erkennt XFact die Daten nach festen Regeln. Mit KI ist die Erkennung genauer, vor allem bei ungewöhnlichen Layouts. **Ob Sie KI nutzen, entscheiden Sie selbst.**

**Was dabei passiert:**
- XFact schickt **nur den Text** Ihrer Rechnung an den gewählten Anbieter, kein Bild und keine weiteren Daten.
- Die Antwort der KI durchläuft dieselben Prüfungen wie die normale Erkennung: Rechenkontrolle und IBAN-Prüfziffer.
- Weichen KI und Regeln voneinander ab, markiert XFact das Feld gelb und zeigt beide Werte zur Auswahl.

### Mit OpenRouter (voreingestellt)

1. Konto bei [openrouter.ai](https://openrouter.ai) anlegen, Guthaben aufladen, API-Schlüssel erzeugen.
2. In XFact: **Menü → KI**, „KI verwenden“ einschalten, Schlüssel eintragen.
3. **Verbindung testen** klicken.

Voreingestellt ist das Modell `anthropic/claude-sonnet-5.5`. In unseren Tests war es fehlerfrei und schnell, bei rund 1–2 Cent pro Rechnung. Günstiger und in unseren Tests ebenso genau sind `anthropic/claude-haiku-5.5` und `openai/gpt-6-luna`. Sie können jedes Modell eintragen, das OpenRouter anbietet.

### Mit einer KI auf Ihrem Rechner (z.B. LM Studio)

Dabei verlässt Ihre Rechnung den Rechner überhaupt nicht.

1. In LM Studio ein Modell laden und den lokalen Server starten.
2. In den Server-Einstellungen von LM Studio **CORS aktivieren**.
3. In XFact unter **Menü → KI** den Endpunkt auf `http://localhost:1234/v1` setzen, den Modellnamen aus LM Studio eintragen und das Schlüsselfeld leer lassen.
4. **Verbindung testen.** Fragt Ihr Browser, ob die Seite auf Ihr lokales Netzwerk zugreifen darf, erlauben Sie das.

Jeder andere Anbieter mit OpenAI-kompatibler Schnittstelle funktioniert ebenso.

> Ihr API-Schlüssel wird im Browser gespeichert. Nutzen Sie XFact nicht mit Schlüssel auf Rechnern, die andere mitbenutzen.

## 10. Offline-Version

Über **Menü → Offline-Version** laden Sie XFact als **eine einzige HTML-Datei** herunter. Ein Doppelklick öffnet sie im Browser, und sie funktioniert ohne Internetverbindung. Für die KI-Anbindung zu OpenRouter brauchen Sie natürlich trotzdem Internet.

Je nach Browser werden gemerkte Angaben bei einer lokal geöffneten Datei anders gespeichert als auf der Website. Nutzen Sie Export und Import, wenn Sie zwischen beiden wechseln.

## 11. Versand und Aufbewahrung

- Schicken Sie **XML und PDF als zwei Anhänge in einer E-Mail**, eine Rechnung pro E-Mail. Packen Sie die Dateien nicht in ein ZIP.
- **Bewahren Sie die XML auf.** Sie ist die maßgebliche Rechnung. Das PDF ist nur eine lesbare Kopie.
- Schreiben Sie die Rechnung immer **zuerst** in Ihrem Programm, wandeln Sie sie um und verschicken Sie sie erst dann. Eine bereits verschickte Rechnung umzuwandeln und erneut zu senden, erzeugt eine zweite Rechnung.
- Behörden nehmen XRechnungen meist nur über ihre Portale oder über Peppol an, nicht per E-Mail.

## 12. Häufige Fragen

**Ist meine XRechnung damit garantiert gültig?**
XFact erzeugt die Datei nach den offiziellen Regeln und blockiert alles, was sie ungültig machen würde. Für die Richtigkeit der Inhalte sind Sie verantwortlich. Mit „Online prüfen“ können Sie zusätzlich eine unabhängige Prüfung machen.

**XFact erkennt meine Positionen falsch.**
Korrigieren Sie die Werte in der Prüfansicht. XFact merkt sich die Beschriftungen Ihrer Vorlage. Hilft das nicht, schalten Sie KI zu.

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
| **ERKENNUNGSREGELN** | Beschriftungen, nach denen gesucht wird (z.B. „Rechnungsnummer“, „Rg.-Nr.“), Einheiten, Hinweistexte der Steuerfälle |
| **PRÜFUNGEN** | was rot oder gelb markiert wird |
| **KI** | Voreinstellungen für Anbieter und Modell, die Anweisung an die KI |
| **XML-ERZEUGUNG** | wie aus den Rechnungsdaten die XRechnung entsteht |
| **PDF LESEN** | wie der Text aus dem PDF geholt und zu Zeilen zusammengesetzt wird |
| **ERKENNUNG** | wie die Erkennungsregeln angewendet werden, z.B. wo nach einem Wert gesucht wird |
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
xfact.html: Wo stehen Farben und Layout, wo die Erkennungsregeln, wo die
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

**Eine Erkennungsregel**
```text
Auf meinen Rechnungen heißt die Rechnungsnummer „Vorgang“ und das Leistungsdatum
„ausgeführt am“. Ergänze beides bei den Erkennungsregeln.
```

**Eine Prüfregel**
```text
Bei uns ist das Zahlungsziel immer 14 Tage. Steht auf der Rechnung kein
Fälligkeitsdatum, soll XFact Rechnungsdatum + 14 Tage vorschlagen und das
Feld gelb markieren, damit ich es sehe.
```

**Voreinstellung der KI**
```text
Stelle als KI-Modell openai/gpt-6-luna voreingestellt ein statt Sonnet.
```

**Nach jeder Änderung**
```text
Passe die Dokumentation an die Änderung an, damit sie wieder stimmt.
```

### Tipps

- **Eine Änderung pro Auftrag.** Kleine Schritte sind leichter zu prüfen und bei Bedarf zurückzunehmen.
- **Sofort ausprobieren:** `xfact.html` im Browser öffnen bzw. neu laden und eine Ihrer Rechnungen durchspielen.
- **Bei Änderungen an Erkennung, Prüfungen oder XML-Erzeugung:** Erzeugen Sie danach eine XML und lassen Sie sie mit „Online prüfen“ kontrollieren. Die XRechnung hat strenge Regeln, bis hin zur Reihenfolge der Elemente in der Datei. Sagen Sie dem Assistenten ausdrücklich, dass die erzeugte XML gültig bleiben muss.
- **Fragen statt raten:** „Was müsste ich ändern, damit …?“ ist ein guter Auftrag. Der Assistent erklärt, und Sie entscheiden.
- **Klappt etwas nicht**, sagen Sie dem Assistenten, was Sie sehen: „Nach der Änderung bleibt die Seite leer.“ Oder Sie kehren zu `xfact-original.html` zurück.

### Weitergeben

Ihre angepasste Version dürfen Sie weitergeben (MIT-Lizenz). Geben Sie `xfact.html` und `XFact-Dokumentation.md` immer gemeinsam weiter, und lassen Sie die Dokumentation vorher an Ihre Änderungen anpassen.
