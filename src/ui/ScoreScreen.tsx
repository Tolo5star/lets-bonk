import type { ScoreData } from "../game/types";
import { isTouchDevice } from "../input/detect-device";
import { colors, fonts, shadows } from "./theme";

interface ScoreScreenProps {
  scores: ScoreData;
  won: boolean;
  onPlayAgain: () => void;
}

export function ScoreScreen({ scores, won, onPlayAgain }: ScoreScreenProps) {
  const survivalSec = Math.floor(scores.survivalTimeMs / 1000);
  const survivalMin = Math.floor(survivalSec / 60);
  const survivalRemSec = survivalSec % 60;

  const healRate =
    scores.healAttempts > 0
      ? `${scores.healSuccesses}/${scores.healAttempts}`
      : "0/0";

  return (
    <div style={s.container}>
      {/* Decorative corner blobs */}
      <div style={s.blobTopRight} />
      <div style={s.blobBottomLeft} />

      <div style={s.scrollArea}>
        <h1 style={s.title}>
          {won ? "You Won!" : "Game Over"}
        </h1>
        <p style={s.subtitle}>
          {won ? "You bonked every last one of them!" : "You got bonked"}
        </p>

        {/* Stats grid — always compact */}
        <div style={s.statsGrid}>
          <StatChip
            value={`${scores.damageDealt}`}
            label="Dealt"
            icon="⚔️"
            color={colors.red}
          />
          <StatChip
            value={`${scores.damageTaken}`}
            label="Taken"
            icon="💥"
            color={colors.orange}
          />
          <StatChip
            value={`${scores.enemiesKilled}`}
            label="Killed"
            icon="💀"
            color={colors.purple}
          />
          <StatChip
            value={`${scores.wavesCompleted}`}
            label="Waves"
            icon="🌊"
            color={colors.blue}
          />
          <StatChip
            value={healRate}
            label="Heals"
            icon="💚"
            color={colors.green}
          />
          <StatChip
            value={`${survivalMin}:${survivalRemSec.toString().padStart(2, "0")}`}
            label="Time"
            icon="⏱️"
            color={colors.yellow}
          />
        </div>

        <button
          style={s.playAgainBtn}
          onClick={onPlayAgain}
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(3px)";
          }}
          onPointerUp={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          }}
        >
          Play Again
        </button>

        <p style={s.hint}>
          {isTouchDevice() ? "Tap to play again" : "Press Enter to play again"}
        </p>
      </div>
    </div>
  );
}

function StatChip({
  value,
  label,
  icon,
  color,
}: {
  value: string;
  label: string;
  icon: string;
  color: string;
}) {
  return (
    <div
      style={{
        ...s.chip,
        borderColor: color + "44",
        background: color + "12",
      }}
    >
      <span style={s.chipIcon}>{icon}</span>
      <span style={{ ...s.chipValue, color }}>{value}</span>
      <span style={s.chipLabel}>{label}</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    position: "relative",
    width: "100%",
    height: "100%",
    background: `radial-gradient(ellipse at 50% 30%, ${colors.bgWarm} 0%, ${colors.bgDark} 70%)`,
    overflow: "auto",
  },
  scrollArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
    padding: "1.2rem",
    position: "relative",
    zIndex: 2,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: "clamp(2rem, 6vw, 3.5rem)",
    color: colors.yellow,
    textShadow: shadows.text,
    marginBottom: "0.2rem",
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: "0.95rem",
    fontWeight: 700,
    color: colors.textMuted,
    marginBottom: "1.2rem",
    fontStyle: "italic",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    width: "100%",
    maxWidth: "380px",
    marginBottom: "1.2rem",
  },
  chip: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "10px 6px 8px",
    borderRadius: "12px",
    border: "2px solid",
    gap: "2px",
  },
  chipIcon: {
    fontSize: "1.1rem",
  },
  chipValue: {
    fontFamily: fonts.display,
    fontSize: "1.3rem",
  },
  chipLabel: {
    fontFamily: fonts.body,
    fontSize: "0.65rem",
    fontWeight: 700,
    color: colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  },
  playAgainBtn: {
    padding: "14px 40px",
    fontSize: "1.2rem",
    fontFamily: fonts.display,
    letterSpacing: "1px",
    border: `3px solid ${colors.blue}`,
    borderBottom: `6px solid #2ea8a0`,
    borderRadius: "16px",
    background: `linear-gradient(180deg, ${colors.blue} 0%, #3bb8b0 100%)`,
    color: "#fff",
    cursor: "pointer",
    boxShadow: `0 4px 0 #228880, ${shadows.box}`,
    textTransform: "uppercase" as const,
    transition: "transform 0.1s",
    marginBottom: "0.5rem",
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: "0.75rem",
    fontWeight: 600,
    color: colors.textMuted,
  },
  blobTopRight: {
    position: "absolute",
    width: "200px",
    height: "200px",
    borderRadius: "50%",
    background: `radial-gradient(circle, ${colors.pink}15 0%, transparent 70%)`,
    top: "-40px",
    right: "-40px",
    zIndex: 0,
  },
  blobBottomLeft: {
    position: "absolute",
    width: "180px",
    height: "180px",
    borderRadius: "50%",
    background: `radial-gradient(circle, ${colors.blue}12 0%, transparent 70%)`,
    bottom: "-30px",
    left: "-30px",
    zIndex: 0,
  },
};
