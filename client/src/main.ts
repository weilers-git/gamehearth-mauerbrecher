import Phaser from "phaser";
import { connectSolo } from "@gamehearth/sdk/client";
import { createWorld, height, runFromWorld, width, type GameEvent, type World } from "../../src/play";
import { afterLevel, freshSave, newRun, readSave, type Run, type Save } from "../../src/rules";
import { mountControls } from "./controls";
import { colors, WallScene, zoom } from "./scene";
import { keyAction, levelText, livesLabel, livesText, menuFor, pointsText, recordLine, type MenuChoice, type MenuScreen } from "./view";

const saveEveryMs = 1000;

function byId(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (node === null) {
    throw new Error(`#${id} fehlt in index.html`);
  }
  return node;
}

async function start(): Promise<void> {
  try {
    const game = await connectSolo<Save, "punkte">();
    let save = readSave(game.saved);
    let world: World | undefined;
    let paused = true;
    let screen: MenuScreen = { kind: "start", run: save.run };
    let saveTimer: ReturnType<typeof setTimeout> | undefined;

    const field = byId("field");
    const menu = byId("menu");
    const entries = byId("entries");
    const pauseButton = byId("pause") as HTMLButtonElement;

    const playing = () => world !== undefined && world.phase === "playing";

    const currentRun = (): Run | null => (world !== undefined && world.phase === "playing" ? runFromWorld(world) : save.run);

    const persist = async () => {
      clearTimeout(saveTimer);
      saveTimer = undefined;
      if (world !== undefined && world.phase === "playing") {
        save = { format: 1, run: runFromWorld(world) };
      }
      await game.save(save);
    };

    const persistSoon = () => {
      saveTimer ??= setTimeout(() => void persist(), saveEveryMs);
    };

    const showHud = () => {
      const run = currentRun();
      byId("level").textContent = run === null ? "" : levelText(run.level);
      byId("score").textContent = run === null ? "" : pointsText(run.score);
      const lives = byId("lives");
      lives.textContent = run === null ? "" : livesText(run.lives);
      lives.setAttribute("aria-label", run === null ? "" : livesLabel(run.lives));
    };

    const showMenu = (next: MenuScreen) => {
      screen = next;
      paused = true;
      controls.enabled = false;
      const content = menuFor(next);
      byId("heading").textContent = content.heading;
      byId("message").textContent = content.message;
      byId("record").textContent = recordLine(game.best.punkte);
      entries.replaceChildren(
        ...content.entries.map((entry) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = entry.label;
          button.addEventListener("click", () => void choose(entry.id));
          return button;
        }),
      );
      pauseButton.hidden = true;
      menu.hidden = false;
      entries.querySelector("button")?.focus();
      showHud();
    };

    const hideMenu = () => {
      menu.hidden = true;
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      pauseButton.hidden = false;
      paused = false;
      controls.enabled = true;
      showHud();
    };

    const play = (run: Run) => {
      clearTimeout(saveTimer);
      saveTimer = undefined;
      world = createWorld(run);
      phaser.scene.start("mauer", { world });
      hideMenu();
    };

    const startNew = async () => {
      save = { format: 1, run: newRun() };
      await game.save(save);
      play(save.run as Run);
    };

    const pauseGame = () => {
      if (paused || world === undefined || world.phase !== "playing") {
        return;
      }
      showMenu({ kind: "pause", run: runFromWorld(world) });
      void persist();
    };

    const levelDone = async (done: World) => {
      clearTimeout(saveTimer);
      saveTimer = undefined;
      paused = true;
      controls.enabled = false;
      const next = afterLevel(done.level, done.score, done.lives);
      save = { format: 1, run: next };
      await game.save(save);
      await game.record("punkte", done.score);
      showMenu(next === null ? { kind: "won", score: done.score, best: game.best.punkte } : { kind: "cleared", level: done.level, score: done.score });
    };

    const gameOver = async (done: World) => {
      clearTimeout(saveTimer);
      saveTimer = undefined;
      paused = true;
      controls.enabled = false;
      save = freshSave();
      await game.save(save);
      await game.record("punkte", done.score);
      showMenu({ kind: "over", score: done.score, best: game.best.punkte });
    };

    const handle = async (current: World, events: readonly GameEvent[]) => {
      const happened = events.map((event) => event.type === "hit" && event.left === 0 ? "destroyed" : event.type);
      showHud();
      if (happened.includes("cleared")) {
        await levelDone(current);
      } else if (happened.includes("over")) {
        await gameOver(current);
      } else if (happened.includes("lost")) {
        await persist();
      } else if (happened.includes("destroyed")) {
        persistSoon();
      }
    };

    const choose = async (choice: MenuChoice) => {
      const run = currentRun();
      switch (choice) {
        case "weiterspielen":
        case "naechstes":
          if (save.run !== null) {
            play(save.run);
          }
          break;
        case "fortsetzen":
          hideMenu();
          break;
        case "neu":
          if (run !== null) {
            showMenu({ kind: "confirm", run, back: screen.kind === "pause" ? "pause" : "start" });
          } else {
            await startNew();
          }
          break;
        case "neu-sicher":
          if (run !== null) {
            await game.record("punkte", run.score);
          }
          await startNew();
          break;
        case "zurueck":
          if (screen.kind === "confirm") {
            showMenu(screen.back === "pause" ? { kind: "pause", run: screen.run } : { kind: "start", run: screen.run });
          }
          break;
      }
    };

    const controls = mountControls(field, width, pauseGame);
    const scene = new WallScene({ controls, paused: () => paused, onStep: (current, events) => void handle(current, events) });
    const phaser = new Phaser.Game({
      type: Phaser.AUTO,
      parent: field,
      width: width * zoom,
      height: height * zoom,
      backgroundColor: colors.background,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      banner: false,
      audio: { noAudio: true },
      scene,
    });

    pauseButton.addEventListener("click", pauseGame);
    addEventListener("keydown", (event) => {
      if (!event.defaultPrevented && !event.repeat && screen.kind === "pause" && paused && keyAction(event.key) === "pause") {
        event.preventDefault();
        hideMenu();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        pauseGame();
        void persist();
      }
    });
    addEventListener("blur", () => {
      if (playing()) {
        pauseGame();
      }
    });
    addEventListener("pagehide", () => void persist());

    showMenu(screen);
  } catch (error) {
    const fallback = byId("fallback");
    fallback.textContent = `Dieses Spiel läuft nur in Gamehearth. Zum Ausprobieren: npm run dev. ${error instanceof Error ? error.message : ""}`;
    fallback.hidden = false;
  }
}

void start();
