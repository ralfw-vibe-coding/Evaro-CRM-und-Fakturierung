# Anforderung: XRechnung-Export aus dem Fakturaprogramm

Stand: 15.10.2026 · Grundlage: Erfassungsformular (Screenshot) und Rechnungen INV 737, 742, 745, 747, 753

## 1. Ziel

Das Fakturaprogramm erzeugt zu jeder Rechnung zusätzlich zum PDF eine **XRechnung als XML-Datei**. Beide Dateien entstehen aus denselben Daten. Ihre Beträge, Daten und Texte müssen übereinstimmen.

Zwei Referenzdateien zeigen das Soll-Ergebnis. Beide hat der offizielle KoSIT-Validator **ohne Fehler und ohne Warnungen** angenommen:

- [Beispiel-XML/Rechnung-0000000753.xml](Beispiel-XML/Rechnung-0000000753.xml): eine Position, ein Leistungstag
- [Beispiel-XML/Rechnung-0000000747.xml](Beispiel-XML/Rechnung-0000000747.xml): 7 Positionen, Leistungszeiträume, km, Kommentar

> Die Reihenfolge der XML-Elemente ist durch das XML-Schema fest vorgegeben. Die Referenzdateien dienen deshalb als Vorlage für die Struktur. Wer Elemente vertauscht, bekommt eine ungültige Datei.

## 2. Ausgabeformat (fest)

| Eigenschaft | Wert |
|---|---|
| Standard | XRechnung 3.0.x (deutsche Ausprägung der EN 16931) |
| Syntax | UN/CEFACT CII D16B (dieselbe Syntax wie ZUGFeRD, damit später ein Wechsel auf ZUGFeRD ohne Umbau möglich ist) |
| Kennung des Profils | `urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0` |
| Kennung des Geschäftsprozesses | `urn:fdc:peppol.eu:2017:poacc:billing:01:1.0` |
| Zeichensatz | UTF-8. Sonderzeichen werden XML-maskiert (`&` → `&amp;`, `<` → `&lt;`). |
| Dateiname | `Rechnung-<Rechnungsnummer>.xml`, gleicher Stamm wie das PDF |
| Zeitpunkt | Beim Statuswechsel **Entwurf → Abgerechnet**, gleichzeitig mit dem PDF. Danach unveränderlich, wird mit der Rechnung archiviert. |

### Formate

| Typ | Format | Beispiel |
|---|---|---|
| Datum | `JJJJMMTT` in `<udt:DateTimeString format="102">` | `20260912` |
| Betrag | Dezimalpunkt, genau 2 Nachkommastellen, kein Tausendertrenner | `16648.00` |
| Einzelpreis | Dezimalpunkt, 2 bis 4 Nachkommastellen | `0.30` |
| Menge | Dezimalpunkt, kein Tausendertrenner | `1080` (nicht `1.080`!) |
| Prozent | ohne %-Zeichen | `0`, `19` |

## 3. Mapping

Abkürzungen für die XML-Pfade:

- `DOC` = `/rsm:CrossIndustryInvoice/rsm:ExchangedDocument`
- `TX` = `/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction`
- `AGR` = `TX/ram:ApplicableHeaderTradeAgreement`
- `DLV` = `TX/ram:ApplicableHeaderTradeDelivery`
- `STL` = `TX/ram:ApplicableHeaderTradeSettlement`
- `POS` = `TX/ram:IncludedSupplyChainTradeLineItem` (einmal pro Position)

Die Spalte „BT“ nennt die Nummer des Feldes in der EN 16931. Unter dieser Nummer melden Validatoren Fehler.

### 3.1 Rechnungskopf (Formular)

| Quelle im Programm | BT | XML-Pfad | Regel | Pflicht |
|---|---|---|---|---|
| Rechnungsnummer | BT-1 | `DOC/ram:ID` | als Text, führende Nullen bleiben (`0000000753`) | ja |
| — (fest) | BT-3 | `DOC/ram:TypeCode` | `380` (Rechnung) | ja |
| Rechnungsdatum | BT-2 | `DOC/ram:IssueDateTime/udt:DateTimeString` | Format 102 | ja |
| Kommentar | BT-22 | `DOC/ram:IncludedNote/ram:Content` | nur wenn befüllt, Text unverändert | nein |
| Referenz | BT-10 | `AGR/ram:BuyerReference` | siehe Regel R1 | **ja** |
| Referenz (nur wenn Leitweg-ID gesetzt) | BT-13 | `AGR/ram:BuyerOrderReferencedDocument/ram:IssuerAssignedID` | siehe Regel R1 | nein |
| — (fest) | BT-5 | `STL/ram:InvoiceCurrencyCode` | `EUR` | ja |
| Rechnungsnummer | BT-83 | `STL/ram:PaymentReference` | Verwendungszweck = Rechnungsnummer | nein |

