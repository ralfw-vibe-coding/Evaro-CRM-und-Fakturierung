- rechnung umschalten auf "abgerechnet". rechnungsnummer zuweisen. das ist eine 10stellige zahl mit führenden nullen. sie wird durch inkrementieren der letzten schon vergebenen rechnungsnummer generiert.

in .env kann auch eine FIRST_INVOICE_NUMBER stehen. wenn diese zahl größer ist als die bisher größte rechnungsnummer, dann wird sie die rechnungsnummer einer neuen rechnung. ansonsten wird es die bisher größte rechnungsnummer + 1.
das ist eine maßnahme, um die fakturierung für den realen betrieb zu starten, in dem es schon rechnungsnummern gibt.

bei umschalten des modus wird auch das rechnungsdatum gesetzt auf das aktuelle datum.


- rechnungsentwürfe löschen können


- in obsidian ein board für evaro anlegen



