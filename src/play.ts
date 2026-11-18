import { breakableCount, columns, gridText, levels, solid } from "./levels";
import { pointsPerHit, readBricks, type Run } from "./rules";

export const width = 360;
export const height = 600;
export const wall = 10;
export const brickTop = 50;
export const brickWidth = (width - 2 * wall) / columns;
export const brickHeight = 16;
export const paddleY = 540;
export const paddleHeight = 12;
export const paddleWidth = 64;
export const widePaddleWidth = 96;
export const ballRadius = 6;
export const paddleSpeed = 420;
export const maxBalls = 3;
export const extraChance = 0.15;
export const maxFalling = 3;
export const fallSpeed = 110;
export const extraWidth = 56;
export const extraHeight = 16;
export const wideMs = 20_000;
export const slowMs = 15_000;
export const slowFactor = 0.6;
export const maxBounceAngle = Math.PI / 3;
export const calmLimitMs = 12_000;

const maxStep = 2;
const eps = 1e-6;

export type ExtraKind = "breit" | "ball" | "langsam";
export const extraKinds: readonly ExtraKind[] = ["breit", "ball", "langsam"];

export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  resting: boolean;
}

export interface Falling {
  kind: ExtraKind;
  x: number;
  y: number;
}

export type Phase = "playing" | "cleared" | "over";

export type GameEvent =
  | { type: "hit"; index: number; left: number }
  | { type: "caught"; kind: ExtraKind }
  | { type: "lost" }
  | { type: "over" }
  | { type: "cleared" };

export interface World {
  level: number;
  score: number;
  lives: number;
  rows: number;
  bricks: number[];
  left: number;
  paddleX: number;
  balls: Ball[];
  falling: Falling[];
  wideLeft: number;
  slowLeft: number;
  calm: number;
  phase: Phase;
  events: GameEvent[];
}

export interface Input {
  move: number;
  dir: number;
  launch: boolean;
}

export type Random = () => number;

export function ballSpeed(level: number): number {
  return 280 + 12 * level;
}

export function currentSpeed(world: World): number {
  return ballSpeed(world.level) * (world.slowLeft > 0 ? slowFactor : 1);
}

export function currentPaddleWidth(world: World): number {
  return world.wideLeft > 0 ? widePaddleWidth : paddleWidth;
}

export function cellCenter(index: number): { x: number; y: number } {
  const col = index % columns;
  const row = Math.floor(index / columns);
  return { x: wall + (col + 0.5) * brickWidth, y: brickTop + (row + 0.5) * brickHeight };
}

function restingBall(world: World): Ball {
  return { x: world.paddleX, y: paddleY - ballRadius, dx: 0, dy: -1, resting: true };
}

export function createWorld(run: Run): World {
  const plan = levels[run.level];
  const bricks = readBricks(run.level, run.bricks);
  if (plan === undefined || bricks === undefined) {
    throw new Error(`Der Stand für Level ${run.level + 1} passt nicht zu diesem Level`);
  }
  const world: World = {
    level: run.level,
    score: run.score,
    lives: run.lives,
    rows: plan.rows,
    bricks,
    left: breakableCount(bricks),
    paddleX: width / 2,
    balls: [],
    falling: [],
    wideLeft: 0,
    slowLeft: 0,
    calm: 0,
    phase: "playing",
    events: [],
  };
  if (!restoreMotion(world, run.motion)) {
    world.balls.push(restingBall(world));
  }
  return world;
}

