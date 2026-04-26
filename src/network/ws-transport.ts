import type { NetMessage } from "./types";

export type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting";

export class WsTransport {
  private ws!: WebSocket;
  private url: string;
  private handlers: Array<(msg: NetMessage) => void> = [];
  private stateHandlers: Array<(state: ConnectionState) => void> = [];
  private intentionallyClosed = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  state: ConnectionState = "connecting";

  constructor(url: string) {
    this.url = url;
    this.createSocket();
  }

  private createSocket() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.state = "connected";
      this.reconnectAttempts = 0;
      for (const h of this.stateHandlers) h("connected");
    };

    this.ws.onclose = () => {
      if (this.intentionallyClosed) {
        this.state = "disconnected";
        for (const h of this.stateHandlers) h("disconnected");
        return;
      }

      // Try to reconnect — DON'T notify "disconnected" until all retries exhausted
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        this.state = "reconnecting";
        for (const h of this.stateHandlers) h("reconnecting");
        const delay = Math.min(1000 * this.reconnectAttempts, 3000);
        this.reconnectTimeout = window.setTimeout(() => this.createSocket(), delay);
      } else {
        this.state = "disconnected";
        for (const h of this.stateHandlers) h("disconnected");
      }
    };

    this.ws.onerror = () => {
      // onclose fires after this
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: NetMessage = JSON.parse(event.data);
        for (const h of this.handlers) h(msg);
      } catch {
        // Ignore
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
    this.intentionallyClosed = true;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.ws.close();
  }
}
