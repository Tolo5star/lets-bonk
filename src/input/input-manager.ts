import type { MoverInput, FighterInput } from "../game/types";
import { KeyboardInput } from "./keyboard";
import { TouchInput } from "./touch-input";
import { isTouchDevice } from "./detect-device";

export class InputManager {
  private keyboard = new KeyboardInput();
  private touch: TouchInput | null = null;
  private _isTouchActive = false;

  get isTouchActive() {
    return this._isTouchActive;
  }

  constructor() {
    if (isTouchDevice()) {
      this.touch = new TouchInput();
      this._isTouchActive = true;
    }
  }

  /** Called by React after touch control elements are rendered */
  mountTouchControls(elements: {
    joystickContainer: HTMLElement;
    dashBtn: HTMLElement;
    attackBtn: HTMLElement;
    blockBtn: HTMLElement;
    healBtn: HTMLElement;
  }) {
    if (this.touch) {
      this.touch.mount(elements);
    }
  }

  getMoverInput(): MoverInput {
    const kb = this.keyboard.getMoverInput();

    if (this.touch) {
      const touch = this.touch.getMoverInput();
      // Merge: take whichever has larger magnitude, OR any dash
      const kbMag = Math.abs(kb.moveX) + Math.abs(kb.moveY);
      const touchMag = Math.abs(touch.moveX) + Math.abs(touch.moveY);

      return {
        moveX: touchMag > kbMag ? touch.moveX : kb.moveX,
        moveY: touchMag > kbMag ? touch.moveY : kb.moveY,
        dash: kb.dash || touch.dash,
      };
    }

    return kb;
  }

  getFighterInput(): FighterInput {
    const kb = this.keyboard.getFighterInput();

    if (this.touch) {
      const touch = this.touch.getFighterInput();
      // Merge: OR all booleans
      return {
        attackStart: kb.attackStart || touch.attackStart,
        attackHold: kb.attackHold || touch.attackHold,
        attackRelease: kb.attackRelease || touch.attackRelease,
        blockHold: kb.blockHold || touch.blockHold,
        healHold: kb.healHold || touch.healHold,
      };
    }

    return kb;
  }

  destroy() {
    this.keyboard.destroy();
    this.touch?.destroy();
  }
}
