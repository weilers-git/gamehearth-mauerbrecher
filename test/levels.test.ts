import { describe, expect, it } from "vitest";
import { breakableCount, cellFromSymbol, columns, gridText, levelPlans, levels, maxRows, parseLevel, solid, symbolFromCell, unreachableBricks } from "../src/levels";

describe("Level", () => {
  it("hat 10 Level", () => {
    expect(levelPlans).toHaveLength(10);
    expect(levels).toHaveLength(10);
  });

  it.each(levels.map((level, index) => [index + 1, level] as const))("Level %i ist gültig: 10 Steine breit, höchstens 12 Reihen, jeder zerbrechliche Stein erreichbar", (_number, level) => {
    expect(level.rows).toBeGreaterThan(0);
    expect(level.rows).toBeLessThanOrEqual(maxRows);
    expect(level.cells).toHaveLength(level.rows * columns);
    expect(breakableCount(level.cells)).toBeGreaterThan(0);
    expect(unreachableBricks(level)).toEqual([]);
  });

  it("wird von Level zu Level nicht leichter: spätere Level brauchen insgesamt mindestens so viele Treffer wie Level 1", () => {
    const hits = levels.map((level) => level.cells.filter((cell) => cell > 0).reduce((sum, cell) => sum + cell, 0));
    for (const total of hits.slice(1)) {
      expect(total).toBeGreaterThanOrEqual(hits[0] ?? 0);
    }
  });

  it("übersetzt Zeichen und Steine in beide Richtungen", () => {
    expect(cellFromSymbol(".")).toBe(0);
    expect(cellFromSymbol("1")).toBe(1);
    expect(cellFromSymbol("3")).toBe(3);
    expect(cellFromSymbol("#")).toBe(solid);
    expect(cellFromSymbol("4")).toBeUndefined();
    expect([0, 1, 2, 3, solid].map(symbolFromCell).join("")).toBe(".123#");
  });

  it("schreibt die Steine als kurzen Text mit / zwischen den Reihen", () => {
    const level = parseLevel("1.2.3.#...\n..........");
    expect(gridText(level.cells)).toBe("1.2.3.#.../..........");
    expect(parseLevel(gridText(level.cells))).toEqual(level);
  });

  it("meldet kaputte Level verständlich", () => {
    expect(() => parseLevel("111")).toThrow("genau 10 Steine");
    expect(() => parseLevel("11111x1111")).toThrow("Unbekanntes Zeichen „x“");
    expect(() => parseLevel("..........\n##########")).toThrow("mindestens einen Stein");
    expect(() => parseLevel("")).toThrow("1 bis 12 Reihen");
    expect(() => parseLevel(Array.from({ length: 13 }, () => "1111111111").join("\n"))).toThrow("1 bis 12 Reihen");
  });

  it("findet Steine, die hinter unzerstörbaren Steinen eingesperrt sind", () => {
    const level = parseLevel("##########\n#1########\n##########");
    expect(unreachableBricks(level)).toEqual([11]);
    const open = parseLevel("##########\n#1.......#\n####.#####");
    expect(unreachableBricks(open)).toEqual([]);
  });

  it("lässt Steine über einer Lücke gelten, wenn man sie von oben erreicht", () => {
    const level = parseLevel("1111111111\n.#########");
    expect(unreachableBricks(level)).toEqual([]);
  });
});
