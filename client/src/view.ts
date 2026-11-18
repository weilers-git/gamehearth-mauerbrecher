import type { ExtraKind } from "../../src/play";
import { levelCount, type Run } from "../../src/rules";

export type KeyAction = "left" | "right" | "launch" | "pause";
export type Steer = "left" | "right";

export const tapMaxMs = 300;
export const tapMaxDistance = 12;

const keyActions: Record<string, KeyAction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  a: "left",
  A: "left",
  d: "right",
  D: "right",
  " ": "launch",
  ArrowUp: "launch",
  w: "launch",
  W: "launch",
  p: "pause",
  P: "pause",
  Escape: "pause",
};

export function keyAction(key: string): KeyAction | undefined {
  return Object.hasOwn(keyActions, key) ? keyActions[key] : undefined;
}

export function pressKey(keys: readonly Steer[], key: Steer): Steer[] {
  return [...keys.filter((held) => held !== key), key];
}

export function releaseKey(keys: readonly Steer[], key: Steer): Steer[] {
  return keys.filter((held) => held !== key);
}

export function steerDirection(keys: readonly Steer[]): number {
  const top = keys.at(-1);
  return top === "left" ? -1 : top === "right" ? 1 : 0;
}

export function isTap(durationMs: number, distance: number): boolean {
  return durationMs <= tapMaxMs && distance <= tapMaxDistance;
}

export function toField(screenPixels: number, shownWidth: number, fieldWidth: number): number {
  return shownWidth > 0 ? (screenPixels * fieldWidth) / shownWidth : 0;
}

export function frameMs(deltaMs: number): number {
  return Math.min(Math.max(deltaMs, 0), 100);
}

export function formatPoints(points: number): string {
  const digits = String(Math.max(0, Math.round(points)));
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function pointsText(points: number): string {
  return `${formatPoints(points)} ${points === 1 ? "Punkt" : "Punkte"}`;
}

export function levelText(level: number): string {
  return `Level ${level + 1}/${levelCount}`;
}

export function livesText(lives: number): string {
  return "♥".repeat(Math.max(0, lives));
}

export function livesLabel(lives: number): string {
  return `${lives} Leben übrig`;
}

export function effectsText(wideLeft: number, slowLeft: number): string {
  const parts: string[] = [];
  if (wideLeft > 0) {
    parts.push(`Breit ${Math.ceil(wideLeft / 1000)} s`);
  }
  if (slowLeft > 0) {
    parts.push(`Langsam ${Math.ceil(slowLeft / 1000)} s`);
  }
  return parts.join("   ");
}

export const extraLabels: Record<ExtraKind, string> = { breit: "BREIT", ball: "+BALL", langsam: "LANGSAM" };

export function restingHint(justLost: boolean, lives: number): string {
  const launch = "Tippen oder Leertaste:\nBall abschießen";
  if (!justLost) {
    return launch;
  }
  return `Ball verloren! Noch ${lives} Leben.\n${launch}`;
}

export function recordLine(best: number | undefined): string {
  return best === undefined ? "Noch keine Bestleistung." : `Bestleistung: ${pointsText(best)}`;
}

export type MenuScreen =
  | { kind: "start"; run: Run | null }
  | { kind: "pause"; run: Run }
  | { kind: "confirm"; run: Run; back: "start" | "pause" }
  | { kind: "cleared"; level: number; score: number }
  | { kind: "over"; score: number; best: number | undefined }
  | { kind: "won"; score: number; best: number | undefined };

export type MenuChoice = "weiterspielen" | "fortsetzen" | "neu" | "neu-sicher" | "zurueck" | "naechstes";

export interface MenuEntry {
  id: MenuChoice;
  label: string;
}

export interface Menu {
  heading: string;
  message: string;
  entries: MenuEntry[];
}

const howTo = "Zieh den Schläger mit dem Finger oder fahr mit den Pfeiltasten. Tippen oder Leertaste schießt den Ball ab.";

function runSummary(run: Run): string {
  return `Level ${run.level + 1}, ${pointsText(run.score)}, ${livesLabel(run.lives)}`;
}

function bestNote(score: number, best: number | undefined): string {
  return best !== undefined && best === score && score > 0 ? " Das ist deine Bestleistung!" : "";
}

export function menuFor(screen: MenuScreen): Menu {
  switch (screen.kind) {
    case "start":
      if (screen.run === null) {
        return { heading: "Mauerbrecher", message: howTo, entries: [{ id: "neu", label: "Spiel starten" }] };
      }
      return {
        heading: "Mauerbrecher",
        message: `Willkommen zurück! ${runSummary(screen.run)}.`,
        entries: [
          { id: "weiterspielen", label: "Weiterspielen" },
          { id: "neu", label: "Neues Spiel" },
        ],
      };
    case "pause":
      return {
        heading: "Pause",
        message: `${runSummary(screen.run)}. Dein Stand ist gespeichert.`,
        entries: [
          { id: "fortsetzen", label: "Weiter" },
          { id: "neu", label: "Neues Spiel" },
        ],
      };
    case "confirm":
      return {
        heading: "Neues Spiel?",
        message: `Dein Stand in Level ${screen.run.level + 1} geht dann verloren. Deine ${pointsText(screen.run.score)} kommen trotzdem in die Bestenliste.`,
        entries: [
          { id: "neu-sicher", label: "Ja, neu beginnen" },
          { id: "zurueck", label: "Zurück" },
        ],
      };
    case "cleared":
      return {
        heading: `Level ${screen.level + 1} geschafft!`,
        message: `Du hast ${pointsText(screen.score)}.`,
        entries: [{ id: "naechstes", label: `Weiter mit Level ${screen.level + 2}` }],
      };
    case "over":
      return {
        heading: "Spiel vorbei",
        message: `Du hast ${pointsText(screen.score)} geschafft.${bestNote(screen.score, screen.best)}`,
        entries: [{ id: "neu", label: "Neues Spiel" }],
      };
    case "won":
      return {
        heading: "Gewonnen!",
        message: `Alle ${levelCount} Level geschafft, ${pointsText(screen.score)}.${bestNote(screen.score, screen.best)}`,
        entries: [{ id: "neu", label: "Nochmal spielen" }],
      };
  }
}
