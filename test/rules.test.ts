import { describe, expect, it } from "vitest";
import { gridText, levels } from "../src/levels";
import { afterLevel, freshSave, levelCount, newRun, readBricks, readSave, runAt, startLives } from "../src/rules";

const firstBricks = gridText(levels[0]?.cells ?? []);

describe("Spielstand lesen", () => {
  it("beginnt ohne Spielstand neu", () => {
    expect(readSave(undefined)).toEqual({ format: 1, run: null });
    expect(readSave({ format: 1, run: null })).toEqual(freshSave());
  });

  it("übernimmt Level, Punkte, Leben und die stehenden Steine", () => {
    const bricks = firstBricks.replace("1111111111", "..11111111");
    const save = { format: 1, run: { level: 0, score: 20, lives: 2, bricks } };
    expect(readSave(save)).toEqual(save);
  });

  it("nimmt angeschlagene Steine an, aber keine Steine, die mehr Treffer brauchen als im Level", () => {
    const plan = levels[4];
    expect(plan).toBeDefined();
    const bricks = gridText(plan?.cells ?? []);
    const damaged = bricks.replace("3333333333", "321321321.");
    expect(readSave({ format: 1, run: { level: 4, score: 0, lives: 3, bricks: damaged } }).run?.bricks).toBe(damaged);
    const stronger = bricks.replace("1111111111", "3111111111");
    expect(readSave({ format: 1, run: { level: 4, score: 0, lives: 3, bricks: stronger } }).run).toBeNull();
  });

  it("beginnt bei unbekanntem oder kaputtem Stand neu, statt abzustürzen", () => {
    const good = { level: 0, score: 0, lives: 3, bricks: firstBricks };
    expect(readSave({ format: 2, run: good })).toEqual(freshSave());
    expect(readSave("Level 3")).toEqual(freshSave());
    expect(readSave(null)).toEqual(freshSave());
    expect(readSave({ format: 1, run: { ...good, level: levelCount } })).toEqual(freshSave());
    expect(readSave({ format: 1, run: { ...good, level: -1 } })).toEqual(freshSave());
    expect(readSave({ format: 1, run: { ...good, score: -10 } })).toEqual(freshSave());
    expect(readSave({ format: 1, run: { ...good, score: 1.5 } })).toEqual(freshSave());
    expect(readSave({ format: 1, run: { ...good, lives: 0 } })).toEqual(freshSave());
    expect(readSave({ format: 1, run: { ...good, lives: 4 } })).toEqual(freshSave());
    expect(readSave({ format: 1, run: { ...good, bricks: 42 } })).toEqual(freshSave());
    expect(readSave({ format: 1, run: { ...good, bricks: "1111111111" } })).toEqual(freshSave());
    expect(readSave({ format: 1, run: "Level 3" })).toEqual(freshSave());
  });

  it("verwirft Steine, die nicht zum Level passen", () => {
    expect(readBricks(0, firstBricks.replace("1111111111", "111111111"))).toBeUndefined();
    expect(readBricks(0, firstBricks.replace("1111111111", "11111111x1"))).toBeUndefined();
    expect(readBricks(0, firstBricks.replace("1111111111", "#111111111"))).toBeUndefined();
    expect(readBricks(3, gridText(levels[3]?.cells ?? []).replace("#1#1##1#1#", ".1#1##1#1#"))).toBeUndefined();
    expect(readBricks(levelCount, firstBricks)).toBeUndefined();
  });

  it("verwirft einen Stand ohne zerbrechliche Steine, denn so ein Level wäre schon geschafft", () => {
    const empty = firstBricks.replace(/1/g, ".");
    expect(readBricks(0, empty)).toBeUndefined();
    const onlySolid = gridText((levels[3]?.cells ?? []).map((cell) => (cell > 0 ? 0 : cell)));
    expect(readBricks(3, onlySolid)).toBeUndefined();
  });
});

describe("Durchgang", () => {
  it("beginnt in Level 1 mit 0 Punkten, 3 Leben und allen Steinen", () => {
    expect(newRun()).toEqual({ level: 0, score: 0, lives: startLives, bricks: firstBricks });
    expect(startLives).toBe(3);
  });

  it("geht nach einem geschafften Level mit Punkten und Leben ins nächste", () => {
    expect(afterLevel(0, 500, 2)).toEqual({ level: 1, score: 500, lives: 2, bricks: gridText(levels[1]?.cells ?? []) });
  });

  it("ist nach Level 10 gewonnen", () => {
    expect(levelCount).toBe(10);
    expect(afterLevel(levelCount - 2, 100, 1)?.level).toBe(levelCount - 1);
    expect(afterLevel(levelCount - 1, 100, 1)).toBeNull();
  });

  it("kennt kein Level hinter dem letzten", () => {
    expect(() => runAt(levelCount, 0, 3)).toThrow("gibt es nicht");
  });

  it("bleibt als Spielstand klein und reines JSON", () => {
    const save = { format: 1, run: runAt(levelCount - 1, 123_456, 3) };
    const text = JSON.stringify(save);
    expect(JSON.parse(text)).toEqual(save);
    expect(text.length).toBeLessThan(400);
  });
});
