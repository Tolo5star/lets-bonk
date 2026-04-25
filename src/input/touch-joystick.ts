/**
 * Floating virtual joystick.
 * Touch-start point becomes the center. Drag to move. Release snaps to (0,0).
 * Draws itself on a small overlay canvas inside the container.
 */
export class TouchJoystick {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private activePointerId: number | null = null;
  private originX = 0;
  private originY = 0;
  private thumbX = 0;
  private thumbY = 0;
  private maxRadius = 40;
  private deadZone = 0.12;
  private resizeObserver: ResizeObserver | null = null;

  // Normalized output
  x = 0;
  y = 0;

  constructor(container: HTMLElement) {
    this.container = container;

    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;";
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d")!;

    container.style.touchAction = "none";
    container.style.position = "relative";
    container.addEventListener("pointerdown", this.onPointerDown);
    container.addEventListener("pointermove", this.onPointerMove);
    container.addEventListener("pointerup", this.onPointerUp);
    container.addEventListener("pointercancel", this.onPointerUp);

    // Use ResizeObserver to properly size the canvas after layout
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
      if (this.activePointerId === null) {
        this.drawIdle();
      }
    });
    this.resizeObserver.observe(container);

    // Initial draw after a frame to ensure layout
    requestAnimationFrame(() => {
      this.resizeCanvas();
      this.drawIdle();
    });
  }

  private resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.maxRadius = Math.min(rect.width, rect.height) * 0.28;
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.activePointerId !== null) return;
    e.preventDefault();
    this.activePointerId = e.pointerId;
    this.container.setPointerCapture(e.pointerId);

    const rect = this.container.getBoundingClientRect();
    this.originX = e.clientX - rect.left;
    this.originY = e.clientY - rect.top;
    this.thumbX = this.originX;
    this.thumbY = this.originY;
    this.updateOutput();
  };

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== this.activePointerId) return;
    e.preventDefault();
    const rect = this.container.getBoundingClientRect();
    this.thumbX = e.clientX - rect.left;
    this.thumbY = e.clientY - rect.top;

    // Clamp to max radius
    const dx = this.thumbX - this.originX;
    const dy = this.thumbY - this.originY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.maxRadius) {
      this.thumbX = this.originX + (dx / dist) * this.maxRadius;
      this.thumbY = this.originY + (dy / dist) * this.maxRadius;
    }

    this.updateOutput();
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.x = 0;
    this.y = 0;
    this.drawIdle();
  };

  private updateOutput() {
    const dx = this.thumbX - this.originX;
    const dy = this.thumbY - this.originY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const normalizedDist = dist / this.maxRadius;

    if (normalizedDist < this.deadZone) {
      this.x = 0;
      this.y = 0;
    } else {
      this.x = dx / this.maxRadius;
      this.y = dy / this.maxRadius;
    }

    this.drawActive();
  }

  private drawActive() {
    const ctx = this.ctx;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // Base ring (at touch origin)
    ctx.beginPath();
    ctx.arc(this.originX, this.originY, this.maxRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(78, 205, 196, 0.35)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(78, 205, 196, 0.06)";
    ctx.fill();

    // Thumb knob
    ctx.beginPath();
    ctx.arc(this.thumbX, this.thumbY, this.maxRadius * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(78, 205, 196, 0.45)";
    ctx.fill();
    ctx.strokeStyle = "rgba(78, 205, 196, 0.65)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawIdle() {
    const ctx = this.ctx;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, this.maxRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(78, 205, 196, 0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner knob hint
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(78, 205, 196, 0.3)";
    ctx.fill();

    // Directional arrows (tiny triangles)
    const arrowDist = this.maxRadius * 0.65;
    ctx.fillStyle = "rgba(78, 205, 196, 0.2)";
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const ax = cx + Math.cos(angle) * arrowDist;
      const ay = cy + Math.sin(angle) * arrowDist;
      ctx.beginPath();
      ctx.moveTo(
        ax + Math.cos(angle) * 6,
        ay + Math.sin(angle) * 6
      );
      ctx.lineTo(
        ax + Math.cos(angle + 2.3) * 5,
        ay + Math.sin(angle + 2.3) * 5
      );
      ctx.lineTo(
        ax + Math.cos(angle - 2.3) * 5,
        ay + Math.sin(angle - 2.3) * 5
      );
      ctx.closePath();
      ctx.fill();
    }

    // Label below
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("MOVE", cx, h - 8);
  }

  destroy() {
    this.container.removeEventListener("pointerdown", this.onPointerDown);
    this.container.removeEventListener("pointermove", this.onPointerMove);
    this.container.removeEventListener("pointerup", this.onPointerUp);
    this.container.removeEventListener("pointercancel", this.onPointerUp);
    this.resizeObserver?.disconnect();
    this.canvas.remove();
  }
}
