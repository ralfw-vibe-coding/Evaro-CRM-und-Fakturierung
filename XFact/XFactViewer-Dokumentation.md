# XFactViewer – Dokumentation

**Eine XRechnung lesbar anzeigen.** Sie ziehen die XML-Datei in den Browser und sehen eine Rechnung, wie Sie sie kennen.

Version 1 · Lizenz: MIT

---

## 1. Was ist XFactViewer?

Eine XRechnung ist eine XML-Datei. Für Programme ist sie gut lesbar, für Menschen nicht. XFactViewer ist eine kleine Web-App, die eine XRechnung so anzeigt, wie man eine Rechnung erwartet: Absender und Empfänger, Positionen, Summen, Zahlung. Codes wie `HUR`, `AE` oder `58` übersetzt er in „Stunde“, „Steuerschuldnerschaft des Leistungsempfängers“ und „SEPA-Überweisung“.

XFactViewer läuft vollständig in Ihrem Browser, auch ohne Internet. **Die Rechnung verlässt Ihren Rechner nicht.**

**Für wen:**
- Alle, die XRechnungen **bekommen** und sie lesen, prüfen, buchen oder ausdrucken wollen
- Alle, die XRechnungen **schreiben** und sehen wollen, was in ihrer Datei steht

## 2. Was XFactViewer kann und was nicht

**XFactViewer kann:**
- XRechnungen in der Syntax **CII** anzeigen. Diese Syntax verwenden auch ZUGFeRD und Factur-X.
- Alle wichtigen Angaben zeigen:
  - Kopfdaten, Rechnungssteller und -empfänger mit Kontakt, Lieferanschrift
  - Positionen mit Leistungsdatum, Nachlässe und Zuschläge
  - Umsatzsteuer, Summen, Anzahlungen
  - Zahlung per Überweisung oder Lastschrift, Zahlungsbedingungen mit Skonto, Bemerkungen
- Codes in verständliche Begriffe übersetzen.
- **Nachrechnen:** Gehen Positionen, Umsatzsteuer und Summen auf? Abweichungen zeigt er an.
- Auf Wunsch die **BT-Nummern** zeigen, also die Nummern der Felder in der Norm (z.B. BT-1 für die Rechnungsnummer). Das hilft, wenn Sie mit dem Absender über einzelne Angaben sprechen.
- Eingebettete **Anhänge** speichern, z.B. eine PDF-Kopie oder einen Stundenzettel.
- **Drucken** oder über den Druckdialog als PDF speichern.
- **Von Ihnen angepasst werden.** Farben, Texte, zusätzliche Angaben: Mit einem KI-Assistenten geht das auch ohne Programmierkenntnisse (Abschnitt 8).

**XFactViewer kann (noch) nicht:**
- XRechnungen in der Syntax **UBL** anzeigen. Bei einer UBL-Datei sagt er Ihnen das.
- Die XML aus einem **ZUGFeRD-PDF** herausholen. Öffnen Sie das PDF; die eingebettete XML finden Sie in vielen PDF-Programmen unter „Anhänge“.
- **Prüfen, ob die XRechnung gültig ist.** Er zeigt an, was in der Datei steht. Ob sie den offiziellen Regeln entspricht, prüft ein Prüfdienst (Link „Online prüfen“ unten auf der Seite).
- Rechnungen speichern, verwalten oder archivieren.

## 3. In 10 Sekunden

1. `XFactViewer.html` im Browser öffnen, z.B. per Doppelklick.
2. Die XML-Datei auf die Fläche ziehen oder auf die Fläche klicken und die Datei auswählen.
3. Lesen. Bei Bedarf **Drucken** oder **Andere Datei**.

## 4. Was Sie sehen

**Oben** steht der Dateiname, darunter „XRechnung · Syntax CII“, wenn die Datei als XRechnung gekennzeichnet ist. Rechts daneben stehen die Schalter **BT-Nummern zeigen**, **Drucken** und **Andere Datei**.

**Die Rechnung:**

