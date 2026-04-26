import { EnemyType, EnemyState, type EnemySnapshot } from "./types";
import {
  BASIC_ENEMY_HP,
  BASIC_ENEMY_SPEED,
  BASIC_ENEMY_DAMAGE,
  BASIC_ENEMY_TELEGRAPH_TICKS,
  BASIC_ENEMY_ATTACK_RANGE,
  BASIC_ENEMY_ATTACK_RECOVERY_TICKS,
  BASIC_ENEMY_RADIUS,
  CHARGER_HP,
  CHARGER_SPEED,
  CHARGER_CHARGE_SPEED,
  CHARGER_DAMAGE,
  CHARGER_TELEGRAPH_TICKS,
  CHARGER_RECOVERY_TICKS,
  CHARGER_RADIUS,
  RANGED_HP,
  RANGED_SPEED,
  RANGED_PREFERRED_DISTANCE,
  RANGED_DAMAGE,
  RANGED_FIRE_RATE_TICKS,
  RANGED_TELEGRAPH_TICKS,
  RANGED_RADIUS,
  MINI_BOSS_HP,
  MINI_BOSS_SPEED,
  MINI_BOSS_DAMAGE,
  MINI_BOSS_TELEGRAPH_TICKS,
  MINI_BOSS_ATTACK_RANGE,
  MINI_BOSS_ENRAGE_HP_RATIO,
  MINI_BOSS_ENRAGE_SPEED_MULT,
  MINI_BOSS_ENRAGE_DAMAGE_MULT,
  MINI_BOSS_RADIUS,
  ARENA_RADIUS,
  STUN_DURATION_TICKS,
} from "./constants";

let nextEnemyId = 1;

export interface EnemyAttackResult {
  damage: number;
  knockback: number;
  fromX: number;
  fromY: number;
}

export interface ProjectileSpawn {
  x: number;
  y: number;
  angle: number;
  speed: number;
  damage: number;
}

