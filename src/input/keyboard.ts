import type { MoverInput, FighterInput } from "../game/types";

export class KeyboardInput {
  private keys = new Set<string>();
  private attackPressed = false;
  private attackJustPressed = false;
  private attackJustReleased = false;

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    this.keys.add(key);

    // Track attack press/release for hold detection
    if (key === "j" && !this.attackPressed) {
      this.attackPressed = true;
      this.attackJustPressed = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    this.keys.delete(key);

    if (key === "j" && this.attackPressed) {
      this.attackPressed = false;
      this.attackJustReleased = true;
    }
  };

  getMoverInput(): MoverInput {
    let moveX = 0;
    let moveY = 0;

    if (this.keys.has("w") || this.keys.has("arrowup")) moveY = -1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) moveY = 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) moveX = -1;
    if (this.keys.has("d") || this.keys.has("arrowright")) moveX = 1;

    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      const len = Math.sqrt(moveX * moveX + moveY * moveY);
      moveX /= len;
      moveY /= len;
    }

    const dash = this.keys.has(" "); // spacebar

    return { moveX, moveY, dash };
  }

  getFighterInput(): FighterInput {
    const input: FighterInput = {
      attackStart: this.attackJustPressed,
      attackHold: this.attackPressed,
      attackRelease: this.attackJustReleased,
      blockHold: this.keys.has("k"),
      healHold: this.keys.has("l"),
    };

    // Clear one-shot flags
    this.attackJustPressed = false;
    this.attackJustReleased = false;

    return input;
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}
