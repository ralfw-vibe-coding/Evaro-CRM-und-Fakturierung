# Architektur der App

Die App ist nicht rein SPA, weil sie ein Backend hat. Das Backend macht die Anbindung von Services über API-Keys leichter. Das Frontend muss nur beim Backend mit einem Token authentifiziert sein.

Dennoch soll möglichst viel Funktionalität der App im Frontend hergestellt werden. Das Backend ist vor allem ein großer Wrapper für Ressourcen, auf die ein direkter Zugriff aus dem Frontend unsicher wäre.

Allerdings soll das Backend bei den persistenten Daten auch gelegentlich eine Vorauswahl treffen (Selektion). Außerdem kann das Backend finale Validationen durchführen bei Veränderungen, Datenkonsistenz garantieren (optimistic locking, merge von JSON Strukturen) und Projektionen/Read Models pflegen.

Das Backend stellt für seine Leistungen einen API zur Verfügung, der auch von anderen Apps genutzt werden kann. Das Frontend dieser App ist nur ein möglichstes und nutzt also auch den API.

Frontend und Backend sind getrennte Prozesse aka Services. Sie folgen derselben grundlegenden Struktur.

Diese Struktur heißt "DAO Architecture": Domain As Object Architecture. In ihr bildet die Domain ein großes, zustandsbehaftetes Objekt, mit dem nur über Nachrichten kommuniziert werden kann.

## Architektur der Services

Jeder Service besteht aus einem Kern und Schalen.

### Der Kern, die Domäne

Die Domäne ist das Herz jedes Service. Nur in der Domäne ist die Logik zu finden, die den Schwerpunkt eines Service ausmacht. Dort werden die Domänenregeln durchgesetzt, dort werden Domänenentscheidungen getroffen. Beides ist unabhängig von Technologien wie HTML DOM oder HTTT Fetch.

#### Domain Data: Domain Provider (pProvider)

Zweck der Domäne ist die Verwaltung des Servicezustands. Der Servicezustand kann in-memory oder persistent sein. Der Zustand wird gehalten in pProvidern, die die Technologie kapseln, mit der Zustand gehalten wird. In einem Backend-Service ist das sehr wahrscheinlich eine Datenbank.

pProvider machen den Rest der Domäne unabhängig von den konkreten Zustandshaltungstechnologien, zb Datenbank, Dateisystem. Sie stellen für diese Medien ein Interface zur Verfügung, hinter dem Implementationen ausgetauscht werden können. Das Interface ist allerdings eine Abstraktion dessen, was die zugrundeliegende Technologie bietet. Das Interface soll es der darum herum liegenden Schale leicht machen, auf das jeweilige Medium zuzugreifen.

#### Domain Logic: Request Processing Unit (RPU)

Um die pProvider herum liegt eine Schalde von RPUs. Jede RPU implementiert die Verarbeitung eines Request. Requests sind entweder Commands oder Queries im Sinne des Command Query Separation Prinzips (CQS).

RPUs enthalten die Domänenlogik. Sie implementieren die Fähigkeiten (Capabilities) eines Service. Sie sind verantwortlich für die Verwaltung und Transformation des Service-Zustands.

Untereinander sind RPUs völlig unabhängig. Sie kennen einander nicht. In Summe bilden sie eine lückenlose Schale um die pProvider. RPUs sind abhängig von pProvidern; nur RPUs kennen pProvider. Keine anderen Module dürfen pProvider nutzen.

Das widerspricht üblichen Architekturmustern wie Hexagonal Architecture oder Clean Architecture. Aber das ist total wichtig! Es ist unbedingt zu beachten, dass die Domäne ganz bewusst abhängig ist von pProvidern. Sie darf aber auch nur von pProvidern abhängig sein. Andere Provider (s.u.) kennt sie nicht.

Nur auf diese Weise kann die Domäne ihren Job machen: die Verwaltung des Zustands und Kontrolle über den Zustand eines Service ausüben. In der Domäne sind dazu alle Regeln konzentriert. Sie muss dafür nicht wissen, ob sie in einem Frontend oder Backend Service läuft oder ob es sich um eine CLI oder Web App handelt. Allein die Domänenlogik und der Domänenzustand zählen.

