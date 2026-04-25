import { useState, useEffect, useRef, useCallback } from "react";
import { WsTransport } from "../network/ws-transport";
import { createRoom, joinRoom } from "../network/room";
import { isTouchDevice } from "../input/detect-device";
import { colors, fonts, shadows } from "./theme";
import type { Role } from "../game/types";
import type { NetMessage } from "../network/types";

type LobbyState = "initial" | "connecting" | "waiting" | "role_select";

interface LobbyScreenProps {
  initialRoomCode?: string;
  onGameStart: (transport: WsTransport, role: Role, isHost: boolean) => void;
  onBack: () => void;
}

const RELAY_URL =
  (import.meta as any).env?.VITE_RELAY_URL || "ws://localhost:8080";

export function LobbyScreen({ initialRoomCode, onGameStart, onBack }: LobbyScreenProps) {
  const [state, setState] = useState<LobbyState>(
    initialRoomCode ? "connecting" : "initial"
  );
  const [roomCode, setRoomCode] = useState(initialRoomCode || "");
  const [joinInput, setJoinInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [peerRole, setPeerRole] = useState<Role | null>(null);
  const transportRef = useRef<WsTransport | null>(null);
  const onGameStartRef = useRef(onGameStart);
  onGameStartRef.current = onGameStart;

  useEffect(() => {
    if (initialRoomCode) handleJoin(initialRoomCode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback((): WsTransport => {
    transportRef.current?.close();
    const transport = new WsTransport(RELAY_URL);
    transportRef.current = transport;
    transport.onStateChange((s) => {
      if (s === "disconnected") {
        setError("Connection lost");
        setState("initial");
      }
    });
    return transport;
  }, []);

  const waitForOpen = (transport: WsTransport): Promise<void> =>
    new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Connection timeout")), 5000);
      if (transport.state === "connected") { clearTimeout(timeout); resolve(); return; }
      transport.onStateChange((s) => {
        if (s === "connected") { clearTimeout(timeout); resolve(); }
        if (s === "disconnected") { clearTimeout(timeout); reject(new Error("Failed to connect")); }
      });
    });

  const handleCreate = useCallback(async () => {
    setError(null);
    setState("connecting");
    try {
      const transport = connect();
      await waitForOpen(transport);
      const code = await createRoom(transport);
      setRoomCode(code);
      setIsHost(true);
      setState("waiting");

      transport.onMessage((msg: NetMessage) => {
        if (msg.type === "peer_joined") setState("role_select");
        if (msg.type === "role_pick") setPeerRole(msg.role);
        if (msg.type === "peer_left") {
          setPeerRole(null);
          setMyRole(null);
          setState("waiting");
        }
      });
    } catch (e: any) {
      setError(e.message || "Failed to create room");
      setState("initial");
    }
  }, [connect]);

  const handleJoin = useCallback(async (code?: string) => {
    const target = (code || joinInput).trim().toUpperCase();
    if (!target || target.length !== 4) {
      setError("Enter a 4-character room code");
      return;
    }
    setError(null);
    setState("connecting");
    try {
      const transport = connect();
      await waitForOpen(transport);
      await joinRoom(transport, target);
      setRoomCode(target);
      setIsHost(false);
      setState("role_select");

      transport.onMessage((msg: NetMessage) => {
        if (msg.type === "role_pick") setPeerRole(msg.role);
        if (msg.type === "game_start") {
          onGameStartRef.current(transport, msg.guestRole, false);
        }
        if (msg.type === "peer_left") {
          setError("Host disconnected");
          setState("initial");
        }
      });
    } catch (e: any) {
      setError(e.message || "Failed to join room");
      setState("initial");
    }
  }, [connect, joinInput]);

  const handleRolePick = useCallback((role: Role) => {
    setMyRole(role);
    transportRef.current?.send({ type: "role_pick", role });
  }, []);

  // Host: start game when roles are complementary
  useEffect(() => {
    if (!isHost || !myRole || !peerRole || myRole === peerRole) return;
    const transport = transportRef.current;
    if (transport) {
      transport.send({ type: "game_start", hostRole: myRole, guestRole: peerRole });
      onGameStartRef.current(transport, myRole, true);
    }
  }, [isHost, myRole, peerRole]);

  const shareLink = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

  // --- Renders ---

  if (state === "connecting") {
    return (
      <div style={s.container}>
        <div style={s.panel}>
          <div style={s.loadingDots}>Connecting...</div>
        </div>
      </div>
    );
  }

  if (state === "waiting") {
    return (
      <div style={s.container}>
        <div style={s.panel}>
          <p style={s.panelSubtitle}>Waiting for partner...</p>
          <div style={s.roomCodeBig}>{roomCode}</div>
          <div style={s.shareRow}>
            <button
              style={s.shareBtn}
              onClick={() => navigator.clipboard.writeText(shareLink).catch(() => {})}
            >
              Copy Link
            </button>
            {isTouchDevice() && !!navigator.share && (
              <button
                style={s.shareBtn}
                onClick={() =>
                  navigator.share({ title: "Let's Bonk!", text: `Join me! Room: ${roomCode}`, url: shareLink }).catch(() => {})
                }
              >
                Share
              </button>
            )}
          </div>
          <p style={s.hint}>Share the code with your partner</p>
          <button style={s.backBtn} onClick={onBack}>Back</button>
        </div>
      </div>
    );
  }

  if (state === "role_select") {
    const conflict = myRole && peerRole && myRole === peerRole;
    return (
      <div style={s.container}>
        <div style={s.panel}>
          <h2 style={s.panelTitle}>Pick Your Role!</h2>
          <p style={s.hint}>Room: {roomCode}</p>

          <div style={s.roleRow}>
            {/* MOVER card */}
            <button
              style={{
                ...s.roleCard,
                borderColor: myRole === "mover" ? colors.blue : "rgba(255,255,255,0.15)",
                background: myRole === "mover" ? colors.blue + "20" : colors.bgCard,
                boxShadow: myRole === "mover" ? `0 0 20px ${colors.blue}33` : "none",
              }}
              onClick={() => handleRolePick("mover")}
            >
              <div style={{ fontSize: "2rem" }}>🕹️</div>
              <div style={{ ...s.roleCardTitle, color: colors.blue }}>You Move</div>
              <div style={s.roleCardDesc}>Joystick + Dash</div>
              <div style={s.roleCardFlavor}>"Get us to safety!"</div>
              {peerRole === "mover" && <div style={s.peerBadge}>Partner wants this</div>}
            </button>

            {/* FIGHTER card */}
            <button
              style={{
                ...s.roleCard,
                borderColor: myRole === "fighter" ? colors.red : "rgba(255,255,255,0.15)",
                background: myRole === "fighter" ? colors.red + "20" : colors.bgCard,
                boxShadow: myRole === "fighter" ? `0 0 20px ${colors.red}33` : "none",
              }}
              onClick={() => handleRolePick("fighter")}
            >
              <div style={{ fontSize: "2rem" }}>⚔️</div>
              <div style={{ ...s.roleCardTitle, color: colors.red }}>You Fight</div>
              <div style={s.roleCardDesc}>Attack + Block + Heal</div>
              <div style={s.roleCardFlavor}>"Protect & Bonk!"</div>
              {peerRole === "fighter" && <div style={s.peerBadge}>Partner wants this</div>}
            </button>
          </div>

          {conflict && (
            <div style={s.conflict}>Both picked {myRole}! Someone switch!</div>
          )}
          {myRole && !peerRole && (
            <p style={s.hint}>Waiting for partner to pick...</p>
          )}
        </div>
      </div>
    );
  }

  // Initial
  return (
    <div style={s.container}>
      <div style={s.panel}>
        <h2 style={s.panelTitle}>Play Online</h2>

        {error && <div style={s.error}>{error}</div>}

        <button style={s.createBtn} onClick={handleCreate}>
          Create Room
        </button>

        <div style={s.dividerRow}>
          <div style={s.dividerLine} />
          <span style={s.dividerText}>or join</span>
          <div style={s.dividerLine} />
        </div>

        <div style={s.joinRow}>
          <input
            style={s.codeInput}
            placeholder="CODE"
            maxLength={4}
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
          <button style={s.joinBtn} onClick={() => handleJoin()}>
            Join
          </button>
        </div>

        <button style={s.backBtn} onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    background: `radial-gradient(ellipse at 40% 30%, ${colors.bgWarm} 0%, ${colors.bgDark} 70%)`,
    padding: "1rem",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    padding: "1.5rem 2rem",
    background: colors.bgPanel,
    borderRadius: "20px",
    border: `2px solid ${colors.border}`,
    boxShadow: shadows.box,
    maxWidth: "480px",
    width: "100%",
  },
  panelTitle: {
    fontFamily: fonts.display,
    fontSize: "1.6rem",
    color: colors.yellow,
    textShadow: shadows.text,
  },
  panelSubtitle: {
    fontFamily: fonts.body,
    fontWeight: 700,
    fontSize: "1rem",
    color: colors.textMuted,
  },
  roomCodeBig: {
    fontFamily: fonts.display,
    fontSize: "3rem",
    color: colors.yellow,
    letterSpacing: "10px",
    textShadow: shadows.textGlow("rgba(255,234,167,0.3)"),
  },
  shareRow: { display: "flex", gap: "8px" },
  shareBtn: {
    padding: "8px 18px",
    fontFamily: fonts.body,
    fontWeight: 700,
    fontSize: "0.85rem",
    border: `2px solid ${colors.border}`,
    borderRadius: "10px",
    background: "rgba(255,255,255,0.06)",
    color: colors.textLight,
    cursor: "pointer",
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: "0.75rem",
    fontWeight: 600,
    color: colors.textMuted,
  },
  error: {
    fontFamily: fonts.body,
    fontWeight: 700,
    color: colors.red,
    fontSize: "0.85rem",
    padding: "6px 14px",
    background: colors.red + "18",
    borderRadius: "8px",
  },
  createBtn: {
    padding: "14px 36px",
    fontSize: "1.1rem",
    fontFamily: fonts.display,
    letterSpacing: "1px",
    border: `3px solid ${colors.blue}`,
    borderBottom: `6px solid #2ea8a0`,
    borderRadius: "14px",
    background: `linear-gradient(180deg, ${colors.blue} 0%, #3bb8b0 100%)`,
    color: "#fff",
    cursor: "pointer",
    boxShadow: `0 4px 0 #228880, ${shadows.box}`,
    textTransform: "uppercase" as const,
  },
  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    maxWidth: "280px",
  },
  dividerLine: { flex: 1, height: "1px", background: colors.border },
  dividerText: {
    fontFamily: fonts.body,
    fontSize: "0.75rem",
    fontWeight: 600,
    color: colors.textMuted,
  },
  joinRow: { display: "flex", gap: "8px" },
  codeInput: {
    width: "110px",
    padding: "10px 12px",
    fontSize: "1.2rem",
    fontFamily: fonts.display,
    textAlign: "center" as const,
    letterSpacing: "5px",
    border: `2px solid ${colors.border}`,
    borderRadius: "10px",
    background: "rgba(255,255,255,0.06)",
    color: colors.yellow,
    outline: "none",
  },
  joinBtn: {
    padding: "10px 20px",
    fontFamily: fonts.body,
    fontWeight: 800,
    fontSize: "0.95rem",
    border: `2px solid ${colors.border}`,
    borderRadius: "10px",
    background: "rgba(255,255,255,0.06)",
    color: colors.textLight,
    cursor: "pointer",
  },
  backBtn: {
    marginTop: "4px",
    padding: "6px 16px",
    fontFamily: fonts.body,
    fontWeight: 600,
    fontSize: "0.75rem",
    border: `1px solid rgba(255,255,255,0.1)`,
    borderRadius: "8px",
    background: "transparent",
    color: colors.textMuted,
    cursor: "pointer",
  },
  roleRow: {
    display: "flex",
    gap: "12px",
    marginTop: "4px",
  },
  roleCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    padding: "14px 20px",
    borderRadius: "16px",
    border: "3px solid",
    cursor: "pointer",
    minWidth: "140px",
    transition: "all 0.15s",
  },
  roleCardTitle: {
    fontFamily: fonts.display,
    fontSize: "1.1rem",
  },
  roleCardDesc: {
    fontFamily: fonts.body,
    fontSize: "0.7rem",
    fontWeight: 700,
    color: colors.textMuted,
  },
  roleCardFlavor: {
    fontFamily: fonts.body,
    fontSize: "0.65rem",
    fontWeight: 600,
    color: colors.textMuted,
    fontStyle: "italic",
    marginTop: "2px",
  },
  peerBadge: {
    fontFamily: fonts.body,
    fontSize: "0.65rem",
    fontWeight: 800,
    color: colors.yellow,
    marginTop: "4px",
    padding: "2px 8px",
    background: colors.yellow + "18",
    borderRadius: "6px",
  },
  conflict: {
    fontFamily: fonts.body,
    fontWeight: 800,
    color: colors.red,
    fontSize: "0.9rem",
  },
  loadingDots: {
    fontFamily: fonts.body,
    fontWeight: 700,
    color: colors.textMuted,
    fontSize: "1rem",
  },
};
