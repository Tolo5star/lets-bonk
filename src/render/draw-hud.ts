import type { GameSnapshot } from "../game/types";
import { PlayerState } from "../game/types";
import { PLAYER_MAX_HP } from "../game/constants";

let _isMobile = false;
export function setHUDMobile(mobile: boolean) {
  _isMobile = mobile;
}

const DISPLAY_FONT = "'Lilita One', 'Nunito', sans-serif";
const BODY_FONT = "'Nunito', sans-serif";

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  canvasWidth: number,
  canvasHeight: number
) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const scale = Math.max(0.7, Math.min(1, canvasWidth / 600));
  const padding = 14 * scale;

  // --- Top left: Wave info (badge style) ---
  const waveText = `WAVE ${snapshot.wave}`;
  const enemyText = `${snapshot.waveEnemiesRemaining} enemies`;

  // Wave badge background
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  const badgeW = 110 * scale;
  const badgeH = 42 * scale;
  ctx.beginPath();
  ctx.roundRect(padding, padding, badgeW, badgeH, 10 * scale);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#ffeaa7";
  ctx.font = `${Math.round(15 * scale)}px ${DISPLAY_FONT}`;
  ctx.textAlign = "left";
  ctx.fillText(waveText, padding + 10 * scale, padding + 18 * scale);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `700 ${Math.round(10 * scale)}px ${BODY_FONT}`;
  ctx.fillText(enemyText, padding + 10 * scale, padding + 34 * scale);

  // --- Top center: HP bar ---
  const hpBarWidth = Math.min(180, canvasWidth * 0.3);
  const hpBarHeight = Math.round(14 * scale);
  const hpX = (canvasWidth - hpBarWidth) / 2;
  const hpY = padding;
  const hpRatio = snapshot.player.hp / PLAYER_MAX_HP;

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.beginPath();
  ctx.roundRect(hpX, hpY, hpBarWidth, hpBarHeight, 7);
  ctx.fill();

  // Fill with gradient
  const hpColor = hpRatio > 0.6 ? "#55efc4" : hpRatio > 0.3 ? "#fdcb6e" : "#ff6b6b";
  ctx.fillStyle = hpColor;
  ctx.beginPath();
  ctx.roundRect(hpX, hpY, hpBarWidth * Math.max(hpRatio, 0), hpBarHeight, 7);
  ctx.fill();

  // HP glow
  ctx.strokeStyle = hpColor + "44";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(hpX - 1, hpY - 1, hpBarWidth + 2, hpBarHeight + 2, 8);
  ctx.stroke();

  // HP text
  ctx.fillStyle = "#fff";
  ctx.font = `800 ${Math.round(10 * scale)}px ${BODY_FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(
    `${Math.ceil(snapshot.player.hp)} / ${PLAYER_MAX_HP}`,
    canvasWidth / 2,
    hpY + hpBarHeight - 2
  );

  // Heart icon
  ctx.font = `${Math.round(11 * scale)}px sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText("❤️", hpX - 4, hpY + hpBarHeight - 1);

  // --- Desktop only: keyboard hints ---
  if (!_isMobile) {
    const bottomY = canvasHeight - padding;

    ctx.font = `700 ${Math.round(11 * scale)}px ${BODY_FONT}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.textAlign = "left";
    ctx.fillText("WASD: Move  SPACE: Dash", padding, bottomY - 16);
    ctx.fillText("J: Attack  K: Block  L: Heal", padding, bottomY);

    ctx.textAlign = "right";
    const rightX = canvasWidth - padding;

    const dashReady = snapshot.player.dashCooldown <= 0;
    ctx.fillStyle = dashReady ? "#ffeaa7" : "rgba(255,255,255,0.25)";
    ctx.fillText(
      dashReady ? "DASH Ready" : `DASH ${(snapshot.player.dashCooldown / 20).toFixed(1)}s`,
      rightX,
      bottomY - 32
    );

    const blockReady = snapshot.player.blockCooldown <= 0;
    ctx.fillStyle = blockReady ? "#74b9ff" : "rgba(255,255,255,0.25)";
    ctx.fillText(
      blockReady ? "BLOCK Ready" : `BLOCK ${(snapshot.player.blockCooldown / 20).toFixed(1)}s`,
      rightX,
      bottomY - 16
    );

    const stateLabel = getStateLabel(snapshot.player.state);
    if (stateLabel) {
      ctx.fillStyle = stateLabel.color;
      ctx.font = `${Math.round(15 * scale)}px ${DISPLAY_FONT}`;
      ctx.textAlign = "right";

      // Text outline
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 3;
      ctx.strokeText(stateLabel.text, rightX, bottomY);
      ctx.fillText(stateLabel.text, rightX, bottomY);
    }
  }

  ctx.restore();
}

function getStateLabel(state: PlayerState): { text: string; color: string } | null {
  switch (state) {
    case PlayerState.Attacking:
      return { text: "BONK!", color: "#ff6b6b" };
    case PlayerState.HeavyCharging:
      return { text: "CHARGING...", color: "#ff9f43" };
    case PlayerState.Blocking:
      return { text: "BLOCKING...", color: "#74b9ff" };
    case PlayerState.BlockActive:
      return { text: "SHIELD UP!", color: "#74b9ff" };
    case PlayerState.HealingCharge:
      return { text: "STAY STILL!", color: "#55efc4" };
    case PlayerState.HealingActive:
      return { text: "HEALED!", color: "#55efc4" };
    case PlayerState.Stunned:
      return { text: "STUNNED!", color: "#636e72" };
    case PlayerState.Dashing:
      return { text: "ZOOM!", color: "#ffeaa7" };
    default:
      return null;
  }
}
