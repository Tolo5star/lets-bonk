import type { GameSnapshot, EnemySnapshot, ProjectileSnapshot } from "../game/types";

/**
 * Snapshot interpolation buffer.
 * Stores recent snapshots and lerps between them for smooth 60fps rendering
 * from 20Hz server updates.
 */
export class SnapshotInterpolator {
  private buffer: Array<{ snapshot: GameSnapshot; time: number }> = [];
  private readonly BUFFER_SIZE = 4;
  private readonly INTERP_DELAY_MS = 80; // render 80ms behind latest snapshot

  push(snapshot: GameSnapshot) {
    this.buffer.push({ snapshot, time: performance.now() });
    if (this.buffer.length > this.BUFFER_SIZE) {
      this.buffer.shift();
    }
  }

  /** Get interpolated snapshot for current render time */
  get(): GameSnapshot | null {
    if (this.buffer.length === 0) return null;
    if (this.buffer.length === 1) return this.buffer[0].snapshot;

    const renderTime = performance.now() - this.INTERP_DELAY_MS;

    // Find two snapshots bracketing renderTime
    let before = this.buffer[0];
    let after = this.buffer[1];

    for (let i = 0; i < this.buffer.length - 1; i++) {
      if (this.buffer[i].time <= renderTime && this.buffer[i + 1].time >= renderTime) {
        before = this.buffer[i];
        after = this.buffer[i + 1];
        break;
      }
    }

    // If renderTime is past all snapshots, use latest
    if (renderTime >= this.buffer[this.buffer.length - 1].time) {
      return this.buffer[this.buffer.length - 1].snapshot;
    }

    // If renderTime is before all snapshots, use earliest
    if (renderTime <= this.buffer[0].time) {
      return this.buffer[0].snapshot;
    }

    const dt = after.time - before.time;
    if (dt <= 0) return after.snapshot;
    const t = Math.max(0, Math.min(1, (renderTime - before.time) / dt));

    return lerpSnapshot(before.snapshot, after.snapshot, t);
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function lerpSnapshot(a: GameSnapshot, b: GameSnapshot, t: number): GameSnapshot {
  return {
    tick: b.tick,
    player: {
      x: lerp(a.player.x, b.player.x, t),
      y: lerp(a.player.y, b.player.y, t),
      vx: lerp(a.player.vx, b.player.vx, t),
      vy: lerp(a.player.vy, b.player.vy, t),
      hp: b.player.hp, // snap
      state: b.player.state, // snap
      angle: lerpAngle(a.player.angle, b.player.angle, t),
      stateTimer: b.player.stateTimer,
      dashCooldown: b.player.dashCooldown,
      blockCooldown: b.player.blockCooldown,
      healProgress: b.player.healProgress,
      attackCharge: b.player.attackCharge,
    },
    enemies: lerpEnemies(a.enemies, b.enemies, t),
    projectiles: lerpProjectiles(a.projectiles, b.projectiles, t),
    wave: b.wave,
    waveEnemiesRemaining: b.waveEnemiesRemaining,
    gameOver: b.gameOver,
    gameWon: b.gameWon,
  };
}

function lerpEnemies(a: EnemySnapshot[], b: EnemySnapshot[], t: number): EnemySnapshot[] {
  return b.map((be) => {
    const ae = a.find((e) => e.id === be.id);
    if (!ae) return be; // new enemy, no lerp
    return {
      ...be,
      x: lerp(ae.x, be.x, t),
      y: lerp(ae.y, be.y, t),
      angle: lerpAngle(ae.angle, be.angle, t),
    };
  });
}

function lerpProjectiles(a: ProjectileSnapshot[], b: ProjectileSnapshot[], t: number): ProjectileSnapshot[] {
  return b.map((bp) => {
    const ap = a.find((p) => p.id === bp.id);
    if (!ap) return bp;
    return {
      ...bp,
      x: lerp(ap.x, bp.x, t),
      y: lerp(ap.y, bp.y, t),
    };
  });
}
