import type { GameSnapshot } from "../game/types";
import { ARENA_RADIUS, CANVAS_PADDING } from "../game/constants";
import { drawArena } from "./draw-arena";
import { drawPlayer } from "./draw-player";
import { drawEnemies, drawProjectiles } from "./draw-enemies";
import { drawHUD, setHUDMobile } from "./draw-hud";
import { drawFloatingTexts } from "./draw-effects";
import { isTouchDevice } from "../input/detect-device";

let _isMobile = false;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private lastSnapshot: GameSnapshot | null = null;
  private screenShake = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    _isMobile = isTouchDevice();
    setHUDMobile(_isMobile);
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  private resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  triggerScreenShake(intensity: number = 5) {
    this.screenShake = Math.max(this.screenShake, intensity);
  }

  updateSnapshot(snapshot: GameSnapshot) {
    this.lastSnapshot = snapshot;
  }

  start() {
    const loop = () => {
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private render() {
    const snapshot = this.lastSnapshot;
    if (!snapshot) return;

    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Clear
    this.ctx.save();
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.fillStyle = "#1a1a2e";
    this.ctx.fillRect(0, 0, w, h);

    // Scale arena to fit the full screen. On mobile, controls overlay
    // the bottom transparently — the arena extends behind them.
    const padding = _isMobile ? 20 : CANVAS_PADDING;
    const scale = Math.min(
      w / (ARENA_RADIUS * 2 + padding * 2),
      h / (ARENA_RADIUS * 2 + padding * 2)
    );

    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShake > 0.5) {
      shakeX = (Math.random() - 0.5) * this.screenShake * 2;
      shakeY = (Math.random() - 0.5) * this.screenShake * 2;
      this.screenShake *= 0.85;
    } else {
      this.screenShake = 0;
    }

    // On mobile, nudge camera slightly up so the center of action
    // is above the controls overlay
    const camX = w / 2 + shakeX;
    const camY = (_isMobile ? h * 0.45 : h / 2) + shakeY;

    this.ctx.translate(camX, camY);
    this.ctx.scale(scale, scale);

    // Draw world
    drawArena(this.ctx);
    drawProjectiles(this.ctx, snapshot.projectiles);
    drawEnemies(this.ctx, snapshot.enemies);
    drawPlayer(this.ctx, snapshot.player);
    drawFloatingTexts(this.ctx);

    this.ctx.restore();

    // Draw HUD (screen space)
    this.ctx.save();
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawHUD(this.ctx, snapshot, w, h);
    this.ctx.restore();
  }

  destroy() {
    this.stop();
    window.removeEventListener("resize", this.resize);
  }
}
