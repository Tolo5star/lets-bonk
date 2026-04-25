import type { NetMessage } from "./types";

export type ConnectionState = "connecting" | "connected" | "disconnected";

export class WsTransport {
  private ws: WebSocket;
  private handlers: Array<(msg: NetMessage) => void> = [];
  private stateHandlers: Array<(state: ConnectionState) => void> = [];
  state: ConnectionState = "connecting";

  constructor(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.state = "connected";
      for (const h of this.stateHandlers) h("connected");
    };

    this.ws.onclose = () => {
      this.state = "disconnected";
      for (const h of this.stateHandlers) h("disconnected");
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: NetMessage = JSON.parse(event.data);
        for (const h of this.handlers) h(msg);
      } catch {
        // Ignore unparseable messages
      }
    };
  }

  send(msg: NetMessage) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  onMessage(handler: (msg: NetMessage) => void) {
    this.handlers.push(handler);
  }

  offMessage(handler: (msg: NetMessage) => void) {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  onStateChange(handler: (state: ConnectionState) => void) {
    this.stateHandlers.push(handler);
  }

  close() {
    this.ws.close();
  }
}
