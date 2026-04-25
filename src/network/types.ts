import type {
  Role,
  MoverInput,
  FighterInput,
  GameSnapshot,
  ScoreData,
} from "../game/types";
import type { GameEventType } from "../game/game-loop";

// All messages that flow over the WebSocket
export type NetMessage =
  // Relay lifecycle (client ↔ server)
  | { type: "create" }
  | { type: "created"; room: string }
  | { type: "join"; room: string }
  | { type: "joined" }
  | { type: "peer_joined" }
  | { type: "peer_left" }
  | { type: "error"; message: string }
  // Role selection (peer ↔ peer via relay)
  | { type: "role_pick"; role: Role }
  | { type: "game_start"; hostRole: Role; guestRole: Role }
  // Gameplay (peer ↔ peer via relay)
  | { type: "input"; mover?: MoverInput; fighter?: FighterInput }
  | { type: "snapshot"; data: GameSnapshot }
  | { type: "event"; eventType: GameEventType; data?: unknown }
  | { type: "scores"; scores: ScoreData; won: boolean };
