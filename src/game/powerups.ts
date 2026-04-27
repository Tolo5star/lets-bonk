import type { ModifierConfig } from "./modifiers";

export interface PowerUp {
  id: string;
  name: string;
  icon: string;
  description: string;
  apply: (config: ModifierConfig) => void;
}

const ALL_POWERUPS: PowerUp[] = [
  {
    id: "attack_boost",
    name: "Bonk Harder",
    icon: "🔥",
    description: "+30% attack power",
    apply: (c) => { c.attackDamageMult *= 1.3; },
  },
  {
    id: "fast_heal",
    name: "Quick Fix",
    icon: "💚",
    description: "Heal charges 35% faster",
    apply: (c) => { c.healChargeMult *= 0.65; },
  },
  {
    id: "fast_block",
    name: "Iron Wall",
    icon: "🛡️",
    description: "Block charges 40% faster",
    apply: (c) => { c.blockChargeMult *= 0.6; },
  },
  {
    id: "speed_boost",
    name: "Zoom Zoom",
    icon: "💨",
    description: "Attacks recover 25% faster",
    apply: (c) => { c.attackSpeedMult *= 0.75; },
  },
  {
    id: "big_heal",
    name: "Mega Heal",
    icon: "❤️‍🩹",
    description: "Heals restore 50% more",
    apply: (c) => { c.healAmountMult *= 1.5; },
  },
];

export function pickPowerUpChoices(count = 3): PowerUp[] {
  const shuffled = [...ALL_POWERUPS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getPowerUpsByIds(ids: string[]): PowerUp[] {
  return ids.map(id => ALL_POWERUPS.find(p => p.id === id)!).filter(Boolean);
}
