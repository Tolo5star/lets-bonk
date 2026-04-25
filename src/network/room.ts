import type { WsTransport } from "./ws-transport";
import type { NetMessage } from "./types";

/** Send "create" and wait for "created" response with room code */
export function createRoom(transport: WsTransport): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout")), 5000);

    const handler = (msg: NetMessage) => {
      if (msg.type === "created") {
        clearTimeout(timeout);
        transport.offMessage(handler);
        resolve(msg.room);
      }
      if (msg.type === "error") {
        clearTimeout(timeout);
        transport.offMessage(handler);
        reject(new Error(msg.message));
      }
    };
    transport.onMessage(handler);
    transport.send({ type: "create" });
  });
}

/** Send "join" and wait for "joined" response */
export function joinRoom(transport: WsTransport, room: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout")), 5000);

    const handler = (msg: NetMessage) => {
      if (msg.type === "joined") {
        clearTimeout(timeout);
        transport.offMessage(handler);
        resolve();
      }
      if (msg.type === "error") {
        clearTimeout(timeout);
        transport.offMessage(handler);
        reject(new Error(msg.message));
      }
    };
    transport.onMessage(handler);
    transport.send({ type: "join", room: room.toUpperCase() });
  });
}