function finite(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function restoreMotion(world: World, motion: unknown): boolean {
  if (motion === null || typeof motion !== "object") {
    return false;
  }
  const raw = motion as Record<string, unknown>;
  const balls = raw["balls"];
  const falling = raw["falling"];
  if (
    !finite(raw["paddleX"], wall, width - wall) ||
    !finite(raw["wideLeft"], 0, wideMs) ||
    !finite(raw["slowLeft"], 0, slowMs) ||
    !finite(raw["calm"], 0, calmLimitMs * 2) ||
    !Array.isArray(balls) ||
    balls.length < 1 ||
    balls.length > maxBalls ||
    !Array.isArray(falling) ||
    falling.length > maxFalling
  ) {
    return false;
  }
  const restoredBalls: Ball[] = [];
  for (const ball of balls as unknown[]) {
    const entry = ball !== null && typeof ball === "object" ? (ball as Record<string, unknown>) : {};
    if (!finite(entry["x"], 0, width) || !finite(entry["y"], 0, height) || !finite(entry["dx"], -1, 1) || !finite(entry["dy"], -1, 1) || typeof entry["resting"] !== "boolean") {
      return false;
    }
    restoredBalls.push({ x: entry["x"], y: entry["y"], dx: entry["dx"], dy: entry["dy"], resting: entry["resting"] });
  }
  const restoredFalling: Falling[] = [];
  for (const extra of falling as unknown[]) {
    const entry = extra !== null && typeof extra === "object" ? (extra as Record<string, unknown>) : {};
    const kind = entry["kind"];
    if (typeof kind !== "string" || !(extraKinds as readonly string[]).includes(kind) || !finite(entry["x"], 0, width) || !finite(entry["y"], 0, height)) {
      return false;
    }
    restoredFalling.push({ kind: kind as ExtraKind, x: entry["x"], y: entry["y"] });
  }
  world.paddleX = raw["paddleX"];
  world.wideLeft = raw["wideLeft"];
  world.slowLeft = raw["slowLeft"];
  world.calm = raw["calm"];
  world.balls = restoredBalls;
  world.falling = restoredFalling;
  return true;
}

export function runFromWorld(world: World): Run {
  return {
    level: world.level,
    score: world.score,
    lives: world.lives,
    bricks: gridText(world.bricks),
    motion: {
      paddleX: world.paddleX,
      balls: world.balls.map((ball) => ({ x: ball.x, y: ball.y, dx: ball.dx, dy: ball.dy, resting: ball.resting })),
      falling: world.falling.map((extra) => ({ kind: extra.kind, x: extra.x, y: extra.y })),
      wideLeft: world.wideLeft,
      slowLeft: world.slowLeft,
      calm: world.calm,
    },
  };
}

function aim(ball: Ball, angle: number): void {
  ball.dx = Math.sin(angle);
  ball.dy = -Math.cos(angle);
}

function movePaddle(world: World, delta: number): void {
  const half = currentPaddleWidth(world) / 2;
  world.paddleX = Math.min(width - wall - half, Math.max(wall + half, world.paddleX + delta));
}

function overlappingBrick(world: World, ball: Ball): number {
  const left = ball.x - ballRadius;
  const right = ball.x + ballRadius;
  const top = ball.y - ballRadius;
  const bottom = ball.y + ballRadius;
  const c0 = Math.max(0, Math.floor((left - wall + eps) / brickWidth));
  const c1 = Math.min(columns - 1, Math.floor((right - wall - eps) / brickWidth));
  const r0 = Math.max(0, Math.floor((top - brickTop + eps) / brickHeight));
  const r1 = Math.min(world.rows - 1, Math.floor((bottom - brickTop - eps) / brickHeight));
  let best = -1;
  let bestArea = 0;
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      const index = row * columns + col;
      if (world.bricks[index] === 0) {
        continue;
      }
      const cellLeft = wall + col * brickWidth;
      const cellTop = brickTop + row * brickHeight;
      const overlapX = Math.min(right, cellLeft + brickWidth) - Math.max(left, cellLeft);
      const overlapY = Math.min(bottom, cellTop + brickHeight) - Math.max(top, cellTop);
      if (overlapX <= eps || overlapY <= eps) {
        continue;
      }
      if (overlapX * overlapY > bestArea) {
        bestArea = overlapX * overlapY;
        best = index;
      }
    }
  }
  return best;
}

