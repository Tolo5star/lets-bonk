export interface RunModifier {
  id: string;
  name: string;
  icon: string;
  description: string;
  apply: (config: ModifierConfig) => void;
}

// Runtime config that modifiers tweak — applied to game loop at start
export interface ModifierConfig {
  enemySpeedMult: number;
  playerKnockbackMult: number;
  healChargeMult: number;
  healAmountMult: number;
  attackDamageMult: number;
  attackSpeedMult: number; // recovery time multiplier (lower = faster)
  blockChargeMult: number;
}

export function defaultConfig(): ModifierConfig {
  return {
    enemySpeedMult: 1,
    playerKnockbackMult: 1,
    healChargeMult: 1,
    healAmountMult: 1,
    attackDamageMult: 1,
    attackSpeedMult: 1,
    blockChargeMult: 1,
  };
}

const ALL_MODIFIERS: RunModifier[] = [
  {
    id: "fast_enemies",
    name: "Speed Demons",
    icon: "⚡",
    description: "Enemies move 30% faster",
    apply: (c) => { c.enemySpeedMult = 1.3; },
  },
  {
    id: "big_knockback",
    name: "Pinball Mode",
    icon: "💥",
    description: "Everything bounces harder",
    apply: (c) => { c.playerKnockbackMult = 1.8; },
  },
  {
    id: "slow_heal",
    name: "No Chill",
    icon: "💔",
    description: "Healing takes 50% longer",
    apply: (c) => { c.healChargeMult = 1.5; },
  },
  {
    id: "mega_heal",
    name: "Risk & Reward",
    icon: "💚",
    description: "Heals restore 2x but take longer",
    apply: (c) => { c.healAmountMult = 2; c.healChargeMult = 1.4; },
  },
  {
    id: "glass_cannon",
    name: "Glass Cannon",
    icon: "🔥",
    description: "Deal 50% more damage, take 30% more",
    apply: (c) => { c.attackDamageMult = 1.5; c.playerKnockbackMult = 1.3; },
  },
  {
    id: "slow_heavy",
    name: "Bonk Harder",
    icon: "🐢",
    description: "Attacks are slower but 40% stronger",
    apply: (c) => { c.attackDamageMult = 1.4; c.attackSpeedMult = 1.4; },
  },
  {
    id: "quick_block",
    name: "Reflex Mode",
    icon: "🛡️",
    description: "Block charges 40% faster",
    apply: (c) => { c.blockChargeMult = 0.6; },
  },
  {
    id: "chaos",
    name: "Pure Chaos",
    icon: "🤪",
    description: "Everything is 20% faster and wilder",
    apply: (c) => {
      c.enemySpeedMult = 1.2;
      c.playerKnockbackMult = 1.3;
      c.attackSpeedMult = 0.8;
    },
  },
];

/** Pick 3 random modifiers for the player to choose from */
export function pickModifierChoices(count = 3): RunModifier[] {
  const shuffled = [...ALL_MODIFIERS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