### Äußere Schale, Peripherie, Shell

#### External Provider (xProvider)

xProvider kapseln den Zugriff auf Ressourcen. Das könnten Datenbanken, Dateisystem, Uhrzeit, Zufallszahlen und andere Services sein. Beispiele. Im Backend wird der Zugriff auf OpenAI durch einen xProvider gekapsel. Im Frontend wird der Zugriff auf das Backend durch einen xProvider gekapselt (Proxy).

#### Portal

Portale kapseln die Kommunikation von Clients mit einem Service; sie bilden sein Interface nach außen. Clients sind User (Menschen) oder andere Services. Portale implementieren also User Interfaces oder HTTP/REST Interfaces. Nur Portale dürfen abhängig sein von Interface-Technologien wie HTML, React oder HTTP Router.

Wichtig: In den Modulen der Shell darf NIEMALS Domänenlogik stehen.

Clients interagieren mit Portalen. Portale werden durch Clients getriggert und sorgen dafür, dass ein Client-Request im Inneren des Service verarbeitet wird zu einem Response an den Client.

### Mittlere Schale, Workflows

Zwischen äußerer Schale bestehend aus Portalen und xProvidern und Kern bestehend aus RPUs und pProvidern sitzt eine mittlere Schale. Sie dient der Orchestrierung von RPUs und xProvidern.

#### Reactor

Portale werden durch Clients getriggert. Sie empfangen Client Requests, die im inneren erfüllt werden müssen. Manchmal kann das eine einzelne RPU erledigen. Dann ruft das Portal die RPU und überlässt ihr die Arbeit. Das Ergebnis der RPU wird am Ende passend für den Client aufbereitet und zurückgegeben.

In vielen Fällen braucht die Verarbeitung eines Client Request jedoch das Zusammenspiel mehrerer RPUs oder auch die Einbeziehung von xProvidern. Dann dürfen Portale nicht versuchen, auch noch diese Orchestrierung zu übernehmen. Portale dürfen nur einen Aufruf machen, um einen Client Request im inneren des Service verarbeitet zu bekommen. Dieser eine Aufruf kann an eine RPU gehen oder an einen Reactor.

Ein Reactor ist die Instanz, die mehrere RPUs und/oder xProvider integriert, damit sie im Verein einen Client Request verarbeiten. Ihre einzige Aufgabe ist die Orchestrierung. Sie selbst enthalten auch keine Domänenlogik. Sie entscheiden höchstens über den Fluss der Verarbeitung im Rahmen ihrer Koordinationsaufgabe.

Reactors implementieren Workflows. Das sind Datenflüsse, die RPUs und xProvider verbinden. Reactors sind deshalb von Natur aus sehr schlank.

## Minimale Repo-Struktur

Folgend die Struktur für die Quellcode-Module in Bezug auf die DAO Architecture. Weitere Module können natürlich dazu kommen und müssen passend platziert werden. Frameworks wie React haben eigene Strukturierungsideen, die auch berücksichtigt werden wollen.

```
service A/
  shell/
    portals/
      XYZ/
        ...
    xproviders/
      XYZ/
        __tests/
        ...
  reactors/
    XYZ/
      __tests/
      ...
  domain/
    rpus/
      XYZ/
        __tests/
        ...
    pproviders/
      XYZ/
        __tests/
        ...
```

Reactors und RPUs haben jeweils nur 1 Funktion, die ihre Leistung repräsentiert: process(request):response. Requests fließen in die Funktion hinein, Responses kommen zurück.

Jeder Reactor und jede RPU stehen für einen Request (Command oder Query), zu dem ein passender Response geliefert wird. Bei Queries ist das das Query Result. Bei Commands ist es ein Status: hat das Command geklappt, wenn nicht, eine Fehlermeldung; evtl. noch ein paar Metadaten, zb die ID eines neuen Datensatzes oder die Anzahl der gelöschten Datensätze.

xProvider, pProvider und Portale haben breitere Schnittstellen, die ihre Leistungen zugänglich machen für die Module, die von ihnen abhängen.