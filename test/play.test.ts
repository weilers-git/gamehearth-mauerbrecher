import { describe, expect, it } from "vitest";
import { breakableCount, columns, levels, parseLevel, solid } from "../src/levels";
import {
  ballRadius,
  ballSpeed,
  brickHeight,
  brickTop,
  brickWidth,
  calmLimitMs,
  cellCenter,
  createWorld,
  currentPaddleWidth,
  currentSpeed,
  height,
  maxBalls,
  paddleSpeed,
  paddleWidth,
  paddleY,
  runFromWorld,
  slowFactor,
  slowMs,
  step,
  wall,
  wideMs,
  widePaddleWidth,
  width,
  type Ball,
  type Input,
  type Random,
  type World,
} from "../src/play";
import { newRun, runAt, startLives } from "../src/rules";

const idle: Input = { move: 0, dir: 0, launch: false };
const never: Random = () => 0.99;
const always: Random = () => 0;

function seeded(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function worldWith(text: string): World {
  const world = createWorld(newRun());
  const level = parseLevel(text);
  world.bricks = level.cells;
  world.rows = level.rows;
  world.left = breakableCount(level.cells);
  return world;
}

function flying(world: World, x: number, y: number, dx: number, dy: number): Ball {
  const length = Math.hypot(dx, dy);
  const ball: Ball = { x, y, dx: dx / length, dy: dy / length, resting: false };
  world.balls = [ball];
  return ball;
}

function run(world: World, ms: number, input: Input = idle, random: Random = never): string[] {
  const types: string[] = [];
  for (let t = 0; t < ms; t += 16) {
    for (const event of step(world, Math.min(16, ms - t), input, random)) {
      types.push(event.type);
    }
  }
  return types;
}

function insideBrick(world: World, ball: Ball): boolean {
  for (let index = 0; index < world.bricks.length; index++) {
    if (world.bricks[index] === 0) {
      continue;
    }
    const left = wall + (index % columns) * brickWidth;
    const top = brickTop + Math.floor(index / columns) * brickHeight;
    const overlapX = Math.min(ball.x + ballRadius, left + brickWidth) - Math.max(ball.x - ballRadius, left);
    const overlapY = Math.min(ball.y + ballRadius, top + brickHeight) - Math.max(ball.y - ballRadius, top);
    if (overlapX > 1e-6 && overlapY > 1e-6) {
      return true;
    }
  }
  return false;
}

describe("Start eines Levels", () => {
  it("legt den Ball auf den Schläger in der Mitte und stellt alle Steine auf", () => {
    const world = createWorld(newRun());
    expect(world.paddleX).toBe(width / 2);
    expect(world.balls).toEqual([{ x: width / 2, y: paddleY - ballRadius, dx: 0, dy: -1, resting: true }]);
    expect(world.left).toBe(50);
    expect(world.lives).toBe(startLives);
    expect(world.phase).toBe("playing");
  });

  it("übernimmt einen gespeicherten Stand und schreibt ihn genauso zurück", () => {
    const saved = { ...runAt(4, 1230, 2) };
    saved.bricks = saved.bricks.replace("3333333333", "321321321.");
    const world = createWorld(saved);
    expect(world.left).toBe(breakableCount(levels[4]?.cells ?? []) - 1);
    expect(runFromWorld(world)).toEqual(saved);
  });

  it("lehnt Steine ab, die nicht zum Level passen", () => {
    expect(() => createWorld({ level: 0, score: 0, lives: 3, bricks: "1" })).toThrow("passt nicht");
  });

  it("wird mit jedem Level etwas schneller", () => {
    expect(ballSpeed(9)).toBeGreaterThan(ballSpeed(0));
  });
});

describe("Schläger", () => {
  it("folgt dem Finger und bleibt zwischen den Wänden", () => {
    const world = createWorld(newRun());
    step(world, 16, { move: -40, dir: 0, launch: false }, never);
    expect(world.paddleX).toBe(width / 2 - 40);
    step(world, 16, { move: -1000, dir: 0, launch: false }, never);
    expect(world.paddleX).toBe(wall + paddleWidth / 2);
    step(world, 16, { move: 1000, dir: 0, launch: false }, never);
    expect(world.paddleX).toBe(width - wall - paddleWidth / 2);
  });

  it("fährt mit den Pfeiltasten gleichmäßig", () => {
    const world = createWorld(newRun());
    step(world, 100, { move: 0, dir: 1, launch: false }, never);
    expect(world.paddleX).toBeCloseTo(width / 2 + paddleSpeed * 0.1);
  });

  it("nimmt den liegenden Ball mit", () => {
    const world = createWorld(newRun());
    step(world, 16, { move: 50, dir: 0, launch: false }, never);
    expect(world.balls[0]?.x).toBe(world.paddleX);
    expect(world.balls[0]?.resting).toBe(true);
  });

  it("schickt den Ball je nach Auftreffpunkt schräg zurück: Mitte gerade, Rand steil zur Seite", () => {
    for (const [offset, sign] of [
      [0, 0],
      [25, 1],
      [-25, -1],
    ] as const) {
      const world = worldWith("1.........");
      const ball = flying(world, width / 2 + offset, paddleY - ballRadius - 3, 0, 1);
      step(world, 16, idle, never);
      expect(ball.dy).toBeLessThan(0);
      expect(Math.sign(Math.round(ball.dx * 100))).toBe(sign);
    }
  });

  it("lässt den Ball vorbei, wenn der Schläger woanders ist", () => {
    const world = worldWith("1.........");
    const ball = flying(world, 40, paddleY - ballRadius - 3, 0, 1);
    world.paddleX = width - 60;
    step(world, 16, idle, never);
    expect(ball.dy).toBeGreaterThan(0);
  });
});

describe("Ball", () => {
  it("bleibt liegen, bis man ihn abschießt", () => {
    const world = createWorld(newRun());
    run(world, 1000);
    expect(world.balls[0]?.resting).toBe(true);
    step(world, 16, { move: 0, dir: 0, launch: true }, seeded(1));
    const ball = world.balls[0];
    expect(ball?.resting).toBe(false);
    expect(ball?.dy).toBeLessThan(0);
    expect(ball?.y).toBeLessThan(paddleY - ballRadius);
  });

  it("prallt von den Wänden und der Decke ab", () => {
    const world = worldWith("1.........");
    const left = flying(world, wall + ballRadius + 1, 300, -1, -1);
    step(world, 16, idle, never);
    expect(left.dx).toBeGreaterThan(0);
    const right = flying(world, width - wall - ballRadius - 1, 300, 1, -1);
    step(world, 16, idle, never);
    expect(right.dx).toBeLessThan(0);
    const top = flying(world, width - 30, wall + ballRadius + 1, 0.3, -1);
    step(world, 16, idle, never);
    expect(top.dy).toBeGreaterThan(0);
  });

  it("zerschlägt einen Stein und bekommt 10 Punkte", () => {
    const world = worldWith("1111111111\n1111111111");
    const target = cellCenter(15);
    const ball = flying(world, target.x, target.y + brickHeight / 2 + ballRadius + 2, 0, -1);
    const events = step(world, 16, idle, never).map((event) => ({ ...event }));
    expect(events).toEqual([{ type: "hit", index: 15, left: 0 }]);
    expect(world.bricks[15]).toBe(0);
    expect(world.score).toBe(10);
    expect(world.left).toBe(19);
    expect(ball.dy).toBeGreaterThan(0);
  });

  it("braucht für einen roten Stein 3 Treffer, jeder Treffer bringt 10 Punkte", () => {
    const world = worldWith("3........1");
    const target = cellCenter(0);
    for (const left of [2, 1, 0]) {
      flying(world, target.x, target.y + brickHeight / 2 + ballRadius + 1, 0, -1);
      step(world, 16, idle, never);
      expect(world.bricks[0]).toBe(left);
    }
    expect(world.score).toBe(30);
    expect(world.left).toBe(1);
  });

  it("kann graue Steine nicht zerschlagen und bekommt dafür keine Punkte", () => {
    const world = worldWith("#........1");
    const target = cellCenter(0);
    const ball = flying(world, target.x, target.y + brickHeight / 2 + ballRadius + 1, 0, -1);
    step(world, 16, idle, never);
    expect(world.bricks[0]).toBe(solid);
    expect(world.score).toBe(0);
    expect(ball.dy).toBeGreaterThan(0);
  });

  it("prallt seitlich von einem Stein ab", () => {
    const world = worldWith("..........\n.....1....");
    const target = cellCenter(15);
    const ball = flying(world, target.x - brickWidth / 2 - ballRadius - 1, target.y, 1, 0.6);
    step(world, 16, idle, never);
    expect(ball.dx).toBeLessThan(0);
    expect(world.bricks[15]).toBe(0);
  });

  it("fliegt auch bei einem langen Bild nicht durch einen Stein hindurch", () => {
    const world = worldWith("..........\n..........\n..........\n..........\n..........\n..........\n..........\n..........\n..........\n..........\n.....1....");
    const target = cellCenter(105);
    const ball = flying(world, target.x, target.y + 30, 0, -1);
    world.level = 9;
    step(world, 100, idle, never);
    expect(world.bricks[105]).toBe(0);
    expect(ball.dy).toBeGreaterThan(0);
  });

  it("trifft an der Fuge zwischen zwei Steinen nur einen und prallt sauber zurück", () => {
    const world = worldWith("1111111111");
    const seam = wall + 5 * brickWidth;
    const ball = flying(world, seam, brickTop + brickHeight + ballRadius + 1, 0, -1);
    step(world, 16, idle, never);
    expect(breakableCount(world.bricks)).toBe(9);
    expect(ball.dy).toBeGreaterThan(0);
    expect(ball.dx).toBe(0);
  });
});

describe("Leben", () => {
  it("kostet ein Leben, wenn der letzte Ball unten rausfällt; dann liegt ein neuer Ball auf dem Schläger", () => {
    const world = worldWith("1.........");
    world.wideLeft = 5000;
    world.slowLeft = 5000;
    world.falling.push({ kind: "ball", x: 100, y: 300 });
    flying(world, 40, height - 2, 0, 1);
    const events = run(world, 100);
    expect(events).toEqual(["lost"]);
    expect(world.lives).toBe(2);
    expect(world.balls).toHaveLength(1);
    expect(world.balls[0]?.resting).toBe(true);
    expect(world.falling).toEqual([]);
    expect(world.wideLeft).toBe(0);
    expect(world.slowLeft).toBe(0);
    expect(world.phase).toBe("playing");
  });

  it("kostet kein Leben, solange noch ein anderer Ball im Spiel ist", () => {
    const world = worldWith("1.........");
    const keep: Ball = { x: 200, y: 300, dx: 0.6, dy: -0.8, resting: false };
    flying(world, 40, height - 2, 0, 1);
    world.balls.push(keep);
    const events = run(world, 100);
    expect(events).toEqual([]);
    expect(world.lives).toBe(startLives);
    expect(world.balls).toEqual([keep]);
  });

  it("ist mit dem letzten Leben vorbei", () => {
    const world = worldWith("1.........");
    world.lives = 1;
    flying(world, 40, height - 2, 0, 1);
    const events = run(world, 200);
    expect(events).toEqual(["over"]);
    expect(world.lives).toBe(0);
    expect(world.phase).toBe("over");
    expect(run(world, 200, { move: 30, dir: 0, launch: true })).toEqual([]);
  });
});

describe("Level geschafft", () => {
  it("ist geschafft, wenn alle zerbrechlichen Steine weg sind; graue zählen nicht", () => {
    const world = worldWith("#1######..");
    const target = cellCenter(1);
    flying(world, target.x, target.y + brickHeight / 2 + ballRadius + 1, 0, -1);
    const events = run(world, 32);
    expect(events).toEqual(["hit", "cleared"]);
    expect(world.phase).toBe("cleared");
    expect(world.left).toBe(0);
    expect(run(world, 500)).toEqual([]);
  });
});

describe("Extras", () => {
  it("fällt manchmal aus einem zerstörten Stein", () => {
    const world = worldWith("1111111111");
    const target = cellCenter(3);
    flying(world, target.x, target.y + brickHeight / 2 + ballRadius + 1, 0, -1);
    step(world, 16, idle, always);
    expect(world.falling).toHaveLength(1);
    expect(world.falling[0]).toMatchObject({ kind: "breit", x: target.x });
    expect(world.falling[0]?.y).toBeGreaterThanOrEqual(target.y);
    expect(world.falling[0]?.y).toBeLessThan(target.y + 2);
    const none = worldWith("1111111111");
    flying(none, target.x, target.y + brickHeight / 2 + ballRadius + 1, 0, -1);
    step(none, 16, idle, never);
    expect(none.falling).toEqual([]);
  });

  it("fällt nicht aus angeschlagenen Steinen, nur aus zerstörten", () => {
    const world = worldWith("2222222222");
    const target = cellCenter(3);
    flying(world, target.x, target.y + brickHeight / 2 + ballRadius + 1, 0, -1);
    step(world, 16, idle, always);
    expect(world.falling).toEqual([]);
  });

  it("macht den Schläger 20 Sekunden lang breiter", () => {
    const world = worldWith("1.........");
    flying(world, 300, 200, 0.6, -0.8);
    world.falling.push({ kind: "breit", x: world.paddleX, y: paddleY - 20 });
    const events = run(world, 400);
    expect(events).toContain("caught");
    expect(currentPaddleWidth(world)).toBe(widePaddleWidth);
    world.wideLeft = 100;
    run(world, 200);
    expect(currentPaddleWidth(world)).toBe(paddleWidth);
    expect(wideMs).toBe(20_000);
  });

  it("macht alle Bälle 15 Sekunden lang langsamer", () => {
    const world = worldWith("1.........");
    flying(world, 300, 200, 0.6, -0.8);
    world.falling.push({ kind: "langsam", x: world.paddleX, y: paddleY - 10 });
    run(world, 200);
    expect(currentSpeed(world)).toBeCloseTo(ballSpeed(0) * slowFactor);
    expect(world.slowLeft).toBeGreaterThan(slowMs - 300);
    world.slowLeft = 100;
    run(world, 200);
    expect(currentSpeed(world)).toBe(ballSpeed(0));
  });

  it("bringt einen zweiten Ball ins Spiel, höchstens 3 auf einmal", () => {
    const world = worldWith("1.........");
    flying(world, 300, 200, 0.6, -0.8);
    for (let i = 0; i < 4; i++) {
      world.falling.push({ kind: "ball", x: world.paddleX, y: paddleY - 4 });
      run(world, 16);
    }
    expect(world.balls).toHaveLength(maxBalls);
    expect(world.balls.every((ball) => !ball.resting)).toBe(true);
  });

  it("verschwindet, wenn man es nicht fängt", () => {
    const world = worldWith("1.........");
    flying(world, 300, 200, 0.6, -0.8);
    world.falling.push({ kind: "ball", x: 30, y: paddleY + 20 });
    world.paddleX = width - 60;
    run(world, 1000);
    expect(world.falling).toEqual([]);
    expect(world.balls).toHaveLength(1);
  });
});

describe("Sicherheitsnetz", () => {
  it("gibt einem Ball, der lange nichts trifft, einen kleinen Schubs in eine neue Richtung", () => {
    const world = worldWith("1.........");
    const ball = flying(world, 200, 300, 0, -1);
    world.calm = calmLimitMs;
    step(world, 16, idle, () => 0.5);
    expect(ball.dx).not.toBe(0);
    expect(Math.abs(ball.dy)).toBeGreaterThanOrEqual(0.5);
    expect(world.calm).toBe(0);
  });
});

describe("Alle Level lassen sich durchspielen", () => {
  it.each(levels.map((_level, index) => [index + 1, index] as const))("Level %i: ein Computer-Spieler schafft es in höchstens 15 Spielminuten, ohne dass ein Ball in einem Stein oder außerhalb landet", (_number, index) => {
    const random = seeded(1000 + index);
    const world = createWorld(runAt(index, 0, startLives));
    let aim = 0;
    let elapsed = 0;
    while (world.phase === "playing" && elapsed < 15 * 60_000) {
      world.lives = startLives;
      const target = world.balls.filter((ball) => !ball.resting && ball.dy > 0).sort((a, b) => b.y - a.y)[0];
      if (elapsed % 1500 < 16) {
        aim = (random() - 0.5) * 50;
      }
      const goal = target === undefined ? world.paddleX : target.x + aim;
      step(world, 16, { move: goal - world.paddleX, dir: 0, launch: true }, random);
      elapsed += 16;
      for (const ball of world.balls) {
        expect(insideBrick(world, ball)).toBe(false);
        expect(ball.x).toBeGreaterThanOrEqual(wall + ballRadius - 1e-6);
        expect(ball.x).toBeLessThanOrEqual(width - wall - ballRadius + 1e-6);
        expect(ball.y).toBeGreaterThanOrEqual(wall + ballRadius - 1e-6);
        expect(Math.abs(ball.dy)).toBeGreaterThanOrEqual(0.49);
      }
    }
    expect(world.phase).toBe("cleared");
    expect(world.score).toBe((levels[index]?.cells ?? []).filter((cell) => cell > 0).reduce((sum, cell) => sum + cell * 10, 0));
  });
});
