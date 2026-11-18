import { describe, expect, it } from "vitest";
import { newRun, runAt } from "../src/rules";
import {
  effectsText,
  formatPoints,
  frameMs,
  isTap,
  keyAction,
  levelText,
  livesLabel,
  livesText,
  menuFor,
  pointsText,
  pressKey,
  recordLine,
  releaseKey,
  restingHint,
  steerDirection,
  tapMaxDistance,
  tapMaxMs,
  toField,
} from "../client/src/view";

function labels(screen: Parameters<typeof menuFor>[0]): string[] {
  return menuFor(screen).entries.map((entry) => entry.label);
}

describe("Anzeige", () => {
  it("schreibt Punkte mit Tausenderpunkt", () => {
    expect(formatPoints(0)).toBe("0");
    expect(formatPoints(980)).toBe("980");
    expect(formatPoints(12_340)).toBe("12.340");
    expect(formatPoints(1_234_567)).toBe("1.234.567");
    expect(pointsText(1)).toBe("1 Punkt");
    expect(pointsText(1230)).toBe("1.230 Punkte");
  });

  it("zeigt Level, Leben und laufende Extras in der Kopfzeile", () => {
    expect(levelText(0)).toBe("Level 1/10");
    expect(levelText(9)).toBe("Level 10/10");
    expect(livesText(3)).toBe("♥♥♥");
    expect(livesText(0)).toBe("");
    expect(livesLabel(2)).toBe("2 Leben übrig");
    expect(effectsText(0, 0)).toBe("");
    expect(effectsText(12_001, 0)).toBe("Breit 13 s");
    expect(effectsText(500, 4000)).toBe("Breit 1 s   Langsam 4 s");
  });

  it("sagt, wie man den Ball abschießt, und nach einem verlorenen Ball, wie viele Leben übrig sind", () => {
    expect(restingHint(false, 3)).toBe("Tippen oder Leertaste:\nBall abschießen");
    expect(restingHint(true, 2)).toBe("Ball verloren! Noch 2 Leben.\nTippen oder Leertaste:\nBall abschießen");
  });

  it("nennt die Bestleistung", () => {
    expect(recordLine(undefined)).toBe("Noch keine Bestleistung.");
    expect(recordLine(4560)).toBe("Bestleistung: 4.560 Punkte");
  });
});

describe("Menü", () => {
  it("bietet beim ersten Start nur Spiel starten an und erklärt die Steuerung", () => {
    const menu = menuFor({ kind: "start", run: null });
    expect(menu.entries).toEqual([{ id: "neu", label: "Spiel starten" }]);
    expect(menu.message).toContain("Leertaste");
  });

  it("bietet beim Wiederkommen Weiterspielen mit Level, Punkten und Leben an", () => {
    const run = { ...runAt(3, 1230, 2) };
    const menu = menuFor({ kind: "start", run });
    expect(menu.message).toBe("Willkommen zurück! Level 4, 1.230 Punkte, 2 Leben übrig.");
    expect(menu.entries.map((entry) => entry.id)).toEqual(["weiterspielen", "neu"]);
  });

  it("fragt vor einem neuen Spiel nach, wenn ein Stand verloren ginge", () => {
    const menu = menuFor({ kind: "confirm", run: runAt(6, 2500, 1), back: "pause" });
    expect(menu.heading).toBe("Neues Spiel?");
    expect(menu.message).toContain("Level 7");
    expect(menu.message).toContain("2.500 Punkte");
    expect(menu.entries.map((entry) => entry.id)).toEqual(["neu-sicher", "zurueck"]);
  });

  it("zeigt Pause, geschafftes Level, Spielende und Sieg", () => {
    expect(labels({ kind: "pause", run: newRun() })).toEqual(["Weiter", "Neues Spiel"]);
    expect(menuFor({ kind: "pause", run: newRun() }).message).toContain("gespeichert");
    expect(menuFor({ kind: "cleared", level: 2, score: 900 })).toEqual({
      heading: "Level 3 geschafft!",
      message: "Du hast 900 Punkte.",
      entries: [{ id: "naechstes", label: "Weiter mit Level 4" }],
    });
    expect(menuFor({ kind: "over", score: 700, best: 900 }).message).toBe("Du hast 700 Punkte geschafft.");
    expect(menuFor({ kind: "over", score: 900, best: 900 }).message).toBe("Du hast 900 Punkte geschafft. Das ist deine Bestleistung!");
    expect(menuFor({ kind: "over", score: 0, best: 0 }).message).toBe("Du hast 0 Punkte geschafft.");
    expect(menuFor({ kind: "won", score: 5000, best: 5000 })).toEqual({
      heading: "Gewonnen!",
      message: "Alle 10 Level geschafft, 5.000 Punkte. Das ist deine Bestleistung!",
      entries: [{ id: "neu", label: "Nochmal spielen" }],
    });
  });
});

describe("Steuerung", () => {
  it("kennt Pfeiltasten, A/D, Leertaste und Pause", () => {
    expect(keyAction("ArrowLeft")).toBe("left");
    expect(keyAction("d")).toBe("right");
    expect(keyAction(" ")).toBe("launch");
    expect(keyAction("ArrowUp")).toBe("launch");
    expect(keyAction("Escape")).toBe("pause");
    expect(keyAction("p")).toBe("pause");
    expect(keyAction("x")).toBeUndefined();
    expect(keyAction("constructor")).toBeUndefined();
  });

  it("fährt in die Richtung der zuletzt gedrückten Taste, die noch gehalten wird", () => {
    let keys = pressKey([], "left");
    expect(steerDirection(keys)).toBe(-1);
    keys = pressKey(keys, "right");
    expect(steerDirection(keys)).toBe(1);
    keys = releaseKey(keys, "right");
    expect(steerDirection(keys)).toBe(-1);
    expect(steerDirection(releaseKey(keys, "left"))).toBe(0);
  });

  it("zählt kurzes Tippen ohne Wischen als Abschuss, Ziehen nicht", () => {
    expect(isTap(120, 3)).toBe(true);
    expect(isTap(tapMaxMs, tapMaxDistance)).toBe(true);
    expect(isTap(tapMaxMs + 1, 0)).toBe(false);
    expect(isTap(100, tapMaxDistance + 1)).toBe(false);
  });

  it("rechnet Fingerwege auf dem Bildschirm in Wege auf dem Spielfeld um", () => {
    expect(toField(100, 360, 360)).toBe(100);
    expect(toField(100, 720, 360)).toBe(50);
    expect(toField(-30, 180, 360)).toBe(-60);
    expect(toField(10, 0, 360)).toBe(0);
  });

  it("zählt höchstens 100 ms pro Bild, damit nach einem Tab-Wechsel nichts springt", () => {
    expect(frameMs(16)).toBe(16);
    expect(frameMs(5000)).toBe(100);
    expect(frameMs(-3)).toBe(0);
  });
});
