# Anleitung für KI-Agenten

Dieses Repo ist ein Einzelspieler-Spiel für **Gamehearth**, eine selbst gehostete Spieleplattform. Es läuft ganz im Browser, mit eigener Spielschleife und Phaser-Physik; einen Server, der die Regeln rechnet, gibt es nicht. Von der Plattform bekommt das Spiel nur zwei Dinge: einen **Spielstand** zum Weiterspielen und **Bestwerte** für die Bestenliste. Gespielt wird ohne Raum und auch offline. Du baust hier mit einer Person zusammen ein Spiel. Lies diese Datei ganz, bevor du etwas änderst.

## Mit wem du arbeitest

Die Person kann vermutlich nicht programmieren. Sie kennt ihr Spiel, nicht den Code.

- Sprich über das Spiel, nicht über Code. Frag nach, was passieren soll („Was passiert, wenn der Ball unten rausfällt?“), nicht wie es gebaut wird.
- Kläre die Regeln vollständig, bevor du sie baust: Steuerung am Handy und mit Tastatur, Ziel, Level oder endlos, Leben, wann das Spiel vorbei ist, was als Bestwert zählt (höher oder niedriger besser), was beim Weiterspielen erhalten bleiben soll. Schreib die Regeln in Alltagssprache in die `README.md` und lass sie bestätigen.
- Arbeite in kleinen Schritten und zeig nach jedem Schritt etwas zum Ausprobieren (`npm run dev`, siehe unten). Sag in einem Satz, was sich geändert hat und was die Person ausprobieren soll.
- Fachwörter nur mit Erklärung. Fehlermeldungen übersetzt du in einen Satz, was nicht stimmt und was du dagegen tust.
- Vor dem ersten Veröffentlichen fragst du nach Lizenz und Namen (siehe „Veröffentlichen“).

## Aufbau

| Pfad | Inhalt |
|---|---|
| `manifest.json` | Name, Version, Bestwerte (`stats`), Lizenz des Spiels |
| `src/levels.ts` | die Level als Textraster und ihre Prüfung (Start, Pilze, Erreichbarkeit) |
| `src/rules.ts` | die Regeln ohne Phaser: Spielstand lesen, Durchgang starten, Level geschafft, Bestzeit |
| `client/src/main.ts` | verbindet das Spiel mit der Plattform (`connectSolo`), startet Phaser und das Menü |
| `client/src/scene.ts` | das Level in Phaser 4 mit Arcade-Physik: Wände, Figur, Pilze, Zeit |
| `client/src/controls.ts` | Steuerkreuz und Tastatur |
| `client/src/view.ts` | alles, was die Oberfläche entscheidet, ohne Phaser (Texte, Menü, Zeitformat, Lenken); gut testbar |
| `client/index.html` | Spielfeld, Steuerkreuz und das Menü als HTML |
| `test/` | Tests für Level, Regeln und Oberflächenlogik (Vitest) |
| `dist/client/` | die gebaute Oberfläche (entsteht durch `npm run build`, nicht von Hand ändern) |

Die Vorlage enthält ein kleines Beispielspiel, **Pilzsuche**: Eine Figur läuft durch 3 Labyrinthe und sammelt alle Pilze, die Gesamtzeit ist der Bestwert. Es zeigt die wichtigsten Muster. Ersetze es vollständig durch das Spiel der Person (siehe „Das Beispiel ersetzen“).

## Befehle

| Befehl | Wofür |
|---|---|
| `npm run dev` | startet das Spiel lokal unter http://localhost:5180, daneben Spielstand und Bestwerte |
| `npm test` | Tests |
| `npm run typecheck` | Typprüfung von Regeln und Oberfläche |
| `npm run check` | prüft das Spiel wie die Plattform: Manifest samt `stats`, Lizenz, gebaute Oberfläche und den Quelltext auf Dinge, die im abgeschotteten Rahmen scheitern. Es spielt nicht selbst; dafür sind deine Tests da |
| `npm run pack` | baut das Spielpaket `dist/<id>-<version>.zip`, nur wenn `check` keine Fehler meldet |

