import type { MoverInput, FighterInput } from "../game/types";
import { TouchJoystick } from "./touch-joystick";
import { TouchButton } from "./touch-button";

/**
 * Touch input system — produces the same MoverInput / FighterInput contracts
 * as KeyboardInput, but from touch controls.
 */
export class TouchInput {
  private joystick: TouchJoystick | null = null;
  private dashButton: TouchButton | null = null;
  private attackButton: TouchButton | null = null;
  private blockButton: TouchButton | null = null;
  private healButton: TouchButton | null = null;


  /** Call after React renders the control elements */
  mount(elements: {
    joystickContainer: HTMLElement;
    dashBtn: HTMLElement;
    attackBtn: HTMLElement;
    blockBtn: HTMLElement;
    healBtn: HTMLElement;
  }) {
    this.joystick = new TouchJoystick(elements.joystickContainer);
    this.dashButton = new TouchButton(elements.dashBtn);
    this.attackButton = new TouchButton(elements.attackBtn);
    this.blockButton = new TouchButton(elements.blockBtn);
    this.healButton = new TouchButton(elements.healBtn);
  }

  getMoverInput(): MoverInput {
    let dash = false;

    if (this.dashButton) {
      const state = this.dashButton.consume();
      if (state.pressed) {
        dash = true;
      }
    }

    return {
      moveX: this.joystick?.x ?? 0,
      moveY: this.joystick?.y ?? 0,
      dash,
    };
  }

  getFighterInput(): FighterInput {
    let attackStart = false;
    let attackHold = false;
    let attackRelease = false;
    let blockHold = false;
    let healHold = false;

    if (this.attackButton) {
      const state = this.attackButton.consume();
      attackStart = state.pressed;
      attackHold = state.held;
      attackRelease = state.released;
    }

    if (this.blockButton) {
      const state = this.blockButton.consume();
      blockHold = state.held;
    }

    if (this.healButton) {
      const state = this.healButton.consume();
      healHold = state.held;
    }

    return {
      attackStart,
      attackHold,
      attackRelease,
      blockHold,
      healHold,
    };
  }

  destroy() {
    this.joystick?.destroy();
    this.dashButton?.destroy();
    this.attackButton?.destroy();
    this.blockButton?.destroy();
    this.healButton?.destroy();
  }
}
