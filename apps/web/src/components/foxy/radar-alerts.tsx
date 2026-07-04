'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { FoxyRadarAlerts } from './types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

type BrowserPushState =
  | 'unsupported'
  | 'idle'
  | 'loading'
  | 'subscribed'
  | 'denied';

export interface RadarAlertsApi {
  /** Signed-in and server state loaded. */
  ready: boolean;
  follows: string[];
  alerts: FoxyRadarAlerts | null;
  browserPush: BrowserPushState;
  /** At least one delivery channel wired (any device or Telegram). */
  hasAnyChannel: boolean;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  toggleFollow: (coin: string) => Promise<void>;
  enableBrowserPush: () => Promise<void>;
  disableBrowserPush: () => Promise<void>;
  linkTelegram: () => Promise<void>;
  unlinkTelegram: () => Promise<void>;
  telegramWaiting: boolean;
  error: string | null;
}

/**
 * State + actions behind the radar "🔔 takip et" flow. One hook
 * instance lives in RadarStrip; the panel and the per-card bells all
 * read from it so follow/channel state stays in sync.
 *
 * Delivery reuses the site-wide /right-now-sw.js service worker and
 * its push subscription — one browser permission covers Right Now and
 * radar alerts; only the server-side registration differs.
 */
export function useRadarAlerts(): RadarAlertsApi {
  const { user, getIdToken } = useAuth();
  const [alerts, setAlerts] = useState<FoxyRadarAlerts | null>(null);
  const [browserPush, setBrowserPush] = useState<BrowserPushState>('idle');
  const [panelOpen, setPanelOpen] = useState(false);
  const [telegramWaiting, setTelegramWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const authed = useCallback(
    async (path: string, init: RequestInit = {}): Promise<Response | null> => {
      const token = await getIdToken();
      if (!token) return null;
      return fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          // Only claim JSON when we actually send a body — Fastify
          // 400'ler "Body cannot be empty" on bodyless DELETE/POST
          // that carry a json content-type.
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...(init.headers as Record<string, string> | undefined),
        },
        cache: 'no-store',
      });
    },
    [getIdToken],
  );

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authed('/me/foxy/radar/alerts');
      if (res?.ok) setAlerts((await res.json()) as FoxyRadarAlerts);
    } catch {
      // keep last known state — the strip must never break over this
    }
  }, [user, authed]);

  // Capability + local subscription probe, then server state.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window)
      ) {
        if (alive) setBrowserPush('unsupported');
      } else if (Notification.permission === 'denied') {
        if (alive) setBrowserPush('denied');
      } else {
        try {
          const reg = await navigator.serviceWorker.getRegistration('/right-now-sw.js');
          const sub = await reg?.pushManager.getSubscription();
          // "subscribed" here means the browser has a subscription; whether
          // it's registered for RADAR alerts server-side comes from
          // alerts.webpush.endpoints below.
          if (alive) setBrowserPush(sub ? 'subscribed' : 'idle');
        } catch {
          if (alive) setBrowserPush('idle');
        }
      }
      await refresh();
    })();
    return () => {
      alive = false;
    };
  }, [refresh]);

  useEffect(
    () => () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    },
    [],
  );

  const follows = alerts?.follows ?? [];
  // This browser counts as a wired channel only if its own subscription
  // endpoint is registered server-side for radar alerts.
  const [localEndpoint, setLocalEndpoint] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const reg = await navigator.serviceWorker?.getRegistration('/right-now-sw.js');
        const sub = await reg?.pushManager.getSubscription();
        setLocalEndpoint(sub?.endpoint ?? null);
      } catch {
        setLocalEndpoint(null);
      }
    })();
  }, [browserPush]);

  const thisBrowserRegistered =
    localEndpoint != null &&
    (alerts?.webpush.endpoints ?? []).includes(localEndpoint);
  const hasAnyChannel =
    (alerts?.webpush.endpoints.length ?? 0) > 0 || alerts?.telegram.linked === true;

  const toggleFollow = useCallback(
    async (coin: string) => {
      if (!user) return;
      setError(null);
      const following = follows.includes(coin);
      try {
        const res = following
          ? await authed(`/me/foxy/radar/follow/${encodeURIComponent(coin)}`, {
              method: 'DELETE',
            })
          : await authed('/me/foxy/radar/follow', {
              method: 'POST',
              body: JSON.stringify({ coin }),
            });
        if (!res?.ok) {
          const body = (await res?.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(body?.message ?? 'Takip kaydedilemedi — tekrar dene.');
        }
        const json = (await res.json()) as { follows: string[] };
        setAlerts((prev) => (prev ? { ...prev, follows: json.follows } : prev));
        // First follow with no delivery channel — open the panel so the
        // user picks one, otherwise the follow silently does nothing.
        if (!following && !hasAnyChannel) setPanelOpen(true);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [user, follows, hasAnyChannel, authed],
  );

  const enableBrowserPush = useCallback(async () => {
    setError(null);
    setBrowserPush('loading');
    try {
      const key = alerts?.webpush.public_key;
      if (!alerts?.webpush.enabled || !key) {
        throw new Error('Bildirim servisi şu an hazır değil — birazdan tekrar dene.');
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setBrowserPush('denied');
        return;
      }
      const reg = await navigator.serviceWorker.register('/right-now-sw.js');
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key) as unknown as BufferSource,
        }));
      const res = await authed('/me/foxy/radar/webpush', {
        method: 'POST',
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res?.ok) throw new Error('Kayıt tamamlanamadı — tekrar dene.');
      setBrowserPush('subscribed');
      await refresh();
    } catch (e) {
      setBrowserPush(Notification.permission === 'denied' ? 'denied' : 'idle');
      setError((e as Error).message);
    }
  }, [alerts, authed, refresh]);

  const disableBrowserPush = useCallback(async () => {
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/right-now-sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        // Only drop the RADAR registration server-side. The browser
        // subscription stays — Right Now push may still be using it.
        await authed('/me/foxy/radar/webpush', {
          method: 'DELETE',
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
      await refresh();
    } catch {
      // non-fatal
    }
  }, [authed, refresh]);

  const linkTelegram = useCallback(async () => {
    setError(null);
    try {
      const res = await authed('/me/foxy/radar/telegram-link', { method: 'POST' });
      if (!res?.ok) throw new Error('Telegram bağlantısı alınamadı.');
      const { link } = (await res.json()) as { link: string | null };
      if (!link) throw new Error('Telegram botu şu an hazır değil.');
      window.open(link, '_blank', 'noopener');
      // The handshake finishes inside Telegram; poll until the server
      // sees the chat linked (max ~2 min).
      setTelegramWaiting(true);
      if (pollTimer.current) clearInterval(pollTimer.current);
      let ticks = 0;
      pollTimer.current = setInterval(() => {
        ticks += 1;
        void refresh();
        if (ticks > 40) {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setTelegramWaiting(false);
        }
      }, 3000);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [authed, refresh]);

  useEffect(() => {
    if (alerts?.telegram.linked && telegramWaiting) {
      setTelegramWaiting(false);
      if (pollTimer.current) clearInterval(pollTimer.current);
    }
  }, [alerts?.telegram.linked, telegramWaiting]);

  const unlinkTelegram = useCallback(async () => {
    setError(null);
    try {
      await authed('/me/foxy/radar/telegram', { method: 'DELETE' });
      await refresh();
    } catch {
      // non-fatal
    }
  }, [authed, refresh]);

  return {
    ready: user != null && alerts != null,
    follows,
    alerts,
    browserPush: thisBrowserRegistered ? 'subscribed' : browserPush === 'subscribed' ? 'idle' : browserPush,
    hasAnyChannel,
    panelOpen,
    setPanelOpen,
    toggleFollow,
    enableBrowserPush,
    disableBrowserPush,
    linkTelegram,
    unlinkTelegram,
    telegramWaiting,
    error,
  };
}

/**
 * Channel picker + followed-coin chips. Light theme to match the Foxy
 * board. Founder-voice copy, zero jargon.
 */
export function RadarAlertsPanel({ api }: { api: RadarAlertsApi }) {
  const { alerts } = api;
  if (!api.panelOpen || !alerts) return null;
  const pushOn = api.browserPush === 'subscribed';
  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-[0_4px_16px_rgba(16,24,40,.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-extrabold text-slate-900">
            Sinyal bildirimleri
          </div>
          <p className="mt-1 max-w-[440px] text-[11.5px] font-medium leading-relaxed text-slate-500">
            Takip ettiğin coinde sinyal yön değiştirince ya da fiyat hacimle
            kırılınca haber veririz. Aynı coin için aynı yönde en fazla 2 saatte
            bir yazarız — bildirim yağmuru yok.
          </p>
        </div>
        <button
          type="button"
          onClick={() => api.setPanelOpen(false)}
          className="rounded-md px-2 py-1 text-[12px] font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Paneli kapat"
        >
          ✕
        </button>
      </div>

      {/* Channel: browser push */}
      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
        <div className="min-w-0">
          <div className="text-[12px] font-bold text-slate-800">
            📱 Tarayıcı bildirimi
          </div>
          <div className="text-[11px] font-medium text-slate-500">
            {api.browserPush === 'unsupported'
              ? 'Bu tarayıcı desteklemiyor.'
              : api.browserPush === 'denied'
                ? 'Tarayıcı izni engelli — site ayarlarından bildirim iznini açman gerek.'
                : !alerts.webpush.enabled
                  ? 'Sunucu tarafı henüz hazır değil.'
                  : 'Site kapalıyken bile bu cihaza bildirim düşer.'}
          </div>
        </div>
        {pushOn ? (
          <button
            type="button"
            onClick={() => void api.disableBrowserPush()}
            className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
          >
            açık ✓ · kapat
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void api.enableBrowserPush()}
            disabled={
              api.browserPush === 'unsupported' ||
              api.browserPush === 'denied' ||
              api.browserPush === 'loading' ||
              !alerts.webpush.enabled
            }
            className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {api.browserPush === 'loading' ? '…' : 'Bu cihazda aç'}
          </button>
        )}
      </div>

      {/* Channel: telegram — hidden entirely when the server has no bot */}
      {alerts.telegram.configured && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-slate-800">✈️ Telegram</div>
            <div className="text-[11px] font-medium text-slate-500">
              {alerts.telegram.linked
                ? 'Bağlı — bot sinyal düşünce mesaj atar.'
                : api.telegramWaiting
                  ? "Telegram'da Başlat'a bas — bağlanınca burada görünür."
                  : 'Bot sana mesaj atar; telefonda, tablette, nerede açıksa.'}
            </div>
          </div>
          {alerts.telegram.linked ? (
            <button
              type="button"
              onClick={() => void api.unlinkTelegram()}
              className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
            >
              bağlı ✓ · kes
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void api.linkTelegram()}
              disabled={api.telegramWaiting}
              className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-700 disabled:opacity-40"
            >
              {api.telegramWaiting ? 'bekleniyor…' : "Telegram'ı bağla"}
            </button>
          )}
        </div>
      )}

      {/* Followed coins */}
      <div className="mt-3">
        <div className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
          Takip ettiklerin
        </div>
        {api.follows.length === 0 ? (
          <div className="mt-1.5 text-[11.5px] font-medium text-slate-400">
            Henüz coin takip etmiyorsun — radar kartındaki 🔔 ile başla.
          </div>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {api.follows.map((coin) => (
              <span
                key={coin}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700"
              >
                {coin}
                <button
                  type="button"
                  onClick={() => void api.toggleFollow(coin)}
                  className="text-slate-300 hover:text-rose-500"
                  aria-label={`${coin} takibini bırak`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {!api.hasAnyChannel && api.follows.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] font-semibold text-amber-700">
          Takip açık ama bildirim kanalı yok — yukarıdan birini aç, yoksa
          sinyali yine kaçırırsın.
        </div>
      )}

      {api.error && (
        <div className="mt-2 text-[11.5px] font-semibold text-rose-600">
          {api.error}
        </div>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}
