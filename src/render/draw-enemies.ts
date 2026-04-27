import { EnemyType, EnemyState } from "../game/types";
import type { EnemySnapshot, ProjectileSnapshot } from "../game/types";

const ENEMY_COLORS: Record<EnemyType, { body: string; dark: string; eye: string }> = {
  [EnemyType.Basic]: { body: "#e17055", dark: "#b35340", eye: "#fff" },
  [EnemyType.Charger]: { body: "#d63031", dark: "#a02020", eye: "#ffeaa7" },
  [EnemyType.Ranged]: { body: "#a29bfe", dark: "#7c6fd0", eye: "#fff" },
  [EnemyType.MiniBoss]: { body: "#6c5ce7", dark: "#4a3db0", eye: "#ffeaa7" },
};

export function drawEnemies(
  ctx: CanvasRenderingContext2D,
  enemies: EnemySnapshot[]
) {
  for (const enemy of enemies) {
    drawEnemy(ctx, enemy);
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: EnemySnapshot) {
  const palette = ENEMY_COLORS[enemy.type];
  const t = Date.now() * 0.003;

  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  // Dying: fade and shrink
  if (enemy.state === EnemyState.Dying) {
    ctx.globalAlpha = 0.5;
    ctx.scale(0.8, 0.8);
  }

  // Telegraph warning
  if (enemy.state === EnemyState.Telegraph) {
    const progress = enemy.telegraphProgress;

    if (enemy.type === EnemyType.MiniBoss) {
      // Boss: ground slam telegraph — danger zone circle on the ground
      const slamRadius = 110; // matches MINI_BOSS_ATTACK_RANGE
      const pulseR = slamRadius * (0.3 + progress * 0.7);

      // Expanding danger fill
      ctx.beginPath();
      ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 40, 40, ${0.05 + progress * 0.12})`;
      ctx.fill();

      // Danger ring
      ctx.beginPath();
      ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 60, 60, ${0.3 + progress * 0.5})`;
      ctx.lineWidth = 3 + progress * 4;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Inner pulse ring
      ctx.beginPath();
      ctx.arc(0, 0, pulseR * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 100, 50, ${progress * 0.4})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Big warning text
      ctx.fillStyle = `rgba(255, 60, 60, ${0.5 + progress * 0.5})`;
      ctx.font = `bold ${16 + progress * 10}px 'Lilita One', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("SLAM!", 0, -enemy.radius - 18);
    } else {
      // Normal enemies: pulsing red ring + exclamation
      const ringR = enemy.radius + 12 + Math.sin(progress * Math.PI * 6) * 3;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 80, 80, ${0.2 + progress * 0.5})`;
      ctx.lineWidth = 2 + progress * 3;
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 80, 80, ${0.5 + progress * 0.5})`;
      ctx.font = `bold ${12 + progress * 6}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("!", 0, -enemy.radius - 10);
    }
  }

  // Boss enrage transition: white flash build-up + freeze
  if (enemy.state === EnemyState.EnrageTransition) {
    const progress = Math.min(enemy.stateTimer / 15, 1); // 0→1 over 15 ticks

    // Expanding white ring
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * (1 + progress * 0.8), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${progress * 0.25})`;
    ctx.fill();

    // Pulsing bright border
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius + 8 + progress * 20, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 80, 80, ${0.4 + progress * 0.6})`;
    ctx.lineWidth = 3 + progress * 6;
    ctx.stroke();

    // Energy lines radiating out
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const inner = enemy.radius + 5;
      const outer = enemy.radius + 10 + progress * 30;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.strokeStyle = `rgba(255, 50, 50, ${progress * 0.7})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // "PHASE 2" text as it builds
    if (progress > 0.6) {
      ctx.fillStyle = `rgba(255, 80, 80, ${(progress - 0.6) / 0.4})`;
      ctx.font = `bold ${14 + progress * 8}px 'Lilita One', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("PHASE 2!", 0, -enemy.radius - 22);
    }
  }

  // Boss shockwave ring expanding outward after enrage fires
  if (enemy.type === EnemyType.MiniBoss && enemy.enraged && enemy.state === EnemyState.Recovery && enemy.stateTimer < 25) {
    const progress = enemy.stateTimer / 25;
    const waveR = enemy.radius + progress * 180;
    const alpha = Math.max(0, 0.6 - progress * 0.6);
    ctx.beginPath();
    ctx.arc(0, 0, waveR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 80, 80, ${alpha})`;
    ctx.lineWidth = 6 - progress * 4;
    ctx.stroke();
    // Second wave
    if (progress > 0.3) {
      const wave2R = enemy.radius + (progress - 0.3) * 120;
      ctx.beginPath();
      ctx.arc(0, 0, wave2R, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 150, 50, ${alpha * 0.5})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  // Charger trail
  if (enemy.state === EnemyState.Charging) {
    const trailAngle = enemy.angle + Math.PI;
    ctx.beginPath();
    ctx.moveTo(
      Math.cos(trailAngle - 0.4) * enemy.radius * 0.8,
      Math.sin(trailAngle - 0.4) * enemy.radius * 0.8
    );
    ctx.lineTo(
      Math.cos(trailAngle) * enemy.radius * 3.5,
      Math.sin(trailAngle) * enemy.radius * 3.5
    );
    ctx.lineTo(
      Math.cos(trailAngle + 0.4) * enemy.radius * 0.8,
      Math.sin(trailAngle + 0.4) * enemy.radius * 0.8
    );
    ctx.fillStyle = palette.body + "44";
    ctx.fill();
  }

  // Enrage glow (boss phase 2)
  if (enemy.enraged) {
    const pulse = 0.3 + Math.sin(t * 6) * 0.15;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius + 12, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 50, 50, ${pulse * 0.15})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 80, 80, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Shadow
  ctx.beginPath();
  ctx.ellipse(0, enemy.radius * 0.5, enemy.radius * 0.7, enemy.radius * 0.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fill();

  // Squash/stretch
  let sx = 1, sy = 1;
  if (enemy.state === EnemyState.Charging) {
    sx = 1.2; sy = 0.85;
    ctx.rotate(enemy.angle);
  } else if (enemy.state === EnemyState.Telegraph) {
    const p = enemy.telegraphProgress;
    sx = 1 + Math.sin(p * Math.PI * 8) * 0.08;
    sy = 1 - Math.sin(p * Math.PI * 8) * 0.08;
  } else {
    sx = 1 + Math.sin(t * 2.5 + enemy.id) * 0.03;
    sy = 1 - Math.sin(t * 2.5 + enemy.id) * 0.03;
  }
  ctx.scale(sx, sy);

  const r = enemy.radius;

  // Body shape varies by type
  ctx.fillStyle = palette.body;
  switch (enemy.type) {
    case EnemyType.Basic:
    case EnemyType.MiniBoss:
      // Round blob
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    case EnemyType.Charger:
      // Spiky blob — triangle-ish
      ctx.beginPath();
      const points = 5;
      for (let i = 0; i <= points; i++) {
        const a = (i / points) * Math.PI * 2 - Math.PI / 2;
        const spike = i % 2 === 0 ? r * 1.15 : r * 0.85;
        const method = i === 0 ? "moveTo" : "lineTo";
        ctx[method](Math.cos(a) * spike, Math.sin(a) * spike);
      }
      ctx.closePath();
      ctx.fill();
      break;
    case EnemyType.Ranged:
      // Diamond blob
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.1);
      ctx.quadraticCurveTo(r * 0.8, 0, 0, r * 1.1);
      ctx.quadraticCurveTo(-r * 0.8, 0, 0, -r * 1.1);
      ctx.fill();
      break;
  }

  // Body highlight
  ctx.beginPath();
  ctx.arc(-r * 0.2, -r * 0.25, r * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();

  // Outline
  ctx.strokeStyle = palette.dark;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Eyes — 1 eye for basic, 2 for others
  const eyeR = r * 0.2;
  const pupilR = r * 0.1;

  if (enemy.state === EnemyState.Stunned) {
    // Dizzy X eyes
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-3, -3); ctx.lineTo(3, 3);
    ctx.moveTo(3, -3); ctx.lineTo(-3, 3);
    ctx.stroke();
    ctx.lineCap = "butt";
  } else {
    const eyeCount = enemy.type === EnemyType.Basic ? 1 : 2;
    const eyeSpread = eyeCount === 1 ? 0 : r * 0.25;
    const eyeY = -r * 0.1;

    for (let i = 0; i < eyeCount; i++) {
      const ex = eyeCount === 1 ? 0 : (i === 0 ? -eyeSpread : eyeSpread);

      ctx.beginPath();
      ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fillStyle = palette.eye;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ex + 1, eyeY + 1, pupilR, 0, Math.PI * 2);
      ctx.fillStyle = "#2d1b4e";
      ctx.fill();

      // Shine
      ctx.beginPath();
      ctx.arc(ex - 1, eyeY - 1, pupilR * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fill();
    }

    // Angry eyebrows for charger/miniboss
    if (enemy.type === EnemyType.Charger || enemy.type === EnemyType.MiniBoss) {
      ctx.strokeStyle = palette.dark;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      if (eyeCount === 2) {
        ctx.beginPath();
        ctx.moveTo(-eyeSpread - eyeR, eyeY - eyeR - 2);
        ctx.lineTo(-eyeSpread + eyeR * 0.5, eyeY - eyeR - 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(eyeSpread + eyeR, eyeY - eyeR - 2);
        ctx.lineTo(eyeSpread - eyeR * 0.5, eyeY - eyeR - 5);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
    }
  }

  // Mini boss: show variant icon + phase indicator
  if (enemy.type === EnemyType.MiniBoss) {
    const variantIcon = enemy.bossVariant === "frenzy" ? "⚡"
                      : enemy.bossVariant === "summoner" ? "🔮"
                      : "👑"; // brute
    ctx.font = `${r * 0.55}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(variantIcon, 0, -r - 4);

    // Phase 2 indicator: glowing "II" above icon
    if (enemy.enraged) {
      ctx.font = `bold ${r * 0.3}px 'Lilita One', sans-serif`;
      ctx.fillStyle = "#ff4757";
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 3;
      ctx.strokeText("PHASE 2", 0, -r - r * 0.6 - 8);
      ctx.fillText("PHASE 2", 0, -r - r * 0.6 - 8);
    }
  }

  ctx.restore();

  // HP bar (only when damaged)
  if (enemy.hp < enemy.maxHp && enemy.state !== EnemyState.Dying) {
    const w = enemy.radius * 2;
    const h = 4;
    const x = enemy.x - w / 2;
    const y = enemy.y - enemy.radius - 10;
    const ratio = enemy.hp / enemy.maxHp;

    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 2);
    ctx.fill();

    ctx.fillStyle = ratio > 0.5 ? palette.body : "#ff4757";
    ctx.beginPath();
    ctx.roundRect(x, y, w * ratio, h, 2);
    ctx.fill();
  }
}

export function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  projectiles: ProjectileSnapshot[]
) {
  for (const proj of projectiles) {
    ctx.save();
    ctx.translate(proj.x, proj.y);

    // Glow
    ctx.beginPath();
    ctx.arc(0, 0, proj.radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(162, 155, 254, 0.2)";
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#a29bfe";
    ctx.fill();
    ctx.strokeStyle = "#7c6fd0";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Shine
    ctx.beginPath();
    ctx.arc(-1.5, -1.5, proj.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fill();

    ctx.restore();
  }
}