**R1, Käuferreferenz:**
- Hat der Kunde eine Leitweg-ID (öffentliche Auftraggeber), kommt sie nach BT-10 und das Feld „Referenz“ nach BT-13.
- Sonst kommt das Feld „Referenz“ nach BT-10.
- Ist beides leer, wird `keine Angabe` gesetzt. XRechnung verlangt BT-10 immer.

### 3.2 Rechnungssteller (feste Firmendaten)

Diese Werte sind heute in der Fußzeile des PDFs fest hinterlegt. Sie gehören in eine zentrale Konfiguration, aus der PDF und XML gemeinsam lesen.

| Wert | BT | XML-Pfad unter `AGR/ram:SellerTradeParty` | Pflicht |
|---|---|---|---|
| `Work With Ease EOOD` | BT-27 | `ram:Name` | ja |
| `205889057` (BG-UIC) | BT-30 | `ram:SpecifiedLegalOrganization/ram:ID` | nein |
| `Уърк уит Ииз ЕООД` | BT-28 | `ram:SpecifiedLegalOrganization/ram:TradingBusinessName` | nein |
| `Andrea Kaden` | BT-41 | `ram:DefinedTradeContact/ram:PersonName` | **ja (XRechnung)** |
| `+49 176 10335862` | BT-42 | `ram:DefinedTradeContact/ram:TelephoneUniversalCommunication/ram:CompleteNumber` | **ja (XRechnung)** |
| `team@work-with-ease.eu` | BT-43 | `ram:DefinedTradeContact/ram:EmailURIUniversalCommunication/ram:URIID` | **ja (XRechnung)** |
| `ul Bor 4` | BT-35 | `ram:PostalTradeAddress/ram:LineOne` | ja |
| `2777` | BT-38 | `ram:PostalTradeAddress/ram:PostcodeCode` | ja |
| `Dobrinishte` | BT-37 | `ram:PostalTradeAddress/ram:CityName` | ja |
| `BG` | BT-40 | `ram:PostalTradeAddress/ram:CountryID` | ja |
| `team@work-with-ease.eu` | BT-34 | `ram:URIUniversalCommunication/ram:URIID` mit `schemeID="EM"` | **ja (XRechnung)** |
| `BG205889057` | BT-31 | `ram:SpecifiedTaxRegistration/ram:ID` mit `schemeID="VA"` | ja |

Bankverbindung (unter `STL/ram:SpecifiedTradeSettlementPaymentMeans`):

| Wert | BT | XML-Pfad | Pflicht |
|---|---|---|---|
| `58` (SEPA-Überweisung) | BT-81 | `ram:TypeCode` | ja |
| `LT163250046848710872` | BT-84 | `ram:PayeePartyCreditorFinancialAccount/ram:IBANID` | ja (ohne Leerzeichen) |
| `Work With Ease EOOD` | BT-85 | `ram:PayeePartyCreditorFinancialAccount/ram:AccountName` | nein |
| `REVOLT21` | BT-86 | `ram:PayeeSpecifiedCreditorFinancialInstitution/ram:BICID` | nein |

### 3.3 Rechnungsempfänger (Kundenstamm)

Pfad: `AGR/ram:BuyerTradeParty`

| Kundenfeld | BT | XML-Pfad | Regel | Pflicht |
|---|---|---|---|---|
| Firmenname | BT-44 | `ram:Name` | | ja |
| Straße bzw. Postfach | BT-50 | `ram:PostalTradeAddress/ram:LineOne` | `PB 473Q` ist zulässig. Gibt es keine Straße, kommt der Adresszusatz hierher. | nein |
| Adresszusatz (z.B. „Rechnungsprüfung“) | BT-51 | `ram:PostalTradeAddress/ram:LineTwo` | nur wenn Straße vorhanden, sonst in LineOne | nein |
| PLZ | BT-53 | `ram:PostalTradeAddress/ram:PostcodeCode` | | **ja (XRechnung)** |
| Ort | BT-52 | `ram:PostalTradeAddress/ram:CityName` | | **ja (XRechnung)** |
| Land | BT-55 | `ram:PostalTradeAddress/ram:CountryID` | ISO-Code: `DE`, nicht „Deutschland“ | ja |
| **E-Mail für Rechnungen (neu)** | BT-49 | `ram:URIUniversalCommunication/ram:URIID` mit `schemeID="EM"` | | **ja (XRechnung)** |
| USt-ID | BT-48 | `ram:SpecifiedTaxRegistration/ram:ID` mit `schemeID="VA"` | normalisieren: Leerzeichen entfernen, Großbuchstaben (`DE 133 51 09 45` → `DE133510945`) | ja bei Reverse Charge |
| **Leitweg-ID (neu)** | BT-10 | siehe R1 | nur bei öffentlichen Auftraggebern | nein |

