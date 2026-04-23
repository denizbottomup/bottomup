import type { Logger } from 'pino';
import type { RealtimeBus } from '../realtime-bus.js';

/**
 * Binance !ticker@arr stream → Redis `spot:<coin>` + `futures:<coin>` pubs.
 *
 * Binance only exposes the array stream on the spot domain, but the USDT-
 * perpetual coins we care about overlap heavily with the spot book, so we
 * fan the same payload to both channels. A dedicated futures worker can
 * drop in later if we find divergence that matters.
 *
 * Payload shape matches the mobile contract (stringified decimals):
 *   { open, close, high, low, change, color, ts, tsm }
 * where `color` is 'g' when change >= 0, 'r' otherwise.
 *
 * Reconnect: 2s backoff, unlimited retries. We swallow parse errors so
 * one malformed frame doesn't kill the stream.
 */
export class BinanceTicker {
  private sock: WebSocket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private lastPublishAt = new Map<string, number>();
  private readonly minIntervalMs = 1000; // per-coin throttle

  constructor(
    private readonly bus: RealtimeBus,
    private readonly log: Logger,
  ) {}

  start(): void {
    this.closed = false;
    this.connect();
  }

  stop(): void {
    this.closed = true;
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.sock?.close();
    this.sock = null;
  }

  private connect(): void {
    if (this.closed) return;
    // `!ticker@arr` was observed returning 0 frames in practice (both from
    // Railway and a local probe) as of 2026-04-24; `!miniTicker@arr` still
    // works and carries the same open/close/high/low fields we need. The
    // `P` (24h percent change) isn't in the mini payload, so we derive it
    // from (close - open) / open below.
    const url = 'wss://stream.binance.com:9443/ws/!miniTicker@arr';
    const sock = new WebSocket(url);
    this.sock = sock;

    sock.addEventListener('open', () => {
      this.log.info('ticker: connected to binance !miniTicker@arr');
    });
    sock.addEventListener('message', (ev) => this.onMessage(ev.data));
    sock.addEventListener('close', () => this.onDown('close'));
    sock.addEventListener('error', () => this.onDown('error'));
  }

  private onDown(reason: string): void {
    this.sock = null;
    if (this.closed) return;
    this.log.warn({ reason }, 'ticker: disconnected, reconnecting in 2s');
    setTimeout(() => this.connect(), 2000);
  }

  private onMessage(raw: unknown): void {
    const text = typeof raw === 'string' ? raw : String(raw);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return;
    }
    if (!Array.isArray(parsed)) return;
    const now = Date.now();

    for (const t of parsed) {
      if (!t || typeof t !== 'object') continue;
      const sym = (t as { s?: unknown }).s;
      if (typeof sym !== 'string' || !sym.endsWith('USDT')) continue;
      const key = `spot:${sym}`;
      const lastAt = this.lastPublishAt.get(key) ?? 0;
      if (now - lastAt < this.minIntervalMs) continue;
      this.lastPublishAt.set(key, now);

      const open = String((t as Record<string, unknown>).o ?? '');
      const close = String((t as Record<string, unknown>).c ?? '');
      const high = String((t as Record<string, unknown>).h ?? '');
      const low = String((t as Record<string, unknown>).l ?? '');
      const openNum = Number(open);
      const closeNum = Number(close);
      const change =
        Number.isFinite(openNum) && openNum > 0 && Number.isFinite(closeNum)
          ? (((closeNum - openNum) / openNum) * 100).toFixed(3)
          : '0';
      const tsm = Number((t as Record<string, unknown>).E ?? now);
      const color = Number(change) >= 0 ? 'g' : 'r';

      const payload = { open, close, high, low, change, color, ts: now, tsm };
      this.bus.publish('spot', sym.toLowerCase(), payload);
      this.bus.publish('futures', sym.toLowerCase(), payload);
    }
  }
}
