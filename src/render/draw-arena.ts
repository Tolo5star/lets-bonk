import { ARENA_RADIUS } from "../game/constants";

export function drawArena(ctx: CanvasRenderingContext2D) {
  // Ground fill — dark purple-blue
  ctx.beginPath();
  ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = "#1e1e3a";
  ctx.fill();

  // Subtle grid for motion perception
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2);
  ctx.clip();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
  ctx.lineWidth = 1;
  const gridSize = 50;
  for (let x = -ARENA_RADIUS; x <= ARENA_RADIUS; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, -ARENA_RADIUS);
    ctx.lineTo(x, ARENA_RADIUS);
    ctx.stroke();
  }
  for (let y = -ARENA_RADIUS; y <= ARENA_RADIUS; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(-ARENA_RADIUS, y);
    ctx.lineTo(ARENA_RADIUS, y);
    ctx.stroke();
  }
  ctx.restore();

  // Arena boundary — thick colorful ring
  ctx.beginPath();
  ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = "#4ecdc4";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Outer glow
  ctx.beginPath();
  ctx.arc(0, 0, ARENA_RADIUS + 6, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(78, 205, 196, 0.15)";
  ctx.lineWidth = 12;
  ctx.stroke();

  // Inner glow
  ctx.beginPath();
  ctx.arc(0, 0, ARENA_RADIUS - 3, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(78, 205, 196, 0.06)";
  ctx.lineWidth = 6;
  ctx.stroke();
}