export class Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  hp: number;
  maxHp: number;
  state = EnemyState.Moving;
  stateTimer = 0;
  angle = 0;
  radius: number;
  dead = false;
  deathTimer = 0;

  enraged = false; // boss phase 2

  // Type-specific
  private speed: number;
  private baseSpeed: number;
  private damage: number;
  private baseDamage: number;
  private telegraphTicks: number;
  private attackRange: number;
  private recoveryTicks: number;
  private fireRateTicks: number;
  private fireCooldown = 0;
  private chargeAngle = 0;

  constructor(type: EnemyType, x: number, y: number) {
    this.id = nextEnemyId++;
    this.type = type;
    this.x = x;
    this.y = y;

    switch (type) {
      case EnemyType.Basic:
        this.hp = BASIC_ENEMY_HP;
        this.maxHp = BASIC_ENEMY_HP;
        this.speed = BASIC_ENEMY_SPEED;
        this.damage = BASIC_ENEMY_DAMAGE;
        this.telegraphTicks = BASIC_ENEMY_TELEGRAPH_TICKS;
        this.attackRange = BASIC_ENEMY_ATTACK_RANGE;
        this.recoveryTicks = BASIC_ENEMY_ATTACK_RECOVERY_TICKS;
        this.radius = BASIC_ENEMY_RADIUS;
        this.fireRateTicks = 0;
        break;
      case EnemyType.Charger:
        this.hp = CHARGER_HP;
        this.maxHp = CHARGER_HP;
        this.speed = CHARGER_SPEED;
        this.damage = CHARGER_DAMAGE;
        this.telegraphTicks = CHARGER_TELEGRAPH_TICKS;
        this.attackRange = 999; // charges from any distance
        this.recoveryTicks = CHARGER_RECOVERY_TICKS;
        this.radius = CHARGER_RADIUS;
        this.fireRateTicks = 0;
        break;
      case EnemyType.Ranged:
        this.hp = RANGED_HP;
        this.maxHp = RANGED_HP;
        this.speed = RANGED_SPEED;
        this.damage = RANGED_DAMAGE;
        this.telegraphTicks = RANGED_TELEGRAPH_TICKS;
        this.attackRange = RANGED_PREFERRED_DISTANCE;
        this.recoveryTicks = 10;
        this.radius = RANGED_RADIUS;
        this.fireRateTicks = RANGED_FIRE_RATE_TICKS;
        break;
      case EnemyType.MiniBoss:
        this.hp = MINI_BOSS_HP;
        this.maxHp = MINI_BOSS_HP;
        this.speed = MINI_BOSS_SPEED;
        this.damage = MINI_BOSS_DAMAGE;
        this.telegraphTicks = MINI_BOSS_TELEGRAPH_TICKS;
        this.attackRange = MINI_BOSS_ATTACK_RANGE;
        this.recoveryTicks = BASIC_ENEMY_ATTACK_RECOVERY_TICKS;
        this.radius = MINI_BOSS_RADIUS;
        this.fireRateTicks = 0;
        break;
    }
    this.baseSpeed = this.speed;
    this.baseDamage = this.damage;
  }

  private distTo(px: number, py: number): number {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private angleTo(px: number, py: number): number {
    return Math.atan2(py - this.y, px - this.x);
  }

  takeDamage(amount: number, knockbackForce: number, fromAngle: number) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.state = EnemyState.Dying;
      this.stateTimer = 0;
      return;
    }

    // Boss enrage at 50% HP
    if (
      this.type === EnemyType.MiniBoss &&
      !this.enraged &&
      this.hp / this.maxHp <= MINI_BOSS_ENRAGE_HP_RATIO
    ) {
      this.enraged = true;
      this.speed = this.baseSpeed * MINI_BOSS_ENRAGE_SPEED_MULT;
      this.damage = this.baseDamage * MINI_BOSS_ENRAGE_DAMAGE_MULT;
    }

    // Apply knockback
    this.vx += Math.cos(fromAngle) * knockbackForce;
    this.vy += Math.sin(fromAngle) * knockbackForce;

    // Interrupt telegraph with stun
    if (this.state === EnemyState.Telegraph) {
      this.state = EnemyState.Stunned;
      this.stateTimer = 0;
    }
  }

  tick(playerX: number, playerY: number): {
    attack: EnemyAttackResult | null;
    projectile: ProjectileSpawn | null;
  } {
    let attack: EnemyAttackResult | null = null;
    let projectile: ProjectileSpawn | null = null;

    this.stateTimer++;

    // Dying animation
    if (this.state === EnemyState.Dying) {
      this.deathTimer++;
      return { attack, projectile };
    }

    // Stunned
    if (this.state === EnemyState.Stunned) {
      if (this.stateTimer >= STUN_DURATION_TICKS) {
        this.state = EnemyState.Moving;
        this.stateTimer = 0;
      }
      this.applyFriction();
      this.move();
      return { attack, projectile };
    }

    // Recovery after attack
    if (this.state === EnemyState.Recovery) {
      if (this.stateTimer >= this.recoveryTicks) {
        this.state = EnemyState.Moving;
        this.stateTimer = 0;
      }
      this.applyFriction();
      this.move();
      return { attack, projectile };
    }

    const dist = this.distTo(playerX, playerY);
    this.angle = this.angleTo(playerX, playerY);

    if (this.fireCooldown > 0) this.fireCooldown--;

    switch (this.type) {
      case EnemyType.Basic:
      case EnemyType.MiniBoss:
        ({ attack } = this.tickMelee(playerX, playerY, dist));
        break;
      case EnemyType.Charger:
        ({ attack } = this.tickCharger(playerX, playerY, dist));
        break;
      case EnemyType.Ranged:
        ({ projectile } = this.tickRanged(playerX, playerY, dist));
        break;
    }

    this.applyFriction();
    this.move();
    this.enforceArenaBoundary();

    return { attack, projectile };
  }

  private tickMelee(
    _playerX: number,
    _playerY: number,
    dist: number
  ): { attack: EnemyAttackResult | null } {
    let attack: EnemyAttackResult | null = null;

    if (this.state === EnemyState.Telegraph) {
      if (this.stateTimer >= this.telegraphTicks) {
        // Attack!
        attack = {
          damage: this.damage,
          knockback: 8,
          fromX: this.x,
          fromY: this.y,
        };
        this.state = EnemyState.Recovery;
        this.stateTimer = 0;
      }
      return { attack };
    }

    if (this.state === EnemyState.Moving) {
      if (dist < this.attackRange + this.radius) {
        this.state = EnemyState.Telegraph;
        this.stateTimer = 0;
      } else {
        // Move toward player
        this.vx += Math.cos(this.angle) * this.speed * 0.3;
        this.vy += Math.sin(this.angle) * this.speed * 0.3;
      }
    }

    return { attack };
  }

  private tickCharger(
    playerX: number,
    playerY: number,
    dist: number
  ): { attack: EnemyAttackResult | null } {
    let attack: EnemyAttackResult | null = null;

    if (this.state === EnemyState.Telegraph) {
      // Lock in charge direction
      if (this.stateTimer === 1) {
        this.chargeAngle = this.angleTo(playerX, playerY);
      }
      if (this.stateTimer >= this.telegraphTicks) {
        this.state = EnemyState.Charging;
        this.stateTimer = 0;
      }
      return { attack };
    }

    if (this.state === EnemyState.Charging) {
      this.vx = Math.cos(this.chargeAngle) * CHARGER_CHARGE_SPEED;
      this.vy = Math.sin(this.chargeAngle) * CHARGER_CHARGE_SPEED;

      // Check if hit player (collision)
      if (dist < this.radius + 20) {
        // 20 = player radius
        attack = {
          damage: this.damage,
          knockback: 12,
          fromX: this.x,
          fromY: this.y,
        };
        this.state = EnemyState.Recovery;
        this.stateTimer = 0;
      }

      // Stop charging after hitting wall or traveling too far
      if (this.stateTimer >= 20) {
        this.state = EnemyState.Recovery;
        this.stateTimer = 0;
      }
      return { attack };
    }

    if (this.state === EnemyState.Moving) {
      if (dist < 250) {
        // Start charge telegraph
        this.state = EnemyState.Telegraph;
        this.stateTimer = 0;
      } else {
        this.vx += Math.cos(this.angle) * this.speed * 0.3;
        this.vy += Math.sin(this.angle) * this.speed * 0.3;
      }
    }

    return { attack };
  }

  private tickRanged(
    playerX: number,
    playerY: number,
    dist: number
  ): { projectile: ProjectileSpawn | null } {
    let projectile: ProjectileSpawn | null = null;

    if (this.state === EnemyState.Telegraph) {
      if (this.stateTimer >= this.telegraphTicks) {
        // Fire projectile
        projectile = {
          x: this.x,
          y: this.y,
          angle: this.angleTo(playerX, playerY),
          speed: 6,
          damage: this.damage,
        };
        this.state = EnemyState.Recovery;
        this.stateTimer = 0;
        this.fireCooldown = this.fireRateTicks;
      }
      return { projectile };
    }

    if (this.state === EnemyState.Moving) {
      // Maintain preferred distance
      if (dist < RANGED_PREFERRED_DISTANCE * 0.6) {
        // Too close, flee
        this.vx -= Math.cos(this.angle) * this.speed * 0.4;
        this.vy -= Math.sin(this.angle) * this.speed * 0.4;
      } else if (dist > RANGED_PREFERRED_DISTANCE * 1.2) {
        // Too far, approach
        this.vx += Math.cos(this.angle) * this.speed * 0.3;
        this.vy += Math.sin(this.angle) * this.speed * 0.3;
      }

      // Start telegraph if in range and cooldown ready
      if (
        dist < RANGED_PREFERRED_DISTANCE * 1.5 &&
        this.fireCooldown <= 0
      ) {
        this.state = EnemyState.Telegraph;
        this.stateTimer = 0;
      }
    }

    return { projectile };
  }

  private applyFriction() {
    this.vx *= 0.88;
    this.vy *= 0.88;
  }

  private move() {
    this.x += this.vx;
    this.y += this.vy;
  }

  private enforceArenaBoundary() {
    const dist = Math.sqrt(this.x * this.x + this.y * this.y);
    const maxDist = ARENA_RADIUS - this.radius;
    if (dist > maxDist) {
      const nx = this.x / dist;
      const ny = this.y / dist;
      this.x = nx * maxDist;
      this.y = ny * maxDist;

      // Bounce for charger
      if (this.state === EnemyState.Charging) {
        const dot = this.vx * nx + this.vy * ny;
        this.vx -= 2 * dot * nx;
        this.vy -= 2 * dot * ny;
        this.state = EnemyState.Recovery;
        this.stateTimer = 0;
      } else {
        this.vx *= -0.3;
        this.vy *= -0.3;
      }
    }
  }

  snapshot(): EnemySnapshot {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      hp: this.hp,
      maxHp: this.maxHp,
      state: this.state,
      angle: this.angle,
      telegraphProgress:
        this.state === EnemyState.Telegraph
          ? this.stateTimer / this.telegraphTicks
          : 0,
      radius: this.radius,
      enraged: this.enraged,
    };
  }
}

export class Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  dead = false;

  constructor(spawn: ProjectileSpawn) {
    this.id = nextEnemyId++;
    this.x = spawn.x;
    this.y = spawn.y;
    this.vx = Math.cos(spawn.angle) * spawn.speed;
    this.vy = Math.sin(spawn.angle) * spawn.speed;
    this.damage = spawn.damage;
    this.radius = 6;
  }

  tick() {
    this.x += this.vx;
    this.y += this.vy;

    // Die if out of arena
    const dist = Math.sqrt(this.x * this.x + this.y * this.y);
    if (dist > ARENA_RADIUS + 20) {
      this.dead = true;
    }
  }

  snapshot() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      angle: Math.atan2(this.vy, this.vx),
      radius: this.radius,
    };
  }
}
