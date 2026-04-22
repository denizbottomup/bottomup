import { z } from 'zod';

/**
 * WS channels, matching the existing bottomup-ws (C#) contract. The mobile
 * client sends {channel, action, id} frames and expects the same channel
 * names echoed back in data frames.
 *
 * DO NOT rename these strings — mobile 2.2.1 has them literally embedded.
 */
export const WS_CHANNELS = ['system', 'crypto-analytics', 'spot', 'futures', 'setup', 'trader'] as const;
export type WsChannel = (typeof WS_CHANNELS)[number];

export const WS_ACTIONS = ['bind', 'unbind', 'values'] as const;
export type WsAction = (typeof WS_ACTIONS)[number];

export const wsClientFrameSchema = z.object({
  channel: z.enum(WS_CHANNELS),
  action: z.enum(WS_ACTIONS),
  id: z.string().min(1),
});
export type WsClientFrame = z.infer<typeof wsClientFrameSchema>;

export const wsServerFrameSchema = z.object({
  channel: z.enum(WS_CHANNELS),
  id: z.string(),
  data: z.unknown(),
  ts: z.number().int(),
});
export type WsServerFrame = z.infer<typeof wsServerFrameSchema>;

/**
 * Redis pub/sub channel naming. Publishers (api, workers, exchange consumers)
 * use these keys; the ws gateway subscribes and fans out to connected clients.
 *
 * Format: `ws:<channel>:<id>`  — e.g. `ws:spot:btcusdt`, `ws:setup:*`
 */
export const redisKey = {
  wsPub: (channel: WsChannel, id: string): string => `ws:${channel}:${id.toLowerCase()}`,
  wsPubWildcard: (channel: WsChannel): string => `ws:${channel}:*`,
} as const;
