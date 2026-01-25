# AYTO Solver - Are You The One? VIP Staffel 5

Eine mobile-first Web-App zur **exakten Berechnung** von Paar-Wahrscheinlichkeiten fuer "Are You The One?" mittels Constraint-Solver.

## Features

- **Exakter Constraint-Solver**: Berechnet alle gueltigen Perfect Matchings und daraus exakte Paar-Wahrscheinlichkeiten
- **Mobile-First Design**: Optimiert fuer Smartphones, funktioniert auf iOS Safari
- **Offline-faehig**: Funktioniert ohne Internetverbindung (PWA)
- **Preisgeld-Tracker**: Verfolge Abzuege durch Strafen und Matchbox-Verkaeufe (Start: 200.000 EUR)
- **Matchbox/Truth Booth**: Perfect Match, Kein Match, oder Verkauft (mit Preisgeld-Abzug)
- **Matching Nights**: Paarungen je Episode + Anzahl Lichter als Constraint
- **Import/Export**: Sichere deinen Spielstand als JSON-Datei
- **Automatische Persistenz**: Alle Daten werden in localStorage gespeichert

## Schnellstart

### Option 1: Lokal ohne Server (Desktop)

1. Lade die Dateien herunter oder klone das Repository
2. Oeffne `index.html` direkt im Browser (Chrome, Firefox, Edge)

**Hinweis**: Bei `file://` funktioniert der Service Worker nicht, aber die App selbst funktioniert problemlos.

### Option 2: Lokaler Server (empfohlen)

```bash
# Mit Python 3
cd AYTO-Generator
python3 -m http.server 8000

# Oder mit Node.js (npx)
npx serve .
```

Dann oeffne `http://localhost:8000` im Browser.

### Option 3: iOS Safari

**Wichtig fuer iOS**: Die Dateien muessen ueber einen Webserver ausgeliefert werden, nicht direkt aus der Dateien-App geoeffnet werden.

Optionen:
1. **Hosting nutzen** (siehe unten)
2. **Lokaler Server** + iPhone im gleichen WLAN: `http://[deine-ip]:8000`
3. **AirDrop + Safari**: Datei an Mac senden, dort lokalen Server starten

### Option 4: Hosting (Netlify Drop)

1. Gehe zu [app.netlify.com/drop](https://app.netlify.com/drop)
2. Ziehe den kompletten `AYTO-Generator` Ordner in das Upload-Feld
3. Warte auf Deployment (ca. 30 Sekunden)
4. Erhalte eine URL wie `https://random-name.netlify.app`
5. Oeffne die URL auf deinem iPhone

Die Seite ist dann weltweit erreichbar und funktioniert offline nach dem ersten Laden.

## Benutzung

### Teilnehmer verwalten

Die Standardteilnehmer der VIP Staffel 5 sind voreingestellt:
- 11 Maenner (inkl. inaktiv: Jimi Blue)
- 10 Frauen

Unter "Teilnehmer" kannst du Namen bearbeiten oder Nachzuegler aktivieren.

### Matchbox hinzufuegen

1. Waehle Mann und Frau
2. Waehle Ergebnis:
   - **Perfect Match**: Hartes Constraint - dieses Paar MUSS zusammen sein
   - **Kein Match**: Hartes Constraint - dieses Paar kann NICHT zusammen sein
   - **Verkauft**: Preisgeld-Abzug, kein hartes Constraint
3. Gib die Episode ein
4. Klicke "+ Matchbox"

### Matching Night hinzufuegen

1. Klicke "+ Neue Matching Night"
2. Waehle fuer jedes Paar Mann und Frau
3. Gib die Anzahl Lichter (Scheinwerfer) ein
4. Die Night wird als Constraint genutzt wenn sie eine vollstaendige Bijektion ist

**Warnung**: Unvollstaendige Nights (nicht alle Teilnehmer zugeordnet) werden in Orange markiert und nicht als Constraint genutzt.

### Wahrscheinlichkeiten berechnen

1. Klicke "Wahrscheinlichkeiten berechnen"
2. Der Solver findet alle gueltigen Loesungen
3. Ergebnis:
   - Anzahl moeglicher Loesungen
   - Laufzeit
   - Sortierte Liste der Paar-Wahrscheinlichkeiten

### Import/Export

- **Export**: Laedt eine JSON-Datei mit allen Daten herunter
- **Import**: Laedt eine vorher exportierte JSON-Datei

## Technische Details

### Solver-Algorithmus

Der Solver verwendet Backtracking mit folgenden Optimierungen:

1. **Domain-Reduktion**: Perfect Matches reduzieren Domains auf 1, No Matches entfernen Optionen
2. **MRV-Heuristik**: Maenner werden nach Domain-Groesse sortiert (kleinste zuerst)
3. **Forward Checking**: Ungueltige Zuweisungen werden frueh erkannt
4. **Night-Pruning**: Fuer jede Matching Night:
   - Pruning wenn `aktuelleMatches > lights`
   - Pruning wenn `maxMoeglicheMatches < lights`

### Zeitlimit

Bei zu vielen Kombinationen (> 5 Sekunden) bricht der Solver ab und zeigt eine Warnung. In diesem Fall: Mehr Constraints hinzufuegen (Matchbox-Ergebnisse, mehr Nights).

### Datenmodell

```javascript
{
  candidates: {
    males: ["Name1", "Name2", ...],
    females: ["Name1", "Name2", ...],
    inactive: [{name: "Name", gender: "male"|"female"}]
  },
  truthBooth: [{
    id, episode, male, female,
    result: "perfect"|"no"|"sold",
    soldAmount?
  }],
  matchingNights: [{
    id, episode,
    pairs: [{male, female}],
    lights: number
  }],
  deductions: [{id, amount, reason}]
}
```

## Browser-Kompatibilitaet

- Chrome/Edge: Vollstaendig unterstuetzt
- Firefox: Vollstaendig unterstuetzt
- Safari (macOS): Vollstaendig unterstuetzt
- Safari (iOS): Vollstaendig unterstuetzt (ueber HTTPS oder localhost)
- Safari (iOS, file://): Nicht unterstuetzt - Webserver erforderlich

## Fehlerbehebung

### Weisse Seite auf iOS

- Stelle sicher, dass die App ueber einen Webserver geladen wird, nicht direkt aus Dateien
- Pruefe die Browser-Konsole auf Fehler

### Solver findet keine Loesung

- Widerspruchliche Constraints pruefen
- Pruefe ob Anzahl Maenner == Anzahl Frauen

### Solver timeout

- Mehr Constraints hinzufuegen (Matchbox-Ergebnisse)
- Matching Nights mit weniger Lichtern bevorzugen (mehr Pruning)

## Lizenz

MIT License - Frei verwendbar.

## Entwicklung

Kein Build-Prozess erforderlich. Alle Dateien sind Vanilla HTML/CSS/JS.

```
AYTO-Generator/
  index.html    - Hauptseite
  styles.css    - Mobile-First Styling
  app.js        - Gesamte App-Logik inkl. Solver
  manifest.json - PWA Manifest
  sw.js         - Service Worker fuer Offline
  README.md     - Diese Datei
```
