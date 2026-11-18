import { breakableCount, cellFromSymbol, columns, gridText, levels, solid } from "./levels";

export const levelCount = levels.length;
export const startLives = 3;
export const pointsPerHit = 10;

export interface Motion {
  paddleX: number;
  balls: { x: number; y: number; dx: number; dy: number; resting: boolean }[];
  falling: { kind: string; x: number; y: number }[];
  wideLeft: number;
  slowLeft: number;
  calm: number;
}

export interface Run {
  level: number;
  score: number;
  lives: number;
  bricks: string;
  motion?: Motion;
}

export interface Save {
  format: 1;
  run: Run | null;
}

export function freshSave(): Save {
  return { format: 1, run: null };
}

export function runAt(level: number, score: number, lives: number): Run {
  const plan = levels[level];
  if (plan === undefined) {
    throw new Error(`Level ${level + 1} gibt es nicht; es gibt ${levelCount}`);
  }
  return { level, score, lives, bricks: gridText(plan.cells) };
}

export function newRun(): Run {
  return runAt(0, 0, startLives);
}

export function afterLevel(level: number, score: number, lives: number): Run | null {
  return level + 1 >= levelCount ? null : runAt(level + 1, score, lives);
}

function whole(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

export function readBricks(level: number, text: unknown): number[] | undefined {
  const plan = levels[level];
  if (plan === undefined || typeof text !== "string") {
    return undefined;
  }
  const rows = text.split("/");
  if (rows.length !== plan.rows || rows.some((row) => row.length !== columns)) {
    return undefined;
  }
  const cells: number[] = [];
  for (const symbol of rows.join("")) {
    const cell = cellFromSymbol(symbol);
    if (cell === undefined) {
      return undefined;
    }
    cells.push(cell);
  }
  const fits = cells.every((cell, index) => {
    const original = plan.cells[index] ?? 0;
    return original === solid ? cell === solid : cell !== solid && cell <= original;
  });
  if (!fits || breakableCount(cells) === 0) {
    return undefined;
  }
  return cells;
}

export function readSave(raw: unknown): Save {
  if (raw === null || typeof raw !== "object") {
    return freshSave();
  }
  const save = raw as Partial<Save>;
  if (save.format !== 1) {
    return freshSave();
  }
  const run = save.run;
  if (run === null || run === undefined || typeof run !== "object") {
    return freshSave();
  }
  if (!whole(run.level, 0, levelCount - 1) || !whole(run.score, 0, Number.MAX_SAFE_INTEGER) || !whole(run.lives, 1, startLives)) {
    return freshSave();
  }
  if (readBricks(run.level, run.bricks) === undefined) {
    return { format: 1, run: runAt(run.level, run.score, run.lives) };
  }
  const motion = run.motion !== null && typeof run.motion === "object" ? { motion: run.motion } : {};
  return { format: 1, run: { level: run.level, score: run.score, lives: run.lives, bricks: run.bricks, ...motion } };
}
