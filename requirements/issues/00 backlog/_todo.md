- rechnung umschalten auf "abgerechnet". rechnungsnummer zuweisen. das ist eine 10stellige zahl mit führenden nullen. sie wird durch inkrementieren der letzten schon vergebenen rechnungsnummer generiert.

in .env kann auch eine FIRST_INVOICE_NUMBER stehen. wenn diese zahl größer ist als die bisher größte rechnungsnummer, dann wird sie die rechnungsnummer einer neuen rechnung. ansonsten wird es die bisher größte rechnungsnummer + 1.
das ist eine maßnahme, um die fakturierung für den realen betrieb zu starten, in dem es schon rechnungsnummern gibt.

bei umschalten des modus wird auch das rechnungsdatum gesetzt auf das aktuelle datum.


- die umsatzsteuer wird wie folgt festgelegt:

1. wenn der rechnungsempfänger im land Bulgarien/Bulgaria ist, dann ist der ust-satz 20%.
2. wenn der rechnungsempfänger in deutschland oder österreich ist, dann wird es schwieriger:
2.1. wenn er eine USt-ID hat, dann wird 0% angesetzt und es muss dieser zusatz unter dem rechnungsbetrag stehen: "Steuerschuldnerschaft des Leistungsempfängers (reverse charge)".
2.2. wenn er keine Ust-id hat, dann werden 19% (deutschland) und 20% (österreich) angesetzt
3. bei anderen angaben für das land ist die umsatzsteuer 0%. aber es gibt keinen "reverse charge" zusatz.

die umsatzsteuer muss für die rechnung änderbar sein.

die erkennung des landes soll möglichst flexibel sein. am besten findet bei der erfassung der gp eine landesauswahl aus einer liste statt. in der stehen schon in dieser reihenfolge: Deutschland, Österreich, Bulgarien. das sind fixe tags. andere können hinzugefügt werden als tags (wie bei kanälen).


