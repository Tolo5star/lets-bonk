import { PlayerState, type MoverInput, type FighterInput, type GameSnapshot, type ScoreData } from "./types";
import { TICK_MS, PLAYER_RADIUS, HEAL_AMOUNT } from "./constants";
import { type ModifierConfig, defaultConfig } from "./modifiers";
import { Player } from "./player";
import { Enemy, Projectile } from "./enemy";
import { EnemySpawner } from "./enemy-spawner";
import { ScoreTracker } from "./scoring";
import { resolveStateTransition, type StateContext } from "./state-machine";
import {
  createAttackHitbox,
  checkHitboxVsEnemy,
  checkProjectileVsPlayer,
  applySelfRecoil,
} from "./combat";

export type GameEventType =
  | "wave_start"
  | "wave_complete"
  | "wave_pause"
  | "game_over"
  | "game_won"
  | "player_hit"
  | "player_low_hp"
  | "enemy_hit"
  | "enemy_killed"
  | "boss_enraged"
  | "heal_success"
  | "heal_interrupted"
  | "block_activated"
  | "attack_triggered"
  | "powerup_available";

export interface GameEvent {
  type: GameEventType;
  data?: unknown;
}

export type BossVariant = "brute" | "frenzy" | "summoner";

export class GameLoop {
  player = new Player();
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  spawner = new EnemySpawner();
  score = new ScoreTracker();
  tick = 0;
  running = false;
  gameOver = false;
  gameWon = false;
  modConfig: ModifierConfig = defaultConfig();
  bossVariant: BossVariant = "brute";
  powerUpWave = 2; // offer power-up after this wave
  powerUpPending = false;

  private moverInput: MoverInput = { moveX: 0, moveY: 0, dash: false };
  private fighterInput: FighterInput = {
    attackStart: false,
    attackHold: false,
    attackRelease: false,
    blockHold: false,
    healHold: false,
  };

  private intervalId: number | null = null;
  private eventListeners: Array<(event: GameEvent) => void> = [];
  private waveCooldownTicks = 0;
  private readonly WAVE_COOLDOWN = 90; // 3s between waves at 30Hz
  private preTick: (() => void) | null = null;

  /** Register a callback that runs right before each game tick — use for reading inputs */
  onPreTick(cb: () => void) {
    this.preTick = cb;
  }

  onEvent(listener: (event: GameEvent) => void) {
    this.eventListeners.push(listener);
  }

  private emit(type: GameEventType, data?: unknown) {
    const event = { type, data };
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }

  setMoverInput(input: MoverInput) {
    this.moverInput = input;
  }

  setFighterInput(input: FighterInput) {
    this.fighterInput = input;
  }

  setModConfig(config: ModifierConfig) {
    this.modConfig = config;
  }

  applyPowerUp(apply: (config: ModifierConfig) => void) {
    apply(this.modConfig);
    this.powerUpPending = false;
  }

  start() {
    this.reset();
    this.running = true;
    this.score.start();

    // Randomize boss variant
    const variants: BossVariant[] = ["brute", "frenzy", "summoner"];
    this.bossVariant = variants[Math.floor(Math.random() * variants.length)];

    this.spawner.startWave();
    this.emit("wave_start", {
      wave: this.spawner.currentWave,
      intro: this.spawner.waveIntro,
    });

    this.intervalId = window.setInterval(() => this.update(), TICK_MS);
  }

  stop() {
    this.running = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.player.reset();
    this.enemies = [];
    this.projectiles = [];
    this.spawner.reset();
    this.score.reset();
    this.tick = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.waveCooldownTicks = 0;
  }