`npm run dev` läuft, bis man es beendet. Starte es im Hintergrund und lies seine Ausgabe: Die Adresse steht dort (meist http://localhost:5180; ist der Port belegt, etwa weil `dev` schon läuft, ein anderer), und Fehler aus der Oberfläche stehen dort als Textblock, den du direkt beheben kannst. Läuft schon ein `dev` für dieses Spiel, nutze es weiter, statt ein zweites zu starten. Ändert sich die Oberfläche, baut `dev` neu und lädt den Rahmen neu. Beende `dev` am Ende samt Kindprozessen (unter Windows etwa `taskkill /T /F` auf den Prozess an dem Port aus der Ausgabe).

**Spielstand in `dev`.** `dev` speichert Spielstand und Bestwerte in `.gamehearth/dev-save.json` im Spielordner (steht in `.gitignore`). Die Seite zeigt beides neben dem Spiel, mit „Spielstand löschen“, „Bestwerte löschen“ und „Neu laden“. Um eine bestimmte Stelle zu prüfen (etwa Level 3), schreib den passenden Spielstand in die Datei und lade das Spiel neu. Ein Bestwert, den das Manifest nicht kennt, und ein ungültiger Spielstand erscheinen als Fehler auf der Seite und im Terminal.

### Die Oberfläche prüfen

Das Spiel läuft in `dev` so abgeschottet wie auf der Plattform: in einem Sandbox-iframe ohne eigene Origin, auch unter `/p1`. Manche eingebauten Browser von KI-Werkzeugen laden solche iframes nicht (etwa der Browser-Bereich der Claude-App: der Rahmen bleibt leer, die Anfragen scheitern mit `net::ERR_BLOCKED_BY_CLIENT`). Dort läuft der Code gar nicht; ein Terminal ohne Fehler beweist dann nichts. Was hilft:

- Hast du Playwright oder einen Chrome mit Fernsteuerung, bediene die Seite selbst. Mit Playwright erreichst du das Spiel mit `page.locator(".seat").frameLocator("iframe")`; das Menü besteht aus echten Knöpfen (`getByRole("button", { name: "Spiel starten" })`), gesteuert wird mit den Pfeiltasten, nachdem du einmal ins Spiel geklickt hast. Über das DevTools-Protokoll von Chrome fehlen abgeschottete Rahmen in `Page.getFrameTree`; du erreichst sie mit `Target.setAutoAttach({ autoAttach: true, flatten: true, waitForDebuggerOnStart: false })`.
- Fehler und `console.log` der Oberfläche stehen mit Stelle im Quelltext im Terminal von `dev`. Lies sie dort.
- Was sich ohne Phaser entscheiden lässt (Regeln, Level, Spielstand, Texte, Zeitformat), gehört nach `src/` und `client/src/view.ts` und wird in `test/` getestet. Je mehr dort steht, desto weniger musst du im Browser nachsehen.
- Konntest du das Spiel nicht selbst sehen, sag das bei der Übergabe ausdrücklich und bitte die Person, http://localhost:5180 in ihrem normalen Browser zu öffnen und zu sagen, was sie sieht. Das ist ohnehin der wichtigste Test.

## Arbeitsablauf

1. Regeln mit der Person klären und in die `README.md` schreiben.
2. Spielstand und Bestwerte entwerfen: Was muss beim Weiterspielen erhalten bleiben? Welcher Wert kommt in die Bestenliste, ist höher oder niedriger besser? Bestwerte unter `stats` in `manifest.json` eintragen.
3. Regeln, Level und Spielstand ohne Phaser in `src/` schreiben, dazu Tests in `test/`, besonders für Ränder (letztes Level, leere Level, kaputter Spielstand).
4. `npm test` und `npm run typecheck`.
5. Die Oberfläche anpassen: erst `client/src/view.ts` (mit Tests), dann `client/src/scene.ts`, `client/src/main.ts` und `client/index.html`.
6. `npm run check`, bis keine Fehler mehr kommen. Warnungen lesen und bewusst entscheiden.
7. `npm run dev`, die Person spielt es aus. Rückmeldung einarbeiten, ab Schritt 3 wiederholen.

Vor jeder Übergabe an die Person müssen `npm test`, `npm run typecheck` und `npm run check` ohne Fehler durchlaufen.

## Die wichtigsten Regeln

Das Spiel spricht nur über `connectSolo` aus `@gamehearth/sdk/client` mit der Plattform:

```ts
import { connectSolo } from "@gamehearth/sdk/client";

const game = await connectSolo<Spielstand, "punkte">();
game.saved;                        // der zuletzt gespeicherte Spielstand oder undefined
game.best.punkte;                  // eigener Bestwert oder undefined
await game.save(spielstand);       // Spielstand speichern
await game.record("punkte", 1200); // Wert melden; die Plattform behält den besseren
```

1. **Nur `connectSolo`, nie `connect`.** `connect` ist für Spiele mit Regeln auf dem Server; die Plattform lehnt es hier ab. `manifest.json` hat `"mode": "single"`, `"server": false` und `"players": { "min": 1, "max": 1 }`; ändere das nicht.
2. **Kein eigener Speicher.** `localStorage`, `sessionStorage`, `indexedDB` und Cookies gibt es im abgeschotteten Rahmen nicht. Alles, was bleiben soll, gehört in den Spielstand (`game.save`), Bestwerte über `game.record`.
3. **Der Spielstand ist reines JSON** (Objekte, Arrays, Texte, Zahlen, `true`/`false`), höchstens 64 KB, nicht `null`. Kein `Date`, keine Klassen, kein `Map`/`Set`. `game.saved` gibt dir bei jedem Lesen eine eigene Kopie.
4. **Der Spielstand trägt eine Formatnummer** (`format: 1` im Beispiel) und wird beim Laden geprüft (`readSave` in `src/rules.ts`). Nach einem Update liest die neue Version den Stand der alten; versteht sie ihn nicht, beginnt sie sauber neu, statt abzustürzen. Änderst du die Form, erhöhe die Nummer oder lies das alte Format weiter.
5. **Speichern an sinnvollen Stellen.** Nach einem geschafften Level, beim Pausieren, bei wichtigen Funden; nicht in jedem Bild. Speichern ist schnell, die Plattform hebt es sofort im Gerät auf und schickt es später zum Server. Ein Spieler kann jederzeit die App schließen; was bis dahin nicht gespeichert ist, ist weg.
6. **Bestwerte stehen im Manifest.** Unter `stats` jeder Name mit `label` (Anzeige in der Bestenliste), `better` (`"higher"` oder `"lower"`) und wahlweise `format` (`"number"` oder `"time"`, Zeiten in Millisekunden). Höchstens 10. Der Name darf sich nach dem ersten Veröffentlichen nie mehr ändern, sonst sind alle bisherigen Bestwerte weg. `game.record` mit einem anderen Namen lehnt die Plattform ab, `check` meldet ihn als Fehler.
7. **Melde jeden fertigen Wert**, auch einen schlechteren; die Plattform behält selbst den besseren. Bestwerte kommen vom Gerät und sind fälschbar; im eigenen Kreis ist das egal.
8. **`save` und `record` können scheitern** (Fehler im Spielstand, voller Speicher) und werfen dann einen Fehler mit Erklärung. Nicht still abfangen: In `dev` erscheint er im Terminal.
9. **Zeit und Zufall sind frei.** Ohne Server-Regeln darfst du `Math.random()`, `Date.now()` und die Zeit von Phaser (`delta` in `update`) benutzen. Für Spielzeit nimm `delta` und begrenze ein einzelnes Bild (wie `frameMs` im Beispiel), sonst springt die Zeit nach einem Tab-Wechsel.
10. **Nur eigene Dateien.** Kein `fetch` nach außen, keine Bilder, Schriften oder Skripte von fremden Adressen, kein WebSocket. Alles kommt aus dem eigenen Build.

### Was die Plattform selbst macht

Darum kümmert sich das Spiel nicht: Die Spielauswahl zeigt „Spielen“ statt „Raum anlegen“. Die Plattform lädt das Spiel vorher in den Browser, damit es offline startet, gleicht Spielstand und Bestwerte mit dem Server ab, sobald er erreichbar ist, und zeigt beim Spiel eine Bestenliste aller Accounts. Im Menü der Plattform kann man den Spielstand und die eigenen Bestwerte löschen, etwa wenn ein kaputter Spielstand das Spiel nicht mehr starten lässt.

## Die Oberfläche

- **Phaser 4, nicht Phaser 3.** Beispiele aus dem Netz sind oft Phaser 3. Halte dich an die Muster in `client/src/scene.ts`; bei Fehlermeldungen zu unbekannten Methoden steckt meist Phaser-3-Code dahinter. Erzeuge in `update()` keine neuen Objekte pro Bild, sondern verwende sie weiter.
- **Physik:** Das Beispiel nutzt Arcade-Physik (`this.physics.add.sprite`, `staticGroup`, `collider`, `overlap`). Eine neue Partie oder ein neues Level startet die Szene neu (`phaser.scene.start("level", daten)`), das räumt alle Objekte weg.
- **Menüs und Texte** gehen am einfachsten als HTML über dem Spielfeld (wie `#menu` im Beispiel): echte Knöpfe, mit Tastatur bedienbar und leicht zu testen.
- **Jede Bedienung geht mit Touch und Tastatur.** Das Steuerkreuz nimmt die Richtung aus der Lage des Fingers zur Mitte, die Tasten bilden einen Stapel (Links halten, Hoch tippen, weiter nach links); beim Verlassen des Fensters lässt alles los.
- **Bildschirm:** Das Manifest nennt `"screen": "small"` (Handy hochkant); `dev` zeigt das Spiel in so einem Rahmen. Phaser skaliert das Feld mit `Scale.FIT` in den freien Platz.
- **Grafik und Ton:** am einfachsten mit Phaser zeichnen (wie die Texturen in `scene.ts`). Eigene Dateien kommen nach `client/public/` und brauchen eine Lizenz CC0, CC-BY oder CC-BY-SA; keine Bilder aus dem Internet ohne klare Lizenz.

## Typische Fehler

| Meldung oder Symptom | Ursache und Abhilfe |
|---|---|
| `connectSolo() gibt es nur für Einzelspieler ohne Reducer` | `manifest.json` hat nicht `"mode": "single"` und `"server": false` |
| `Es ruft connectSolo() aus @gamehearth/sdk/client auf, nicht connect()` | `connect` durch `connectSolo` ersetzen |
| `Den Bestwert "…" gibt es nicht` | Name unter `stats` in `manifest.json` eintragen oder Tippfehler im Code beheben |
| `Der Spielstand ist kein reines JSON` | ein `Date`, `undefined`, `NaN` oder eine Klasse im Spielstand; als Zahl oder Text speichern |
| `Der Spielstand ist … KB groß` | weniger speichern: nur, was zum Weiterspielen nötig ist |
| Warnung: `nutzt localStorage` | stattdessen `game.save` und `game.saved` |
| Nach einem Update startet das Spiel nicht mehr | ein alter Spielstand passt nicht zur neuen Form; beim Laden prüfen und sonst neu beginnen (`readSave`) |
| Die Zeit springt nach einem Tab-Wechsel | `delta` pro Bild begrenzen (`frameMs`) |
| Die Figur bleibt an Ecken hängen | die Figur in die Mitte der Gasse lenken (`steerTowardLane`) oder ihren Körper kleiner machen |
| Oberfläche bleibt leer, `dev` zeigt einen Fehler aus dem iframe | Fehlermeldung samt Datei und Zeile in der Ausgabe von `dev` lesen |

## Das Beispiel ersetzen

Wenn das eigene Spiel steht, darf von der Pilzsuche nichts übrig bleiben:

- `manifest.json`: `name`, `description`, `roles.player` (Eingaben, Bildschirm) und `stats` passend setzen. `mode`, `server` und `players` bleiben. Die `id` kommt aus dem Ordnernamen. Passt sie nicht (etwa `mein-spiel`), änder sie jetzt in `manifest.json` und `package.json`: nur Kleinbuchstaben, Ziffern und Bindestriche. Nach dem ersten Veröffentlichen ändert sie sich nie mehr.
- `package.json`: `description`.
- `src/`, `client/src/`, `client/index.html`, `test/`: Regeln, Oberfläche und Tests des eigenen Spiels. Die Dateinamen darfst du behalten oder ändern.
- `README.md`: Regeln des eigenen Spiels; den Hinweis „enthält noch das Beispiel“ oben entfernen.
- Zum Schluss nach Resten suchen: `Pilzsuche`, `Pilz`, `pilz`, `mushroom`, `bestzeit`, `levelTexts`, `LevelScene` und `figur` in `src/`, `client/`, `test/`, `README.md`, `manifest.json` und `package.json`.
- `AGENTS.md` und `CLAUDE.md` bleiben, wie sie sind. Sie erwähnen die Pilzsuche als Beispiel der Vorlage.
- Das ursprüngliche Beispiel liegt danach weiter zum Nachschlagen unter `node_modules/gamehearth/templates/einzelspieler/`, etwa wie `client/src/scene.ts` Physik und Texturen aufsetzt oder `client/src/controls.ts` Finger und Tasten liest.

## Mehr Einzelheiten

Diese Dateien passen immer zur installierten Version. Lies sie, bevor du etwas benutzt, das hier nicht steht:

- `node_modules/@gamehearth/sdk/README.md`: der vollständige Vertrag, besonders der Abschnitt zu `connectSolo` und Bestwerten
- `node_modules/gamehearth/README.md`: `dev`, `check`, `pack` und Kataloge

Ändere nichts in `node_modules` und schalte keine Prüfungen ab. Wenn der Vertrag etwas nicht hergibt, sag der Person, was nicht geht.

## Veröffentlichen

Vor dem ersten Release fragst du die Person:

- **Lizenz:** Vorbelegt sind MIT für den Code und CC0 für Grafik (siehe `LICENSE` und `manifest.json`). Erklär kurz: Jeder darf das Spiel dann benutzen, ändern und weitergeben. Andere erlaubte Lizenzen: jede OSI-Lizenz für Code, CC0, CC-BY oder CC-BY-SA für Grafik.
- **Name in der `LICENSE`:** wer als Urheber dasteht; das ist öffentlich sichtbar.

Ablauf:

1. Version in `manifest.json` und `package.json` erhöhen (`0.1.0` → `0.2.0`), committen.
2. Das Repo auf GitHub hochladen. Ein Tag startet die Release-CI: `git tag v0.2.0 && git push origin v0.2.0`. Sie baut mit `check` und `pack` das Spielpaket und hängt es an ein Release.
3. Damit ein Gamehearth-Server das Spiel installieren kann, braucht es einen **Katalog**: ein eigenes Repo mit einer `catalog.json`. Anlegen und eintragen mit `npx gamehearth catalog add catalog.json <adresse-des-pakets> --name "Mein Katalog"`. Auf dem Server fügt ein Admin unter „Verwaltung“ die Raw-Adresse der `catalog.json` hinzu und installiert das Spiel. Einzelheiten in `node_modules/gamehearth/README.md`.
4. Gespielt wird mit einem Account: In der Spielauswahl steht beim Spiel „Spielen“.
