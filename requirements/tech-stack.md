# Tech Stack für Evaro CRM & Fakturierung

- Plattform: node.js mit Typescript
- Frontend: React, Vite, Shadcn/ui und Lucide Icons
- Backend: serverless functions; Persistenz mit Postgres
- Deployment: Netlify, Neon.tech für Postgres

## User Interface

Modern, schlicht, Buttons wenn möglich mit Ludice Icons.

Die Basis soll ein Grid-Layout sein, um die Positionierung aller UI-Elemente präzise steuern zu können.

Destruktive Operationen sollen vor Ausführung immer bestätigt werden. Beispiel: Zum Löschen eines Kontakts wird ein Trash Can Button geklickt. Der wird daraufhin zu einem "?", um durch erneutes Klicken die Lösung zu bestätigen. Ein Klick neben den Button setzt/woanders hin setzt den Button zurück auf Trash Can Icon.

## Authentifizierung

User melden sich mit ihrer Email an und bekommen ein OTP zugeschickt. Dann wird ein JWT generiert, das 1 Woche gilt.
Statt dem OTP kann auch ein geheimes Passwort angegeben werden, dass der App über .env/AUTH_SECRET_OTP bekannt ist.

Das Backend akzeptiert Clients, die authentifiziert sind oder einen API-Key vorzeigen.

## Automatisierte Tests und Testabdeckung

Siehe das Architekturdokument [DAO Architecture](architektur.md) für Begriffe, die im Folgenden relevant sind:

- Tests sind auf jeden Fall zu schreiben für RPUs und Reactors; Testabdeckung 80%
- Tests sind wenn möglich auch zu schreiben für xProvider und pProvider; da es hier um Ressourcenzugriffe geht, müssen die Tests jedoch nicht immer wieder ausgeführt werden, wenn es keine Veränderungen an den Modulen gegeben hat
- pProvider sollten für Tests von RPUs in einer leichtgewichtigen Variante vorliegen (zb in-memory Implementation bzw. Mock/Fake/Stub)
- xProvider sollten für Tests von Reactors auch in einer leichtgewichtigen Variante vorliegen (Mock/Fake/Stub)

