import type { ScoreData } from "./types";

export class ScoreTracker {
  damageDealt = 0;
  damageTaken = 0;
  healAttempts = 0;
  healSuccesses = 0;
  enemiesKilled = 0;
  wavesCompleted = 0;
  startTime = 0;

  start() {
    this.startTime = Date.now();
  }

  reset() {
    this.damageDealt = 0;
    this.damageTaken = 0;
    this.healAttempts = 0;
    this.healSuccesses = 0;
    this.enemiesKilled = 0;
    this.wavesCompleted = 0;
    this.startTime = Date.now();
  }

  snapshot(): ScoreData {
    return {
      damageDealt: Math.round(this.damageDealt),
      damageTaken: Math.round(this.damageTaken),
      healAttempts: this.healAttempts,
      healSuccesses: this.healSuccesses,
      enemiesKilled: this.enemiesKilled,
      wavesCompleted: this.wavesCompleted,
      survivalTimeMs: Date.now() - this.startTime,
    };
  }
}
