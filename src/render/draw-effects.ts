// Floating text effects (attack names, damage numbers, etc.)

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  birth: number;
  lifetime: number;
  vx: number;
  vy: number;
  rotation: number;
}

const activeTexts: FloatingText[] = [];

const LIGHT_ATTACK_NAMES = [
  "Bonk!", "Bap!", "Smack!", "Whap!", "Tap!", "Boop!", "Slap!", "Poke!",
];

const HEAVY_ATTACK_NAMES = [
  "MEGA BONK!", "SPLAT!", "REKT!", "YEET!", "SLAM!", "KA-POW!", "OOF!",
  "WHAM!", "THWACK!",
];

export function spawnAttackText(x: number, y: number, isHeavy: boolean) {
  const names = isHeavy ? HEAVY_ATTACK_NAMES : LIGHT_ATTACK_NAMES;
  const text = names[Math.floor(Math.random() * names.length)];
  activeTexts.push({
    x,
    y: y - 30,
    text,
    color: isHeavy ? "#ff6b6b" : "#ffeaa7",
    fontSize: isHeavy ? 22 : 16,
    birth: Date.now(),
    lifetime: isHeavy ? 1200 : 800,
    vx: (Math.random() - 0.5) * 2,
    vy: -1.5 - Math.random(),
    rotation: (Math.random() - 0.5) * 0.4,
  });
}

export function spawnDamageText(x: number, y: number, damage: number) {
  activeTexts.push({
    x: x + (Math.random() - 0.5) * 20,
    y: y - 20,
    text: `-${Math.round(damage)}`,
    color: "#ff6b6b",
    fontSize: 14,
    birth: Date.now(),
    lifetime: 600,
    vx: (Math.random() - 0.5) * 1.5,
    vy: -2,
    rotation: (Math.random() - 0.5) * 0.3,
  });
}

export function spawnHealText(x: number, y: number) {
  activeTexts.push({
    x,
    y: y - 20,
    text: "+30 HP",
    color: "#55efc4",
    fontSize: 18,
    birth: Date.now(),
    lifetime: 1000,
    vx: 0,
    vy: -1.2,
    rotation: 0,
  });
}

export function drawFloatingTexts(ctx: CanvasRenderingContext2D) {
  const now = Date.now();

  for (let i = activeTexts.length - 1; i >= 0; i--) {
    const ft = activeTexts[i];
    const age = now - ft.birth;
    if (age > ft.lifetime) {
      activeTexts.splice(i, 1);
      continue;
    }

    const progress = age / ft.lifetime;
    const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;

    ft.x += ft.vx;
    ft.y += ft.vy;
    ft.vy += 0.02; // slight gravity

    ctx.save();
    ctx.translate(ft.x, ft.y);
    ctx.rotate(ft.rotation);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = `bold ${ft.fontSize}px 'Lilita One', 'Nunito', sans-serif`;
    ctx.textAlign = "center";

    // Text outline
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 3;
    ctx.strokeText(ft.text, 0, 0);

    // Text fill
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, 0, 0);

    ctx.restore();
  }
}
