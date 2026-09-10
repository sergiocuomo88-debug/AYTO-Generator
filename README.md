# 🔥 AYTO Match Calculator

**Professional "Are You The One?" Matching Engine & Statistics Tool**

Eine hochmoderne Webanwendung zur genauen Berechnung von Match-Wahrscheinlichkeiten basierend auf Matching Night Ergebnissen, Matschbox-Abstimmungen und verkauften Matches.

## 🎯 Features

### 📊 Intelligente Match-Berechnung
- **Wahrscheinlichkeits-Matrix**: Zeigt für jedes potenzielle Pärchen die Match-Wahrscheinlichkeit in Prozent
- **Multi-Faktor-Algorithmus**: Kombiniert Evidenz aus mehreren Quellen:
  - Matching Night Lichter (Sichtungsergebnisse)
  - Matschbox-Abstimmungen (Community-Votes)
  - Verkaufte Matches (Definitive Aussagen)

### 🎮 Vollständiges Management-System
- **Kandidaten-Verwaltung**: Männer & Frauen hinzufügen/löschen
- **Matching Nights**: Pro Night eingeben, welche Pärchen nebeneinander saßen und wie viele Lichter an waren
- **Matschbox**: Abstimmungen protokollieren (Ja/Nein für jedes Pärchen)
- **Verkaufte Matches**: Definitive Matches speichern (z.B. Gewinner oder enthüllte Matches)

### 📈 Real-Time Statistiken
- Live-Übersicht aller Kandidaten
- Match-Fortschritt Tracking
- Automatische Berechnung der Wahrscheinlichkeitsmatrix

### 💾 Persistente Speicherung
- Alle Daten werden lokal im Browser gespeichert (LocalStorage)
- Keine Server-Abhängigkeit
- Daten bleiben über Sessions erhalten

### 🎨 Professionelles Design
- Modernes, dunkles UI mit AYTO-Branding (Rot & Pink)
- Responsive Design für Desktop & Mobile
- Intuitive Tabs & Navigation

## 🚀 Quick Start

1. **Öffne** `index.html` im Browser
2. **Füge Kandidaten ein** (Männer & Frauen)
3. **Registriere Matching Nights** (wer saß nebeneinander, wie viele Lichter)
4. **Füge Matschbox-Abstimmungen ein** (optional)
5. **Trage verkaufte Matches ein** (optional)
6. **Schaue** die Match-Wahrscheinlichkeits-Matrix an!

## 📐 Matching-Algorithmus

Die Match-Wahrscheinlichkeit wird wie folgt berechnet:

```
Basis-Wahrscheinlichkeit: 50%

+ Für jede Matching Night, in der ein Pärchen nebeneinander saß: +25%
+ Wenn Matschbox für ein Match abstimmte: +20%
- Wenn Matschbox gegen ein Match abstimmte: -30%
= 100% wenn es ein "verkauftes" Match ist (definitive Aussage)
```

Das Ergebnis wird normalisiert (0-100%).

### Beispiel:
- Anna & Marco haben in Night 1 Licht bekommen (+25%)
- Sie hatten in Night 2 auch Licht (+25%)
- Matschbox stimmte mit JA ab (+20%)
- **Wahrscheinlichkeit: 50% + 25% + 25% + 20% = 120% → normalisiert zu 100%**

## 🎯 Interpretation der Ergebnisse

- **🟢 70-100%**: Sehr hohe Wahrscheinlichkeit - wahrscheinlich ein echtes Match!
- **🟡 40-69%**: Mittlere Wahrscheinlichkeit - könnte sein
- **🔴 0-39%**: Niedrige Wahrscheinlichkeit - wahrscheinlich kein Match

## 📱 Browser-Kompatibilität

- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile Browser

## 💡 Tipps für beste Ergebnisse

1. **Genaue Dateneingabe**: Stelle sicher, dass du alle Matching Nights korrekt eingibst
2. **Matschbox-Abstimmungen**: Je mehr Abstimmungen, desto präziser die Berechnung
3. **Verkaufte Matches**: Verwende diese nur für definitiv bestätigte Matches
4. **Regelmäßige Updates**: Aktualisiere die Daten nach jeder neuen Matching Night

## 🔐 Datenschutz

- **Alle Daten sind lokal**: Nichts wird an externe Server gesendet
- **Keine Cookies**: Nur Browser LocalStorage
- **Jederzeit löschbar**: Entferne alle Daten über Browser-Einstellungen

## 🎬 AYTO Referenz

Diese App basiert auf der TV-Show "Are You The One?" - einem Format, bei dem Paare versuchen herauszufinden, ob sie ein mathematisches Match sind:

- **Matching Night**: Nacht, in der Paare nebeneinander sitzen. Lichter zeigen an, wie viele echte Matches nebeneinander sitzen
- **Matschbox**: Community-Abstimmung über potenzielle Pärchen
- **Verkauft**: Ein Paar, das offiziell bestätigt wurde (oft durch Preisgeld oder Enthüllung)

## 📊 Made with ❤️

Eine professionelle Matching-Engine für AYTO-Fans!
