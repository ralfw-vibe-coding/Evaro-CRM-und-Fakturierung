# Fakturierung

Rechnungen werden nur an Geschäftspartner geschrieben.

Der Geschäftspartner, an den eine Rechnung geschrieben wird, muss schon vorhanden sein. Auf einer neuen Rechnung wird er nur ausgewählt.

Der Fakturierungsbereich besteht auch aus 3 Spalten:

- Filter: so schmal wie beim CRM. Zunächst gibt es nur einen Suchbegriff, der nach Rechnungsnummern und gp-Namen filtert.
- Übersicht: die übersicht zeigt für jede rechnung die rechnungsnummer (klein), den gp namen, den rechnungsbetrag, das rechnungsdatum (klein). außerdem hat jede rechnung noch einen modus: Entwurf, Abgerechnet, Bezahlt; der kann als kleiner chip angezeigt werdn. die übersicht ist eine schlichte tabelle und schmal.
- Details: die details sind breit. struktur siehe unten.

beim anlegen einer rechnung muss ein geschäftspartner ausgewählt werden. dazu gibt es ein dropbox mit suchfunktion. erst nach auswahl wird die rg angelegt und die details gezeigt.

## Details einer Rechnung

nach anlegen einer rechnung ist der modus erstmal "entwurf". es ist noch keine rechnungsnummer zugewiesen.

### Rechnungskopf

- die rechnungsnummer (sobald vorhanden)
- das rechnungsdatum (sobald vorhanden)

- gp mit seiner adresse (nicht veränderbar)
- gp ust-id (nicht veränderbar)
- erste gp email

- ein feld für eine referenz (zb bestellnr)
- ein kommentarfeld (einzeilig)

### Rechnungspositionen

Rechnungspositionen bestehen aus diesen Angaben:

- Leistungsdatum (optional)
- Produktform (das ist ein tag, das gespeichert werden soll), zb Vortrag, Seminar
- Produktthema (das ist auch ein tag), zb Zeitmanagement, Office 365
- Menge (default: 1)
- Mengeneinheit (das ist auch ein tag) (default: leer)
- Einzelpreis (default: 0)
- Der gesamtpreis wird kalkuliert
- außerdem kann noch ein freitext eingegeben werden

Soviele angaben wie möglich sollen in einer zeile nebeneinander stehen.
der freitext kann in einer nächsten zeile stehen. allerdings sollte er mit produktkategorie und produktbezeichnung gruppiert sein.

### Rechnungsfuß

#### Summenblock

- Summe der Nettopreise
- Summen je Umsatzsteuersatz: Umsatzsteuersatz, Umsatzsteuerbetrag
- Rechnungsbetrag als Summe dieser Summen

Alle Angaben in Euro.

#### Zahlungsbedingungen

Die Zahlungsbedingungen sollen ad hoc eingegeben werden können. Aber man soll sie auch speichern und dann aus einer liste auswählen können. Das soll elegant möglich sein.

Zahlungsbedingungen können ein absolutes Zahlungsziel enthalten, zb "Zahlbar bis zum 12.7.2026", das aber relativ zum Rechnungsdatum ist, zb Rechnungsdatum + 10 tage. dafür wäre es gut, wenn zahlungsbedingungen eine formel enthalten könnten, zb `{rgdatum}` oder `{rgdatum + 10}`. für das rechnungsdatum sollten mehrere platzhalter erkannt werden, zb "rgdatum", "rechnungsdatum", "rgd", "invdate".

unterhalb des eingabefeldes für die zahlungsbedingungen sollten sie dann "berechnet" angezeigt werden, so wie sie später auf der rechnung erscheinen.




