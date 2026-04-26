// Floating text effects + hit spark particles

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

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  birth: number;
  lifetime: number;
}

const activeTexts: FloatingText[] = [];
const activeParticles: Particle[] = [];

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
    fontSize: isHeavy ? 24 : 17,
    birth: Date.now(),
    lifetime: isHeavy ? 1200 : 800,
    vx: (Math.random() - 0.5) * 2,
    vy: -1.5 - Math.random(),
    rotation: (Math.random() - 0.5) * 0.4,
  });

  // Spawn hit sparks!
  const sparkCount = isHeavy ? 12 : 6;
  const sparkColors = isHeavy
    ? ["#ff6b6b", "#ff9f43", "#ffeaa7", "#fff"]
    : ["#ffeaa7", "#ff9f43", "#fff"];
  for (let i = 0; i < sparkCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * (isHeavy ? 5 : 3);
    activeParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
      radius: isHeavy ? 2 + Math.random() * 3 : 1.5 + Math.random() * 2,
      birth: Date.now(),
      lifetime: 300 + Math.random() * 300,
    });
  }
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

  // Red damage sparks
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    activeParticles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * (1 + Math.random() * 2),
      vy: Math.sin(angle) * (1 + Math.random() * 2),
      color: Math.random() > 0.5 ? "#ff6b6b" : "#ff4757",
      radius: 1.5 + Math.random() * 1.5,
      birth: Date.now(),
      lifetime: 200 + Math.random() * 200,
    });
  }
}

export function spawnHealText(x: number, y: number) {
  activeTexts.push({
    x,
    y: y - 20,
    text: "+30 HP",
    color: "#55efc4",
    fontSize: 20,
    birth: Date.now(),
    lifetime: 1000,
    vx: 0,
    vy: -1.2,
    rotation: 0,
  });

  // Green heal sparkles
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 20;
    activeParticles.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      vx: Math.cos(angle) * 0.5,
      vy: -1 - Math.random() * 2,
      color: Math.random() > 0.5 ? "#55efc4" : "#00b894",
      radius: 1.5 + Math.random() * 2,
      birth: Date.now(),
      lifetime: 500 + Math.random() * 500,
    });
  }
}

export function drawFloatingTexts(ctx: CanvasRenderingContext2D) {
  const now = Date.now();

  // Draw particles
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const p = activeParticles[i];
    const age = now - p.birth;
    if (age > p.lifetime) {
      activeParticles.splice(i, 1);
      continue;
    }

    const alpha = 1 - age / p.lifetime;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.vy += 0.03; // gravity

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * (0.5 + alpha * 0.5), 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  }

  // Draw floating text
  for (let i = activeTexts.length - 1; i >= 0; i--) {
    const ft = activeTexts[i];
    const age = now - ft.birth;
    if (age > ft.lifetime) {
      activeTexts.splice(i, 1);
      continue;
    }

    const progress = age / ft.lifetime;
    const alpha = progress < 0.15 ? progress / 0.15 : 1 - (progress - 0.15) / 0.85;
    // Scale up on spawn, then shrink slightly
    const scale = progress < 0.1 ? 0.5 + (progress / 0.1) * 0.7 : 1.2 - progress * 0.3;

    ft.x += ft.vx;
    ft.y += ft.vy;
    ft.vy += 0.015;

    ctx.save();
    ctx.translate(ft.x, ft.y);
    ctx.rotate(ft.rotation);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = `bold ${ft.fontSize}px 'Lilita One', 'Nunito', sans-serif`;
    ctx.textAlign = "center";

    // Thick outline
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.strokeText(ft.text, 0, 0);

    // Fill
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, 0, 0);

    ctx.restore();
  }
}
