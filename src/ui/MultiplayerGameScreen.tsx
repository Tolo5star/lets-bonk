import { useEffect, useRef, useState, useCallback } from "react";
import { GameLoop } from "../game/game-loop";
import { Renderer } from "../render/renderer";
import { InputManager } from "../input/input-manager";
import { TICK_MS, HEAVY_ATTACK_CHARGE_TICKS } from "../game/constants";
import { PlayerState } from "../game/types";
import { isTouchDevice } from "../input/detect-device";
import { MoverControls } from "./MoverControls";
import { FighterControls } from "./FighterControls";
import { FeedbackToasts, useFeedbackToasts } from "./FeedbackToast";
import { SnapshotInterpolator } from "../render/interpolation";
import { spawnAttackText, spawnDamageText, spawnHealText } from "../render/draw-effects";
import type { WsTransport } from "../network/ws-transport";
import type { NetMessage } from "../network/types";
import { pickModifierChoices, getModifiersByIds, defaultConfig, type RunModifier } from "../game/modifiers";
import { pickPowerUpChoices, getPowerUpsByIds, type PowerUp } from "../game/powerups";
import { fonts } from "./theme";
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

  type MPPhase = "modifier_select" | "playing" | "powerup_select";
  const [phase, setPhase] = useState<MPPhase>(isHost ? "modifier_select" : "modifier_select");
  const [modChoices, setModChoices] = useState<RunModifier[]>(() => isHost ? pickModifierChoices(3) : []);
  const modChoicesRef = useRef<RunModifier[]>([]);
  modChoicesRef.current = modChoices;
  const [powerUpChoices, setPowerUpChoices] = useState<PowerUp[]>([]);
  const gameRef = useRef<GameLoop | null>(null);
  const [gameStartTrigger, setGameStartTrigger] = useState<ReturnType<typeof defaultConfig> | null>(null);
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

  // === GAME LIFECYCLE — starts once gameStartTrigger is set ===
  useEffect(() => {
    if (!gameStartTrigger) return;
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
          // Guest: trigger local feedback (effects + particles)
          if (!isHost) {
            if (msg.eventType === "player_hit") {
              renderer.triggerScreenShake(8);
              toast(randomFrom(["OOF", "BONK!", "OUCH"]), "#ff6b6b");
              // Spawn damage particles at player position from latest snapshot
              const latestSnap = interpolator?.get();
              if (latestSnap) spawnDamageText(latestSnap.player.x, latestSnap.player.y, 8);
            }
            if (msg.eventType === "enemy_hit") renderer.triggerScreenShake(3);
            if (msg.eventType === "enemy_killed") {
              renderer.triggerScreenShake(5);
              toast(randomFrom(["SPLAT!", "BONKED!"]), "#ffeaa7");
            }
            if (msg.eventType === "attack_triggered") {
              // If we're the fighter, we already predicted this locally — skip to avoid double sparks
              if (role !== "fighter") {
                const d = msg.data as { type: string; hitbox: { x: number; y: number; range: number; angle: number } };
                spawnAttackText(
                  d.hitbox.x + Math.cos(d.hitbox.angle) * d.hitbox.range * 0.5,
                  d.hitbox.y + Math.sin(d.hitbox.angle) * d.hitbox.range * 0.5,
                  d.type === "heavy"
                );
              }
            }
            if (msg.eventType === "heal_success") {
              toast("HEALED! +30", "#55efc4");
              const snap = interpolator?.get();
              if (snap) spawnHealText(snap.player.x, snap.player.y);
            }
            if (msg.eventType === "block_activated") toast("SHIELD UP!", "#74b9ff");
            if (msg.eventType === "wave_start") {
              const d = msg.data as { wave: number; intro: string };
              toast(`WAVE ${d.wave}`, "#ffeaa7");
              if (d.intro) setTimeout(() => toast(d.intro, "#fff"), 600);
            }
            if (msg.eventType === "wave_pause") {
              const d = msg.data as { taunt: string };
              toast(d.taunt, "rgba(255,255,255,0.8)");
            }
            if (msg.eventType === "boss_enraged") {
              renderer.triggerScreenShake(12);
              toast("IT GOT ANGRY!! 😡", "#ff4757");
            }
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
        if (event.type === "powerup_available") {
          const choices = pickPowerUpChoices(3);
          setPowerUpChoices(choices);
          // Send choices to guest so they can see the read-only view
          transport.send({ type: "powerup_choices", choiceIds: choices.map(p => p.id) });
          setPhase("powerup_select");
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

      game.setModConfig(gameStartTrigger!);
      gameRef.current = game;
      game.start();
    } else {
      // === GUEST: send inputs + predict visuals ===

      // Prediction state — tracks local input for instant visual feedback
      let attackHoldStart = 0;
      let attackReleaseTime = 0;
      let wasHeavy = false;
      let isHoldingAttack = false;
      let blockHoldStart = 0;
      let isHoldingBlock = false;

      inputInterval = window.setInterval(() => {
        if (role === "mover") {
          const moverIn = input.getMoverInput();
          transport.send({ type: "input", mover: moverIn });
          if (moverIn.dash) renderer.triggerScreenShake(2);
        } else {
          const fighterIn = input.getFighterInput();
          transport.send({ type: "input", fighter: fighterIn });

          // Track attack hold for prediction
          if (fighterIn.attackStart) {
            attackHoldStart = performance.now();
            isHoldingAttack = true;
          }
          if (fighterIn.attackRelease && isHoldingAttack) {
            wasHeavy = (performance.now() - attackHoldStart) > 800;
            attackReleaseTime = performance.now();
            isHoldingAttack = false;

            // Spawn sparks instantly (predicted)
            const snap = interpolator?.get();
            if (snap) {
              const range = wasHeavy ? 100 : 80;
              spawnAttackText(
                snap.player.x + Math.cos(snap.player.angle) * range * 0.5,
                snap.player.y + Math.sin(snap.player.angle) * range * 0.5,
                wasHeavy
              );
              renderer.triggerScreenShake(wasHeavy ? 4 : 2);
            }
          }
          if (!fighterIn.attackHold) {
            isHoldingAttack = false;
          }

          // Track block hold
          if (fighterIn.blockHold && !isHoldingBlock) {
            blockHoldStart = performance.now();
          }
          isHoldingBlock = fighterIn.blockHold;
        }
      }, TICK_MS);

      // Feed interpolated snapshots to renderer at 60fps WITH state prediction overlay
      snapshotInterval = window.setInterval(() => {
        if (!interpolator) return;
        const snap = interpolator.get();
        if (!snap) return;

        // Apply fighter prediction: override player state for instant visual
        if (role === "fighter") {
          const now = performance.now();

          if (isHoldingAttack) {
            // Charging heavy attack — show charge ring instantly
            snap.player.state = PlayerState.HeavyCharging;
            snap.player.stateTimer = Math.floor((now - attackHoldStart) / TICK_MS);
          } else if (now - attackReleaseTime < 400) {
            // Just released attack — show attack arc instantly
            snap.player.state = PlayerState.Attacking;
            snap.player.stateTimer = Math.floor((now - attackReleaseTime) / TICK_MS);
            snap.player.attackCharge = wasHeavy ? HEAVY_ATTACK_CHARGE_TICKS : 0;
          }

          if (isHoldingBlock && !isHoldingAttack) {
            snap.player.state = PlayerState.Blocking;
            snap.player.stateTimer = Math.floor((now - blockHoldStart) / TICK_MS);
          }
        }

        renderer.updateSnapshot(snap);
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
  }, [isHost, role, transport, tryMountTouch, gameStartTrigger]);

  // Cleanup input on unmount
  useEffect(() => {
    return () => { inputRef.current?.destroy(); };
  }, []);

  // Host: send modifier choices to guest immediately
  useEffect(() => {
    if (isHost && modChoices.length > 0) {
      transport.send({ type: "modifier_choices", choiceIds: modChoices.map(m => m.id) });
    }
  }, [isHost, modChoices, transport]);

  // Guest: pre-game listener for modifier/powerup sync — must run independently of game start
  useEffect(() => {
    if (isHost) return; // host doesn't need this

    const preGameHandler = (msg: NetMessage) => {
      if (msg.type === "modifier_choices") {
        setModChoices(getModifiersByIds(msg.choiceIds));
        setPhase("modifier_select");
      }
      if (msg.type === "modifier_selected") {
        const choices = modChoicesRef.current;
        const picked = choices[msg.choiceIndex];
        const config = defaultConfig();
        if (picked) picked.apply(config);
        setGameStartTrigger(config);
        setPhase("playing");
      }
      if (msg.type === "powerup_choices") {
        setPowerUpChoices(getPowerUpsByIds(msg.choiceIds));
        setPhase("powerup_select");
      }
      if (msg.type === "powerup_selected") {
        setPhase("playing");
      }
    };

    transport.onMessage(preGameHandler);
    return () => transport.offMessage(preGameHandler);
  }, [isHost, transport]);


  // Guest waiting for host to send modifier choices
  if (!isHost && phase === "modifier_select" && modChoices.length === 0) {
    return (
      <div style={mpStyles.container}>
        <div style={{ fontSize: "2rem" }}>⏳</div>
        <p style={mpStyles.title}>Connecting...</p>
        <p style={mpStyles.subtitle}>Waiting for partner to set up the game</p>
      </div>
    );
  }

  // Modifier selection — host picks, guest watches read-only
  if (phase === "modifier_select" && modChoices.length > 0) {
    return (
      <div style={mpStyles.container}>
        <div style={{ fontSize: "2rem" }}>🎲</div>
        <h2 style={mpStyles.title}>Pick Your Chaos</h2>
        {isHost
          ? <p style={mpStyles.subtitle}>One modifier per run — your partner can see your choices</p>
          : <p style={{ ...mpStyles.subtitle, color: "#ffeaa7" }}>⏳ Partner is choosing...</p>
        }
        <div style={mpStyles.choices}>
          {modChoices.map((mod, idx) => (
            <button key={mod.id}
              style={{
                ...mpStyles.card,
                opacity: isHost ? 1 : 0.5,
                cursor: isHost ? "pointer" : "default",
                border: isHost ? "2px solid rgba(255,255,255,0.15)" : "2px solid rgba(255,255,255,0.06)",
              }}
              onClick={() => {
                if (!isHost) return;
                const config = defaultConfig();
                mod.apply(config);
                setGameStartTrigger(config);
                transport.send({ type: "modifier_selected", choiceIndex: idx });
                setPhase("playing");
              }}>
              <span style={{ fontSize: "1.8rem" }}>{mod.icon}</span>
              <span style={mpStyles.cardName}>{mod.name}</span>
              <span style={mpStyles.cardDesc}>{mod.description}</span>
            </button>
          ))}
        </div>
        {isHost && (
          <button style={mpStyles.skipBtn} onClick={() => {
            setGameStartTrigger(defaultConfig());
            transport.send({ type: "modifier_selected", choiceIndex: -1 });
            setPhase("playing");
          }}>
            No modifier (classic)
          </button>
        )}
      </div>
    );
  }

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

      {/* Power-up overlay — host picks, guest sees read-only */}
      {phase === "powerup_select" && powerUpChoices.length > 0 && (
        <div style={mpStyles.overlay}>
          <div style={{ fontSize: "2rem" }}>⚡</div>
          <h2 style={{ ...mpStyles.title, color: "#ffeaa7" }}>Power Up!</h2>
          {isHost
            ? <p style={mpStyles.subtitle}>Pick a boost for the next waves</p>
            : <p style={{ ...mpStyles.subtitle, color: "#ffeaa7" }}>⏳ Partner is choosing...</p>
          }
          <div style={mpStyles.choices}>
            {powerUpChoices.map((pu, idx) => (
              <button key={pu.id}
                style={{
                  ...mpStyles.card,
                  opacity: isHost ? 1 : 0.5,
                  cursor: isHost ? "pointer" : "default",
                  border: isHost ? "2px solid rgba(255,255,255,0.15)" : "2px solid rgba(255,255,255,0.06)",
                }}
                onClick={() => {
                  if (!isHost) return;
                  gameRef.current?.applyPowerUp(pu.apply);
                  transport.send({ type: "powerup_selected", choiceIndex: idx });
                  setPhase("playing");
                }}>
                <span style={{ fontSize: "1.8rem" }}>{pu.icon}</span>
                <span style={mpStyles.cardName}>{pu.name}</span>
                <span style={mpStyles.cardDesc}>{pu.description}</span>
              </button>
            ))}
          </div>
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

const mpStyles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    background: "radial-gradient(ellipse at 50% 40%, #2a2a4a 0%, #1a1a2e 70%)",
    padding: "1.5rem",
    gap: "10px",
  },
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(10, 10, 30, 0.88)",
    backdropFilter: "blur(6px)",
    zIndex: 20,
    gap: "10px",
    padding: "1rem",
  },
  title: {
    fontFamily: fonts.display,
    fontSize: "clamp(1.5rem, 5vw, 2.2rem)",
    color: "#e0e0e0",
    textShadow: "2px 2px 0 rgba(0,0,0,0.3)",
  },
  subtitle: {
    fontFamily: "'Nunito', sans-serif",
    fontWeight: 700,
    fontSize: "0.85rem",
    color: "rgba(255,255,255,0.5)",
  },
  choices: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "5px",
    padding: "12px 16px",
    borderRadius: "14px",
    border: "2px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.05)",
    cursor: "pointer",
    minWidth: "110px",
    maxWidth: "150px",
    fontFamily: "'Nunito', sans-serif",
    color: "#f0e6d3",
  },
  cardName: {
    fontFamily: fonts.display,
    fontSize: "0.9rem",
    color: "#ffeaa7",
  },
  cardDesc: {
    fontSize: "0.68rem",
    fontWeight: 600,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  skipBtn: {
    padding: "7px 18px",
    fontFamily: "'Nunito', sans-serif",
    fontWeight: 700,
    fontSize: "0.75rem",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    background: "transparent",
    color: "rgba(255,255,255,0.4)",
    cursor: "pointer",
  },
};