Im XML stehen die Adresselemente in der Reihenfolge `PostcodeCode, LineOne, LineTwo, CityName, CountryID` anzuordnen.

### 3.4 Positionen

Pro Position ein `POS`-Block, durchnummeriert ab 1.

| Formularfeld | BT | XML-Pfad unter `POS` | Regel | Pflicht |
|---|---|---|---|---|
| laufende Nummer | BT-126 | `ram:AssociatedDocumentLineDocument/ram:LineID` | 1, 2, 3 … | ja |
| Leistungsart (+ Thema) | BT-153 | `ram:SpecifiedTradeProduct/ram:Name` | siehe Regel R2 | ja |
| Beschreibung | BT-154 | `ram:SpecifiedTradeProduct/ram:Description` | nur wenn befüllt | nein |
| Einzelpreis | BT-146 | `ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:ChargeAmount` | netto | ja |
| Menge | BT-129 | `ram:SpecifiedLineTradeDelivery/ram:BilledQuantity` | | ja |
| Einheit | BT-130 | Attribut `unitCode` an `BilledQuantity` | Code laut Tabelle 4.1 | ja |
| Steuerart | BT-151 | `ram:SpecifiedLineTradeSettlement/ram:ApplicableTradeTax/ram:CategoryCode` | wie im Kopf (Abschnitt 3.6), dazu `ram:TypeCode` = `VAT` | ja |
| USt-Satz | BT-152 | `…/ram:ApplicableTradeTax/ram:RateApplicablePercent` | wie im Kopf | ja |
| Datum (von) | BT-134 | `ram:SpecifiedLineTradeSettlement/ram:BillingSpecifiedPeriod/ram:StartDateTime` | Format 102 | ja (Regel R3) |
| **Datum bis (neu)** | BT-135 | `…/ram:BillingSpecifiedPeriod/ram:EndDateTime` | leer bedeutet gleich „von“ | ja (Regel R3) |
| Gesamt | BT-131 | `ram:SpecifiedLineTradeSettlement/ram:SpecifiedTradeSettlementLineMonetarySummation/ram:LineTotalAmount` | Regel R5 | ja |

**R2, Positionsname:** Name und Beschreibung im XML müssen dem entsprechen, was in der Positionsspalte des PDFs steht:
- BT-153 = die erste, fett gedruckte Zeile, also die Leistungsart. Ist ein Thema gesetzt, wird es angehängt: `Leistungsart: Thema`.
- BT-154 = der Beschreibungstext.

**R3, Leistungsdatum:** Jede Position braucht ein Datum. Das Umsatzsteuerrecht verlangt den Leistungszeitpunkt.
- Das Formular bekommt ein optionales Feld „bis“ pro Position. Freitext wie `01.01.-25.08.26` entfällt.
- Ist kein „bis“ gesetzt, gilt Ende = Start.
- Ohne Datum wird die Rechnung nicht erzeugt (Abschnitt 5).

**R4, Leistungsdatum im Kopf** (abgeleitet aus den Positionen):
- Haben alle Positionen denselben einzelnen Tag, kommt dieser Tag nach `DLV/ram:ActualDeliverySupplyChainEvent/ram:OccurrenceDateTime/udt:DateTimeString` (BT-72).
- Sonst kommt der Zeitraum vom frühesten Start bis zum spätesten Ende nach `STL/ram:BillingSpecifiedPeriod` (BT-73/BT-74). Es steht dort nach `ram:ApplicableTradeTax` und vor `ram:SpecifiedTradePaymentTerms`. Das Element `DLV` bleibt in diesem Fall **leer** als `<ram:ApplicableHeaderTradeDelivery/>`, ist aber trotzdem vorhanden.

### 3.5 Zahlungsbedingungen

| Formularfeld | BT | XML-Pfad | Regel | Pflicht |
|---|---|---|---|---|
| Zahlungsziel (Tage) | BT-9 | `STL/ram:SpecifiedTradePaymentTerms/ram:DueDateDateTime/udt:DateTimeString` | Rechnungsdatum + Tage, Format 102 | ja |
| Text + Freier Text | BT-20 | `STL/ram:SpecifiedTradePaymentTerms/ram:Description` | `Der Rechnungsbetrag ist ohne Abzug zahlbar bis: TT.MM.JJJJ`. Ein freier Text wird mit Zeilenumbruch angehängt. Der Text darf **nicht mit `#` beginnen**, weil XRechnung das als Skonto-Angabe auswertet. | ja |

