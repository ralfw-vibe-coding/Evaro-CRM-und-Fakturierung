# Mapping Review: kontakte.xlsx -> contacts

Quelle: `requirements/ressourcen/odoo export 2/kontakte.xlsx`  
Ziel: Tabelle `contacts`

Hinweis: Die Tabelle hat die echten DB-Spalten `id`, `active`, `data`, `created_at`, `updated_at`. Die fachlichen Zielpfade unten liegen deshalb fast alle in `contacts.data` (JSONB).

Bitte Feedback direkt in der Spalte **Feedback / Entscheidung** eintragen.

| Excel-Spalte | Daten enthalten | Mapping-Vorschlag | Feedback / Entscheidung |
|---|---:|---|---|
| Aktivitäten | nein, 0/129 | Nicht importieren. |  |
| Bundesland | ja, 19/129 | `data.import.raw.Bundesland`, da aktuelles Kontaktmodell kein Bundesland hat. |  |
| E-Mail | ja, 112/129 | `data.channels[]` mit `type: "email"`, aber nur wenn `Normalisierte E-Mail` leer ist. |  |
| Interessen | ja, 2/129 | In `data.notes` als Zeile `Interessen: #...`; Leerzeichen innerhalb eines Interesses durch `_` ersetzen. |  |
| Land | ja, 108/129 | Kein operatives Kontaktfeld; in `data.import.raw.Land` behalten. Falls später Einzelperson ohne GP-Adresse wichtig ist, Review. |  |
| Mobil | ja, 27/129 | `data.channels[]` mit `type: "mobile"`. |  |
| Produkte | nein, 0/129 | Nicht importieren. |  |
| Stadt | ja, 115/129 | Kein operatives Kontaktfeld; in `data.import.raw.Stadt` behalten. Beziehung läuft über Geschäftspartneradresse. |  |
| Stichwörter | ja, 16/129 | In `data.notes` als Zeile `Stichwörter: ...`. |  |
| Straße | ja, 113/129 | Kein operatives Kontaktfeld; in `data.import.raw.Straße` behalten. Beziehung läuft über Geschäftspartneradresse. |  |
| Telefon | ja, 63/129 | `data.channels[]` mit `type: "phone"`. |  |
| Vollständiger Name | ja, 127/129 | Fallback zur Namensableitung; zusätzlich in `data.import.raw`. |  |
| Übergeordneter Name | ja, 114/129 | Matching-Key zum Geschäftspartner; außerdem `data.company_text`, bis Relation erzeugt ist. |  |
| Zusätzliche Infos | nein, 0/129 | Nicht importieren. |  |
| Website-Link | ja, 10/129 | Review-Feld: Wenn persönliche Website, `data.channels[]` mit `type: "website"`; sonst eher beim Geschäftspartner. In `data.import.raw` behalten. |  |
| Vorname | ja, 68/129 | `data.first_name`. |  |
| Vollständige Adresse | ja, 121/129 | Nicht operativ mappen; Original in `data.import.raw.Vollständige Adresse` behalten. |  |
| Unternehmensname | ja, 1/129 | Fallback für Matching-Key und `data.company_text`. |  |
| Telefon/Mobil | nein, 0/129 | Nicht importieren. |  |
| Rolle | ja, 40/129 | `data.role[]`. |  |
| Quelle | ja, 18/129 | In `data.notes` als Zeile `Quelle: ...`. |  |
| PLZ | ja, 114/129 | Kein operatives Kontaktfeld; in `data.import.raw.PLZ` behalten. Beziehung läuft über Geschäftspartneradresse. |  |
| Notizen | ja, 5/129 | Review-Feld: Wenn personbezogen, an `data.notes` anhängen; wenn Vereinbarung/Rechnung, eher beim Geschäftspartner. HTML bereinigen. |  |
| Notizen.1 | nein, 0/129 | Nicht importieren. |  |
| Notizen.2 | ja, 42/129 | `data.notes`, HTML bereinigen. |  |
| Normalisierte E-Mail | ja, 112/129 | Bevorzugt für `data.channels[]` mit `type: "email"`. |  |
| Newsletter | ja, 127/129 | Wenn `True`: in `data.notes` als Zeile `Newsletter: ja`; bei `False` nichts importieren. |  |
| Name des Unternehmens | ja, 115/129 | Bevorzugter Matching-Key zum Geschäftspartner; außerdem `data.company_text`, bis Relation erzeugt ist. |  |
| Name | ja, 124/129 | Fallback zur Namensableitung, wenn Vorname/Nachname fehlen. |  |
| Nachname | ja, 68/129 | `data.last_name`. |  |
| Ländercode | ja, 108/129 | Kein operatives Kontaktfeld; in `data.import.raw.Ländercode` behalten. |  |
| Ist ein Unternehmen | ja, 127/129 | Steuert Importentscheidung; sollte bei Kontakten `False` sein. In `data.import.raw` behalten. |  |
| Empfehlung von | ja, 10/129 | In `data.notes` als Zeile `Empfehlung von: ...`. |  |
| Du/Sie | nein, 0/129 | Nicht importieren. |  |
| Anzeigename | ja, 127/129 | Fallback zur Namensableitung; zusätzlich in `data.import.raw`. |  |
| Ansprache | ja, 64/129 | Ableitung für `data.gender` und `data.salutation`, soweit eindeutig; Original in `data.import.raw`. |  |

## Offene Importentscheidungen

- Sollen Kontakt-Adressfelder grundsätzlich nur im Rohdatenblock bleiben, weil Adressen zum Geschäftspartner gehören?
- Sollen Kontakte ohne Firmenbezug ohne Relation importiert werden, oder sollen bei Selbständigen/Freiberuflern gleichnamige Geschäftspartner erzeugt werden?
- Soll `Website-Link` beim Kontakt oder beim Geschäftspartner landen, wenn beides möglich ist?
- Soll `Notizen` bei Kontakten zeilenweise geprüft werden, weil dort teils Rechnung/Vereinbarung und teils Personenhinweise stehen?
- Soll `Ansprache` automatisch `gender` und `salutation` setzen, oder nur als Rohwert behalten werden?
