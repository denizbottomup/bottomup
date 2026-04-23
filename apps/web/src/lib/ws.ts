'use client';

export interface WsServerFrame {
  channel: 'system' | 'crypto-analytics' | 'spot' | 'futures' | 'setup' | 'trader';
  id: string;
  data: unknown;
  ts: number;
}

export type WsMessageHandler = (frame: WsServerFrame) => void;

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || 'wss://bottomupws-production.up.railway.app';

/**
 * Minimal WebSocket client for the bottomUP gateway (`apps/ws`).
 *
 * Protocol is unchanged from the C# backend the mobile app binds to:
 *   client → server: {channel, action: "bind"|"unbind", id}
 *   server → client: {channel, id, data, ts}
 *
 * This wrapper:
 *   - reconnects with exponential backoff (1s → up to 30s)
 *   - resubscribes to all previously-bound topics on reconnect
 *   - only public channels are supported here; authed channels (`trader`)
 *     would need a JWT appended as `?token=...`.
 */
export class BottomupWs {
  private sock: WebSocket | null = null;
  private readonly handlers = new Set<WsMessageHandler>();
  private readonly subs = new Set<string>();
  private closed = false;
  private backoffMs = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly url = WS_URL) {}

  connect(): void {
    if (this.sock || this.closed) return;
    const sock = new WebSocket(this.url);
    this.sock = sock;

    sock.addEventListener('open', () => {
      this.backoffMs = 1000;
      for (const key of this.subs) {
        const [channel, id] = key.split('|');
        if (channel && id) sock.send(JSON.stringify({ channel, action: 'bind', id }));
      }
    });

    sock.addEventListener('message', (ev) => {
      try {
        const frame = JSON.parse(String(ev.data)) as WsServerFrame;
        for (const h of this.handlers) {
          try {
            h(frame);
          } catch {
            /* ignore per-handler errors */
          }
        }
      } catch {
        /* non-JSON frame — ignore */
      }
    });

    const onDown = (): void => {
      this.sock = null;
      if (this.closed) return;
      this.reconnectTimer = setTimeout(() => this.connect(), this.backoffMs);
      this.backoffMs = Math.min(this.backoffMs * 2, 30_000);
    };
    sock.addEventListener('close', onDown);
    sock.addEventListener('error', onDown);
  }

  bind(channel: string, id: string): void {
    const key = `${channel}|${id}`;
    if (this.subs.has(key)) return;
    this.subs.add(key);
    if (this.sock?.readyState === WebSocket.OPEN) {
      this.sock.send(JSON.stringify({ channel, action: 'bind', id }));
    }
  }

  unbind(channel: string, id: string): void {
    const key = `${channel}|${id}`;
    if (!this.subs.delete(key)) return;
    if (this.sock?.readyState === WebSocket.OPEN) {
      this.sock.send(JSON.stringify({ channel, action: 'unbind', id }));
    }
  }

  onMessage(h: WsMessageHandler): () => void {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.sock?.close();
    this.sock = null;
  }
}
