// Dynamic commentary — random funny lines on game events
// Each event type has a pool of lines + cooldown to prevent spam

interface CommentaryLine {
  text: string;
  color: string;
}

const POOLS: Record<string, CommentaryLine[]> = {
  heal_interrupted: [
    { text: "STAY STILL 😡", color: "#ff6b6b" },
    { text: "WHY DID YOU MOVE", color: "#ff6b6b" },
    { text: "HOLD STILL PLEASE", color: "#ff9f43" },
    { text: "SO CLOSE 😭", color: "#ff6b6b" },
  ],
  heal_success: [
    { text: "HEALED! +30", color: "#55efc4" },
    { text: "TEAMWORK!", color: "#55efc4" },
    { text: "CLUTCH HEAL 💚", color: "#00b894" },
    { text: "NICE PATIENCE", color: "#55efc4" },
  ],
  player_hit: [
    { text: "OOF", color: "#ff6b6b" },
    { text: "BONK!", color: "#ff6b6b" },
    { text: "OUCH", color: "#ff6b6b" },
    { text: "YIKES", color: "#ff6b6b" },
    { text: "THAT HURT 😭", color: "#ff6b6b" },
    { text: "RUN AWAY!", color: "#ff9f43" },
  ],
  player_low_hp: [
    { text: "HEAL!! HEAL!!", color: "#ff4757" },
    { text: "WE'RE DYING 💀", color: "#ff4757" },
    { text: "THIS IS FINE 🔥", color: "#ff4757" },
    { text: "PANIC MODE", color: "#ff4757" },
  ],
  enemy_killed: [
    { text: "SPLAT!", color: "#ffeaa7" },
    { text: "BONKED!", color: "#ffeaa7" },
    { text: "BYE BYE", color: "#ffeaa7" },
    { text: "REKT", color: "#ffeaa7" },
    { text: "GET OUTTA HERE", color: "#ffeaa7" },
    { text: "DELETED 🗑️", color: "#ffeaa7" },
  ],
  block_activated: [
    { text: "SHIELD UP!", color: "#74b9ff" },
    { text: "BLOCKED!", color: "#74b9ff" },
    { text: "NICE TIMING", color: "#74b9ff" },
    { text: "PARRY GOD", color: "#74b9ff" },
  ],
  boss_enraged: [
    { text: "IT GOT ANGRY!! 😡", color: "#ff4757" },
    { text: "OH NO IT'S MAD", color: "#ff4757" },
    { text: "PHASE 2 BABY", color: "#ff4757" },
    { text: "THIS IS BAD 💀", color: "#ff4757" },
  ],
  wave_complete: [
    { text: "NICE!", color: "#55efc4" },
    { text: "YOU'RE STILL ALIVE??", color: "#ffeaa7" },
    { text: "IT GETS WORSE 😈", color: "#a29bfe" },
    { text: "BREATHE...", color: "rgba(255,255,255,0.7)" },
    { text: "DEEP BREATH", color: "rgba(255,255,255,0.7)" },
  ],
  multi_kill: [
    { text: "MULTI-BONK!!", color: "#ff6b9d" },
    { text: "COMBO! 🔥", color: "#ff9f43" },
    { text: "OKAY THAT WAS CLEAN", color: "#ffeaa7" },
  ],
  clutch: [
    { text: "CLUTCH!!", color: "#55efc4" },
    { text: "HOW?!", color: "#ffeaa7" },
    { text: "BY THE SKIN OF YOUR TEETH", color: "#55efc4" },
  ],
};

const cooldowns: Record<string, number> = {};
const COOLDOWN_MS = 2500; // minimum time between same event type

export function getCommentary(eventType: string): CommentaryLine | null {
  const pool = POOLS[eventType];
  if (!pool || pool.length === 0) return null;

  const now = Date.now();
  const lastTime = cooldowns[eventType] || 0;
  if (now - lastTime < COOLDOWN_MS) return null;

  cooldowns[eventType] = now;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Track kills for multi-kill detection
let recentKills = 0;
let killTimer = 0;

export function trackKill(): string | null {
  const now = Date.now();
  if (now - killTimer > 1500) {
    recentKills = 0;
  }
  recentKills++;
  killTimer = now;

  if (recentKills >= 3) {
    const line = getCommentary("multi_kill");
    recentKills = 0;
    return line?.text || null;
  }
  return null;
}
