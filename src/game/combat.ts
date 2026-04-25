import {
  LIGHT_ATTACK_DAMAGE,
  LIGHT_ATTACK_KNOCKBACK,
  LIGHT_ATTACK_RANGE,
  LIGHT_ATTACK_ARC,
  HEAVY_ATTACK_DAMAGE,
  HEAVY_ATTACK_KNOCKBACK,
  HEAVY_ATTACK_RANGE,
  HEAVY_ATTACK_ARC,
  HEAVY_ATTACK_SELF_RECOIL,
  PLAYER_RADIUS,
} from "./constants";
import type { Enemy, Projectile } from "./enemy";
import type { Player } from "./player";

export interface AttackHitbox {
  x: number;
  y: number;
  range: number;
  arc: number;
  angle: number;
  damage: number;
  knockback: number;
  isHeavy: boolean;
}

export function createAttackHitbox(
  player: Player,
  type: "light" | "heavy"
): AttackHitbox {
  const isHeavy = type === "heavy";
  return {
    x: player.x,
    y: player.y,
    range: isHeavy ? HEAVY_ATTACK_RANGE : LIGHT_ATTACK_RANGE,
    arc: isHeavy ? HEAVY_ATTACK_ARC : LIGHT_ATTACK_ARC,
    angle: player.angle,
    damage: isHeavy ? HEAVY_ATTACK_DAMAGE : LIGHT_ATTACK_DAMAGE,
    knockback: isHeavy ? HEAVY_ATTACK_KNOCKBACK : LIGHT_ATTACK_KNOCKBACK,
    isHeavy,
  };
}

export function checkHitboxVsEnemy(hitbox: AttackHitbox, enemy: Enemy): boolean {
  const dx = enemy.x - hitbox.x;
  const dy = enemy.y - hitbox.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Range check
  if (dist > hitbox.range + enemy.radius) return false;

  // Arc check
  const angleToEnemy = Math.atan2(dy, dx);
  let angleDiff = angleToEnemy - hitbox.angle;
  // Normalize to -PI..PI
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

  return Math.abs(angleDiff) <= hitbox.arc / 2;
}

export function checkProjectileVsPlayer(
  projectile: Projectile,
  player: Player
): boolean {
  const dx = player.x - projectile.x;
  const dy = player.y - projectile.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < PLAYER_RADIUS + projectile.radius;
}

export function applySelfRecoil(player: Player) {
  const recoilAngle = player.angle + Math.PI; // opposite direction
  player.vx += Math.cos(recoilAngle) * HEAVY_ATTACK_SELF_RECOIL;
  player.vy += Math.sin(recoilAngle) * HEAVY_ATTACK_SELF_RECOIL;
}
