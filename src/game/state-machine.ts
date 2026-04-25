import {
  PlayerState,
  STATE_PRIORITY,
  type MoverInput,
  type FighterInput,
} from "./types";
import {
  LIGHT_ATTACK_RECOVERY_TICKS,
  HEAVY_ATTACK_CHARGE_TICKS,
  HEAVY_ATTACK_RECOVERY_TICKS,
  BLOCK_CHARGE_TICKS,
  BLOCK_ACTIVE_TICKS,
  STUN_DURATION_TICKS,
  DASH_DURATION_TICKS,
  HEAL_CHARGE_TICKS,
} from "./constants";

export interface StateContext {
  state: PlayerState;
  stateTimer: number; // ticks in current state
  dashCooldown: number;
  blockCooldown: number;
  healProgress: number; // ticks of heal charge
  attackCharge: number; // ticks of heavy attack charge
}

export interface StateTransitionResult {
  newState: PlayerState;
  resetTimer: boolean;
  healTriggered: boolean;
  attackTriggered: "light" | "heavy" | null;
  dashTriggered: boolean;
  blockActivated: boolean;
}

export function resolveStateTransition(
  ctx: StateContext,
  moverInput: MoverInput,
  fighterInput: FighterInput
): StateTransitionResult {
  const result: StateTransitionResult = {
    newState: ctx.state,
    resetTimer: false,
    healTriggered: false,
    attackTriggered: null,
    dashTriggered: false,
    blockActivated: false,
  };

  // Stunned: can't do anything until timer expires
  if (ctx.state === PlayerState.Stunned) {
    if (ctx.stateTimer >= STUN_DURATION_TICKS) {
      result.newState = PlayerState.Idle;
      result.resetTimer = true;
    }
    return result;
  }

  // Dashing: locked in until duration expires
  if (ctx.state === PlayerState.Dashing) {
    if (ctx.stateTimer >= DASH_DURATION_TICKS) {
      result.newState = PlayerState.Idle;
      result.resetTimer = true;
    }
    return result;
  }

  // Block active: locked in until duration expires
  if (ctx.state === PlayerState.BlockActive) {
    if (ctx.stateTimer >= BLOCK_ACTIVE_TICKS) {
      result.newState = PlayerState.Idle;
      result.resetTimer = true;
      // blockCooldown is set by the caller
    }
    return result;
  }

  // Attacking recovery: locked in until recovery frames finish
  if (ctx.state === PlayerState.Attacking) {
    const recoveryTicks =
      ctx.attackCharge >= HEAVY_ATTACK_CHARGE_TICKS
        ? HEAVY_ATTACK_RECOVERY_TICKS
        : LIGHT_ATTACK_RECOVERY_TICKS;
    if (ctx.stateTimer >= recoveryTicks) {
      result.newState = PlayerState.Idle;
      result.resetTimer = true;
    }
    return result;
  }

  // Healing active: brief animation lock
  if (ctx.state === PlayerState.HealingActive) {
    if (ctx.stateTimer >= 10) {
      // 500ms heal animation
      result.newState = PlayerState.Idle;
      result.resetTimer = true;
    }
    return result;
  }

  // --- Below: states that can be interrupted by player input ---

  // Fighter: Block (highest priority action)
  if (fighterInput.blockHold && ctx.blockCooldown <= 0) {
    if (ctx.state === PlayerState.Blocking) {
      // Continue charging
      if (ctx.stateTimer >= BLOCK_CHARGE_TICKS) {
        result.newState = PlayerState.BlockActive;
        result.resetTimer = true;
        result.blockActivated = true;
      }
    } else if (
      STATE_PRIORITY[PlayerState.Blocking] > STATE_PRIORITY[ctx.state]
    ) {
      result.newState = PlayerState.Blocking;
      result.resetTimer = true;
    }
    return result;
  }

  // If was blocking but released, go to idle
  if (ctx.state === PlayerState.Blocking && !fighterInput.blockHold) {
    result.newState = PlayerState.Idle;
    result.resetTimer = true;
  }

  // Fighter: Heal (both must be still — in single-device mode, mover input must be zero)
  const isStill =
    Math.abs(moverInput.moveX) < 0.1 && Math.abs(moverInput.moveY) < 0.1;
  if (fighterInput.healHold && isStill) {
    if (ctx.state === PlayerState.HealingCharge) {
      if (ctx.stateTimer >= HEAL_CHARGE_TICKS) {
        result.newState = PlayerState.HealingActive;
        result.resetTimer = true;
        result.healTriggered = true;
      }
    } else if (
      ctx.state === PlayerState.Idle ||
      ctx.state === PlayerState.Moving
    ) {
      result.newState = PlayerState.HealingCharge;
      result.resetTimer = true;
    }
    return result;
  }

  // If was healing but conditions broke, cancel
  if (ctx.state === PlayerState.HealingCharge) {
    result.newState = PlayerState.Idle;
    result.resetTimer = true;
  }

  // Fighter: Attack
  if (fighterInput.attackStart) {
    if (
      ctx.state === PlayerState.Idle ||
      ctx.state === PlayerState.Moving
    ) {
      result.newState = PlayerState.HeavyCharging;
      result.resetTimer = true;
    }
    return result;
  }

  if (fighterInput.attackHold && ctx.state === PlayerState.HeavyCharging) {
    // Continue charging heavy attack
    return result;
  }

  if (fighterInput.attackRelease) {
    if (ctx.state === PlayerState.HeavyCharging) {
      result.newState = PlayerState.Attacking;
      result.resetTimer = true;
      result.attackTriggered =
        ctx.stateTimer >= HEAVY_ATTACK_CHARGE_TICKS ? "heavy" : "light";
    }
    return result;
  }

  // Mover: Dash
  if (moverInput.dash && ctx.dashCooldown <= 0) {
    if (
      ctx.state === PlayerState.Idle ||
      ctx.state === PlayerState.Moving
    ) {
      result.newState = PlayerState.Dashing;
      result.resetTimer = true;
      result.dashTriggered = true;
    }
    return result;
  }

  // Mover: Movement
  const isMoving =
    Math.abs(moverInput.moveX) > 0.1 || Math.abs(moverInput.moveY) > 0.1;
  if (isMoving && (ctx.state === PlayerState.Idle || ctx.state === PlayerState.Moving)) {
    result.newState = PlayerState.Moving;
    if (ctx.state !== PlayerState.Moving) result.resetTimer = true;
    return result;
  }

  // Default to idle
  if (ctx.state === PlayerState.Moving && !isMoving) {
    result.newState = PlayerState.Idle;
    result.resetTimer = true;
  }

  return result;
}