### 3.6 Umsatzsteuer

Das Formular kennt einen USt-Satz und das Kästchen „Reverse Charge“. Daraus folgt genau ein Steuerblock `STL/ram:ApplicableTradeTax`:

| Fall | CategoryCode (BT-118) | Satz (BT-119) | ExemptionReason (BT-120) | ExemptionReasonCode (BT-121) | Steuerbetrag (BT-117) |
|---|---|---|---|---|---|
| Reverse Charge angehakt | `AE` | `0` | `Steuerschuldnerschaft des Leistungsempfängers (reverse charge)` | `VATEX-EU-AE` | `0.00` |
| kein Reverse Charge, Satz > 0 | `S` | Satz aus dem Formular | — | — | Basis × Satz / 100, auf 2 Stellen gerundet |
| kein Reverse Charge, Satz = 0 | wird **nicht erzeugt** (Abschnitt 5), weil dafür ein Befreiungsgrund nötig wäre | | | | |

Die Kindelemente stehen in dieser Reihenfolge: `CalculatedAmount, TypeCode (VAT), ExemptionReason, BasisAmount, CategoryCode, ExemptionReasonCode, RateApplicablePercent`. Die Steuerbasis (BasisAmount) ist die Summe der Positionen.

### 3.7 Summen

Pfad: `STL/ram:SpecifiedTradeSettlementHeaderMonetarySummation`, in dieser Reihenfolge:

| Element | BT | Berechnung |
|---|---|---|
| `ram:LineTotalAmount` | BT-106 | Summe aller Positionsbeträge (BT-131) |
| `ram:TaxBasisTotalAmount` | BT-109 | = BT-106 (keine Rabatte oder Zuschläge im Programm) |
| `ram:TaxTotalAmount currencyID="EUR"` | BT-110 | = Steuerbetrag BT-117 |
| `ram:GrandTotalAmount` | BT-112 | BT-109 + BT-110 |
| `ram:DuePayableAmount` | BT-115 | = BT-112 (keine Anzahlungen) |

**R5, Rundung:** Positionsbetrag = Menge × Einzelpreis, kaufmännisch auf 2 Stellen gerundet. Alle Summen werden aus den **gerundeten** Positionsbeträgen gebildet. PDF und XML müssen dieselbe Berechnung verwenden.

## 4. Codelisten

### 4.1 Einheiten (UN/ECE Rec. 20)

Die Einheiten-Auswahl im Formular bekommt pro Eintrag einen festen Code:

| Einheit im Formular | `unitCode` |
|---|---|
| Std | `HUR` |
| Tage | `DAY` |
| Pauschale | `LS` |
| km | `KMT` |
| Stück | `C62` |
| Monat | `MON` |

Eine Einheit ohne Code verhindert die Erzeugung (Abschnitt 5). Neue Einheiten werden nur mit Code angelegt.

### 4.2 Länder

ISO 3166-1 Alpha-2 (`DE`, `BG`, `AT`, `CH` …). Der Kundenstamm speichert den Code. Im PDF wird weiter der Ländername gedruckt.

## 5. Prüfungen vor der Erzeugung (blockierend)

Der Statuswechsel auf „Abgerechnet“ wird abgelehnt, wenn eine dieser Prüfungen fehlschlägt. Die Meldung nennt das betroffene Feld.

1. Für den Kunden sind Name, PLZ, Ort, Ländercode und **Rechnungs-E-Mail** vorhanden.
2. Bei Reverse Charge ist die USt-ID des Kunden vorhanden. Normalisiert passt sie zum Muster `^[A-Z]{2}[0-9A-Z]{2,12}$`, bei `DE` genau `DE` plus 9 Ziffern.
3. Kein Reverse Charge und USt = 0 % → Abbruch, weil dieser Fall nicht unterstützt wird.
4. Jede Position hat ein Datum („von“). Ein „bis“ liegt nicht vor dem „von“.
5. Jede Position hat Menge > 0, einen Einzelpreis und eine Einheit mit Code.
6. Die Rechnungssumme ist größer als 0. Gutschriften sind nicht im Umfang.

## 6. Nötige Änderungen am Programm