| Bereich | Inhalt |
|---|---|
| **Kopf** | Rechnungsart (z.B. Rechnung, Gutschrift, Rechnungskorrektur), Nummer und Datum |
| **Rechnungssteller, Rechnungsempfänger** | Name, Anschrift, Land, wenn nicht Deutschland, USt-IdNr., Steuernummer, elektronische Adresse, Ansprechpartner mit Telefon und E-Mail |
| **Kopfdaten** | Fälligkeit, Leistungsdatum oder -zeitraum, Käuferreferenz bzw. Leitweg-ID, Bestell-, Auftrags-, Vertrags- und Projektnummer, Bezug auf eine frühere Rechnung |
| **Positionen** | Nummer, Datum, Bezeichnung mit Beschreibung und Artikelnummer, Menge, Einheit, Preis, Umsatzsteuersatz, Betrag; Nachlässe und Zuschläge je Position |
| **Nachlässe und Zuschläge** | auf die ganze Rechnung, falls vorhanden |
| **Summen** | Netto, Umsatzsteuer je Satz bzw. Art der Steuerbefreiung, Gesamtbetrag, bereits gezahlt, zu zahlen; darunter der Text der Rechnung zur Steuerbefreiung |
| **Nachrechnen** | ✓, wenn alles aufgeht, sonst gelb, wo die Abweichung liegt |
| **Zahlung** | Zahlungsart; bei Überweisung IBAN, BIC und Kontoinhaber; bei Lastschrift Gläubiger-ID, Mandatsreferenz und das Konto, von dem abgebucht wird; Verwendungszweck, Fälligkeit, Zahlungsbedingungen. Skonto, das in der XRechnung als `#SKONTO#TAGE=14#PROZENT=2.00#` steht, erscheint als „2,00 % Skonto bei Zahlung innerhalb von 14 Tagen“. |
| **Bemerkungen, Lieferanschrift, Anhänge** | wenn die Rechnung welche enthält |

Was in der Datei nicht steht, wird nicht angezeigt. Leere Zeilen gibt es nicht.

**Unbekannte Codes** zeigt XFactViewer so, wie sie in der Datei stehen, z.B. eine seltene Einheit als `XBG`.

**Nachrechnen** ist keine Prüfung der Gültigkeit. XFactViewer rechnet nur mit den Werten aus der Datei: Menge × Preis je Position, die Summe der Positionen, Nachlässe und Zuschläge, die Steuer je Satz, den Gesamtbetrag und den Zahlbetrag. Abweichungen bis 1 Cent gelten als Rundung.

## 5. Sicherheit

- Die Datei wird **nur in Ihrem Browser** gelesen. Es wird nichts hochgeladen, nichts gespeichert, und es gibt keine Verbindung zu einem Server.
- Inhalte der Rechnung werden **nur als Text** angezeigt. Eine präparierte Datei kann auf der Seite nichts ausführen.
- **Anhänge** speichert XFactViewer nur auf Ihren Wunsch und öffnet sie nicht. Öffnen Sie einen Anhang nur, wenn Sie dem Absender vertrauen.
- **Links** in der Rechnung, z.B. auf externe Anhänge, werden nur als Text gezeigt, nicht als anklickbarer Link.

## 6. Häufige Fragen

**Ist die Rechnung gültig, wenn XFactViewer sie anzeigt?**
Nicht unbedingt. XFactViewer zeigt auch Dateien an, die gegen Regeln der XRechnung verstoßen. Die Gültigkeit prüft ein Prüfdienst, z.B. über den Link „Online prüfen“. Beachten Sie: Dort laden Sie die Rechnung auf eine fremde Website.

**Muss ich XRechnungen überhaupt lesen können?**
Seit dem 1. Januar 2025 müssen alle Unternehmen in Deutschland E-Rechnungen empfangen können. Für den Empfang genügt ein E-Mail-Postfach; um sie zu lesen, brauchen Sie ein Programm wie dieses. Bewahren Sie die XML-Datei auf. Sie ist das Original; ein Ausdruck ersetzt sie nicht. Zu den Fristen fragen Sie im Zweifel Ihren Steuerberater.

**Die Datei wird nicht angezeigt: „keine XRechnung“.**
Die XML-Datei ist eine andere Art von Dokument, z.B. eine Bestellung oder ein Lieferschein. Oder es ist eine XRechnung in UBL, dann sagt XFactViewer das ausdrücklich.

**Nachrechnen zeigt eine Abweichung.**
Dann stimmen die Werte in der Datei nicht zusammen. Sprechen Sie den Absender an und nennen Sie ihm die betroffenen Felder. Mit „BT-Nummern zeigen“ sehen Sie deren Nummern.

**Kann ich die Rechnung als PDF speichern?**
Ja: **Drucken** und im Druckdialog „Als PDF speichern“ wählen. Gedruckt wird nur die Rechnung, ohne Schalter und Fußzeile.

## 7. Verantwortung und Lizenz

XFactViewer ist Open Source unter der **MIT-Lizenz**. Sie dürfen es nutzen, verändern und weitergeben. Es wird **ohne Gewähr** bereitgestellt. Verlassen Sie sich bei Buchung und Zahlung nicht allein auf die Anzeige, sondern prüfen Sie die Rechnung wie gewohnt.

Wer XFactViewer verändert und weitergibt, passt bitte diese Dokumentation mit an.

## 8. XFactViewer anpassen

**Ausdrücklich erwünscht.** XFactViewer gehört Ihnen. Soll die Rechnung anders aussehen, fehlt Ihnen eine Angabe oder ein Code, dann ändern Sie es. Programmieren müssen Sie dafür nicht können. Ein KI-Assistent übernimmt das, Sie sagen ihm in normaler Sprache, was Sie wollen.

