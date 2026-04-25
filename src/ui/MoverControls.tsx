import { useRef, useEffect } from "react";
import type { PlayerSnapshot } from "../game/types";
import { DASH_COOLDOWN_TICKS } from "../game/constants";

interface MoverControlsProps {
  onMount: (joystickContainer: HTMLElement, dashBtn: HTMLElement) => void;
  player: PlayerSnapshot | null;
}

export function MoverControls({ onMount, player }: MoverControlsProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const dashRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (joystickRef.current && dashRef.current && !mountedRef.current) {
      mountedRef.current = true;
      onMount(joystickRef.current, dashRef.current);
    }
  }, [onMount]);

  const dashReady = player ? player.dashCooldown <= 0 : true;
  const dashCooldownPct = player
    ? Math.min(player.dashCooldown / DASH_COOLDOWN_TICKS, 1)
    : 0;

  return (
    <div style={styles.container}>
      {/* Joystick zone — takes most of the space */}
      <div ref={joystickRef} style={styles.joystickZone} />

      {/* Dash button */}
      <div
        ref={dashRef}
        style={{
          ...styles.dashButton,
          opacity: dashReady ? 1 : 0.4,
          background: dashReady
            ? "rgba(255, 234, 167, 0.2)"
            : "rgba(100, 100, 100, 0.15)",
          borderColor: dashReady
            ? "rgba(255, 234, 167, 0.5)"
            : "rgba(100, 100, 100, 0.2)",
        }}
      >
        <span style={styles.dashLabel}>DASH</span>
        {!dashReady && (
          <div
            style={{
              ...styles.cooldownOverlay,
              height: `${dashCooldownPct * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    padding: "6px",
    gap: "5px",
    position: "relative",
  },
  joystickZone: {
    flex: 1,
    position: "relative",
    borderRadius: "10px",
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    overflow: "hidden",
  },
  dashButton: {
    position: "relative",
    height: "36px",
    borderRadius: "10px",
    border: "2px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    cursor: "pointer",
  },
  dashLabel: {
    fontFamily: "monospace",
    fontWeight: "bold",
    fontSize: "16px",
    color: "rgba(255, 234, 167, 0.9)",
    letterSpacing: "2px",
    zIndex: 1,
    position: "relative" as const,
  },
  cooldownOverlay: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: "rgba(0, 0, 0, 0.4)",
    transition: "height 0.05s linear",
  },
};
