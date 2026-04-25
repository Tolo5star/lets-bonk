/**
 * Touch-aware button state tracker with wobble animation.
 * Attaches to a DOM element and tracks press/hold/release.
 */
export class TouchButton {
  private element: HTMLElement;
  private activePointerId: number | null = null;

  isDown = false;
  justPressed = false;
  justReleased = false;
  holdDuration = 0; // ms since press
  private pressStart = 0;
  private wobbleTimeout: number | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
    element.style.touchAction = "none";
    element.style.userSelect = "none";
    element.style.webkitUserSelect = "none";
    element.style.pointerEvents = "auto";
    element.style.transition = "transform 0.1s ease";

    element.addEventListener("pointerdown", this.onDown);
    element.addEventListener("pointerup", this.onUp);
    element.addEventListener("pointercancel", this.onUp);
    element.addEventListener("pointerleave", this.onUp);
  }

  private onDown = (e: PointerEvent) => {
    if (this.activePointerId !== null) return;
    this.activePointerId = e.pointerId;
    this.element.setPointerCapture(e.pointerId);

    this.isDown = true;
    this.justPressed = true;
    this.pressStart = performance.now();
    this.holdDuration = 0;

    // Wobble effect!
    this.element.style.transform = "scale(0.88) rotate(-3deg)";
    if (this.wobbleTimeout) clearTimeout(this.wobbleTimeout);
    this.wobbleTimeout = window.setTimeout(() => {
      if (this.isDown) {
        this.element.style.transform = "scale(0.92) rotate(1deg)";
      }
    }, 80);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.isDown = false;
    this.justReleased = true;
    this.holdDuration = performance.now() - this.pressStart;

    // Bounce back with overshoot wobble
    this.element.style.transform = "scale(1.06) rotate(2deg)";
    if (this.wobbleTimeout) clearTimeout(this.wobbleTimeout);
    this.wobbleTimeout = window.setTimeout(() => {
      this.element.style.transform = "scale(1) rotate(0deg)";
    }, 100);
  };

  /** Call once per tick to read and clear one-shot flags */
  consume(): { pressed: boolean; released: boolean; held: boolean; holdMs: number } {
    const result = {
      pressed: this.justPressed,
      released: this.justReleased,
      held: this.isDown,
      holdMs: this.isDown ? performance.now() - this.pressStart : this.holdDuration,
    };
    this.justPressed = false;
    this.justReleased = false;
    return result;
  }

  destroy() {
    this.element.removeEventListener("pointerdown", this.onDown);
    this.element.removeEventListener("pointerup", this.onUp);
    this.element.removeEventListener("pointercancel", this.onUp);
    this.element.removeEventListener("pointerleave", this.onUp);
    if (this.wobbleTimeout) clearTimeout(this.wobbleTimeout);
  }
}
