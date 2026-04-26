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

  // Attack arc — FLASHY
  if (player.state === PlayerState.Attacking) {
    const isHeavy = player.attackCharge >= HEAVY_ATTACK_CHARGE_TICKS;
    const range = isHeavy ? HEAVY_ATTACK_RANGE : LIGHT_ATTACK_RANGE;
    const arc = isHeavy ? HEAVY_ATTACK_ARC : LIGHT_ATTACK_ARC;
    const attackAge = player.stateTimer;
    const flash = Math.max(0, 1 - attackAge / 6); // bright flash that fades

    // Outer glow
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, range + 10 * flash, player.angle - arc / 2 - 0.1, player.angle + arc / 2 + 0.1);
    ctx.closePath();
    ctx.fillStyle = isHeavy
      ? `rgba(255, 80, 80, ${0.15 * flash})`
      : `rgba(255, 180, 80, ${0.12 * flash})`;
    ctx.fill();

    // Main arc
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, range, player.angle - arc / 2, player.angle + arc / 2);
    ctx.closePath();
    ctx.fillStyle = isHeavy
      ? `rgba(255, 107, 107, ${0.2 + 0.35 * flash})`
      : `rgba(255, 200, 100, ${0.15 + 0.3 * flash})`;
    ctx.fill();

    // Bright edge line
    ctx.beginPath();
    ctx.arc(0, 0, range, player.angle - arc / 2, player.angle + arc / 2);
    ctx.strokeStyle = isHeavy
      ? `rgba(255, 150, 150, ${0.6 * flash})`
      : `rgba(255, 220, 150, ${0.5 * flash})`;
    ctx.lineWidth = 3 + 4 * flash;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.lineCap = "butt";

    // Impact lines (radiating from center)
    if (attackAge < 4) {
      const lineCount = isHeavy ? 8 : 5;
      for (let i = 0; i < lineCount; i++) {
        const a = player.angle - arc / 2 + (arc / (lineCount - 1)) * i;
        const innerR = range * 0.4;
        const outerR = range * (0.7 + 0.4 * flash);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
        ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
        ctx.strokeStyle = isHeavy
          ? `rgba(255, 200, 200, ${0.5 * flash})`
          : `rgba(255, 230, 180, ${0.4 * flash})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Heavy attack: screen-flash circle
    if (isHeavy && attackAge < 3) {
      ctx.beginPath();
      ctx.arc(0, 0, range * 1.3 * flash, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.08 * flash})`;
      ctx.fill();
    }
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
  ctx.ellipse(0, r * 0.7, r * 0.9, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fill();

  // --- Little stubby arms (behind body) ---
  const armWave = Math.sin(t * 4) * 0.2;
  const isAttacking = player.state === PlayerState.Attacking;
  ctx.strokeStyle = BODY_DARK;
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = "round";
  // Left arm
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, r * 0.1);
  ctx.lineTo(-r * 1.1, r * (isAttacking ? -0.3 : 0.2 + armWave));
  ctx.strokeStyle = BODY_COLOR;
  ctx.stroke();
  ctx.strokeStyle = BODY_DARK;
  ctx.lineWidth = r * 0.08;
  ctx.stroke();
  // Right arm
  ctx.beginPath();
  ctx.moveTo(r * 0.7, r * 0.1);
  ctx.lineTo(r * 1.1, r * (isAttacking ? -0.3 : 0.2 - armWave));
  ctx.strokeStyle = BODY_COLOR;
  ctx.lineWidth = r * 0.22;
  ctx.stroke();
  ctx.strokeStyle = BODY_DARK;
  ctx.lineWidth = r * 0.08;
  ctx.stroke();
  ctx.lineCap = "butt";

  // --- Chubby body (slightly taller than wide) ---
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.95, r, 0, 0, Math.PI * 2);
  ctx.fillStyle = BODY_COLOR;
  ctx.fill();

  // Body gradient highlight
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, -r * 0.25, r * 0.5, r * 0.55, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.13)";
  ctx.fill();

  // Body outline
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.95, r, 0, 0, Math.PI * 2);
  ctx.strokeStyle = BODY_DARK;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // --- Little feet at bottom ---
  ctx.fillStyle = BODY_DARK;
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, r * 0.85, r * 0.2, r * 0.1, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.35, r * 0.85, r * 0.2, r * 0.1, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // --- Tuft of hair / antenna on top ---
  ctx.strokeStyle = BODY_COLOR;
  ctx.lineWidth = r * 0.12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.9);
  ctx.quadraticCurveTo(r * 0.3, -r * 1.5, r * 0.15, -r * 1.35);
  ctx.stroke();
  // Tip blob
  ctx.beginPath();
  ctx.arc(r * 0.15, -r * 1.35, r * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = "#ff9ec4";
  ctx.fill();
  ctx.lineCap = "butt";

  ctx.restore(); // undo squash/stretch rotation

  // --- FACE (always face the angle direction) ---
  const eyeSpread = r * 0.3;
  const eyeForward = r * 0.12;
  const eyeR = r * 0.2;
  const pupilR = r * 0.11;
  const ex1 = Math.cos(player.angle) * eyeForward - Math.sin(player.angle) * eyeSpread;
  const ey1 = Math.sin(player.angle) * eyeForward + Math.cos(player.angle) * eyeSpread - r * 0.1;
  const ex2 = Math.cos(player.angle) * eyeForward + Math.sin(player.angle) * eyeSpread;
  const ey2 = Math.sin(player.angle) * eyeForward - Math.cos(player.angle) * eyeSpread - r * 0.1;

  // Stunned: X eyes + stars
  if (player.state === PlayerState.Stunned) {
    const xSize = r * 0.15;
    ctx.strokeStyle = PUPIL_COLOR;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (const [ex, ey] of [[ex1, ey1], [ex2, ey2]]) {
      ctx.beginPath();
      ctx.moveTo(ex - xSize, ey - xSize);
      ctx.lineTo(ex + xSize, ey + xSize);
      ctx.moveTo(ex + xSize, ey - xSize);
      ctx.lineTo(ex - xSize, ey + xSize);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    // Spinning stars
    ctx.fillStyle = "#ffeaa7";
    ctx.font = `${r * 0.35}px sans-serif`;
    ctx.textAlign = "center";
    for (let i = 0; i < 3; i++) {
      const a = t * 3 + i * 2.09;
      const d = r + r * 0.4;
      ctx.fillText("★", Math.cos(a) * d, Math.sin(a) * d + r * 0.1);
    }
    // Dizzy mouth
    ctx.beginPath();
    ctx.arc(Math.cos(player.angle) * r * 0.15, Math.sin(player.angle) * r * 0.15 + r * 0.25, r * 0.12, 0, Math.PI);
    ctx.strokeStyle = BODY_DARK;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    // Normal eyes
    const pupilOffset = r * 0.06;
    const px = Math.cos(player.angle) * pupilOffset;
    const py = Math.sin(player.angle) * pupilOffset;
    const isCharging = player.state === PlayerState.HeavyCharging;

    for (const [ex, ey] of [[ex1, ey1], [ex2, ey2]]) {
      // White
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fillStyle = EYE_COLOR;
      ctx.fill();
      ctx.strokeStyle = BODY_DARK;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pupil (bigger when charging for comedic "focused" look)
      const pSize = isCharging ? pupilR * 0.7 : pupilR;
      ctx.beginPath();
      ctx.arc(ex + px, ey + py, pSize, 0, Math.PI * 2);
      ctx.fillStyle = PUPIL_COLOR;
      ctx.fill();

      // Eye shine
      ctx.beginPath();
      ctx.arc(ex + px - 2, ey + py - 2, pSize * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fill();
    }

    // --- MOUTH (expression changes with state) ---
    const mouthX = Math.cos(player.angle) * r * 0.2;
    const mouthY = Math.sin(player.angle) * r * 0.2 + r * 0.3;

    ctx.strokeStyle = BODY_DARK;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    if (player.state === PlayerState.Attacking) {
      // Wide open yell mouth
      ctx.beginPath();
      ctx.ellipse(mouthX, mouthY, r * 0.18, r * 0.14, 0, 0, Math.PI * 2);
      ctx.fillStyle = BODY_DARK;
      ctx.fill();
      ctx.fillStyle = "#ff8888";
      ctx.beginPath();
      ctx.ellipse(mouthX, mouthY + r * 0.04, r * 0.1, r * 0.05, 0, 0, Math.PI);
      ctx.fill(); // tongue
    } else if (player.state === PlayerState.HeavyCharging) {
      // Gritting teeth
      ctx.beginPath();
      ctx.moveTo(mouthX - r * 0.15, mouthY);
      ctx.lineTo(mouthX + r * 0.15, mouthY);
      ctx.stroke();
      // Teeth lines
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(mouthX + i * r * 0.08, mouthY - r * 0.03);
        ctx.lineTo(mouthX + i * r * 0.08, mouthY + r * 0.03);
        ctx.stroke();
      }
    } else if (player.state === PlayerState.HealingCharge || player.state === PlayerState.HealingActive) {
      // Peaceful smile
      ctx.beginPath();
      ctx.arc(mouthX, mouthY - r * 0.05, r * 0.12, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else if (player.state === PlayerState.Dashing) {
      // Determined grin
      ctx.beginPath();
      ctx.arc(mouthX, mouthY - r * 0.08, r * 0.15, 0.1, Math.PI - 0.1);
      ctx.stroke();
    } else {
      // Default cute smile
      ctx.beginPath();
      ctx.arc(mouthX, mouthY - r * 0.03, r * 0.1, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }
    ctx.lineCap = "butt";

    // Blush cheeks (always visible, subtle)
    ctx.fillStyle = "rgba(255, 150, 180, 0.2)";
    const blushDist = r * 0.45;
    ctx.beginPath();
    ctx.ellipse(
      Math.cos(player.angle) * r * 0.05 - Math.sin(player.angle) * blushDist,
      Math.sin(player.angle) * r * 0.05 + Math.cos(player.angle) * blushDist + r * 0.1,
      r * 0.12, r * 0.08, 0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(
      Math.cos(player.angle) * r * 0.05 + Math.sin(player.angle) * blushDist,
      Math.sin(player.angle) * r * 0.05 - Math.cos(player.angle) * blushDist + r * 0.1,
      r * 0.12, r * 0.08, 0, 0, Math.PI * 2
    );
    ctx.fill();
  }

  ctx.restore();

  // HP bar
  drawHPBar(ctx, player.x, player.y - r - 20, player.hp, PLAYER_MAX_HP);
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
