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

// Forgiveness: hit detection is more generous than visuals
// "If the player thinks it should hit, it should hit"
const RANGE_FORGIVENESS = 1.35; // +35% range for hit detection
const ARC_FORGIVENESS = 1.3; // +30% arc for hit detection

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
  type: "light" | "heavy",
  enemies: Enemy[]
): AttackHitbox {
  const isHeavy = type === "heavy";
  const baseRange = isHeavy ? HEAVY_ATTACK_RANGE : LIGHT_ATTACK_RANGE;
  const baseArc = isHeavy ? HEAVY_ATTACK_ARC : LIGHT_ATTACK_ARC;

  // Soft auto-aim: slightly rotate toward nearest enemy in front
  let aimAngle = player.angle;
  const autoAimRange = baseRange * RANGE_FORGIVENESS;
  const autoAimArc = baseArc * 0.8; // only auto-aim within reasonable cone
  let closestDist = autoAimRange;

  for (const enemy of enemies) {
    if (enemy.dead) continue;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > autoAimRange + enemy.radius) continue;

    const angleToEnemy = Math.atan2(dy, dx);
    let angleDiff = angleToEnemy - player.angle;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    if (Math.abs(angleDiff) <= autoAimArc / 2 && dist < closestDist) {
      closestDist = dist;
      // Nudge aim toward enemy (subtle, 30% correction)
      aimAngle = player.angle + angleDiff * 0.3;
    }
  }

  return {
    x: player.x,
    y: player.y,
    range: baseRange,
    arc: baseArc,
    angle: aimAngle,
    damage: isHeavy ? HEAVY_ATTACK_DAMAGE : LIGHT_ATTACK_DAMAGE,
    knockback: isHeavy ? HEAVY_ATTACK_KNOCKBACK : LIGHT_ATTACK_KNOCKBACK,
    isHeavy,
  };
}

export function checkHitboxVsEnemy(hitbox: AttackHitbox, enemy: Enemy): boolean {
  const dx = enemy.x - hitbox.x;
  const dy = enemy.y - hitbox.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Forgiveness range — more generous than the visual arc
  if (dist > hitbox.range * RANGE_FORGIVENESS + enemy.radius) return false;

  // Forgiveness arc — wider than visual
  const angleToEnemy = Math.atan2(dy, dx);
  let angleDiff = angleToEnemy - hitbox.angle;
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

  return Math.abs(angleDiff) <= (hitbox.arc * ARC_FORGIVENESS) / 2;
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
  const recoilAngle = player.angle + Math.PI;
  player.vx += Math.cos(recoilAngle) * HEAVY_ATTACK_SELF_RECOIL;
  player.vy += Math.sin(recoilAngle) * HEAVY_ATTACK_SELF_RECOIL;
}
