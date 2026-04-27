export type Role = "mover" | "fighter";

export enum PlayerState {
  Idle = 0,
  Moving = 1,
  Attacking = 2,
  HeavyCharging = 3,
  Blocking = 4,
  BlockActive = 5,
  HealingCharge = 6,
  HealingActive = 7,
  Stunned = 8,
  Dashing = 9,
}

// Higher number = higher priority. Used to resolve conflicts between mover and fighter inputs.
export const STATE_PRIORITY: Record<PlayerState, number> = {
  [PlayerState.Idle]: 0,
  [PlayerState.Moving]: 1,
  [PlayerState.Attacking]: 2,
  [PlayerState.HeavyCharging]: 3,
  [PlayerState.Dashing]: 4,
  [PlayerState.HealingCharge]: 5,
  [PlayerState.HealingActive]: 5,
  [PlayerState.Blocking]: 6,
  [PlayerState.BlockActive]: 6,
  [PlayerState.Stunned]: 10,
};

export enum EnemyType {
  Basic = 0,
  Charger = 1,
  Ranged = 2,
  MiniBoss = 3,
}

export enum EnemyState {
  Idle = 0,
  Moving = 1,
  Telegraph = 2,
  Attacking = 3,
  Charging = 4, // Charger rush
  Recovery = 5,
  Stunned = 6,
  Dying = 7,
  EnrageTransition = 8, // Boss phase 2 entry: freeze → shockwave
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface MoverInput {
  moveX: number; // -1 to 1
  moveY: number; // -1 to 1
  dash: boolean;
}

export interface FighterInput {
  attackStart: boolean;
  attackHold: boolean;
  attackRelease: boolean;
  blockHold: boolean;
  healHold: boolean;
}

export interface PlayerSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  state: PlayerState;
  angle: number;
  stateTimer: number;
  dashCooldown: number;
  blockCooldown: number;
  healProgress: number;
  attackCharge: number;
}

export interface EnemySnapshot {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  state: EnemyState;
  angle: number;
  telegraphProgress: number;
  radius: number;
  enraged: boolean;
  stateTimer: number;
  bossVariant?: string;
}

export interface ProjectileSnapshot {
  id: number;
  x: number;
  y: number;
  angle: number;
  radius: number;
}

export interface GameSnapshot {
  tick: number;
  player: PlayerSnapshot;
  enemies: EnemySnapshot[];
  projectiles: ProjectileSnapshot[];
  wave: number;
  waveEnemiesRemaining: number;
  gameOver: boolean;
  gameWon: boolean;
}

export interface ScoreData {
  damageDealt: number;
  damageTaken: number;
  healAttempts: number;
  healSuccesses: number;
  enemiesKilled: number;
  wavesCompleted: number;
  survivalTimeMs: number;
}
