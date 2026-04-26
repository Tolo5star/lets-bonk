import { useEffect, useRef, useState, useCallback } from "react";
import { GameLoop } from "../game/game-loop";
import { Renderer } from "../render/renderer";
import { InputManager } from "../input/input-manager";
import { TICK_MS } from "../game/constants";
import { isTouchDevice } from "../input/detect-device";
import { MoverControls } from "./MoverControls";
import { FighterControls } from "./FighterControls";
import { FeedbackToasts, useFeedbackToasts } from "./FeedbackToast";
import { SnapshotInterpolator } from "../render/interpolation";
import { spawnAttackText, spawnDamageText, spawnHealText } from "../render/draw-effects";
import type { WsTransport } from "../network/ws-transport";
import type { NetMessage } from "../network/types";
import type {
  Role,
  ScoreData,
  MoverInput,
  FighterInput,
  PlayerSnapshot,
} from "../game/types";

interface MultiplayerGameScreenProps {
  transport: WsTransport;
  role: Role; // local player's role
  isHost: boolean;
  onGameOver: (scores: ScoreData, won: boolean) => void;
}

export function MultiplayerGameScreen({
  transport,
  role,
  isHost,
  onGameOver,
}: MultiplayerGameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerState, setPlayerState] = useState<PlayerSnapshot | null>(null);
  const [isTouch] = useState(isTouchDevice);
  const [disconnected, setDisconnected] = useState(false);
  const { toasts, showToast } = useFeedbackToasts();
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  // InputManager: created eagerly so children can mount touch controls
  const inputRef = useRef<InputManager | null>(null);
  if (inputRef.current === null) {
    inputRef.current = new InputManager();
  }

  // Touch mount tracking
  const moverElsRef = useRef<{ joystickContainer: HTMLElement; dashBtn: HTMLElement } | null>(null);
  const fighterElsRef = useRef<{ attackBtn: HTMLElement; blockBtn: HTMLElement; healBtn: HTMLElement } | null>(null);
  const touchMountedRef = useRef(false);

  const tryMountTouch = useCallback(() => {
    if (touchMountedRef.current || !inputRef.current) return;
    // Only mount the controls for our role
    if (role === "mover" && moverElsRef.current) {
      // Create dummy elements for fighter (won't be used)
      const dummy = document.createElement("div");
      inputRef.current.mountTouchControls({
        joystickContainer: moverElsRef.current.joystickContainer,
        dashBtn: moverElsRef.current.dashBtn,
        attackBtn: dummy,
        blockBtn: dummy,
        healBtn: dummy,
      });
      touchMountedRef.current = true;
    }
    if (role === "fighter" && fighterElsRef.current) {
      const dummy = document.createElement("div");
      inputRef.current.mountTouchControls({
        joystickContainer: dummy,
        dashBtn: dummy,
        attackBtn: fighterElsRef.current.attackBtn,
        blockBtn: fighterElsRef.current.blockBtn,
        healBtn: fighterElsRef.current.healBtn,
      });
      touchMountedRef.current = true;
    }
  }, [role]);

  const onMoverMount = useCallback(
    (joystickContainer: HTMLElement, dashBtn: HTMLElement) => {
      moverElsRef.current = { joystickContainer, dashBtn };
      tryMountTouch();
    },
    [tryMountTouch]
  );

  const onFighterMount = useCallback(
    (attackBtn: HTMLElement, blockBtn: HTMLElement, healBtn: HTMLElement) => {
      fighterElsRef.current = { attackBtn, blockBtn, healBtn };
      tryMountTouch();
    },
    [tryMountTouch]
  );

  // === GAME LIFECYCLE ===
  useEffect(() => {
    const canvas = canvasRef.current;
    const input = inputRef.current;
    if (!canvas || !input) return;

    tryMountTouch();

    const renderer = new Renderer(canvas);
    const toast = showToastRef.current;
    const interpolator = isHost ? null : new SnapshotInterpolator();

    // Remote input buffer with sticky one-shot flags
    const remoteInput: { mover: MoverInput; fighter: FighterInput } = {
      mover: { moveX: 0, moveY: 0, dash: false },
      fighter: {
        attackStart: false,
        attackHold: false,
        attackRelease: false,
        blockHold: false,
        healHold: false,
      },
    };

    function consumeRemoteMover(): MoverInput {
      const m = { ...remoteInput.mover };
      remoteInput.mover.dash = false; // clear one-shot
      return m;
    }

    function consumeRemoteFighter(): FighterInput {
      const f = { ...remoteInput.fighter };
      // Clear one-shot flags after reading
      remoteInput.fighter.attackStart = false;
      remoteInput.fighter.attackRelease = false;
      return f;
    }

    // Network message handler
    const netHandler = (msg: NetMessage) => {
      switch (msg.type) {
        case "input":
          // Merge remote input with sticky one-shots
          if (msg.mover) {
            remoteInput.mover.moveX = msg.mover.moveX;
            remoteInput.mover.moveY = msg.mover.moveY;
            if (msg.mover.dash) remoteInput.mover.dash = true;
          }
          if (msg.fighter) {
            remoteInput.fighter.blockHold = msg.fighter.blockHold;
            remoteInput.fighter.healHold = msg.fighter.healHold;
            remoteInput.fighter.attackHold = msg.fighter.attackHold;
            if (msg.fighter.attackStart) remoteInput.fighter.attackStart = true;
            if (msg.fighter.attackRelease) remoteInput.fighter.attackRelease = true;
          }
          break;

        case "snapshot":
          // Guest: feed to interpolator for smooth rendering
          if (!isHost && interpolator) {
            interpolator.push(msg.data);
            setPlayerState(msg.data.player);
          }
          break;

        case "event":
          // Guest: trigger local feedback
          if (!isHost) {
            if (msg.eventType === "player_hit") renderer.triggerScreenShake(8);
            if (msg.eventType === "enemy_hit") renderer.triggerScreenShake(3);
            if (msg.eventType === "enemy_killed") renderer.triggerScreenShake(5);
            if (msg.eventType === "heal_success") toast("HEALED! +30", "#55efc4");
            if (msg.eventType === "block_activated") toast("SHIELD UP!", "#74b9ff");
            if (msg.eventType === "wave_start") {
              const d = msg.data as { wave: number };
              toast(`WAVE ${d.wave}`, "#ffeaa7");
            }
            if (msg.eventType === "player_hit")
              toast(randomFrom(["OOF", "BONK!", "OUCH"]), "#ff6b6b");
            if (msg.eventType === "enemy_killed")
              toast(randomFrom(["SPLAT!", "BONKED!"]), "#ffeaa7");
          }
          break;

        case "scores":
          onGameOverRef.current(msg.scores, msg.won);
          break;

        case "peer_left":
          setDisconnected(true);
          break;
      }
    };
    transport.onMessage(netHandler);

    let game: GameLoop | null = null;
    let inputInterval: number;
    let snapshotInterval: number;

    if (isHost) {
      // === HOST: run game loop ===
      game = new GameLoop();

      game.onEvent((event) => {
        // Send events to guest
        transport.send({ type: "event", eventType: event.type, data: event.data });

        // Local feedback (host side)
        if (event.type === "player_hit") {
          renderer.triggerScreenShake(8);
          toast(randomFrom(["OOF", "BONK!", "OUCH"]), "#ff6b6b");
          const snap = game!.snapshot();
          spawnDamageText(snap.player.x, snap.player.y, 8);
        }
        if (event.type === "enemy_hit") renderer.triggerScreenShake(3);
        if (event.type === "enemy_killed") {
          renderer.triggerScreenShake(5);
          toast(randomFrom(["SPLAT!", "BONKED!"]), "#ffeaa7");
        }
        if (event.type === "attack_triggered") {
          const d = event.data as { type: string; hitbox: { x: number; y: number; range: number; angle: number } };
          spawnAttackText(
            d.hitbox.x + Math.cos(d.hitbox.angle) * d.hitbox.range * 0.5,
            d.hitbox.y + Math.sin(d.hitbox.angle) * d.hitbox.range * 0.5,
            d.type === "heavy"
          );
        }
        if (event.type === "heal_success") {
          toast("HEALED! +30", "#55efc4");
          const snap = game!.snapshot();
          spawnHealText(snap.player.x, snap.player.y);
        }
        if (event.type === "block_activated") toast("SHIELD UP!", "#74b9ff");
        if (event.type === "wave_start") {
          const d = event.data as { wave: number; intro: string };
          toast(`WAVE ${d.wave}`, "#ffeaa7");
          if (d.intro) setTimeout(() => toast(d.intro, "#fff"), 600);
        }
        if (event.type === "wave_pause") {
          const d = event.data as { taunt: string };
          toast(d.taunt, "rgba(255,255,255,0.8)");
        }
        if (event.type === "boss_enraged") {
          renderer.triggerScreenShake(12);
          toast("IT GOT ANGRY!! 😡", "#ff4757");
        }
        if (event.type === "game_over") {
          const d = event.data as { scores: ScoreData };
          transport.send({ type: "scores", scores: d.scores, won: false });
          onGameOverRef.current(d.scores, false);
        }
        if (event.type === "game_won") {
          const d = event.data as { scores: ScoreData };
          transport.send({ type: "scores", scores: d.scores, won: true });
          onGameOverRef.current(d.scores, true);
        }
      });

      // Read inputs synchronously before each game tick
      game.onPreTick(() => {
        if (role === "mover") {
          game!.setMoverInput(input.getMoverInput());
          game!.setFighterInput(consumeRemoteFighter());
        } else {
          game!.setFighterInput(input.getFighterInput());
          game!.setMoverInput(consumeRemoteMover());
        }
      });

      // Snapshot broadcast
      snapshotInterval = window.setInterval(() => {
        if (!game!.running && !game!.gameOver) return;
        const snap = game!.snapshot();
        renderer.updateSnapshot(snap);
        setPlayerState(snap.player);
        transport.send({ type: "snapshot", data: snap });
      }, TICK_MS);

      game.start();
    } else {
      // === GUEST: send inputs + interpolate snapshots ===
      inputInterval = window.setInterval(() => {
        if (role === "mover") {
          transport.send({ type: "input", mover: input.getMoverInput() });
        } else {
          transport.send({ type: "input", fighter: input.getFighterInput() });
        }
      }, TICK_MS);

      // Feed interpolated snapshots to renderer at 60fps
      snapshotInterval = window.setInterval(() => {
        if (interpolator) {
          const snap = interpolator.get();
          if (snap) renderer.updateSnapshot(snap);
        }
      }, 16);
    }

    renderer.start();

    return () => {
      if (inputInterval) clearInterval(inputInterval);
      if (snapshotInterval) clearInterval(snapshotInterval);
      game?.stop();
      renderer.destroy();
      transport.offMessage(netHandler);
    };
  }, [isHost, role, transport, tryMountTouch]);

  // Cleanup input on unmount
  useEffect(() => {
    return () => { inputRef.current?.destroy(); };
  }, []);

  if (disconnected) {
    return (
      <div style={styles.disconnected}>
        <div style={{ fontSize: "2rem" }}>Partner disconnected</div>
        <div style={{ color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>
          Returning to menu...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.fullscreen}>
      <canvas ref={canvasRef} style={styles.canvas} />
      <FeedbackToasts toasts={toasts} />

      {/* Role label */}
      <div style={styles.roleLabel}>
        {role === "mover" ? "MOVER" : "FIGHTER"}
      </div>

      {/* Show only this player's controls */}
      {isTouch && role === "mover" && (
        <div style={styles.controlsFullWidth}>
          <MoverControls onMount={onMoverMount} player={playerState} />
        </div>
      )}
      {isTouch && role === "fighter" && (
        <div style={styles.controlsFullWidth}>
          <FighterControls onMount={onFighterMount} player={playerState} />
        </div>
      )}
    </div>
  );
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const styles: Record<string, React.CSSProperties> = {
  fullscreen: {
    position: "relative",
    width: "100%",
    height: "100%",
    background: "#1a1a2e",
    overflow: "hidden",
  },
  canvas: {
    display: "block",
    width: "100%",
    height: "100%",
  },
  roleLabel: {
    position: "absolute",
    top: "8px",
    right: "12px",
    fontFamily: "monospace",
    fontSize: "12px",
    fontWeight: "bold",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: "2px",
    zIndex: 5,
  },
  controlsFullWidth: {
    position: "absolute",
    bottom: "6px",
    left: "6px",
    right: "6px",
    height: "140px",
    background: "rgba(10, 10, 30, 0.6)",
    borderRadius: "12px",
    backdropFilter: "blur(4px)",
    zIndex: 5,
  },
  disconnected: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    background: "#1a1a2e",
    color: "#ff6b6b",
    fontFamily: "monospace",
  },
};
