import { EnemyType } from "./types";
import { Enemy } from "./enemy";
import { ARENA_RADIUS } from "./constants";

interface WaveDefinition {
  groups: Array<{
    enemies: Array<{ type: EnemyType; count: number }>;
    delayTicks: number; // ticks after wave start to spawn this group
  }>;
}

const WAVES: WaveDefinition[] = [
  // Wave 1: Easy - just basics
  {
    groups: [
      {
        enemies: [{ type: EnemyType.Basic, count: 3 }],
        delayTicks: 0,
      },
      {
        enemies: [{ type: EnemyType.Basic, count: 2 }],
        delayTicks: 80, // 4s later
      },
    ],
  },
  // Wave 2: Mixed
  {
    groups: [
      {
        enemies: [
          { type: EnemyType.Basic, count: 2 },
          { type: EnemyType.Charger, count: 1 },
        ],
        delayTicks: 0,
      },
      {
        enemies: [
          { type: EnemyType.Ranged, count: 2 },
        ],
        delayTicks: 60,
      },
      {
        enemies: [
          { type: EnemyType.Charger, count: 2 },
          { type: EnemyType.Basic, count: 1 },
        ],
        delayTicks: 120,
      },
    ],
  },
  // Wave 3: Mini boss
  {
    groups: [
      {
        enemies: [{ type: EnemyType.MiniBoss, count: 1 }],
        delayTicks: 0,
      },
      {
        enemies: [
          { type: EnemyType.Basic, count: 2 },
        ],
        delayTicks: 60,
      },
      {
        enemies: [
          { type: EnemyType.Ranged, count: 1 },
          { type: EnemyType.Charger, count: 1 },
        ],
        delayTicks: 120,
      },
    ],
  },
];

function randomSpawnPosition(): { x: number; y: number } {
  // Spawn on the arena edge
  const angle = Math.random() * Math.PI * 2;
  const dist = ARENA_RADIUS * 0.85;
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
  };
}

export class EnemySpawner {
  private waveIndex = 0;
  private waveTick = 0;
  private spawnedGroups = new Set<number>();
  waveActive = false;
  allWavesComplete = false;

  get currentWave(): number {
    return this.waveIndex + 1;
  }

  get totalWaves(): number {
    return WAVES.length;
  }

  startWave() {
    if (this.waveIndex >= WAVES.length) {
      this.allWavesComplete = true;
      return;
    }
    this.waveTick = 0;
    this.spawnedGroups.clear();
    this.waveActive = true;
  }

  tick(activeEnemyCount: number): Enemy[] {
    if (!this.waveActive || this.waveIndex >= WAVES.length) return [];

    this.waveTick++;
    const wave = WAVES[this.waveIndex];
    const spawned: Enemy[] = [];

    for (let i = 0; i < wave.groups.length; i++) {
      if (this.spawnedGroups.has(i)) continue;
      const group = wave.groups[i];
      if (this.waveTick >= group.delayTicks) {
        this.spawnedGroups.add(i);
        for (const def of group.enemies) {
          for (let j = 0; j < def.count; j++) {
            const pos = randomSpawnPosition();
            spawned.push(new Enemy(def.type, pos.x, pos.y));
          }
        }
      }
    }

    // Check if wave is complete (all groups spawned and all enemies dead)
    const allGroupsSpawned = this.spawnedGroups.size === wave.groups.length;
    if (allGroupsSpawned && activeEnemyCount === 0 && spawned.length === 0) {
      this.waveActive = false;
      this.waveIndex++;
      if (this.waveIndex >= WAVES.length) {
        this.allWavesComplete = true;
      }
    }

    return spawned;
  }

  reset() {
    this.waveIndex = 0;
    this.waveTick = 0;
    this.spawnedGroups.clear();
    this.waveActive = false;
    this.allWavesComplete = false;
  }
}
