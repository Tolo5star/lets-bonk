// All game tuning numbers live here. Tweak freely.

// Arena
export const ARENA_RADIUS = 400;
export const ARENA_CENTER_X = 0;
export const ARENA_CENTER_Y = 0;

// Player
export const PLAYER_RADIUS = 20;
export const PLAYER_MAX_HP = 100;
export const PLAYER_SPEED = 5; // units per tick
export const PLAYER_FRICTION = 0.85;

// Dash
export const DASH_SPEED = 14;
export const DASH_DURATION_TICKS = 5; // 250ms
export const DASH_COOLDOWN_TICKS = 40; // 2s

// Light attack
export const LIGHT_ATTACK_DAMAGE = 10;
export const LIGHT_ATTACK_KNOCKBACK = 6;
export const LIGHT_ATTACK_RANGE = 65;
export const LIGHT_ATTACK_ARC = Math.PI * 0.65; // wider arc
export const LIGHT_ATTACK_RECOVERY_TICKS = 8; // 400ms

// Heavy attack
export const HEAVY_ATTACK_CHARGE_TICKS = 20; // 1s
export const HEAVY_ATTACK_DAMAGE = 25;
export const HEAVY_ATTACK_KNOCKBACK = 12;
export const HEAVY_ATTACK_RANGE = 80;
export const HEAVY_ATTACK_ARC = Math.PI * 0.9; // big wide arc
export const HEAVY_ATTACK_RECOVERY_TICKS = 14; // 700ms
export const HEAVY_ATTACK_SELF_RECOIL = 5;

// Block
export const BLOCK_CHARGE_TICKS = 40; // 2s
export const BLOCK_ACTIVE_TICKS = 30; // 1.5s
export const BLOCK_DAMAGE_REDUCTION = 0.8; // 80% damage reduced
export const BLOCK_COOLDOWN_TICKS = 60; // 3s
export const BLOCK_KNOCKBACK_RESIST = 0.3; // 70% knockback reduced

// Heal
export const HEAL_CHARGE_TICKS = 40; // 2s
export const HEAL_AMOUNT = 30;
export const HEAL_PROXIMITY_THRESHOLD = 60; // not used in single-device mode

// Stun
export const STUN_DURATION_TICKS = 15; // 750ms

// Basic enemy
export const BASIC_ENEMY_HP = 30;
export const BASIC_ENEMY_SPEED = 2;
export const BASIC_ENEMY_DAMAGE = 8;
export const BASIC_ENEMY_TELEGRAPH_TICKS = 20; // 1s
export const BASIC_ENEMY_ATTACK_RANGE = 40;
export const BASIC_ENEMY_ATTACK_RECOVERY_TICKS = 20; // 1s
export const BASIC_ENEMY_RADIUS = 18;

// Charger enemy
export const CHARGER_HP = 20;
export const CHARGER_SPEED = 2.5;
export const CHARGER_CHARGE_SPEED = 12;
export const CHARGER_DAMAGE = 15;
export const CHARGER_TELEGRAPH_TICKS = 15; // 750ms
export const CHARGER_RECOVERY_TICKS = 30; // 1.5s
export const CHARGER_RADIUS = 16;

// Ranged enemy
export const RANGED_HP = 15;
export const RANGED_SPEED = 1.5;
export const RANGED_PREFERRED_DISTANCE = 200;
export const RANGED_PROJECTILE_SPEED = 6;
export const RANGED_DAMAGE = 6;
export const RANGED_FIRE_RATE_TICKS = 60; // 3s
export const RANGED_TELEGRAPH_TICKS = 10; // 500ms
export const RANGED_RADIUS = 14;
export const PROJECTILE_RADIUS = 6;

// Mini boss
export const MINI_BOSS_HP = 150;
export const MINI_BOSS_SPEED = 1.5;
export const MINI_BOSS_DAMAGE = 20;
export const MINI_BOSS_TELEGRAPH_TICKS = 25;
export const MINI_BOSS_ATTACK_RANGE = 55;
export const MINI_BOSS_RADIUS = 35;

// Timing
export const TICK_RATE = 20; // Hz
export const TICK_MS = 1000 / TICK_RATE; // 50ms

// Rendering
export const CANVAS_PADDING = 50; // extra space around arena edge