function dropExtra(world: World, index: number, random: Random): void {
  if (world.falling.length >= maxFalling || random() >= extraChance) {
    return;
  }
  const kind = extraKinds[Math.min(extraKinds.length - 1, Math.floor(random() * extraKinds.length))] ?? "breit";
  const spot = cellCenter(index);
  world.falling.push({ kind, x: spot.x, y: spot.y });
}

function hitBrick(world: World, index: number, random: Random): void {
  const cell = world.bricks[index] ?? 0;
  if (cell === solid || cell <= 0) {
    return;
  }
  const left = cell - 1;
  world.bricks[index] = left;
  world.score += pointsPerHit;
  world.calm = 0;
  world.events.push({ type: "hit", index, left });
  if (left > 0) {
    return;
  }
  world.left -= 1;
  if (world.left <= 0) {
    world.phase = "cleared";
    world.falling.length = 0;
    world.events.push({ type: "cleared" });
    return;
  }
  dropExtra(world, index, random);
}

function collideX(world: World, ball: Ball, random: Random): void {
  if (ball.x - ballRadius < wall) {
    ball.x = wall + ballRadius;
    ball.dx = Math.abs(ball.dx);
  } else if (ball.x + ballRadius > width - wall) {
    ball.x = width - wall - ballRadius;
    ball.dx = -Math.abs(ball.dx);
  }
  const hit = overlappingBrick(world, ball);
  if (hit < 0) {
    return;
  }
  const cellLeft = wall + (hit % columns) * brickWidth;
  ball.x = ball.dx > 0 ? cellLeft - ballRadius : cellLeft + brickWidth + ballRadius;
  ball.dx = -ball.dx;
  hitBrick(world, hit, random);
}

function bounceOffPaddle(world: World, ball: Ball): void {
  const reach = currentPaddleWidth(world) / 2 + ballRadius;
  const offset = Math.max(-1, Math.min(1, (ball.x - world.paddleX) / reach));
  ball.y = paddleY - ballRadius;
  aim(ball, offset * maxBounceAngle);
  world.calm = 0;
}

function collideY(world: World, ball: Ball, previousBottom: number, random: Random): void {
  if (ball.y - ballRadius < wall) {
    ball.y = wall + ballRadius;
    ball.dy = Math.abs(ball.dy);
  }
  const hit = overlappingBrick(world, ball);
  if (hit >= 0) {
    const cellTop = brickTop + Math.floor(hit / columns) * brickHeight;
    ball.y = ball.dy > 0 ? cellTop - ballRadius : cellTop + brickHeight + ballRadius;
    ball.dy = -ball.dy;
    hitBrick(world, hit, random);
    return;
  }
  const bottom = ball.y + ballRadius;
  if (ball.dy > 0 && previousBottom <= paddleY + eps && bottom >= paddleY) {
    const reach = currentPaddleWidth(world) / 2 + ballRadius;
    if (Math.abs(ball.x - world.paddleX) <= reach) {
      bounceOffPaddle(world, ball);
    }
  }
}

function moveBall(world: World, ball: Ball, distance: number, random: Random): void {
  const steps = Math.max(1, Math.ceil(distance / maxStep));
  const h = distance / steps;
  for (let i = 0; i < steps && world.phase === "playing"; i++) {
    ball.x += ball.dx * h;
    collideX(world, ball, random);
    if (world.phase !== "playing") {
      return;
    }
    const previousBottom = ball.y + ballRadius;
    ball.y += ball.dy * h;
    collideY(world, ball, previousBottom, random);
    if (ball.y - ballRadius > height) {
      return;
    }
  }
}

function launch(world: World, random: Random): void {
  for (const ball of world.balls) {
    if (ball.resting) {
      const side = random() < 0.5 ? -1 : 1;
      aim(ball, side * (0.15 + random() * 0.3));
      ball.resting = false;
      world.calm = 0;
    }
  }
}

