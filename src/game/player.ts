import { PlayerState, type PlayerSnapshot } from "./types";
import {
  PLAYER_MAX_HP,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYER_FRICTION,
  DASH_SPEED,
  DASH_COOLDOWN_TICKS,
  BLOCK_COOLDOWN_TICKS,
  BLOCK_DAMAGE_REDUCTION,
  BLOCK_KNOCKBACK_RESIST,
  HEAL_AMOUNT,
  ARENA_RADIUS,
} from "./constants";

export class Player {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  hp = PLAYER_MAX_HP;
  state = PlayerState.Idle;
  angle = 0; // facing direction in radians
  stateTimer = 0;
  dashCooldown = 0;
  blockCooldown = 0;
  healProgress = 0;
  attackCharge = 0;
  dashDirectionX = 0;
  dashDirectionY = 0;

  reset() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.hp = PLAYER_MAX_HP;
    this.state = PlayerState.Idle;
    this.angle = 0;
    this.stateTimer = 0;
    this.dashCooldown = 0;
    this.blockCooldown = 0;
    this.healProgress = 0;
    this.attackCharge = 0;
  }

  applyMovement(moveX: number, moveY: number) {
    if (
      this.state === PlayerState.Idle ||
      this.state === PlayerState.Moving
    ) {
      this.vx += moveX * PLAYER_SPEED;
      this.vy += moveY * PLAYER_SPEED;

      // Update facing direction based on movement
      if (Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1) {
        this.angle = Math.atan2(moveY, moveX);
      }
    }
  }

  applyDash() {
    this.dashDirectionX = Math.cos(this.angle);
    this.dashDirectionY = Math.sin(this.angle);
    this.vx = this.dashDirectionX * DASH_SPEED;
    this.vy = this.dashDirectionY * DASH_SPEED;
    this.dashCooldown = DASH_COOLDOWN_TICKS;
  }

  applyKnockback(force: number, fromX: number, fromY: number) {
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    let multiplier = 1;
    if (this.state === PlayerState.BlockActive) {
      multiplier = BLOCK_KNOCKBACK_RESIST;
    }

    this.vx += (dx / dist) * force * multiplier;
    this.vy += (dy / dist) * force * multiplier;
  }

  takeDamage(amount: number): number {
    let actualDamage = amount;
    if (this.state === PlayerState.BlockActive) {
      actualDamage = amount * (1 - BLOCK_DAMAGE_REDUCTION);
    }
    this.hp = Math.max(0, this.hp - actualDamage);
    return actualDamage;
  }

  heal() {
    this.hp = Math.min(PLAYER_MAX_HP, this.hp + HEAL_AMOUNT);
  }

  healAmount(amount: number) {
    this.hp = Math.min(PLAYER_MAX_HP, this.hp + amount);
  }

  setBlockCooldown() {
    this.blockCooldown = BLOCK_COOLDOWN_TICKS;
  }

  tick() {
    // Apply friction
    this.vx *= PLAYER_FRICTION;
    this.vy *= PLAYER_FRICTION;

    // Dashing maintains velocity
    if (this.state === PlayerState.Dashing) {
      this.vx = this.dashDirectionX * DASH_SPEED;
      this.vy = this.dashDirectionY * DASH_SPEED;
    }

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Arena boundary enforcement (circular)
    const dist = Math.sqrt(this.x * this.x + this.y * this.y);
    const maxDist = ARENA_RADIUS - PLAYER_RADIUS;
    if (dist > maxDist) {
      const nx = this.x / dist;
      const ny = this.y / dist;
      this.x = nx * maxDist;
      this.y = ny * maxDist;

      // Bounce velocity off the wall
      const dot = this.vx * nx + this.vy * ny;
      this.vx -= 2 * dot * nx * 0.5; // 50% energy loss on bounce
      this.vy -= 2 * dot * ny * 0.5;
    }

    // Decrement cooldowns
    if (this.dashCooldown > 0) this.dashCooldown--;
    if (this.blockCooldown > 0) this.blockCooldown--;

    // Increment state timer
    this.stateTimer++;

    // Track charge for heavy attack
    if (this.state === PlayerState.HeavyCharging) {
      this.attackCharge = this.stateTimer;
    }

    // Track heal progress
    if (this.state === PlayerState.HealingCharge) {
      this.healProgress = this.stateTimer;
    } else {
      this.healProgress = 0;
    }
  }

  snapshot(): PlayerSnapshot {
    return {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      hp: this.hp,
      state: this.state,
      angle: this.angle,
      stateTimer: this.stateTimer,
      dashCooldown: this.dashCooldown,
      blockCooldown: this.blockCooldown,
      healProgress: this.healProgress,
      attackCharge: this.attackCharge,
    };
  }
}
