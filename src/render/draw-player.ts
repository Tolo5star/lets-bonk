import { PlayerState } from "../game/types";
import type { PlayerSnapshot } from "../game/types";
import {
  PLAYER_RADIUS,
  PLAYER_MAX_HP,
  HEAL_CHARGE_TICKS,
  BLOCK_CHARGE_TICKS,
  HEAVY_ATTACK_CHARGE_TICKS,
  LIGHT_ATTACK_RANGE,
  LIGHT_ATTACK_ARC,
  HEAVY_ATTACK_RANGE,
  HEAVY_ATTACK_ARC,
} from "../game/constants";

// Blob-character colors — pink body like the mood board
const BODY_COLOR = "#ff6b9d";
const BODY_DARK = "#cc4477";
const EYE_COLOR = "#fff";
const PUPIL_COLOR = "#2d1b4e";

export function drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerSnapshot) {
  ctx.save();
  ctx.translate(player.x, player.y);

  const r = PLAYER_RADIUS;
  const t = Date.now() * 0.003; // animation timer

  // --- State-specific outer effects ---

  // Heal charge ring
  if (player.state === PlayerState.HealingCharge) {
    const progress = player.stateTimer / HEAL_CHARGE_TICKS;
    ctx.beginPath();
    ctx.arc(0, 0, r + 14, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.strokeStyle = "#55efc4";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.lineCap = "butt";
    // Sparkles
    if (progress > 0.5) {
      for (let i = 0; i < 3; i++) {
        const a = t * 2 + i * 2.1;
        const d = r + 18 + Math.sin(a * 3) * 4;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#55efc4";
        ctx.fill();
      }
    }
  }

  // Block charge ring
  if (player.state === PlayerState.Blocking) {
    const progress = player.stateTimer / BLOCK_CHARGE_TICKS;
    ctx.beginPath();
    ctx.arc(0, 0, r + 12, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.strokeStyle = "#74b9ff";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  // Block active shield
  if (player.state === PlayerState.BlockActive) {
    ctx.beginPath();
    ctx.arc(0, 0, r + 10, player.angle - Math.PI * 0.6, player.angle + Math.PI * 0.6);
    ctx.strokeStyle = "#74b9ff";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.lineCap = "butt";

    // Shield glow
    ctx.beginPath();
    ctx.arc(0, 0, r + 10, player.angle - Math.PI * 0.6, player.angle + Math.PI * 0.6);
    ctx.strokeStyle = "rgba(116, 185, 255, 0.3)";
    ctx.lineWidth = 14;
    ctx.stroke();
  }

  // Heavy attack charge indicator
  if (player.state === PlayerState.HeavyCharging) {
    const progress = Math.min(player.stateTimer / HEAVY_ATTACK_CHARGE_TICKS, 1);
    const color = progress >= 1 ? "#ff6b6b" : "#ff9f43";
    ctx.beginPath();
    ctx.arc(0, 0, r + 10, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.lineCap = "butt";
    if (progress >= 1) {
      // Pulsing glow when fully charged
      const pulse = 0.3 + Math.sin(t * 8) * 0.2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 16, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 107, 107, ${pulse})`;
      ctx.lineWidth = 8;
      ctx.stroke();
    }
  }

  // Healing active burst
  if (player.state === PlayerState.HealingActive) {
    const burstR = r + 20 + Math.sin(t * 6) * 5;
    ctx.beginPath();
    ctx.arc(0, 0, burstR, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(85, 239, 196, 0.15)";
    ctx.fill();
    ctx.strokeStyle = "rgba(85, 239, 196, 0.5)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Attack arc
  if (player.state === PlayerState.Attacking) {
    const isHeavy = player.attackCharge >= HEAVY_ATTACK_CHARGE_TICKS;
    const range = isHeavy ? HEAVY_ATTACK_RANGE : LIGHT_ATTACK_RANGE;
    const arc = isHeavy ? HEAVY_ATTACK_ARC : LIGHT_ATTACK_ARC;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, range, player.angle - arc / 2, player.angle + arc / 2);
    ctx.closePath();
    ctx.fillStyle = isHeavy
      ? "rgba(255, 107, 107, 0.25)"
      : "rgba(255, 159, 67, 0.2)";
    ctx.fill();
  }

  // --- BLOB BODY ---
  // Squash/stretch based on state
  let scaleX = 1;
  let scaleY = 1;
  if (player.state === PlayerState.Dashing) {
    scaleX = 1.25;
    scaleY = 0.8;
  } else if (player.state === PlayerState.Attacking && player.stateTimer < 4) {
    scaleX = 0.85;
    scaleY = 1.2;
  } else if (player.state === PlayerState.Stunned) {
    scaleX = 1 + Math.sin(t * 12) * 0.08;
    scaleY = 1 - Math.sin(t * 12) * 0.08;
  } else {
    // Idle bob
    scaleX = 1 + Math.sin(t * 2) * 0.02;
    scaleY = 1 - Math.sin(t * 2) * 0.02;
  }

  ctx.save();
  ctx.rotate(player.state === PlayerState.Dashing ? player.angle : 0);
  ctx.scale(scaleX, scaleY);

  // Shadow
  ctx.beginPath();
  ctx.ellipse(0, r * 0.6, r * 0.8, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = BODY_COLOR;
  ctx.fill();

  // Body highlight
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.3, r * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fill();

  // Body outline
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = BODY_DARK;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.restore(); // undo squash/stretch rotation

  // --- EYES (always face the angle direction) ---
  const eyeSpread = r * 0.35;
  const eyeForward = r * 0.15;
  const eyeR = r * 0.22;
  const pupilR = r * 0.12;
  const ex1 = Math.cos(player.angle) * eyeForward - Math.sin(player.angle) * eyeSpread;
  const ey1 = Math.sin(player.angle) * eyeForward + Math.cos(player.angle) * eyeSpread;
  const ex2 = Math.cos(player.angle) * eyeForward + Math.sin(player.angle) * eyeSpread;
  const ey2 = Math.sin(player.angle) * eyeForward - Math.cos(player.angle) * eyeSpread;

  // Stunned: X eyes
  if (player.state === PlayerState.Stunned) {
    ctx.strokeStyle = PUPIL_COLOR;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    for (const [ex, ey] of [[ex1, ey1], [ex2, ey2]]) {
      ctx.beginPath();
      ctx.moveTo(ex - 4, ey - 4);
      ctx.lineTo(ex + 4, ey + 4);
      ctx.moveTo(ex + 4, ey - 4);
      ctx.lineTo(ex - 4, ey + 4);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    // Stars
    ctx.fillStyle = "#ffeaa7";
    ctx.font = "10px sans-serif";
    for (let i = 0; i < 3; i++) {
      const a = t * 3 + i * 2.09;
      const d = r + 12;
      ctx.fillText("★", Math.cos(a) * d - 4, Math.sin(a) * d + 3);
    }
  } else {
    // Normal eyes
    const pupilOffset = r * 0.05;
    const px = Math.cos(player.angle) * pupilOffset;
    const py = Math.sin(player.angle) * pupilOffset;

    for (const [ex, ey] of [[ex1, ey1], [ex2, ey2]]) {
      // White
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fillStyle = EYE_COLOR;
      ctx.fill();
      ctx.strokeStyle = BODY_DARK;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pupil
      ctx.beginPath();
      ctx.arc(ex + px, ey + py, pupilR, 0, Math.PI * 2);
      ctx.fillStyle = PUPIL_COLOR;
      ctx.fill();

      // Eye shine
      ctx.beginPath();
      ctx.arc(ex + px - 1.5, ey + py - 1.5, pupilR * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fill();
    }
  }

  ctx.restore();

  // HP bar
  drawHPBar(ctx, player.x, player.y - r - 16, player.hp, PLAYER_MAX_HP);
}

function drawHPBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hp: number,
  maxHp: number
) {
  const width = 44;
  const height = 6;
  const ratio = hp / maxHp;
  const rx = x - width / 2;

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.beginPath();
  ctx.roundRect(rx, y, width, height, 3);
  ctx.fill();

  // Fill
  const hpColor =
    ratio > 0.6 ? "#55efc4" : ratio > 0.3 ? "#fdcb6e" : "#ff6b6b";
  ctx.fillStyle = hpColor;
  ctx.beginPath();
  ctx.roundRect(rx, y, width * ratio, height, 3);
  ctx.fill();

  // Border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(rx, y, width, height, 3);
  ctx.stroke();
}
