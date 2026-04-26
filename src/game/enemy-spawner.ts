import { EnemyType } from "./types";
import { Enemy } from "./enemy";
import { ARENA_RADIUS } from "./constants";

interface WaveDefinition {
  groups: Array<{
    enemies: Array<{ type: EnemyType; count: number }>;
    delayTicks: number;
  }>;
}

const WAVES: WaveDefinition[] = [
  // Wave 1: "We got this" — confidence + laughter
  {
    groups: [
      {
        enemies: [{ type: EnemyType.Basic, count: 3 }],
        delayTicks: 0,
      },
      {
        enemies: [{ type: EnemyType.Basic, count: 2 }],
        delayTicks: 80,
      },
    ],
  },
  // Wave 2: "Oh… okay" — introduce charger, forces repositioning
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
          { type: EnemyType.Charger, count: 2 },
        ],
        delayTicks: 80,
      },
    ],
  },
  // Wave 3: "WAIT WHAT" — ranged introduced, first real coordination check
  {
    groups: [
      {
        enemies: [
          { type: EnemyType.Ranged, count: 2 },
          { type: EnemyType.Basic, count: 1 },
        ],
        delayTicks: 0,
      },
      {
        enemies: [
          { type: EnemyType.Charger, count: 1 },
          { type: EnemyType.Ranged, count: 1 },
        ],
        delayTicks: 60,
      },
      {
        enemies: [
          { type: EnemyType.Basic, count: 2 },
          { type: EnemyType.Ranged, count: 1 },
        ],
        delayTicks: 120,
      },
    ],
  },
  // Wave 4: "THIS IS TOO MUCH" — swarm, chaos peak, heal becomes critical
  {
    groups: [
      {
        enemies: [
          { type: EnemyType.Basic, count: 3 },
          { type: EnemyType.Charger, count: 2 },
        ],
        delayTicks: 0,
      },
      {
        enemies: [
          { type: EnemyType.Ranged, count: 2 },
          { type: EnemyType.Basic, count: 2 },
        ],
        delayTicks: 50,
      },
      {
        enemies: [
          { type: EnemyType.Charger, count: 2 },
          { type: EnemyType.Ranged, count: 1 },
          { type: EnemyType.Basic, count: 1 },
        ],
        delayTicks: 100,
      },
    ],
  },
  // Wave 5: BOSS — epic finish
  {
    groups: [
      {
        enemies: [{ type: EnemyType.MiniBoss, count: 1 }],
        delayTicks: 0,
      },
      {
        // Phase 1 minions
        enemies: [{ type: EnemyType.Basic, count: 2 }],
        delayTicks: 80,
      },
      {
        // Phase 2 pressure
        enemies: [
          { type: EnemyType.Charger, count: 1 },
          { type: EnemyType.Ranged, count: 1 },
        ],
        delayTicks: 160,
      },
      {
        // Final push
        enemies: [
          { type: EnemyType.Basic, count: 2 },
          { type: EnemyType.Charger, count: 1 },
        ],
        delayTicks: 240,
      },
    ],
  },
];

// Funny wave intro texts
export const WAVE_INTROS: string[] = [
  "Let's go!",          // Wave 1
  "Oh... okay 😅",      // Wave 2
  "WAIT WHAT?!",         // Wave 3
  "THIS IS TOO MUCH 😱", // Wave 4
  "BOSS FIGHT 🐉",      // Wave 5
];

export const WAVE_TAUNTS: string[][] = [
  ["You got this!", "Easy peasy!", "Warm up time!"],
  ["They look angry...", "MOVE MOVE MOVE!", "Here they come!"],
  ["They're SHOOTING?!", "Duck and bonk!", "Coordination time!"],
  ["YOU'RE STILL ALIVE??", "It gets worse 😈", "Heal or die!"],
  ["This is the big one...", "FINAL BOSS", "Together or not at all!"],
];

function randomSpawnPosition(): { x: number; y: number } {
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

  get waveIntro(): string {
    return WAVE_INTROS[this.waveIndex] || "";
  }

  get waveTaunt(): string {
    const taunts = WAVE_TAUNTS[this.waveIndex] || ["..."];
    return taunts[Math.floor(Math.random() * taunts.length)];
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
