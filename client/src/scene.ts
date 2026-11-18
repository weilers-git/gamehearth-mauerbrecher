import Phaser from "phaser";
import { solid } from "../../src/levels";
import {
  ballRadius,
  brickHeight,
  brickWidth,
  cellCenter,
  currentPaddleWidth,
  extraHeight,
  extraWidth,
  height,
  maxBalls,
  maxFalling,
  paddleHeight,
  paddleWidth,
  paddleY,
  step,
  wall,
  width,
  type ExtraKind,
  type GameEvent,
  type World,
} from "../../src/play";
import type { Controls } from "./controls";
import { effectsText, extraLabels, frameMs, restingHint } from "./view";

export const zoom = 2;

export const colors = {
  background: 0x141a2e,
  wall: 0x3b4670,
  bricks: [0x000000, 0x5ec27a, 0xf2b84b, 0xe5584f],
  solid: 0x8d93a8,
  solidEdge: 0x5d6276,
  ball: 0xf6f1e7,
  paddle: 0x8fd0ff,
  text: "#f6f1e7",
  extras: { breit: 0x3f9e5c, ball: 0xd9822b, langsam: 0x6a5bd6 } satisfies Record<ExtraKind, number>,
};

const font = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export interface SceneHooks {
  controls: Controls;
  paused(): boolean;
  onStep(world: World, events: readonly GameEvent[]): void;
}

interface Capsule {
  body: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  kind: ExtraKind | undefined;
}

export class WallScene extends Phaser.Scene {
  readonly #hooks: SceneHooks;
  #world: World | undefined;
  #bricks: (Phaser.GameObjects.Rectangle | undefined)[] = [];
  #balls: Phaser.GameObjects.Arc[] = [];
  #capsules: Capsule[] = [];
  #paddle: Phaser.GameObjects.Rectangle | undefined;
  #hint: Phaser.GameObjects.Text | undefined;
  #effects: Phaser.GameObjects.Text | undefined;
  #justLost = false;

  constructor(hooks: SceneHooks) {
    super("mauer");
    this.#hooks = hooks;
  }

  init(data: { world?: World }): void {
    this.#world = data.world;
    this.#bricks = [];
    this.#balls = [];
    this.#capsules = [];
    this.#paddle = undefined;
    this.#hint = undefined;
    this.#effects = undefined;
    this.#justLost = false;
  }

  create(): void {
    const camera = this.cameras.main;
    camera.setBackgroundColor(colors.background);
    camera.setZoom(zoom);
    camera.centerOn(width / 2, height / 2);
    this.add.rectangle(wall / 2, height / 2, wall, height, colors.wall);
    this.add.rectangle(width - wall / 2, height / 2, wall, height, colors.wall);
    this.add.rectangle(width / 2, wall / 2, width, wall, colors.wall);
    const world = this.#world;
    if (world === undefined) {
      return;
    }
    world.bricks.forEach((cell, index) => {
      if (cell === 0) {
        this.#bricks.push(undefined);
        return;
      }
      const spot = cellCenter(index);
      const brick = this.add.rectangle(spot.x, spot.y, brickWidth - 3, brickHeight - 3, cell === solid ? colors.solid : (colors.bricks[cell] ?? colors.solid));
      brick.setRounded(3);
      if (cell === solid) {
        brick.setStrokeStyle(2, colors.solidEdge);
      }
      this.#bricks.push(brick);
    });
    this.#paddle = this.add.rectangle(world.paddleX, paddleY + paddleHeight / 2, paddleWidth, paddleHeight, colors.paddle).setRounded(paddleHeight / 2);
    for (let i = 0; i < maxBalls; i++) {
      this.#balls.push(this.add.circle(0, 0, ballRadius, colors.ball).setVisible(false));
    }
    for (let i = 0; i < maxFalling; i++) {
      const body = this.add.rectangle(0, 0, extraWidth, extraHeight, colors.extras.breit).setRounded(extraHeight / 2).setVisible(false);
      const label = this.add
        .text(0, 0, "", { fontFamily: font, fontSize: "10px", fontStyle: "bold", color: "#ffffff", resolution: zoom * 2 })
        .setOrigin(0.5)
        .setVisible(false);
      this.#capsules.push({ body, label, kind: undefined });
    }
    this.#hint = this.add
      .text(width / 2, 420, "", { fontFamily: font, fontSize: "17px", color: colors.text, align: "center", lineSpacing: 6, resolution: zoom * 2 })
      .setOrigin(0.5);
    this.#effects = this.add
      .text(width - wall - 6, wall + 8, "", { fontFamily: font, fontSize: "13px", color: colors.text, resolution: zoom * 2 })
      .setOrigin(1, 0);
    this.#render(world);
  }

  override update(_time: number, delta: number): void {
    const world = this.#world;
    if (world === undefined) {
      return;
    }
    if (!this.#hooks.paused() && world.phase === "playing") {
      const events = step(world, frameMs(delta), this.#hooks.controls.take(), Math.random);
      for (const event of events) {
        if (event.type === "hit") {
          this.#showHit(event.index, event.left);
        } else if (event.type === "lost") {
          this.#justLost = true;
        }
      }
      if (events.length > 0) {
        this.#hooks.onStep(world, events);
      }
    }
    this.#render(world);
  }

  #showHit(index: number, left: number): void {
    const brick = this.#bricks[index];
    if (brick === undefined) {
      return;
    }
    if (left <= 0) {
      brick.setVisible(false);
    } else {
      brick.setFillStyle(colors.bricks[left] ?? colors.solid);
    }
  }

  #render(world: World): void {
    const paddle = this.#paddle;
    if (paddle !== undefined) {
      paddle.setPosition(world.paddleX, paddleY + paddleHeight / 2);
      paddle.scaleX = currentPaddleWidth(world) / paddleWidth;
    }
    this.#balls.forEach((sprite, i) => {
      const ball = world.balls[i];
      sprite.setVisible(ball !== undefined);
      if (ball !== undefined) {
        sprite.setPosition(ball.x, ball.y);
      }
    });
    this.#capsules.forEach((capsule, i) => {
      const extra = world.falling[i];
      capsule.body.setVisible(extra !== undefined);
      capsule.label.setVisible(extra !== undefined);
      if (extra === undefined) {
        return;
      }
      if (capsule.kind !== extra.kind) {
        capsule.kind = extra.kind;
        capsule.body.setFillStyle(colors.extras[extra.kind]);
        capsule.label.setText(extraLabels[extra.kind]);
      }
      capsule.body.setPosition(extra.x, extra.y);
      capsule.label.setPosition(extra.x, extra.y);
    });
    const resting = world.phase === "playing" && world.balls.some((ball) => ball.resting);
    if (!resting) {
      this.#justLost = false;
    }
    const hint = resting ? restingHint(this.#justLost, world.lives) : "";
    if (this.#hint !== undefined && this.#hint.text !== hint) {
      this.#hint.setText(hint);
    }
    const effects = effectsText(world.wideLeft, world.slowLeft);
    if (this.#effects !== undefined && this.#effects.text !== effects) {
      this.#effects.setText(effects);
    }
  }
}
