import uWS from 'uWebSockets.js';
import type { Logger } from 'pino';
import {
  WS_CHANNELS,
  type WsChannel,
  type WsClientFrame,
  type WsServerFrame,
  wsClientFrameSchema,
} from '@bottomup/events';
import { RedisBus } from './redis-bus.js';
import { tryVerifyJwt, type WsAuthedUser } from './auth.js';

interface Session {
  user: WsAuthedUser | null;
  // per-channel id subscriptions. "*" = wildcard (all ids).
  subs: Map<WsChannel, Set<string>>;
}

const encoder = new TextEncoder();

/**
 * Wire protocol (kept from the existing C# bottomup-ws, mobile 2.2.1 is
 * bound to it):
 *
 *   client → server : {"channel":"setup","action":"bind","id":"*"}
 *                     {"channel":"setup","action":"unbind","id":"btcusdt"}
 *                     {"channel":"setup","action":"values","id":"*"}
 *
 *   server → client : {"channel":"setup","id":"btcusdt","data":{...},"ts":172...}
 *
 * `values` triggers a replay of last-known values for the requested id(s);
 * in the new architecture, publishers keep last values in Redis and the
 * gateway reads them on demand. For MVP we only support bind/unbind.
 */
export function startGateway(opts: {
  log: Logger;
  port: number;
  jwtSecret: string;
  bus: RedisBus;
}): { close: () => Promise<void> } {
  const { log, port, jwtSecret, bus } = opts;

  const sessions = new WeakMap<uWS.WebSocket<Session>, Session>();

  const app = uWS.App().ws<Session>('/*', {
    compression: uWS.SHARED_COMPRESSOR,
    idleTimeout: 120,
    maxPayloadLength: 64 * 1024,

    upgrade: async (res, req, context) => {
      const secWsKey = req.getHeader('sec-websocket-key');
      const secWsProtocol = req.getHeader('sec-websocket-protocol');
      const secWsExtensions = req.getHeader('sec-websocket-extensions');
      const auth = req.getHeader('authorization');
      const qs = req.getQuery() || '';

      let aborted = false;
      res.onAborted(() => {
        aborted = true;
      });

      // Token can come in header (Bearer ...) or query ?token=...
      let token: string | null = null;
      if (auth.startsWith('Bearer ')) {
        token = auth.slice('Bearer '.length).trim();
      } else {
        const m = /(?:^|&)token=([^&]+)/.exec(qs);
        if (m?.[1]) token = decodeURIComponent(m[1]);
      }

      const user = await tryVerifyJwt(token, jwtSecret);
      if (aborted) return;

      res.cork(() => {
        res.upgrade<Session>(
          { user, subs: new Map() },
          secWsKey,
          secWsProtocol,
          secWsExtensions,
          context,
        );
      });
    },

    open: (ws) => {
      const session = (ws.getUserData() as Session);
      sessions.set(ws, session);
      log.debug({ user: session.user?.sub ?? null }, 'ws: connection open');
      sendFrame(ws, { channel: 'system', id: 'hello', data: { ok: true }, ts: Date.now() });
    },

    message: (ws, rawMsg) => {
      const text = Buffer.from(rawMsg).toString('utf8');
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return sendError(ws, 'Invalid JSON');
      }
      const result = wsClientFrameSchema.safeParse(parsed);
      if (!result.success) {
        return sendError(ws, 'Malformed frame');
      }
      handleClientFrame(ws, result.data, log);
    },

    close: (ws) => {
      const s = ws.getUserData();
      log.debug({ user: s.user?.sub ?? null }, 'ws: connection close');
    },
  });

  bus.onMessage((channel, id, data) => {
    // Broadcast to every client subscribed to (channel, id) or (channel, "*")
    app.publish(topicFor(channel, id), JSON.stringify({ channel, id, data, ts: Date.now() } satisfies WsServerFrame), false, true);
    app.publish(topicFor(channel, '*'), JSON.stringify({ channel, id, data, ts: Date.now() } satisfies WsServerFrame), false, true);
  });

  let listenSocket: unknown = null;
  // Bind to all interfaces explicitly. Railway's edge proxy otherwise can
  // return 502 with x-railway-fallback=true — uWS single-arg listen() binds
  // to a default that the proxy's internal reachability check mis-detects.
  app.listen('0.0.0.0', port, (socket) => {
    if (!socket) throw new Error(`ws: failed to listen on :${port}`);
    listenSocket = socket;
    log.info({ port, host: '0.0.0.0' }, 'ws: listening');
  });

  return {
    close: async () => {
      if (listenSocket) uWS.us_listen_socket_close(listenSocket as never);
    },
  };
}

function handleClientFrame(ws: uWS.WebSocket<Session>, frame: WsClientFrame, log: Logger): void {
  const s = ws.getUserData();
  if (!isChannelPermitted(frame.channel, s.user)) {
    return sendError(ws, `Channel ${frame.channel} requires auth`);
  }

  switch (frame.action) {
    case 'bind': {
      const topic = topicFor(frame.channel, frame.id);
      ws.subscribe(topic);
      addSub(s, frame.channel, frame.id);
      log.debug({ topic }, 'ws: bind');
      return;
    }
    case 'unbind': {
      const topic = topicFor(frame.channel, frame.id);
      ws.unsubscribe(topic);
      removeSub(s, frame.channel, frame.id);
      log.debug({ topic }, 'ws: unbind');
      return;
    }
    case 'values': {
      // TODO(mvp+1): read last values from Redis hash `ws:last:<channel>:<id>`
      // and replay to this client only.
      log.debug({ frame }, 'ws: values (stub)');
      return;
    }
  }
}

function sendFrame(ws: uWS.WebSocket<Session>, frame: WsServerFrame): void {
  ws.send(JSON.stringify(frame));
}

function sendError(ws: uWS.WebSocket<Session>, message: string): void {
  ws.send(JSON.stringify({ channel: 'system', id: 'error', data: { message }, ts: Date.now() }));
}

function topicFor(channel: WsChannel, id: string): string {
  return `${channel}:${id.toLowerCase()}`;
}

function addSub(s: Session, channel: WsChannel, id: string): void {
  let set = s.subs.get(channel);
  if (!set) {
    set = new Set();
    s.subs.set(channel, set);
  }
  set.add(id.toLowerCase());
}

function removeSub(s: Session, channel: WsChannel, id: string): void {
  s.subs.get(channel)?.delete(id.toLowerCase());
}

/**
 * Public channels (no auth): spot, futures, crypto-analytics, system, setup.
 * User-scoped channels (auth required): trader.
 *
 * `setup` was originally auth-gated in the old C# backend, but the payloads
 * it carries (published trader orders visible to every follower on the web
 * feed) are semi-public on purpose. Gating it would force the web client to
 * acquire our own JWT just to stream feed updates — not worth the plumbing
 * for MVP. Trader stays auth'd because it can carry private copy-trade state.
 */
function isChannelPermitted(channel: WsChannel, user: WsAuthedUser | null): boolean {
  if (user) return WS_CHANNELS.includes(channel);
  return (
    channel === 'spot' ||
    channel === 'futures' ||
    channel === 'crypto-analytics' ||
    channel === 'system' ||
    channel === 'setup' ||
    channel === 'analyst'
  );
}

