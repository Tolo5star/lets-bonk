# Let's Bonk

Browser-based 2-player co-op game. Two players share one character: Player A controls movement, Player B controls actions (attack/block/heal). Fight waves of enemies in a circular arena. Mobile-first.

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Rendering**: HTML5 Canvas now (proving mechanics), PixiJS upgrade planned for visual polish pass
- **Physics**: Matter.js (client-side only)
- **Networking** (Phase 2): Thin WebSocket relay server — no game logic on server

## Architecture

All game logic runs client-side. The server (Phase 2) is purely a message relay.

```
src/
  game/       → Game loop, physics, combat, enemies, state machine (core logic)
  render/     → Canvas drawing (arena, player, enemies, HUD)
  input/      → Keyboard + touch input (unified via InputManager)
  network/    → Transport abstraction (local bus now, WebSocket later)
  ui/         → React components (lobby, game screen, score screen, touch controls)
```

## Key Patterns

- **State machine** (`game/state-machine.ts`): Pure function resolving player state from mover + fighter inputs with priority system
- **Game loop** (`game/game-loop.ts`): Fixed 20Hz tick via setInterval. Reads inputs → resolves state → steps physics → resolves combat → emits events
- **Renderer** (`render/renderer.ts`): 60fps requestAnimationFrame loop, reads snapshots from game loop
- **Input abstraction**: `InputManager` delegates to `KeyboardInput` or `TouchInput` based on device detection

## Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # Production build (tsc + vite build)
```

## Design Philosophy

- **Mobile-first**: Touch controls are P0, keyboard is secondary
- **Clumsy chaos**: Controls should feel slightly floaty, imprecise, and funny — not pixel-perfect
- **Big chunky UI**: Large touch targets, no small icons, visual feedback over text
- **Lean backend**: All game logic client-side, server is just a relay pipe
- **Prove fun first**: Single-device gameplay before networking