function addBall(world: World, random: Random): void {
  if (world.balls.length >= maxBalls) {
    return;
  }
  const other = world.balls.find((ball) => !ball.resting);
  const side = other === undefined ? (random() < 0.5 ? -1 : 1) : other.dx > 0 ? -1 : 1;
  const ball: Ball = { x: world.paddleX, y: paddleY - ballRadius, dx: 0, dy: -1, resting: false };
  aim(ball, side * (0.35 + random() * 0.25));
  world.balls.push(ball);
}

function catchExtra(world: World, kind: ExtraKind, random: Random): void {
  if (kind === "breit") {
    world.wideLeft = wideMs;
    movePaddle(world, 0);
  } else if (kind === "langsam") {
    world.slowLeft = slowMs;
  } else {
    addBall(world, random);
  }
  world.events.push({ type: "caught", kind });
}

function moveFalling(world: World, seconds: number, random: Random): void {
  const half = currentPaddleWidth(world) / 2;
  for (let i = world.falling.length - 1; i >= 0; i--) {
    const extra = world.falling[i] as Falling;
    extra.y += fallSpeed * seconds;
    const caught =
      extra.y + extraHeight / 2 >= paddleY &&
      extra.y - extraHeight / 2 <= paddleY + paddleHeight &&
      extra.x + extraWidth / 2 >= world.paddleX - half &&
      extra.x - extraWidth / 2 <= world.paddleX + half;
    if (caught) {
      world.falling.splice(i, 1);
      catchExtra(world, extra.kind, random);
    } else if (extra.y - extraHeight / 2 > height) {
      world.falling.splice(i, 1);
    }
  }
}

function loseLife(world: World): void {
  world.lives = Math.max(0, world.lives - 1);
  world.falling.length = 0;
  world.wideLeft = 0;
  world.slowLeft = 0;
  world.calm = 0;
  if (world.lives === 0) {
    world.phase = "over";
    world.events.push({ type: "over" });
    return;
  }
  movePaddle(world, 0);
  world.balls.push(restingBall(world));
  world.events.push({ type: "lost" });
}

function nudge(world: World, random: Random): void {
  for (const ball of world.balls) {
    if (!ball.resting) {
      const side = ball.dx < 0 ? -1 : 1;
      const down = ball.dy > 0;
      aim(ball, side * (0.3 + random() * 0.6));
      if (down) {
        ball.dy = -ball.dy;
      }
    }
  }
  world.calm = 0;
}

export function step(world: World, ms: number, input: Input, random: Random): readonly GameEvent[] {
  world.events.length = 0;
  if (world.phase !== "playing") {
    return world.events;
  }
  const seconds = Math.max(0, ms) / 1000;
  world.wideLeft = Math.max(0, world.wideLeft - ms);
  world.slowLeft = Math.max(0, world.slowLeft - ms);
  movePaddle(world, input.move + Math.sign(input.dir) * paddleSpeed * seconds);
  for (const ball of world.balls) {
    if (ball.resting) {
      ball.x = world.paddleX;
      ball.y = paddleY - ballRadius;
    }
  }
  if (input.launch) {
    launch(world, random);
  }
  const distance = currentSpeed(world) * seconds;
  let flying = false;
  for (const ball of world.balls) {
    if (!ball.resting) {
      flying = true;
      moveBall(world, ball, distance, random);
      if (world.phase !== "playing") {
        return world.events;
      }
    }
  }
  for (let i = world.balls.length - 1; i >= 0; i--) {
    const ball = world.balls[i] as Ball;
    if (ball.y - ballRadius > height) {
      world.balls.splice(i, 1);
    }
  }
  if (world.balls.length === 0) {
    loseLife(world);
    return world.events;
  }
  moveFalling(world, seconds, random);
  if (flying) {
    world.calm += ms;
    if (world.calm > calmLimitMs) {
      nudge(world, random);
    }
  }
  return world.events;
}
