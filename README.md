# Mauerbrecher

Ein Einzelspieler-Spiel für [Gamehearth](https://github.com/weilers-git/gamehearth), die selbst gehostete Spieleplattform. Man spielt allein am Handy (hochkant) oder am Rechner, auch ohne Verbindung zum Server; Spielstand und Bestleistung hebt die Plattform auf.

## Regeln

### Ziel

Unten steht ein Schläger, oben eine Mauer aus Steinen. Ein Ball prallt vom Schläger ab und zerschlägt die Steine. Sind alle Steine weg, die kaputtgehen können, ist das Level geschafft. Es gibt 10 Level; wer Level 10 schafft, hat gewonnen.

### Steuerung

| Was | Am Handy | Mit der Tastatur |
|---|---|---|
| Schläger bewegen | den Finger irgendwo auf das Spielfeld legen und nach links oder rechts ziehen; der Schläger macht dieselbe Bewegung mit | Pfeiltasten links und rechts (oder A und D) gedrückt halten |
| Ball abschießen | kurz tippen | Leertaste (oder Pfeil hoch, W) |
| Pause | Knopf „Pause“ oben rechts | P oder Esc (noch einmal drücken spielt weiter) |

Zu Beginn jedes Levels und nach jedem verlorenen Ball liegt der Ball auf dem Schläger und wartet, bis man ihn abschießt. Je nachdem, wo der Ball den Schläger trifft, fliegt er zurück: in der Mitte gerade nach oben, am Rand schräg zur Seite. So kann man zielen.

### Steine

| Farbe | braucht noch |
|---|---|
| grün | 1 Treffer |
| gelb | 2 Treffer |
| rot | 3 Treffer |
| grau | geht nicht kaputt |

Ein angeschlagener Stein wechselt die Farbe: Ein roter wird nach dem ersten Treffer gelb, dann grün, dann ist er weg. Graue Steine stehen im Weg, zählen aber nicht: Ein Level ist geschafft, sobald nur noch graue Steine übrig sind.

### Punkte

Jeder Treffer auf einen Stein, der kaputtgehen kann, bringt 10 Punkte. Ein grüner Stein bringt also 10, ein gelber insgesamt 20, ein roter insgesamt 30 Punkte. Graue Steine bringen nichts. Die Punkte laufen über alle Level weiter.

### Extras

Aus ungefähr jedem siebten Stein, der zerbricht, fällt ein Extra langsam nach unten. Fängt man es mit dem Schläger, wirkt es; fällt es vorbei, ist es weg.

| Extra | Farbe | was es tut |
|---|---|---|
| BREIT | grün | der Schläger ist 20 Sekunden lang anderthalbmal so breit |
| +BALL | orange | ein zusätzlicher Ball startet vom Schläger; höchstens 3 Bälle sind gleichzeitig im Spiel |
| LANGSAM | lila | alle Bälle fliegen 15 Sekunden lang deutlich langsamer |

Wie lange BREIT und LANGSAM noch wirken, steht oben rechts im Spielfeld. Fängt man dasselbe Extra noch einmal, beginnt seine Zeit von vorn.

### Leben und Spielende

- Man hat 3 Leben, oben in der Leiste als Herzen.
- Fällt ein Ball unten heraus, während noch ein anderer im Spiel ist, passiert nichts weiter.
- Fällt der letzte Ball heraus, ist ein Leben weg. Laufende und fallende Extras enden, und ein neuer Ball liegt auf dem Schläger.
- Ist das letzte Leben weg, ist das Spiel vorbei.
- Leben gibt es nicht dazu; man nimmt die übrigen Leben ins nächste Level mit.
- Jedes Level ist ein wenig schneller als das vorige.

### Bestenliste

In die Bestenliste kommen die Punkte; mehr ist besser. Die Punkte werden gemeldet, wenn ein Level geschafft ist, wenn das Spiel vorbei ist, nach dem Sieg und wenn man ein laufendes Spiel mit „Neues Spiel“ abbricht. Die Plattform behält davon immer den besten Wert.

### Aufhören und weiterspielen

- Man kann jederzeit aufhören, auch mitten im Level. Beim nächsten Start steht im Menü „Weiterspielen“, und es geht im selben Level mit denselben Punkten, denselben Leben und genau den Steinen weiter, die noch stehen (angeschlagene Steine bleiben angeschlagen).
- Der Ball liegt dann wieder auf dem Schläger. Extras, die gerade wirkten oder fielen, sind nach dem Wiederkommen weg.
- Das Spiel speichert nach zerstörten Steinen (höchstens einmal pro Sekunde), nach einem verlorenen Ball, nach jedem Level, beim Pausieren und wenn man die App verlässt.
- Verlässt man die App oder wechselt in ein anderes Fenster, hält das Spiel von selbst an.
- „Neues Spiel“ fragt nach, bevor ein laufender Stand verloren geht.
- Nach dem Spielende und nach dem Sieg beginnt das nächste Spiel wieder bei Level 1.

### Sonst

Das Spiel hat keinen Ton.

### Selbst festgelegt, bitte prüfen

Diese Punkte standen nicht in der Beschreibung; ich habe sie so entschieden. Wenn etwas anders sein soll, einfach sagen:

- Der Schläger folgt der Bewegung des Fingers, nicht seiner Position. Man kann den Finger also irgendwo hinlegen und verdeckt den Ball nicht.
- Punkte gibt es pro Treffer (10), nicht pro ganzem Stein. Für geschaffte Level gibt es keinen Extra-Bonus.
- Extras fallen aus etwa 15 % der zerbrochenen Steine, höchstens 3 gleichzeitig. BREIT wirkt 20 Sekunden, LANGSAM 15 Sekunden (Bälle 40 % langsamer).
- Beim Weiterspielen nach einer Unterbrechung liegt der Ball auf dem Schläger, statt mitten im Flug weiterzufliegen.
- Fliegt ein Ball 12 Sekunden lang herum, ohne den Schläger oder einen zerbrechlichen Stein zu berühren (etwa zwischen grauen Steinen), bekommt er einen kleinen Schubs in eine neue Richtung, damit nichts hängen bleibt.

## Ausprobieren

Voraussetzung ist Node 22 oder neuer.

```bash
npm install
npm run dev
```

Dann http://localhost:5180 öffnen. Dort steht das Spiel in einem Handy-Rahmen, darunter Spielstand und Bestwerte zum Ansehen und Löschen. Mit `npm run dev -- --host` geht es auch mit einem echten Handy im WLAN.

## Level ändern

Die 10 Level stehen als Textraster in `src/levels.ts`, jede Reihe genau 10 Zeichen, höchstens 12 Reihen: `.` frei, `1` grün, `2` gelb, `3` rot, `#` grau. Die Tests prüfen, dass jeder zerbrechliche Stein für den Ball erreichbar ist und dass ein Computer-Spieler jedes Level schafft.

## Entwickeln

Dieses Spiel lässt sich gut mit einem KI-Agenten (Claude Code, Cursor, Copilot …) weiterbauen. Die Anleitung für den Agenten steht in [AGENTS.md](AGENTS.md).

| Befehl | Was er tut |
|---|---|
| `npm run dev` | startet das Spiel lokal im Browser, mit Einblick in Spielstand und Bestwerte |
| `npm test` | Tests |
| `npm run typecheck` | Typprüfung |
| `npm run check` | prüft das Spiel wie die Plattform |
| `npm run pack` | baut das Spielpaket für einen Katalog |

## Lizenz

Code unter MIT, Grafik unter CC0 (siehe [LICENSE](LICENSE) und `manifest.json`).
