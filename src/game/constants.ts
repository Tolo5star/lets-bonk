// All game tuning numbers live here. Tweak freely.

// Arena
export const ARENA_RADIUS = 400;
export const ARENA_CENTER_X = 0;
export const ARENA_CENTER_Y = 0;

// Player
export const PLAYER_RADIUS = 32;
export const PLAYER_MAX_HP = 100;
export const PLAYER_SPEED = 3.3; // units per tick (scaled for 30Hz)
export const PLAYER_FRICTION = 0.85;

// Dash
export const DASH_SPEED = 9.5; // scaled for 30Hz
export const DASH_DURATION_TICKS = 8; // 250ms at 30Hz
export const DASH_COOLDOWN_TICKS = 60; // 2s at 30Hz

// Light attack
export const LIGHT_ATTACK_DAMAGE = 10;
export const LIGHT_ATTACK_KNOCKBACK = 4;
export const LIGHT_ATTACK_RANGE = 80;
export const LIGHT_ATTACK_ARC = Math.PI * 0.7; // wide arc
export const LIGHT_ATTACK_RECOVERY_TICKS = 12; // 400ms at 30Hz

// Heavy attack
export const HEAVY_ATTACK_CHARGE_TICKS = 30; // 1s at 30Hz
export const HEAVY_ATTACK_DAMAGE = 25;
export const HEAVY_ATTACK_KNOCKBACK = 8;
export const HEAVY_ATTACK_RANGE = 100;
export const HEAVY_ATTACK_ARC = Math.PI; // full semicircle
export const HEAVY_ATTACK_RECOVERY_TICKS = 21; // 700ms at 30Hz
export const HEAVY_ATTACK_SELF_RECOIL = 3.3;

// Block
export const BLOCK_CHARGE_TICKS = 30; // 1s at 30Hz
export const BLOCK_ACTIVE_TICKS = 45; // 1.5s at 30Hz
export const BLOCK_DAMAGE_REDUCTION = 0.8;
export const BLOCK_COOLDOWN_TICKS = 60; // 2s at 30Hz
export const BLOCK_KNOCKBACK_RESIST = 0.3; // 70% knockback reduced

// Heal
export const HEAL_CHARGE_TICKS = 60; // 2s at 30Hz
export const HEAL_AMOUNT = 30;
export const HEAL_PROXIMITY_THRESHOLD = 60; // not used in single-device mode

// Stun
export const STUN_DURATION_TICKS = 22; // 750ms at 30Hz

// Basic enemy
export const BASIC_ENEMY_HP = 30;
export const BASIC_ENEMY_SPEED = 1.3;
export const BASIC_ENEMY_DAMAGE = 8;
export const BASIC_ENEMY_TELEGRAPH_TICKS = 30; // 1s at 30Hz
export const BASIC_ENEMY_ATTACK_RANGE = 40;
export const BASIC_ENEMY_ATTACK_RECOVERY_TICKS = 30; // 1s at 30Hz
export const BASIC_ENEMY_RADIUS = 28;

// Charger enemy
export const CHARGER_HP = 20;
export const CHARGER_SPEED = 1.7;
export const CHARGER_CHARGE_SPEED = 8;
export const CHARGER_DAMAGE = 15;
export const CHARGER_TELEGRAPH_TICKS = 22; // 750ms at 30Hz
export const CHARGER_RECOVERY_TICKS = 45; // 1.5s at 30Hz
export const CHARGER_RADIUS = 26;

// Ranged enemy
export const RANGED_HP = 15;
export const RANGED_SPEED = 1;
export const RANGED_PREFERRED_DISTANCE = 200;
export const RANGED_PROJECTILE_SPEED = 4;
export const RANGED_DAMAGE = 6;
export const RANGED_FIRE_RATE_TICKS = 90; // 3s at 30Hz
export const RANGED_TELEGRAPH_TICKS = 15; // 500ms at 30Hz
export const RANGED_RADIUS = 22;
export const PROJECTILE_RADIUS = 8;

// Mini boss
export const MINI_BOSS_HP = 250;
export const MINI_BOSS_SPEED = 1;
export const MINI_BOSS_DAMAGE = 22;
export const MINI_BOSS_TELEGRAPH_TICKS = 33; // ~1.1s at 30Hz
export const MINI_BOSS_ATTACK_RANGE = 110;
export const MINI_BOSS_RADIUS = 55;
export const MINI_BOSS_ENRAGE_HP_RATIO = 0.5; // enrages at 50% HP
export const MINI_BOSS_ENRAGE_SPEED_MULT = 1.6;
export const MINI_BOSS_ENRAGE_DAMAGE_MULT = 1.3;

// Timing
export const TICK_RATE = 30; // Hz (was 20 — faster = less input lag on mobile)
export const TICK_MS = 1000 / TICK_RATE; // ~33ms

// Rendering
export const CANVAS_PADDING = 50; // extra space around arena edge
