import { useEffect, useRef, useCallback, useState } from "react";
import { GameLoop } from "../game/game-loop";
import { Renderer } from "../render/renderer";
import { InputManager } from "../input/input-manager";
import { TICK_MS } from "../game/constants";
import { isTouchDevice } from "../input/detect-device";
import { MoverControls } from "./MoverControls";
import { FighterControls } from "./FighterControls";
import { FeedbackToasts, useFeedbackToasts } from "./FeedbackToast";
import { spawnAttackText, spawnDamageText, spawnHealText } from "../render/draw-effects";
import type { ScoreData, PlayerSnapshot } from "../game/types";

interface GameScreenProps {
  onGameOver: (scores: ScoreData, won: boolean) => void;
}

export function GameScreen({ onGameOver }: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerState, setPlayerState] = useState<PlayerSnapshot | null>(null);
  const [isTouch] = useState(isTouchDevice);
  const { toasts, showToast } = useFeedbackToasts();
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

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

  // Game lifecycle
  useEffect(() => {
    const canvas = canvasRef.current;
    const input = inputRef.current;
    if (!canvas || !input) return;

    const game = new GameLoop();
    const renderer = new Renderer(canvas);

    // Try mounting touch now (children may have already mounted)
    tryMountTouch();

    // Goofy feedback events
    game.onEvent((event) => {
      const toast = showToastRef.current;
      switch (event.type) {
        case "player_hit": {
          renderer.triggerScreenShake(8);
          toast(randomFrom(["OOF", "BONK!", "OUCH", "YIKES"]), "#ff6b6b");
          const snap = game.snapshot();
          spawnDamageText(snap.player.x, snap.player.y, 8);
          break;
        }
        case "enemy_hit":
          renderer.triggerScreenShake(3);
          break;
        case "enemy_killed":
          renderer.triggerScreenShake(5);
          toast(randomFrom(["SPLAT!", "BONKED!", "BYE BYE", "REKT"]), "#ffeaa7");
          break;
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
          toast("HEALED! +30", "#55efc4");
          const s = game.snapshot();
          spawnHealText(s.player.x, s.player.y);
          break;
        }
        case "block_activated":
          toast("SHIELD UP!", "#74b9ff");
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
          const d = event.data as { wave: number };
          toast(`WAVE ${d.wave}`, "#ffeaa7");
          break;
        }
      }
    });

    // Input polling — reads from InputManager every tick
    const inputInterval = window.setInterval(() => {
      if (!game.running) return;
      game.setMoverInput(input.getMoverInput());
      game.setFighterInput(input.getFighterInput());
    }, TICK_MS);

    // Feed snapshots to renderer every frame
    const renderInterval = window.setInterval(() => {
      if (!game.running && !game.gameOver) return;
      renderer.updateSnapshot(game.snapshot());
    }, 16);

    // Update React state for control feedback at lower rate (reduces re-renders)
    const uiInterval = window.setInterval(() => {
      if (!game.running && !game.gameOver) return;
      setPlayerState(game.snapshot().player);
    }, 100); // 10fps for UI — controls only need cooldown info

    game.start();
    renderer.start();

    return () => {
      clearInterval(inputInterval);
      clearInterval(renderInterval);
      clearInterval(uiInterval);
      game.stop();
      renderer.destroy();
    };
  }, [tryMountTouch]);

  // Cleanup input on unmount
  useEffect(() => {
    return () => {
      inputRef.current?.destroy();
    };
  }, []);

  // Mobile layout: fullscreen canvas + overlaid controls
  if (isTouch) {
    return (
      <div style={styles.fullscreen}>
        <canvas ref={canvasRef} style={styles.canvasFull} />
        <FeedbackToasts toasts={toasts} />

        {/* LEFT: Mover controls */}
        <div style={styles.moverOverlay}>
          <MoverControls onMount={onMoverMount} player={playerState} />
        </div>

        {/* RIGHT: Fighter controls */}
        <div style={styles.fighterOverlay}>
          <FighterControls onMount={onFighterMount} player={playerState} />
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div style={styles.fullscreen}>
      <canvas ref={canvasRef} style={styles.canvasFull} />
      <FeedbackToasts toasts={toasts} />
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
