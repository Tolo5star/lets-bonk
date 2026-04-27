import { useEffect, useRef, useCallback, useState } from "react";
import { GameLoop } from "../game/game-loop";
import { Renderer } from "../render/renderer";
import { InputManager } from "../input/input-manager";
// TICK_MS no longer needed — input reads via onPreTick
import { isTouchDevice } from "../input/detect-device";
import { MoverControls } from "./MoverControls";
import { FighterControls } from "./FighterControls";
import { FeedbackToasts, useFeedbackToasts } from "./FeedbackToast";
import { spawnAttackText, spawnDamageText, spawnHealText } from "../render/draw-effects";
import { getCommentary, trackKill } from "../game/commentary";
import { pickModifierChoices, defaultConfig, type ModifierConfig } from "../game/modifiers";
import { pickPowerUpChoices, type PowerUp } from "../game/powerups";
import { fonts, shadows } from "./theme";
import type { ScoreData, PlayerSnapshot } from "../game/types";

interface GameScreenProps {
  onGameOver: (scores: ScoreData, won: boolean) => void;
}

type GamePhase = "modifier_select" | "playing" | "powerup_select";

export function GameScreen({ onGameOver }: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerState, setPlayerState] = useState<PlayerSnapshot | null>(null);
  const [isTouch] = useState(isTouchDevice);
  const { toasts, showToast } = useFeedbackToasts();
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const [phase, setPhase] = useState<GamePhase>("modifier_select");
  const [modChoices] = useState(() => pickModifierChoices(3));
  const [selectedMod, setSelectedMod] = useState<ModifierConfig>(defaultConfig());
  const [powerUpChoices, setPowerUpChoices] = useState<PowerUp[]>([]);
  const gameRef = useRef<GameLoop | null>(null);

  // Create InputManager ONCE eagerly — it must exist before children mount
  const inputRef = useRef<InputManager | null>(null);
  if (inputRef.current === null) {
    inputRef.current = new InputManager();
  }

  // Track touch element refs for deferred mounting
  const moverElementsRef = useRef<{ joystickContainer: HTMLElement; dashBtn: HTMLElement } | null>(null);
  const fighterElementsRef = useRef<{ attackBtn: HTMLElement; blockBtn: HTMLElement; healBtn: HTMLElement } | null>(null);
  const touchMountedRef = useRef(false);

  const tryMountTouch = useCallback(() => {
    if (touchMountedRef.current) return;
    const input = inputRef.current;
    const mover = moverElementsRef.current;
    const fighter = fighterElementsRef.current;
    if (input && mover && fighter) {
      input.mountTouchControls({
        joystickContainer: mover.joystickContainer,
        dashBtn: mover.dashBtn,
        attackBtn: fighter.attackBtn,
        blockBtn: fighter.blockBtn,
        healBtn: fighter.healBtn,
      });
      touchMountedRef.current = true;
    }
  }, []);

  const onMoverMount = useCallback(
    (joystickContainer: HTMLElement, dashBtn: HTMLElement) => {
      moverElementsRef.current = { joystickContainer, dashBtn };
      tryMountTouch();
    },
    [tryMountTouch]
  );

  const onFighterMount = useCallback(
    (attackBtn: HTMLElement, blockBtn: HTMLElement, healBtn: HTMLElement) => {
      fighterElementsRef.current = { attackBtn, blockBtn, healBtn };
      tryMountTouch();
    },
    [tryMountTouch]
  );

  const gameInitedRef = useRef(false);

  // Game lifecycle — only starts ONCE after modifier selection
  useEffect(() => {
    if (phase !== "playing") return;
    if (gameInitedRef.current) return; // already running, don't recreate
    gameInitedRef.current = true;

    const canvas = canvasRef.current;
    const input = inputRef.current;
    if (!canvas || !input) return;

    const game = new GameLoop();
    const renderer = new Renderer(canvas);

    // Try mounting touch now (children may have already mounted)
    tryMountTouch();

    // Dynamic commentary — uses cooldown-based line pools
    game.onEvent((event) => {
      const toast = showToastRef.current;
      const line = getCommentary(event.type);

      switch (event.type) {
        case "player_hit": {
          renderer.triggerScreenShake(8);
          if (line) toast(line.text, line.color);
          const snap = game.snapshot();
          spawnDamageText(snap.player.x, snap.player.y, 8);
          break;
        }
        case "enemy_hit":
          renderer.triggerScreenShake(3);
          break;
        case "enemy_killed": {
          renderer.triggerScreenShake(5);
          // Check for multi-kill combo
          const multiLine = trackKill();
          if (multiLine) {
            toast(multiLine, "#ff6b9d");
          } else if (line) {
            toast(line.text, line.color);
          }
          break;
        }
        case "attack_triggered": {
          const d = event.data as { type: string; hitbox: { x: number; y: number; range: number; angle: number } };
          spawnAttackText(
            d.hitbox.x + Math.cos(d.hitbox.angle) * d.hitbox.range * 0.5,
            d.hitbox.y + Math.sin(d.hitbox.angle) * d.hitbox.range * 0.5,
            d.type === "heavy"
          );
          break;
        }
        case "heal_success": {
          if (line) toast(line.text, line.color);
          const s = game.snapshot();
          spawnHealText(s.player.x, s.player.y);
          break;
        }
        case "heal_interrupted":
          if (line) toast(line.text, line.color);
          break;
        case "block_activated":
          if (line) toast(line.text, line.color);
          break;
        case "game_over": {
          const d = event.data as { scores: ScoreData };
          onGameOverRef.current(d.scores, false);
          break;
        }
        case "game_won": {
          const d = event.data as { scores: ScoreData };
          onGameOverRef.current(d.scores, true);
          break;
        }
        case "wave_start": {
          const d = event.data as { wave: number; intro: string };
          toast(`WAVE ${d.wave}`, "#ffeaa7");
          if (d.intro) {
            setTimeout(() => toast(d.intro, "#fff"), 600);
          }
          break;
        }
        case "wave_pause": {
          const wLine = getCommentary("wave_complete");
          if (wLine) toast(wLine.text, wLine.color);
          break;
        }
        case "boss_enraged":
          if (line) toast(line.text, line.color);
          else toast("IT GOT ANGRY!!", "#ff4757");
          renderer.triggerScreenShake(12);
          break;
        case "player_low_hp":
          if (line) toast(line.text, line.color);
          break;
        case "powerup_available":
          setPowerUpChoices(pickPowerUpChoices(3));
          setPhase("powerup_select");
          break;
      }
    });

    // Read inputs synchronously before each game tick (no drift)
    game.onPreTick(() => {
      game.setMoverInput(input.getMoverInput());
      game.setFighterInput(input.getFighterInput());
    });

    // Feed snapshots to renderer every frame
    const renderInterval = window.setInterval(() => {
      if (!game.running && !game.gameOver) return;
      renderer.updateSnapshot(game.snapshot());
    }, 16);

    // Update React state for control feedback at lower rate
    const uiInterval = window.setInterval(() => {
      if (!game.running && !game.gameOver) return;
      setPlayerState(game.snapshot().player);
    }, 100);

    // Apply selected modifier
    game.setModConfig(selectedMod);
    gameRef.current = game;

    game.start();
    renderer.start();

    return () => {
      clearInterval(renderInterval);
      clearInterval(uiInterval);
      game.stop();
      renderer.destroy();
    };
  // phase and selectedMod intentionally excluded — game only starts once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tryMountTouch]);

  // Cleanup input on unmount
  useEffect(() => {
    return () => {
      inputRef.current?.destroy();
    };
  }, []);

  // --- Modifier selection (pre-game) ---
  if (phase === "modifier_select") {
    return (
      <div style={ms.container}>
        <h2 style={ms.title}>Pick Your Chaos</h2>
        <p style={ms.subtitle}>Choose a modifier for this run</p>
        <div style={ms.choices}>
          {modChoices.map((mod) => (
            <button
              key={mod.id}
              style={ms.modCard}
              onClick={() => {
                const config = defaultConfig();
                mod.apply(config);
                setSelectedMod(config);
                setPhase("playing");
              }}
            >
              <span style={ms.modIcon}>{mod.icon}</span>
              <span style={ms.modName}>{mod.name}</span>
              <span style={ms.modDesc}>{mod.description}</span>
            </button>
          ))}
        </div>
        <button
          style={ms.skipBtn}
          onClick={() => setPhase("playing")}
        >
          No modifier (classic)
        </button>
      </div>
    );
  }

  // --- Power-up selection (mid-game overlay) ---
  const powerUpOverlay = phase === "powerup_select" && (
    <div style={ms.powerUpOverlay}>
      <h2 style={ms.title}>Power Up!</h2>
      <p style={ms.subtitle}>Choose a boost for the next waves</p>
      <div style={ms.choices}>
        {powerUpChoices.map((pu) => (
          <button
            key={pu.id}
            style={ms.modCard}
            onClick={() => {
              if (gameRef.current) {
                gameRef.current.applyPowerUp(pu.apply);
              }
              setPhase("playing");
            }}
          >
            <span style={ms.modIcon}>{pu.icon}</span>
            <span style={ms.modName}>{pu.name}</span>
            <span style={ms.modDesc}>{pu.description}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Mobile layout
  if (isTouch) {
    return (
      <div style={styles.fullscreen}>
        <canvas ref={canvasRef} style={styles.canvasFull} />
        <FeedbackToasts toasts={toasts} />
        <div style={styles.moverOverlay}>
          <MoverControls onMount={onMoverMount} player={playerState} />
        </div>
        <div style={styles.fighterOverlay}>
          <FighterControls onMount={onFighterMount} player={playerState} />
        </div>
        {powerUpOverlay}
      </div>
    );
  }

  // Desktop layout
  return (
    <div style={styles.fullscreen}>
      <canvas ref={canvasRef} style={styles.canvasFull} />
      <FeedbackToasts toasts={toasts} />
      {powerUpOverlay}
    </div>
  );
}

// Modifier/power-up selection styles
const ms: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    background: `radial-gradient(ellipse at 50% 40%, #2a2a4a 0%, #1a1a2e 70%)`,
    padding: "1.5rem",
    gap: "12px",
  },
  title: {
    fontFamily: fonts.display,
    fontSize: "clamp(1.5rem, 5vw, 2.5rem)",
    color: "#ffeaa7",
    textShadow: shadows.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: 700,
    fontSize: "0.9rem",
    color: "rgba(255,255,255,0.5)",
    marginBottom: "8px",
  },
  choices: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  modCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    padding: "14px 18px",
    borderRadius: "14px",
    border: "2px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.05)",
    cursor: "pointer",
    minWidth: "120px",
    maxWidth: "160px",
    fontFamily: fonts.body,
    color: "#f0e6d3",
    transition: "all 0.15s",
  },
  modIcon: {
    fontSize: "1.8rem",
  },
  modName: {
    fontFamily: fonts.display,
    fontSize: "0.95rem",
    color: "#ffeaa7",
  },
  modDesc: {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  skipBtn: {
    marginTop: "8px",
    padding: "8px 20px",
    fontFamily: fonts.body,
    fontWeight: 700,
    fontSize: "0.8rem",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    background: "transparent",
    color: "rgba(255,255,255,0.4)",
    cursor: "pointer",
  },
  powerUpOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(10, 10, 30, 0.85)",
    backdropFilter: "blur(6px)",
    zIndex: 20,
    gap: "10px",
    padding: "1rem",
  },
};


const styles: Record<string, React.CSSProperties> = {
  fullscreen: {
    position: "relative",
    width: "100%",
    height: "100%",
    background: "#1a1a2e",
    overflow: "hidden",
  },
  canvasFull: {
    display: "block",
    width: "100%",
    height: "100%",
  },

  // Controls: absolutely positioned at bottom corners
  // NO parent wrapper with pointerEvents:none — each zone is independent
  moverOverlay: {
    position: "absolute",
    bottom: "6px",
    left: "6px",
    width: "45%",
    height: "140px",
    background: "rgba(10, 10, 30, 0.6)",
    borderRadius: "12px",
    backdropFilter: "blur(4px)",
    zIndex: 5,
  },
  fighterOverlay: {
    position: "absolute",
    bottom: "6px",
    right: "6px",
    width: "45%",
    height: "140px",
    background: "rgba(10, 10, 30, 0.6)",
    borderRadius: "12px",
    backdropFilter: "blur(4px)",
    zIndex: 5,
  },

  rotateText: { // unused, kept to avoid cleanup noise
    fontFamily: "monospace",
    fontSize: "1.2rem",
    color: "#4ecdc4",
  },
  rotateSubtext: {
    fontFamily: "monospace",
    fontSize: "0.85rem",
    color: "rgba(255, 255, 255, 0.4)",
  },
};
