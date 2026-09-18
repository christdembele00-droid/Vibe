export type RealtimeEvent = {
  type: string;
  [key: string]: unknown;
};

export class VibeRealtime {
  private socket: WebSocket | null = null;
  private stopped = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private attempt = 0;

  constructor(
    private readonly apiUrl: string,
    private readonly token: string,
    private readonly conversationId: string,
    private readonly onEvent: (event: RealtimeEvent) => void,
    private readonly onState?: (state: "connecting" | "connected" | "closed") => void,
  ) {}

  connect() {
    this.stopped = false;
    this.cleanupSocket();
    const url = new URL(this.apiUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = url.pathname.replace(//$/, "") + "/ws/conversations/" + this.conversationId;
    this.onState?.("connecting");
    this.socket = new WebSocket(url.toString());

    this.socket.onopen = () => {
      this.attempt = 0;
      this.socket?.send(JSON.stringify({ type: "auth", token: this.token }));
      this.onState?.("connected");
      this.pingTimer = setInterval(() => {
        try {
          this.socket?.send(JSON.stringify({ type: "ping" }));
        } catch {}
      }, 25000);
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as RealtimeEvent;
        this.onEvent(payload);
      } catch {}
    };

    this.socket.onclose = () => {
      this.cleanupSocket();
      this.onState?.("closed");
      this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      try {
        this.socket?.close();
      } catch {}
    };
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.cleanupSocket();
  }

  private scheduleReconnect() {
    if (this.stopped || this.reconnectTimer) return;
    const delay = Math.min(30000, 1000 * 2 ** Math.min(this.attempt, 5));
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private cleanupSocket() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
    const socket = this.socket;
    this.socket = null;
    if (socket && socket.readyState < WebSocket.CLOSING) {
      try {
        socket.close();
      } catch {}
    }
  }
}
