# Mapping Review: unternehmen.xlsx -> business_partners

Quelle: `requirements/ressourcen/odoo export 2/unternehmen.xlsx`  
Ziel: Tabelle `business_partners`

Hinweis: Die Tabelle hat die echten DB-Spalten `id`, `types`, `data`, `created_at`, `updated_at`. Die fachlichen Zielpfade unten liegen deshalb fast alle in `business_partners.data` (JSONB).

Bitte Feedback direkt in der Spalte **Feedback / Entscheidung** eintragen.

| Excel-Spalte | Daten enthalten | Mapping-Vorschlag | Feedback / Entscheidung |
|---|---:|---|---|
| Aktivitäten | nein, 0/116 | Nicht importieren. |  |
| Bundesland | ja, 20/116 | `data.import.raw.Bundesland`, da aktuelles Adressmodell kein Bundesland hat. |  |
| E-Mail | ja, 36/116 | `data.channels[]` mit `type: "email"`, aber nur wenn `Normalisierte E-Mail` leer ist. |  |
| Interessen | ja, 16/116 | `data.tags[]`. |  |
| Land | ja, 85/116 | `data.address.country`, falls `Ländercode` leer ist. |  |
| Mobil | ja, 5/116 | `data.channels[]` mit `type: "mobile"`. |  |
| Produkte | ja, 11/116 | `data.tags[]`, mit Präfix `Produkt: ...`. |  |
| Stadt | ja, 89/116 | `data.address.city`. |  |
| Stichwörter | ja, 62/116 | `data.tags[]`. |  |
| Straße | ja, 88/116 | `data.address.street`. |  |
| Telefon | ja, 47/116 | `data.channels[]` mit `type: "phone"`. |  |
| USt-IdNr. | ja, 68/116 | `data.vat_id`. |  |
| Vollständiger Name | ja, 99/116 | Fallback für `data.name`; zusätzlich in `data.import.raw`. |  |
| Übergeordneter Name | ja, 1/116 | Review-Feld; nicht direkt operativ mappen. In `data.import.raw` behalten. |  |
| Zusätzliche Infos | nein, 0/116 | Nicht importieren. |  |
| Website-Link | ja, 66/116 | `data.channels[]` mit `type: "website"`. |  |
| Vorname | ja, 2/116 | Review-Feld; gehört fachlich nicht zu `business_partners`. In `data.import.raw` behalten. |  |
| Vollständige Adresse | ja, 99/116 | Operative Adresse aus Einzelspalten; Original in `data.import.raw.Vollständige Adresse` behalten. |  |
| Unternehmensname | nein, 0/116 | Nicht importieren. |  |
| Telefon/Mobil | nein, 0/116 | Nicht importieren. |  |
| Rolle | nein, 0/116 | Nicht importieren. |  |
| Quelle | ja, 52/116 | `data.tags[]`, mit Präfix `Quelle: ...`. |  |
| PLZ | ja, 88/116 | `data.address.zip`. |  |
| Notizen | ja, 28/116 | `data.memo`, weil hier eher Vereinbarungen/Preise/Rechnungshinweise stehen. HTML bereinigen. |  |
| Notizen.1 | nein, 0/116 | Nicht importieren. |  |
| Notizen.2 | ja, 49/116 | `data.notes`, weil hier eher Verlauf/Gesprächsnotizen stehen. HTML bereinigen. |  |
| Normalisierte E-Mail | ja, 36/116 | Bevorzugt für `data.channels[]` mit `type: "email"`. |  |
| Newsletter | ja, 99/116 | Wenn `True`: `data.tags[]` enthält `newsletter`. Bei `False` nichts importieren. |  |
| Name des Unternehmens | ja, 99/116 | Bevorzugt für `data.name`. |  |
| Name | ja, 99/116 | Fallback für `data.name`. |  |
| Nachname | ja, 2/116 | Review-Feld; gehört fachlich nicht zu `business_partners`. In `data.import.raw` behalten. |  |
| Ländercode | ja, 85/116 | Bevorzugt für `data.address.country`. |  |
| Ist ein Unternehmen | ja, 99/116 | Steuert Importentscheidung; nicht als Fachfeld nötig. In `data.import.raw` behalten. |  |
| Empfehlung von | ja, 27/116 | `data.tags[]`, mit Präfix `Empfehlung von: ...`. |  |
| Du/Sie | nein, 0/116 | Nicht importieren. |  |
| Anzeigename | ja, 99/116 | Fallback für `data.name`; zusätzlich in `data.import.raw`. |  |
| Ansprache | ja, 2/116 | Review-Feld; gehört fachlich nicht zu `business_partners`. In `data.import.raw` behalten. |  |

## Offene Importentscheidungen

- Sollen nicht-operative, aber gefüllte Felder grundsätzlich unter `data.import.raw` behalten werden?
- Sollen leere Spalten komplett ignoriert werden oder ebenfalls im Rohdatenblock auftauchen?
- Soll `types` für alle importierten Unternehmen `["customer"]` sein, oder zunächst leer bleiben?
- Sollen personartige Unternehmenszeilen wie `Michael Görg-Christiansen` als Geschäftspartner, Kontakt oder beides importiert werden?
- Sollen doppelte Unternehmenszeilen vor dem Import zusammengeführt werden?
