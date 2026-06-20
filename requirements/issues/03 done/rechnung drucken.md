Eine Rechnung kann in jedem Status gedruckt werden.
Wenn noch keine Rechnungsnr vorhanden ist, dann für Rgnr 0000000000 einsetzen und für das rgdatum "DD.MM.YYYY".

die angaben, die auf einer rechnung stehen müssen:

- alles, was in der rechnung erfasst ist: header, positionen, footer; das richtet sich an den rechnungsempfänger.
- der rechnungssteller muss aber identifiziert werden. am besten geschieht das durch app settings. die könnten über das profi menü aufgerufen werden.

## App Settings für die Fakturierung

- firmenname des rechnungsstellers. hier separat, um ggf. auf der rechnung irgendwo herausgehoben zu werden.
- anschrift des rechnungsstellers; der firmenname wird autom. davor gesetzt beim druck. das kann 1 textfeld sein.
- bankverbindung als 1 textfeld
- vat-nr
- kontaktdaten: ansprechpartner, email, telefon, website als separate felder

diese angaben müssen auf der rechnung platziert werden im kopf bzw. footer der seite.

## Rechnung drucken

der rechnungsdruck wird über ein icon ausgelöst vor dem speichern-icon der rechnung. es kann immer gedruckt werden, sobald min. 1 position eingetragen wurde.

die beschriftungen auf der rechnung sind alle auf englisch.

eine rechnung wird so generiert, dass daraus ein A4 PDF gedruckt werden kann mit ordentlichem seitenumbruch.
die rechnung wird in der app angezeigt und dann kann man sie nach PDF drucken. eine PDF generierung in der app ist erstmal nicht nötig, wenn react komponenten der layout ordentlich machen.