### Was Sie brauchen

- **`XFactViewer.html`**: die ganze App in einer Datei, lesbar und kommentiert
- **Diese Dokumentation** als `XFactViewer-Dokumentation.md`
- **Einen KI-Assistenten, der Dateien bearbeiten kann**, zum Beispiel Claude Code. Andere Assistenten wie Cursor, Codex oder Gemini CLI funktionieren ähnlich.
- **Ein, zwei XRechnungen** zum Ausprobieren

### So ist XFactViewer.html aufgebaut

Am Anfang der Datei steht eine Übersicht. Darunter folgen deutlich markierte Abschnitte:

| Abschnitt | Was darin steht |
|---|---|
| **FARBEN UND SCHRIFTEN** | alle Farben, Schriften und Abstände an einer Stelle |
| **LAYOUT** | Aussehen der Bausteine, auch beim Drucken |
| **SEITE** | Aufbau der Oberfläche: Kopfzeile, Ablagefläche, Rechnung, Fußzeile |
| **TEXTE** | alle Beschriftungen und Meldungen |
| **CODES** | was Codes bedeuten: Rechnungsarten, Einheiten, Steuerkategorien, Zahlungsarten |
| **LESEN** | wie aus der XML die Rechnung wird; hier stehen die Namen der XML-Elemente |
| **NACHRECHNEN** | welche Werte nachgerechnet werden und mit welcher Toleranz |
| **ANZEIGE** | wie die Rechnung auf dem Bildschirm aussieht und welche Angabe wo steht |
| **ABLAUF** | Datei wählen, anzeigen, drucken |

### Los geht's

1. Legen Sie einen neuen Ordner an, zum Beispiel `XFactViewer anpassen`, und kopieren Sie beide Dateien und Ihre Beispiel-XRechnungen hinein.
2. **Sichern Sie die Originaldatei**, z.B. als `XFactViewer-original.html`. Dann können Sie jederzeit zurück.
3. Starten Sie den KI-Assistenten in diesem Ordner. Bei Claude Code geht das im Terminal mit `claude` oder in der Claude-App, indem Sie den Ordner auswählen.

### Der erste Auftrag: kennenlernen, noch nichts ändern

```text
In diesem Ordner liegt XFactViewer: XFactViewer.html ist eine Web-App, die
XRechnungen (XML) lesbar anzeigt, XFactViewer-Dokumentation.md beschreibt,
was sie kann. Dazu liegen ein paar XRechnungen als Beispiele hier.

Lies zuerst die Dokumentation. Verschaffe dir dann einen Überblick über
XFactViewer.html: Wo stehen Farben und Layout, wo die Codes, wo wird die XML
gelesen, wo wird die Rechnung angezeigt?

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

**Ein Code fehlt**
```text
In unseren Rechnungen kommt die Einheit „XRO“ vor, XFactViewer zeigt nur den
Code. Ergänze, dass XRO „Rolle“ bedeutet.
```

**Eine Angabe fehlt in der Anzeige**
```text
Unsere Lieferanten schicken die Lieferscheinnummer mit (BT-16). Zeig sie bei
den Kopfdaten an, unter der Bestellnummer. Probiere es mit der Datei
Lieferant-Muster.xml aus.
```

**Für die Buchhaltung**
```text
Ich drucke Rechnungen für die Buchhaltung aus. Beim Drucken soll oben rechts
ein Kasten mit „Eingegangen am: ____  Geprüft: ____  Gebucht: ____“ stehen.
Am Bildschirm soll der Kasten nicht erscheinen.
```

**Nachrechnen**
```text
Abweichungen bis 5 Cent sollen beim Nachrechnen als Rundung gelten, nicht nur bis 1 Cent.
```

**Nach jeder Änderung**
```text
Passe die Dokumentation an die Änderung an, damit sie wieder stimmt.
```

### Tipps

- **Eine Änderung pro Auftrag.** Kleine Schritte sind leichter zu prüfen und bei Bedarf zurückzunehmen.
- **Sofort ausprobieren:** `XFactViewer.html` im Browser neu laden und eine Ihrer XRechnungen öffnen.
- **Fragen statt raten:** „Was müsste ich ändern, damit …?“ ist ein guter Auftrag. Der Assistent erklärt, und Sie entscheiden.
- **Klappt etwas nicht**, sagen Sie dem Assistenten, was Sie sehen: „Nach der Änderung bleibt die Seite leer.“ Oder Sie kehren zu `XFactViewer-original.html` zurück.

### Weitergeben

Ihre angepasste Version dürfen Sie weitergeben (MIT-Lizenz). Geben Sie `XFactViewer.html` und `XFactViewer-Dokumentation.md` immer gemeinsam weiter, und lassen Sie die Dokumentation vorher an Ihre Änderungen anpassen.