| Bereich | Änderung |
|---|---|
| Kundenstamm | neue Felder **Rechnungs-E-Mail** (Pflicht) und **Leitweg-ID** (optional); Land als ISO-Code; USt-ID beim Speichern normalisieren |
| Position | neues optionales Feld **Datum bis**; Datum „von“ wird Pflicht |
| Einheiten | Code-Feld laut Tabelle 4.1 |
| Firmendaten | Fußzeilendaten zentral ablegen, sodass PDF und XML sie gemeinsam nutzen |
| Abrechnen | XML parallel zum PDF erzeugen, speichern und archivieren |
| Versand | XML und PDF als **zwei getrennte Anhänge** einer E-Mail (kein ZIP), eine Rechnung pro E-Mail |

## 7. Nicht im Umfang (Version 1)

- Gutschriften und Stornos (`TypeCode` 381 bzw. 384)
- Rabatte und Zuschläge, Anzahlungen, Skonto
- mehrere USt-Sätze auf einer Rechnung; steuerfreie Umsätze außer Reverse Charge
- Fremdwährungen
- ZUGFeRD (XML im PDF). Das ist ein späterer Schritt mit derselben XML.
- Versand an Behördenportale (ZRE/OZG-RE) bzw. Peppol

## 8. Abnahmekriterien

1. Jede erzeugte Datei wird vom **KoSIT-Validator** mit der Konfiguration für XRechnung 3.0.x als `ACCEPTABLE` bewertet und enthält **keine Warnungen**.
2. Mit den Daten von INV 747 und INV 753 entsteht inhaltlich dasselbe wie in den Referenzdateien. Ausgenommen sind die Platzhalter für BT-10 und BT-49.
3. Netto, USt und Rechnungsbetrag in XML und PDF sind identisch.
4. `&`, Umlaute und kyrillische Zeichen sind in der XML korrekt enthalten. Die Datei ist wohlgeformtes UTF-8.
5. Testfall Negativ: Bei Reverse Charge ohne Kunden-USt-ID wird die Rechnung nicht erzeugt (Prüfung 5.2). Zum Vergleich: Ohne diese Prüfung lehnt der Validator mit `BR-AE-02` ab. Das ist geprüft.

### Validator lokal ausführen

Java 11 oder neuer ist nötig.

```bash
curl -LO https://github.com/itplr-kosit/validator/releases/download/v1.6.3/validator-1.6.3-standalone.jar
```

```bash
curl -LO https://github.com/itplr-kosit/validator-configuration-xrechnung/releases/download/v2026-08-31/xrechnung-3.0.2-validator-configuration-2026-08-31.zip && unzip -o xrechnung-3.0.2-validator-configuration-2026-08-31.zip -d xr-conf
```

```bash
java -jar validator-1.6.3-standalone.jar -s xr-conf/scenarios.xml -r xr-conf -h Beispiel-XML/Rechnung-0000000753.xml
```

Der Parameter `-h` erzeugt zusätzlich einen lesbaren HTML-Prüfbericht.

## 9. Offene Entscheidungen

1. **Rechnungs-E-Mail der Kunden** (BT-49): Woher kommt sie für die bestehenden Kunden? Ohne sie gibt es keine gültige XRechnung.
2. **Ersatzwert für BT-10**, wenn keine Referenz erfasst ist: `keine Angabe` oder lieber eine Kundennummer?
3. **Thema im Positionsnamen** (R2): Wird das Thema heute im PDF gedruckt? Das XML soll dem PDF folgen.
4. **Steuerberater:** bestätigen lassen, dass für die Leistungen an deutsche Unternehmen die Steuerart `AE` und der Hinweistext richtig sind.

## Anhang: Befunde in den Beispielrechnungen

Diese Punkte würden mit den Prüfungen aus Abschnitt 5 auffallen:

- **INV 737:** Im Kommentar steht der Leistungszeitraum „1.05.26-31.07.25“, das Endjahr ist falsch. Außerdem fehlt das Positionsdatum, und der Zeitraum endet nach dem Rechnungsdatum (2.7.2026).
- **INV 742:** Die Termine stehen nur im Beschreibungstext („2.7. & 16.7.26“), ein Positionsdatum fehlt.
- **INV 745:** Die USt-ID des Kunden ist mit Leerzeichen erfasst.
- **INV 747:** Die Zeiträume sind als Freitext erfasst („01.01.-25.08.26“, „26.-28.08.26“). Sie müssen in „von/bis“ umgestellt werden.
- **Alle Rechnungen:** Die eigene Nummer `BG205889057` ist im PDF als „USt-Nr.“ beschriftet, es ist aber die USt-IdNr. Die Beschriftung sollte angepasst werden. Im XML steht sie bereits korrekt als USt-IdNr. (`schemeID="VA"`).
