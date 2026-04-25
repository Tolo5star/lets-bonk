import { useState, useCallback, useEffect, useRef } from "react";
import { GameScreen } from "./ui/GameScreen";
import { ScoreScreen } from "./ui/ScoreScreen";
import { LobbyScreen } from "./ui/LobbyScreen";
import { MultiplayerGameScreen } from "./ui/MultiplayerGameScreen";
import { isTouchDevice, tryLockLandscape } from "./input/detect-device";
import { colors, fonts, shadows } from "./ui/theme";
import type { WsTransport } from "./network/ws-transport";
import type { ScoreData, Role } from "./game/types";

type Screen = "title" | "game" | "lobby" | "multiplayer-game" | "score";

function getRoomFromURL(): string | undefined {
  const params = new URLSearchParams(window.location.search);
  return params.get("room")?.toUpperCase() || undefined;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() =>
    getRoomFromURL() ? "lobby" : "title"
  );
  const [scores, setScores] = useState<ScoreData | null>(null);
  const [won, setWon] = useState(false);
  const [mpTransport, setMpTransport] = useState<WsTransport | null>(null);
  const [mpRole, setMpRole] = useState<Role>("mover");
  const [mpIsHost, setMpIsHost] = useState(false);
  const initialRoomRef = useRef(getRoomFromURL());

  const handleStartLocal = useCallback(() => setScreen("game"), []);
  const handlePlayOnline = useCallback(() => setScreen("lobby"), []);

  const handleGameOver = useCallback((s: ScoreData, w: boolean) => {
    setScores(s);
    setWon(w);
    setScreen("score");
  }, []);

  const handlePlayAgain = useCallback(() => {
    mpTransport?.close();
    setMpTransport(null);
    setScreen("title");
    window.history.replaceState({}, "", window.location.pathname);
  }, [mpTransport]);

  const handleLobbyBack = useCallback(() => {
    mpTransport?.close();
    setMpTransport(null);
    setScreen("title");
    window.history.replaceState({}, "", window.location.pathname);
  }, [mpTransport]);

  const handleMultiplayerStart = useCallback(
    (transport: WsTransport, role: Role, isHost: boolean) => {
      setMpTransport(transport);
      setMpRole(role);
      setMpIsHost(isHost);
      setScreen("multiplayer-game");
    },
    []
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (screen === "title") handleStartLocal();
        if (screen === "score") handlePlayAgain();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [screen, handleStartLocal, handlePlayAgain]);

  if (screen === "game") {
    tryLockLandscape();
    return <GameScreen onGameOver={handleGameOver} />;
  }
  if (screen === "lobby") {
    return (
      <LobbyScreen
        initialRoomCode={initialRoomRef.current}
        onGameStart={handleMultiplayerStart}
        onBack={handleLobbyBack}
      />
    );
  }
  if (screen === "multiplayer-game" && mpTransport) {
    tryLockLandscape();
    return (
      <MultiplayerGameScreen
        transport={mpTransport}
        role={mpRole}
        isHost={mpIsHost}
        onGameOver={handleGameOver}
      />
    );
  }
  if (screen === "score" && scores) {
    return (
      <ScoreScreen scores={scores} won={won} onPlayAgain={handlePlayAgain} />
    );
  }

  // ===== TITLE SCREEN =====
  return (
    <div style={s.container}>
      {/* Decorative blobs */}
      <div style={s.blobPink} />
      <div style={s.blobBlue} />
      <div style={s.blobGreen} />

      <div style={s.content}>
        <h1 style={s.title}>
          Let's <span style={s.titleAccent}>Bonk</span>
        </h1>
        <p style={s.tagline}>Timing is bad. Consequences are funny.</p>

        <div style={s.buttonGroup}>
          <button
            style={s.primaryBtn}
            onClick={handlePlayOnline}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(3px)";
              (e.currentTarget as HTMLElement).style.boxShadow = shadows.box;
            }}
            onPointerUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = s.primaryBtn.boxShadow as string;
            }}
          >
            Play Together
          </button>
          <button style={s.secondaryBtn} onClick={handleStartLocal}>
            Local Play
          </button>
        </div>

        <p style={s.hint}>
          {isTouchDevice()
            ? "Two phones, two players, one chaos!"
            : "Share a keyboard or play online!"}
        </p>

        <div style={s.footer}>
          <span style={s.footerEmoji}>🎮</span>
          <span> A co-op game about trust, chaos, and bonking </span>
          <span style={s.footerEmoji}>💥</span>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    background: `radial-gradient(ellipse at 30% 20%, ${colors.bgWarm} 0%, ${colors.bgDark} 70%)`,
    overflow: "hidden",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    zIndex: 2,
    padding: "1.5rem",
  },
  title: {
    fontFamily: fonts.display,
    fontSize: "clamp(2.5rem, 8vw, 5rem)",
    color: colors.textLight,
    textShadow: shadows.text,
    lineHeight: 1.1,
    textAlign: "center",
    marginBottom: "0.3rem",
  },
  titleAccent: {
    color: colors.pink,
    textShadow: shadows.textGlow("rgba(255,107,157,0.4)"),
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: "clamp(0.8rem, 2.5vw, 1.1rem)",
    fontWeight: 700,
    color: colors.yellow,
    marginBottom: "2rem",
    textShadow: "1px 1px 0 rgba(0,0,0,0.3)",
    fontStyle: "italic",
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "1.5rem",
    alignItems: "center",
  },
  primaryBtn: {
    padding: "16px 48px",
    fontSize: "1.3rem",
    fontFamily: fonts.display,
    letterSpacing: "1px",
    border: `3px solid ${colors.pink}`,
    borderRadius: "18px",
    borderBottom: `6px solid #cc4477`,
    background: `linear-gradient(180deg, ${colors.pink} 0%, #e8507a 100%)`,
    color: "#fff",
    cursor: "pointer",
    boxShadow: `0 6px 0 #aa3366, ${shadows.box}`,
    textTransform: "uppercase" as const,
    transition: "transform 0.1s, box-shadow 0.1s",
  },
  secondaryBtn: {
    padding: "10px 32px",
    fontSize: "0.95rem",
    fontFamily: fonts.body,
    fontWeight: 800,
    border: `2px solid rgba(255,255,255,0.2)`,
    borderRadius: "12px",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.6)",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: "0.85rem",
    fontWeight: 700,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: "1.5rem",
  },
  footer: {
    fontFamily: fonts.body,
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "rgba(255,255,255,0.25)",
    textAlign: "center",
  },
  footerEmoji: {
    fontSize: "0.9rem",
  },

  // Decorative background blobs
  blobPink: {
    position: "absolute",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: `radial-gradient(circle, ${colors.pink}15 0%, transparent 70%)`,
    top: "-50px",
    right: "-50px",
    zIndex: 0,
  },
  blobBlue: {
    position: "absolute",
    width: "250px",
    height: "250px",
    borderRadius: "50%",
    background: `radial-gradient(circle, ${colors.blue}12 0%, transparent 70%)`,
    bottom: "-30px",
    left: "-30px",
    zIndex: 0,
  },
  blobGreen: {
    position: "absolute",
    width: "200px",
    height: "200px",
    borderRadius: "50%",
    background: `radial-gradient(circle, ${colors.green}10 0%, transparent 70%)`,
    top: "40%",
    left: "10%",
    zIndex: 0,
  },
};
