import { WS_URL } from "../constants";

type MessageHandler = (data: Record<string, unknown>) => void;
type StatusHandler = (connected: boolean) => void;

interface WebSocketClientOptions {
  market: string;
  onMessage: MessageHandler;
  onStatusChange?: StatusHandler;
  reconnectDelayMs?: number;
}

/**
 * Managed WebSocket client for the QBAN orderbook/fills channel.
 * Handles auto-reconnect and channel subscription.
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private market: string;
  private onMessage: MessageHandler;
  private onStatusChange?: StatusHandler;
  private reconnectDelayMs: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  constructor(options: WebSocketClientOptions) {
    this.market = options.market;
    this.onMessage = options.onMessage;
    this.onStatusChange = options.onStatusChange;
    this.reconnectDelayMs = options.reconnectDelayMs ?? 3000;
  }

  connect(): void {
    if (
      this.ws?.readyState === WebSocket.OPEN ||
      this.ws?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    this.intentionalClose = false;
    const ws = new WebSocket(WS_URL);
    this.ws = ws;

    ws.onopen = () => {
      this.onStatusChange?.(true);
      ws.send(
        JSON.stringify({
          action: "subscribe",
          channel: "orderbook",
          market: this.market,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(
          typeof event.data === "string" ? event.data : ""
        );
        this.onMessage(data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      this.onStatusChange?.(false);
    };

    ws.onclose = () => {
      this.onStatusChange?.(false);
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelayMs);
  }
}
