import type { Input } from "../../src/play";
import { isTap, keyAction, pressKey, releaseKey, steerDirection, toField, type Steer } from "./view";

export interface Controls {
  enabled: boolean;
  take(): Input;
  reset(): void;
}

interface Finger {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  startedAt: number;
  farthest: number;
}

export function mountControls(field: HTMLElement, fieldWidth: number, onPause: () => void): Controls {
  const input: Input = { move: 0, dir: 0, launch: false };
  let move = 0;
  let launch = false;
  let keys: Steer[] = [];
  let finger: Finger | undefined;
  let enabled = false;

  const shownWidth = () => field.querySelector("canvas")?.getBoundingClientRect().width ?? field.clientWidth;

  const letGo = () => {
    keys = [];
    finger = undefined;
    move = 0;
    launch = false;
  };

  field.addEventListener("pointerdown", (event) => {
    if (!enabled || finger !== undefined) {
      return;
    }
    event.preventDefault();
    finger = { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, startedAt: performance.now(), farthest: 0 };
    field.setPointerCapture(event.pointerId);
  });
  field.addEventListener("pointermove", (event) => {
    if (finger === undefined || event.pointerId !== finger.id) {
      return;
    }
    move += toField(event.clientX - finger.lastX, shownWidth(), fieldWidth);
    finger.lastX = event.clientX;
    finger.farthest = Math.max(finger.farthest, Math.hypot(event.clientX - finger.startX, event.clientY - finger.startY));
  });
  field.addEventListener("pointerup", (event) => {
    if (finger === undefined || event.pointerId !== finger.id) {
      return;
    }
    if (enabled && isTap(performance.now() - finger.startedAt, finger.farthest)) {
      launch = true;
    }
    finger = undefined;
  });
  const cancel = (event: PointerEvent) => {
    if (finger !== undefined && event.pointerId === finger.id) {
      finger = undefined;
    }
  };
  field.addEventListener("pointercancel", cancel);
  field.addEventListener("lostpointercapture", cancel);

  addEventListener("keydown", (event) => {
    const action = keyAction(event.key);
    if (!enabled || action === undefined) {
      return;
    }
    event.preventDefault();
    if (action === "left" || action === "right") {
      keys = pressKey(keys, action);
    } else if (action === "launch") {
      launch = true;
    } else if (!event.repeat) {
      onPause();
    }
  });
  addEventListener("keyup", (event) => {
    const action = keyAction(event.key);
    if (action === "left" || action === "right") {
      keys = releaseKey(keys, action);
    }
  });
  addEventListener("blur", letGo);

  return {
    get enabled() {
      return enabled;
    },
    set enabled(value: boolean) {
      enabled = value;
      letGo();
    },
    take() {
      input.move = enabled ? move : 0;
      input.dir = enabled ? steerDirection(keys) : 0;
      input.launch = enabled && launch;
      move = 0;
      launch = false;
      return input;
    },
    reset: letGo,
  };
}
