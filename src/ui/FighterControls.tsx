import { useRef, useEffect } from "react";
import { PlayerState, type PlayerSnapshot } from "../game/types";
import {
  BLOCK_COOLDOWN_TICKS,
  HEAL_CHARGE_TICKS,
  HEAVY_ATTACK_CHARGE_TICKS,
  BLOCK_CHARGE_TICKS,
} from "../game/constants";

interface FighterControlsProps {
  onMount: (attackBtn: HTMLElement, blockBtn: HTMLElement, healBtn: HTMLElement) => void;
  player: PlayerSnapshot | null;
}

export function FighterControls({ onMount, player }: FighterControlsProps) {
  const attackRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const healRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (attackRef.current && blockRef.current && healRef.current && !mountedRef.current) {
      mountedRef.current = true;
      onMount(attackRef.current, blockRef.current, healRef.current);
    }
  }, [onMount]);

  const blockReady = player ? player.blockCooldown <= 0 : true;
  const blockCooldownPct = player
    ? Math.min(player.blockCooldown / BLOCK_COOLDOWN_TICKS, 1)
    : 0;

  // Heal is "available" when player is still and heal is held
  const isCharging = player?.state === PlayerState.HealingCharge;
  const healProgress = isCharging
    ? Math.min((player?.stateTimer ?? 0) / HEAL_CHARGE_TICKS, 1)
    : 0;

  // Attack charge progress (for heavy attack visual)
  const isAttackCharging = player?.state === PlayerState.HeavyCharging;
  const attackChargePct = isAttackCharging
    ? Math.min((player?.stateTimer ?? 0) / HEAVY_ATTACK_CHARGE_TICKS, 1)
    : 0;

  // Block charge progress
  const isBlockCharging = player?.state === PlayerState.Blocking;
  const blockChargePct = isBlockCharging
    ? Math.min((player?.stateTimer ?? 0) / BLOCK_CHARGE_TICKS, 1)
    : 0;

  return (
    <div style={styles.container}>
      {/* Top row: Block + Heal */}
      <div style={styles.topRow}>
        <div
          ref={blockRef}
          style={{
            ...styles.button,
            ...styles.blockButton,
            opacity: blockReady ? 1 : 0.4,
            background: isBlockCharging
              ? `rgba(116, 185, 255, ${0.2 + blockChargePct * 0.3})`
              : blockReady
                ? "rgba(116, 185, 255, 0.15)"
                : "rgba(100, 100, 100, 0.1)",
            borderColor: isBlockCharging
              ? `rgba(116, 185, 255, ${0.5 + blockChargePct * 0.4})`
              : blockReady
                ? "rgba(116, 185, 255, 0.4)"
                : "rgba(100, 100, 100, 0.2)",
          }}
        >
          <span style={{ ...styles.buttonLabel, color: "rgba(116, 185, 255, 0.9)" }}>
            BLOCK
          </span>
          {isBlockCharging && (
            <div
              style={{
                ...styles.chargeRing,
                background: `conic-gradient(rgba(116, 185, 255, 0.4) ${blockChargePct * 360}deg, transparent 0deg)`,
              }}
            />
          )}
          {!blockReady && !isBlockCharging && (
            <div
              style={{
                ...styles.cooldownOverlay,
                height: `${blockCooldownPct * 100}%`,
              }}
            />
          )}
        </div>

        <div
          ref={healRef}
          style={{
            ...styles.button,
            ...styles.healButton,
            background: isCharging
              ? `rgba(85, 239, 196, ${0.15 + healProgress * 0.35})`
              : "rgba(85, 239, 196, 0.1)",
            borderColor: isCharging
              ? `rgba(85, 239, 196, ${0.4 + healProgress * 0.5})`
              : "rgba(85, 239, 196, 0.3)",
            boxShadow: healProgress >= 1
              ? "0 0 20px rgba(0, 184, 148, 0.6)"
              : "none",
          }}
        >
          <span style={{ ...styles.buttonLabel, color: "rgba(85, 239, 196, 0.9)" }}>
            HEAL
          </span>
          {isCharging && (
            <div
              style={{
                ...styles.chargeRing,
                background: `conic-gradient(rgba(0, 184, 148, 0.5) ${healProgress * 360}deg, transparent 0deg)`,
              }}
            />
          )}
        </div>
      </div>

      {/* ATTACK — biggest button, bottom */}
      <div
        ref={attackRef}
        style={{
          ...styles.button,
          ...styles.attackButton,
          background: isAttackCharging
            ? `rgba(255, 107, 107, ${0.2 + attackChargePct * 0.3})`
            : "rgba(255, 107, 107, 0.15)",
          borderColor: isAttackCharging
            ? attackChargePct >= 1
              ? "rgba(255, 107, 107, 0.9)"
              : `rgba(255, 159, 67, ${0.5 + attackChargePct * 0.4})`
            : "rgba(255, 107, 107, 0.4)",
          boxShadow: attackChargePct >= 1
            ? "0 0 25px rgba(255, 107, 107, 0.5)"
            : "none",
        }}
      >
        <span
          style={{
            ...styles.buttonLabel,
            fontSize: "16px",
            color: "rgba(255, 107, 107, 0.95)",
          }}
        >
          {isAttackCharging && attackChargePct >= 1 ? "BONK!" : "ATTACK"}
        </span>
        {isAttackCharging && (
          <div
            style={{
              ...styles.chargeRing,
              background: `conic-gradient(${
                attackChargePct >= 1
                  ? "rgba(255, 107, 107, 0.5)"
                  : "rgba(255, 159, 67, 0.4)"
              } ${attackChargePct * 360}deg, transparent 0deg)`,
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
  },
  topRow: {
    display: "flex",
    gap: "5px",
    height: "45%",
  },
  button: {
    position: "relative",
    borderRadius: "12px",
    border: "2px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    cursor: "pointer",
  },
  blockButton: {
    flex: 1,
  },
  healButton: {
    flex: 1,
  },
  attackButton: {
    flex: 1,
  },
  buttonLabel: {
    fontFamily: "monospace",
    fontWeight: "bold",
    fontSize: "14px",
    letterSpacing: "2px",
    zIndex: 1,
    position: "relative" as const,
  },
  chargeRing: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: "12px",
    pointerEvents: "none" as const,
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