  private update() {
    if (!this.running) return;
    // Freeze game during power-up selection (enemies stop, no damage)
    if (this.powerUpPending) return;

    // 0. Read inputs right before processing (no drift from separate interval)
    if (this.preTick) this.preTick();

    this.tick++;

    // 1. State machine resolution
    this.resolvePlayerState();

    // 2. Apply player movement
    if (
      this.player.state === PlayerState.Idle ||
      this.player.state === PlayerState.Moving
    ) {
      this.player.applyMovement(this.moverInput.moveX, this.moverInput.moveY);
    }

    // 3. Player physics tick
    this.player.tick();

    // 4. Enemy AI + physics
    for (const enemy of this.enemies) {
      const result = enemy.tick(this.player.x, this.player.y);

      // Enemy melee attack hit
      if (result.attack) {
        const dist = Math.sqrt(
          (this.player.x - result.attack.fromX) ** 2 +
            (this.player.y - result.attack.fromY) ** 2
        );
        if (dist < result.attack.knockback * 5 + PLAYER_RADIUS + enemy.radius) {
          const actualDamage = this.player.takeDamage(result.attack.damage);
          this.player.applyKnockback(
            result.attack.knockback * this.modConfig.playerKnockbackMult,
            result.attack.fromX,
            result.attack.fromY
          );
          this.score.damageTaken += actualDamage;
          this.emit("player_hit");
        }
      }

      // Spawn projectiles
      if (result.projectile) {
        this.projectiles.push(new Projectile(result.projectile));
      }
    }

    // 5. Projectile updates + collision
    for (const proj of this.projectiles) {
      proj.tick();
      if (!proj.dead && checkProjectileVsPlayer(proj, this.player)) {
        const actualDamage = this.player.takeDamage(proj.damage);
        this.player.applyKnockback(4, proj.x, proj.y);
        this.score.damageTaken += actualDamage;
        proj.dead = true;
        this.emit("player_hit");
      }
    }

    // 6. Clean up dead entities
    this.enemies = this.enemies.filter(
      (e) => !(e.dead && e.deathTimer > 15)
    );
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    // 7. Wave management
    const aliveEnemies = this.enemies.filter((e) => !e.dead).length;
    const newEnemies = this.spawner.tick(aliveEnemies);
    // Apply enemy speed modifier to newly spawned enemies
    if (this.modConfig.enemySpeedMult !== 1) {
      for (const enemy of newEnemies) {
        enemy.applySpeedMult(this.modConfig.enemySpeedMult);
      }
    }
    this.enemies.push(...newEnemies);

    // Wave cooldown between waves (micro-pause)
    if (!this.spawner.waveActive && !this.spawner.allWavesComplete) {
      this.waveCooldownTicks++;
      // Emit pause event at start of cooldown
      if (this.waveCooldownTicks === 1) {
        this.score.wavesCompleted++;
        this.emit("wave_pause", {
          nextWave: this.spawner.currentWave,
          taunt: this.spawner.waveTaunt,
        });

        // Offer power-up after wave 2
        if (this.score.wavesCompleted === this.powerUpWave) {
          this.powerUpPending = true;
          this.emit("powerup_available");
        }
      }
      if (this.waveCooldownTicks >= this.WAVE_COOLDOWN) {
        this.waveCooldownTicks = 0;
        this.spawner.startWave();
        this.emit("wave_start", {
          wave: this.spawner.currentWave,
          intro: this.spawner.waveIntro,
        });
      }
    }

    // Check boss enrage
    for (const enemy of this.enemies) {
      if (enemy.type === 3 && enemy.enraged && !enemy.dead) {
        // Only emit once per boss via a flag check
        if (!(enemy as any)._enrageEmitted) {
          (enemy as any)._enrageEmitted = true;
          this.emit("boss_enraged");
        }
      }
    }

    // 8. Low HP warning
    if (this.player.hp > 0 && this.player.hp <= 25 && this.tick % 20 === 0) {
      this.emit("player_low_hp");
    }

    // 9. Check win/lose
    if (this.player.hp <= 0) {
      this.gameOver = true;
      this.running = false;
      this.stop();
      this.emit("game_over", { scores: this.score.snapshot() });
    }

    if (this.spawner.allWavesComplete && aliveEnemies === 0) {
      this.gameWon = true;
      this.gameOver = true;
      this.score.wavesCompleted = this.spawner.totalWaves;
      this.running = false;
      this.stop();
      this.emit("game_won", { scores: this.score.snapshot() });
    }

    // Clear one-shot inputs
    this.moverInput = { ...this.moverInput, dash: false };
    this.fighterInput = {
      ...this.fighterInput,
      attackStart: false,
      attackRelease: false,
    };
  }

  private resolvePlayerState() {
    const ctx: StateContext = {
      state: this.player.state,
      stateTimer: this.player.stateTimer,
      dashCooldown: this.player.dashCooldown,
      blockCooldown: this.player.blockCooldown,
      healProgress: this.player.healProgress,
      attackCharge: this.player.attackCharge,
    };

    const result = resolveStateTransition(
      ctx,
      this.moverInput,
      this.fighterInput
    );

    if (result.resetTimer) {
      this.player.stateTimer = 0;
      this.player.attackCharge = 0;
    }
    this.player.state = result.newState;

    if (result.dashTriggered) {
      this.player.applyDash();
    }

    if (result.blockActivated) {
      this.emit("block_activated");
    }

    if (result.healTriggered) {
      this.player.healAmount(Math.round(HEAL_AMOUNT * this.modConfig.healAmountMult));
      this.score.healSuccesses++;
      this.emit("heal_success");
    }

    // Track heal attempts (entering heal charge state)
    if (
      result.newState === PlayerState.HealingCharge &&
      ctx.state !== PlayerState.HealingCharge
    ) {
      this.score.healAttempts++;
    }

    // Heal interrupted — was charging but now isn't
    if (
      ctx.state === PlayerState.HealingCharge &&
      result.newState !== PlayerState.HealingCharge &&
      result.newState !== PlayerState.HealingActive
    ) {
      this.emit("heal_interrupted");
    }

    if (result.attackTriggered) {
      const hitbox = createAttackHitbox(this.player, result.attackTriggered, this.enemies);
      this.emit("attack_triggered", {
        type: result.attackTriggered,
        hitbox,
      });

      // Check hits against enemies
      for (const enemy of this.enemies) {
        if (enemy.dead) continue;
        if (checkHitboxVsEnemy(hitbox, enemy)) {
          const angleToEnemy = Math.atan2(
            enemy.y - this.player.y,
            enemy.x - this.player.x
          );
          const modDamage = hitbox.damage * this.modConfig.attackDamageMult;
          enemy.takeDamage(modDamage, hitbox.knockback, angleToEnemy);
          this.score.damageDealt += modDamage;
          this.emit("enemy_hit");

          if (enemy.dead) {
            this.score.enemiesKilled++;
            this.emit("enemy_killed");
          }
        }
      }

      // Self-recoil for heavy attacks
      if (result.attackTriggered === "heavy") {
        applySelfRecoil(this.player);
      }
    }

    // Block cooldown when block active ends
    if (
      ctx.state === PlayerState.BlockActive &&
      result.newState !== PlayerState.BlockActive
    ) {
      this.player.setBlockCooldown();
    }
  }

  snapshot(): GameSnapshot {
    return {
      tick: this.tick,
      player: this.player.snapshot(),
      enemies: this.enemies.map((e) => e.snapshot()),
      projectiles: this.projectiles.map((p) => p.snapshot()),
      wave: this.spawner.currentWave,
      waveEnemiesRemaining: this.enemies.filter((e) => !e.dead).length,
      gameOver: this.gameOver,
      gameWon: this.gameWon,
    };
  }

  getScores(): ScoreData {
    return this.score.snapshot();
  }
}
