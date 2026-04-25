export function isTouchDevice(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export function isMobile(): boolean {
  return isTouchDevice() && window.innerWidth < 1024;
}

export function tryLockLandscape() {
  try {
    const orientation = screen.orientation;
    if (orientation?.lock) {
      orientation.lock("landscape").catch(() => {
        // Silently fail — not supported on iOS Safari
      });
    }
  } catch {
    // Not available
  }
}
