import type { NetMessage } from "./types";

export type ConnectionState = "connecting" | "connected" | "disconnected";

export class WsTransport {
  private ws!: WebSocket;
  private url: string;
  private handlers: Array<(msg: NetMessage) => void> = [];
  private stateHandlers: Array<(state: ConnectionState) => void> = [];
  private intentionallyClosed = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: number | null = null;
  state: ConnectionState = "connecting";

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  private connect() {
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

      // Try to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * this.reconnectAttempts, 3000);
        console.log(`WS reconnecting (attempt ${this.reconnectAttempts})...`);
        this.reconnectTimeout = window.setTimeout(() => this.connect(), delay);
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
    this.intentionallyClosed = true;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.ws.close();
  }
}
