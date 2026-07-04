'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { CoinMatch } from '@/lib/coin-extract';
import { LiveChartPanel } from './live-chart';
import { DepthWallsPanel } from './depth-walls';
import { ZonesPanel, useConfluence } from './zones-panel';
import type {
  FoxyAnalysis,
  FoxyAssetMarket,
  FoxyDerivatives,
  FoxyOrderBook,
  FoxyScalpSignal,
  FoxySetupsByCoin,
  FoxyVerdict,
  FoxyWhaleTransfer,
  FoxyWhales,
} from './types';

interface Props {
  coin: CoinMatch;
  analysis: FoxyAnalysis;
  market: FoxyAssetMarket | null;
  derivatives: FoxyDerivatives | null;
  whales: FoxyWhales | null;
  setups: FoxySetupsByCoin | null;
  orderbook: FoxyOrderBook | null;
  signal: FoxyScalpSignal | null;
  getIdToken: () => Promise<string | null>;
}

/**
 * The post-prompt decision board. Light fintech surface (Stripe/Mercury
 * register) — bold numbers, source-tagged data tiles, the AI model's
 * call up top. Self-contained light theme via standard Tailwind colors
 * so it reads correctly inside the otherwise-dark app shell.
 */
export function FoxyBoard({
  coin,
  analysis,
  market,
  derivatives,
  whales,
  setups,
  orderbook,
  signal,
  getIdToken,
}: Props) {
  const v = verdictTheme(analysis.verdict);
  // One live signal for both the card and the chart's level-lines.
  const liveSignal = useLiveScalpSignal(signal, coin, getIdToken);
  const liveWhales = useLiveWhales(whales, coin, getIdToken);
  // One confluence snapshot for the zones panel AND the chart's bands.
  const confluence = useConfluence(coin);
  // The verdict is a snapshot of query time; the scalp signal keeps
  // updating live. Surface both facts so the layering reads as
  // intentional — a timestamp on the verdict, a live short-term chip
  // next to it, and an explicit notice when the signal has flipped
  // direction since the analysis was written.
  const askedAtRef = useRef(new Date());
  const askedAt = askedAtRef.current;
  const signalFlipped =
    signal != null &&
    liveSignal != null &&
    signal.direction !== 'NONE' &&
    liveSignal.direction !== signal.direction;

  return (
    <div className="mx-auto flex max-w-[920px] flex-col gap-3.5 tabular-nums">
      <Header coin={coin} market={market} />

      {/* AI model — the call */}
      <section
        className={`relative overflow-hidden rounded-[20px] border ${v.cardBorder} bg-white p-6 shadow-[0_2px_6px_rgba(16,24,40,.06),0_12px_32px_rgba(16,24,40,.08)]`}
      >
        <span className={`absolute inset-y-0 left-0 w-[5px] ${v.accentBg}`} />
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-xl ${v.badgeBg} px-4 py-1.5 text-[26px] font-black leading-none ${v.badgeFg}`}
          >
            {analysis.verdict}
          </span>
          <h2 className="min-w-0 flex-1 text-[19px] font-bold leading-tight tracking-tight text-slate-900">
            {analysis.headline}
          </h2>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400">
              Pozisyon görüşü ·{' '}
              {askedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {analysis.verdict === 'BEKLE' &&
            (analysis.bias === 'up' || analysis.bias === 'down') ? (
              <span
                className={`rounded-md px-2 py-0.5 text-[10.5px] font-extrabold ${
                  analysis.bias === 'up'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                Eğilim: {analysis.bias === 'up' ? 'YUKARI' : 'AŞAĞI'}
              </span>
            ) : null}
            {liveSignal && liveSignal.direction !== 'NONE' ? (
              <span
                className={`rounded-md px-2 py-0.5 text-[10.5px] font-extrabold ${
                  liveSignal.direction === 'LONG'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                Kısa vade şu an: {liveSignal.direction}
              </span>
            ) : null}
          </div>
        </div>

        {signalFlipped ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] font-semibold leading-snug text-amber-800">
            <span className="mt-px">⚠️</span>
            <span>
              Kısa vade sinyali bu analizden sonra yön değiştirdi (
              {signal.direction === 'NONE' ? 'İZLE' : signal.direction} →{' '}
              {liveSignal.direction === 'NONE' ? 'İZLE' : liveSignal.direction}).
              Yukarıdaki metin sorgu anının fotoğrafı — güncel seviyeler
              aşağıdaki scalp kartında.
            </span>
          </div>
        ) : null}

        {analysis.takeaway ? (
          <div className={`mt-4 flex gap-3 rounded-2xl ${v.softBg} ${v.softBorder} border p-4`}>
            <span className="text-[22px] leading-none">🦊</span>
            <div>
              <div className={`mb-1 text-[11px] font-extrabold uppercase tracking-[0.07em] ${v.badgeFg}`}>
                Senin için
              </div>
              <p className="text-[15px] font-medium leading-relaxed text-slate-800">
                {analysis.takeaway}
              </p>
            </div>
          </div>
        ) : null}

        {analysis.reasons.length > 0 ? (
          <ul className="mt-4 grid gap-2.5">
            {analysis.reasons.map((r, i) => (
              <li key={i} className="flex gap-3 text-[14.5px] font-medium leading-relaxed text-slate-600">
                <span className={`mt-[7px] inline-block size-[7px] shrink-0 rounded-full ${v.accentBg}`} />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {analysis.invalidation ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-[13px] font-medium leading-snug text-slate-600">
            <span className="font-bold text-slate-900">Ne zaman fikrim değişir:</span>{' '}
            {analysis.invalidation}
          </div>
        ) : null}
      </section>

      <ScalpSignalPanel signal={liveSignal} />

      <LiveChartPanel
        coin={coin}
        signal={liveSignal}
        zones={confluence.data?.zones ?? null}
      />

      <MetricGrid
        derivatives={derivatives}
        whales={liveWhales.whales}
        whaleThreshold={liveWhales.threshold}
      />

      <div className="grid gap-3.5 md:grid-cols-[1fr_1.25fr]">
        <OrderBookPanel orderbook={orderbook} coin={coin} />
        <WhaleFeedPanel live={liveWhales} />
      </div>

      <ZonesPanel state={confluence} />

      <DepthWallsPanel coin={coin} />

      <TradersPanel setups={setups} coin={coin} />
    </div>
  );
}

/* ─────────────────────────── header ─────────────────────────── */

function Header({ coin, market }: { coin: CoinMatch; market: FoxyAssetMarket | null }) {
  const up = (market?.change_24h_pct ?? 0) >= 0;
  return (
    <div className="flex items-center justify-between gap-4 px-1">
      <div className="flex items-center gap-3.5">
        <div className="grid size-11 place-items-center rounded-full bg-slate-900 text-[17px] font-extrabold text-white shadow-sm">
          {coin.symbol.slice(0, 1)}
        </div>
        <div>
          <h1 className="text-[20px] font-extrabold leading-none tracking-tight text-slate-900">
            {coin.display}{' '}
            <span className="font-bold text-slate-400">{coin.symbol}</span>
          </h1>
          <div className="mt-1 text-[12.5px] font-semibold text-slate-400">
            {market?.high_24h && market?.low_24h
              ? `24s aralık ${fmtPrice(market.low_24h)} – ${fmtPrice(market.high_24h)}`
              : `${coin.symbol}/USDT`}
            {market?.quote_volume_24h
              ? ` · hacim ${fmtUsd(market.quote_volume_24h)}`
              : ''}
          </div>
        </div>
      </div>
      {market ? (
        <div className="text-right">
          <div className="text-[34px] font-extrabold leading-none tracking-tight text-slate-900">
            {fmtPrice(market.price)}
          </div>
          <div
            className={`mt-1.5 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[13px] font-bold ${
              up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {up ? '▲' : '▼'} %{Math.abs(market.change_24h_pct).toFixed(2)}
            <span className="font-semibold opacity-70">24s</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ────────────────────────── metric grid ─────────────────────── */

function MetricGrid({
  derivatives,
  whales,
  whaleThreshold = '1M$+',
}: {
  derivatives: FoxyDerivatives | null;
  whales: FoxyWhales | null;
  whaleThreshold?: '1M$+' | '250K$+';
}) {
  const tiles: ReactNode[] = [];

  if (derivatives?.funding) {
    const ann = derivatives.funding.annualized_pct;
    tiles.push(
      <Tile key="funding" name="Fonlama oranı" src="Coinglass">
        <div className={`text-[26px] font-extrabold leading-none ${ann >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          %{ann.toFixed(2)}
          <span className="text-[15px] font-bold text-slate-400">/yıl</span>
        </div>
        <Meaning>
          {ann >= 0
            ? 'Alıcılar pozisyonu açık tutmak için ödüyor — yükseliş tarafı kalabalık.'
            : 'Satıcılar pozisyon için ödüyor — düşüş tarafı kalabalık.'}
        </Meaning>
      </Tile>,
    );
  }

  if (derivatives?.long_short) {
    const longPct = Math.round(derivatives.long_short.long_ratio * 100);
    const shortPct = 100 - longPct;
    tiles.push(
      <Tile key="ls" name="Alıcı / satıcı dengesi" src="Binance">
        <div className="text-[26px] font-extrabold leading-none text-slate-900">
          {longPct} / {shortPct}
        </div>
        <div className="mt-3 flex h-2 overflow-hidden rounded-md bg-slate-100">
          <span className="bg-emerald-500" style={{ width: `${longPct}%` }} />
          <span className="bg-rose-400" style={{ width: `${shortPct}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] font-bold">
          <span className="text-emerald-600">Alıcı %{longPct}</span>
          <span className="text-rose-500">Satıcı %{shortPct}</span>
        </div>
      </Tile>,
    );
  }

  if (whales) {
    const net = whales.flows.cex_in_usd - whales.flows.cex_out_usd;
    const hasFlow = whales.flows.cex_in_usd > 0 || whales.flows.cex_out_usd > 0;
    tiles.push(
      <Tile key="whale" name="Büyük cüzdan akışı" src="Arkham">
        <div className="text-[26px] font-extrabold leading-none text-slate-900">
          {hasFlow ? `${net >= 0 ? '+' : '−'}${fmtUsd(Math.abs(net))}` : '$0'}
        </div>
        <Meaning>
          {!hasFlow
            ? `Son 24 saatte ${whaleThreshold} giriş/çıkış yok. Büyük para kenarda bekliyor.`
            : net > 0
              ? `Net borsaya giriş ağır basıyor (${whaleThreshold} transferler) — satış baskısı riski.`
              : `Net borsadan çıkış ağır basıyor (${whaleThreshold} transferler) — tutma eğilimi.`}
        </Meaning>
      </Tile>,
    );
  }

  if (derivatives?.oi) {
    const ch = derivatives.oi.change_24h_pct;
    tiles.push(
      <Tile key="oi" name="Açık pozisyon" src="Coinglass">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[26px] font-extrabold leading-none text-slate-900">
            {fmtUsd(derivatives.oi.oi_usd)}
          </span>
          {ch != null ? (
            <span className={`text-[14px] font-bold ${ch >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {ch >= 0 ? '+' : ''}
              {ch.toFixed(1)}%
            </span>
          ) : null}
        </div>
        <Meaning>
          {ch != null && ch >= 0
            ? 'Piyasaya yeni pozisyon giriyor — ilgi artıyor.'
            : 'Piyasadan pozisyon çıkıyor — ilgi azalıyor.'}
        </Meaning>
      </Tile>,
    );
  }

  if (derivatives?.liquidation && derivatives.liquidation.total_24h_usd > 0) {
    const liq = derivatives.liquidation;
    const longHeavy = liq.long_24h_usd >= liq.short_24h_usd;
    const pct = Math.round(
      ((longHeavy ? liq.long_24h_usd : liq.short_24h_usd) / liq.total_24h_usd) * 100,
    );
    tiles.push(
      <Tile key="liq" name="Likidasyon 24s" src="Coinglass">
        <div className="text-[26px] font-extrabold leading-none text-slate-900">
          {fmtUsd(liq.total_24h_usd)}
        </div>
        <Meaning>
          Patlayan pozisyonların %{pct}&apos;i {longHeavy ? 'alıcı — yükselişe oynayanlar' : 'satıcı — düşüşe oynayanlar'} sıkıştı.
        </Meaning>
      </Tile>,
    );
  }

  if (tiles.length === 0) return null;
  return <section className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3">{tiles}</section>;
}

function Tile({ name, src, children }: { name: string; src: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.04),0_4px_16px_rgba(16,24,40,.05)]">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[13px] font-bold text-slate-600">{name}</span>
        <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-300">
          {src}
        </span>
      </div>
      {children}
    </div>
  );
}

function Meaning({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[12.5px] font-medium leading-snug text-slate-400">{children}</p>;
}

/* ────────────────────────── order book ──────────────────────── */

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

function OrderBookPanel({
  orderbook: seed,
  coin,
}: {
  orderbook: FoxyOrderBook | null;
  coin: CoinMatch;
}) {
  // The Foxy query seeds the first frame; then we poll the public
  // order-book endpoint so "canlı tahta" is genuinely live (~2s cadence).
  const [orderbook, setOrderbook] = useState<FoxyOrderBook | null>(seed);
  useEffect(() => {
    setOrderbook(seed);
  }, [seed]);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Recursive poll: schedule the next fetch AFTER the current one
    // resolves so slow venues never stack up. ~1s cadence keeps the
    // ladder flowing without hammering the exchanges.
    const loop = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/public/orderbook/${encodeURIComponent(coin.symbol)}`,
          { cache: 'no-store' },
        );
        if (res.ok) {
          const json = (await res.json()) as FoxyOrderBook | null;
          if (alive && json && Array.isArray(json.asks) && json.asks.length > 0) {
            setOrderbook(json);
          }
        }
      } catch {
        // transient — keep the last good book
      }
      if (alive) timer = setTimeout(() => void loop(), 1000);
    };
    void loop();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [coin.symbol]);

  const maxSz = orderbook
    ? Math.max(...orderbook.asks.concat(orderbook.bids).map((l) => l.sz), 0)
    : 0;
  const asks = orderbook ? orderbook.asks.slice(0, 5).reverse() : [];
  const bids = orderbook ? orderbook.bids.slice(0, 5) : [];
  const sources = orderbook?.sources ?? [];

  return (
    <Panel
      title="Canlı tahta"
      right={
        <Live>
          {sources.length > 0 ? `${sources.length} borsa` : coin.symbol}
        </Live>
      }
    >
      {orderbook ? (
        <>
          {sources.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-[18px] py-2.5">
              {sources.map((s) => (
                <span
                  key={s}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-500"
                >
                  {s}
                </span>
              ))}
              <span className="ml-auto self-center text-[10.5px] font-semibold text-slate-300">
                {orderbook.inst_id} · toplam derinlik
              </span>
            </div>
          ) : null}
          <div className="py-1.5">
            {asks.map((l, i) => (
              <ObRow key={`a${i}`} level={l} maxSz={maxSz} side="ask" />
            ))}
            <div className="my-0.5 flex items-center justify-between bg-slate-50 px-[18px] py-2.5">
              <span className="text-[16px] font-extrabold text-slate-900">{fmtPrice(orderbook.mid)}</span>
              <span className="text-[11.5px] font-semibold text-slate-400">
                spread {fmtPrice(orderbook.spread)} · {orderbook.spread_pct.toFixed(3)}%
              </span>
            </div>
            {bids.map((l, i) => (
              <ObRow key={`b${i}`} level={l} maxSz={maxSz} side="bid" />
            ))}
          </div>
        </>
      ) : (
        <Empty>Canlı tahta şu an alınamadı.</Empty>
      )}
    </Panel>
  );
}

function ObRow({
  level,
  maxSz,
  side,
}: {
  level: { px: number; sz: number };
  maxSz: number;
  side: 'ask' | 'bid';
}) {
  const w = maxSz > 0 ? Math.round((level.sz / maxSz) * 100) : 0;
  const ask = side === 'ask';
  return (
    <div className="relative z-[1] flex items-center justify-between px-[18px] py-[5px] text-[13px] font-semibold">
      <span
        className={`absolute inset-y-0 right-0 -z-[1] transition-[width] duration-700 ease-out ${ask ? 'bg-rose-50' : 'bg-emerald-50'}`}
        style={{ width: `${w}%` }}
      />
      <span className={ask ? 'text-rose-600' : 'text-emerald-600'}>{fmtPrice(level.px)}</span>
      <span className="text-slate-500">{level.sz.toFixed(2)}</span>
    </div>
  );
}

/* ─────────────────────── scalp signal ───────────────────────── */

/**
 * Live scalp signal, lifted to board level so the signal card AND the
 * chart's level-lines share one source. The query seeds the first
 * frame; then we poll the authed scalp endpoint every ~25s.
 */
function useLiveScalpSignal(
  seed: FoxyScalpSignal | null,
  coin: CoinMatch,
  getIdToken: () => Promise<string | null>,
): FoxyScalpSignal | null {
  const [signal, setSignal] = useState<FoxyScalpSignal | null>(seed);
  useEffect(() => setSignal(seed), [seed]);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const loop = async () => {
      try {
        const token = await getIdToken();
        if (token) {
          const res = await fetch(
            `${API_BASE}/me/foxy/scalp/${encodeURIComponent(coin.symbol)}`,
            { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
          );
          if (res.ok) {
            const json = (await res.json()) as FoxyScalpSignal | null;
            if (alive && json) setSignal(json);
          }
        }
      } catch {
        // transient — keep the last good signal
      }
      if (alive) timer = setTimeout(() => void loop(), 25000);
    };
    timer = setTimeout(() => void loop(), 25000);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [coin.symbol, getIdToken]);
  return signal;
}

function ScalpSignalPanel({ signal }: { signal: FoxyScalpSignal | null }) {
  if (!signal) return null; // no candles for this coin → hide entirely

  const none = signal.direction === 'NONE';
  const long = signal.direction === 'LONG';
  const accent = none ? 'bg-slate-300' : long ? 'bg-emerald-500' : 'bg-rose-500';
  const badge = none
    ? 'bg-slate-100 text-slate-500'
    : long
      ? 'bg-emerald-500 text-white'
      : 'bg-rose-500 text-white';
  const dirLabel = none ? 'İŞLEM YOK' : long ? 'LONG' : 'SHORT';

  const entryPct =
    signal.entry != null && signal.stop != null && signal.entry !== 0
      ? ((signal.stop - signal.entry) / signal.entry) * 100
      : null;

  return (
    <section className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_2px_6px_rgba(16,24,40,.06),0_12px_32px_rgba(16,24,40,.08)]">
      <span className={`absolute inset-y-0 left-0 w-[5px] ${accent}`} />

      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[16px]">🦊</span>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-slate-400">
          Scalp sinyali
        </span>
        <span className={`rounded-lg px-3 py-1 text-[15px] font-black leading-none ${badge}`}>
          {dirLabel}
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
          {signal.timeframe}
        </span>
        {!none ? (
          <span className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Güven %{signal.confidence}
          </span>
        ) : (
          <span className="ml-auto text-[11px] font-bold text-slate-300">Foxy üretti</span>
        )}
      </div>

      <p className="mt-3 text-[15px] font-bold leading-snug text-slate-900">
        {signal.headline}
      </p>

      {!none && signal.entry != null && signal.stop != null ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <LevelTile
            label="Giriş"
            value={fmtPrice(signal.entry)}
            sub={
              signal.entry_zone
                ? `${fmtPrice(signal.entry_zone[0])} – ${fmtPrice(signal.entry_zone[1])}`
                : 'piyasa'
            }
            tone="neutral"
          />
          <LevelTile
            label="Stop"
            value={fmtPrice(signal.stop)}
            sub={entryPct != null ? `${signedPct(entryPct)} · 1R` : '1R risk'}
            tone="stop"
          />
          {signal.targets.map((t, i) => (
            <LevelTile
              key={i}
              label={`TP${i + 1}`}
              value={fmtPrice(t.price)}
              sub={`${signedPct(t.pct)} · ${t.r}R`}
              tone="tp"
            />
          ))}
        </div>
      ) : null}

      {signal.reasons.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {signal.reasons.map((r, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-[13.5px] font-medium leading-snug text-slate-600"
            >
              <span className={`mt-[7px] inline-block size-[6px] shrink-0 rounded-full ${accent}`} />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {signal.invalidation ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-slate-50 px-4 py-3 text-[12.5px] font-medium leading-snug text-slate-600">
          <span>
            <span className="font-bold text-slate-900">Geçersiz olur:</span>{' '}
            {signal.invalidation}
          </span>
        </div>
      ) : null}

      <p className="mt-2.5 text-[10.5px] font-medium text-slate-300">
        Foxy&apos;nin ürettiği algoritmik seviyeler (OKX 5dk mumları) · yatırım tavsiyesi değil
      </p>
    </section>
  );
}

function LevelTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: 'neutral' | 'stop' | 'tp';
}) {
  const box =
    tone === 'stop'
      ? 'border-rose-100 bg-rose-50'
      : tone === 'tp'
        ? 'border-emerald-100 bg-emerald-50'
        : 'border-slate-200 bg-slate-50';
  const val =
    tone === 'stop' ? 'text-rose-600' : tone === 'tp' ? 'text-emerald-600' : 'text-slate-900';
  const lbl =
    tone === 'stop' ? 'text-rose-400' : tone === 'tp' ? 'text-emerald-500' : 'text-slate-400';
  return (
    <div className={`rounded-xl border ${box} px-3 py-2.5`}>
      <div className={`text-[10px] font-extrabold uppercase tracking-[0.06em] ${lbl}`}>{label}</div>
      <div className={`mt-1 text-[15px] font-black leading-none ${val}`}>{value}</div>
      <div className="mt-1 text-[10.5px] font-semibold text-slate-400">{sub}</div>
    </div>
  );
}

/* ───────────────────────── whale feed ───────────────────────── */

interface LiveWhales {
  whales: FoxyWhales | null;
  threshold: '1M$+' | '250K$+';
  checkedAt: Date | null;
}

/**
 * Live Arkham feed, lifted to board level so the metric tile and the
 * wallet-movements panel read one source. The query seeds the first
 * frame; then we poll the authed whales endpoint. On-chain transfers
 * arrive on minute scales (and Arkham is rate-limited), so a ~45s
 * cadence is genuinely live without burning the API key. When the
 * default 1M$+ threshold comes back empty we drop to 250K$+ so there
 * is usually a real flow to watch (the badge shows which).
 */
function useLiveWhales(
  seed: FoxyWhales | null,
  coin: CoinMatch,
  getIdToken: () => Promise<string | null>,
): LiveWhales {
  const [state, setState] = useState<LiveWhales>({
    whales: seed,
    threshold: '1M$+',
    checkedAt: null,
  });
  useEffect(
    () => setState({ whales: seed, threshold: '1M$+', checkedAt: null }),
    [seed],
  );

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const fetchWhales = async (token: string, minUsd?: number) => {
      const qs = minUsd ? `?min_usd=${minUsd}` : '';
      const res = await fetch(
        `${API_BASE}/me/foxy/whales/${encodeURIComponent(coin.symbol)}${qs}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
      );
      if (!res.ok) return null;
      return (await res.json()) as FoxyWhales | null;
    };
    const loop = async () => {
      try {
        const token = await getIdToken();
        if (token) {
          let json = await fetchWhales(token);
          let threshold: '1M$+' | '250K$+' = '1M$+';
          if (json && json.transfers.length === 0) {
            const lower = await fetchWhales(token, 250_000);
            if (lower && lower.transfers.length > 0) {
              json = lower;
              threshold = '250K$+';
            }
          }
          if (alive && json) {
            setState({ whales: json, threshold, checkedAt: new Date() });
          }
        }
      } catch {
        // transient — keep the last good feed
      }
      if (alive) timer = setTimeout(() => void loop(), 45000);
    };
    // First live pass right away (the seed may be minutes old by the
    // time the user reads the panel), then the 45s cadence.
    void loop();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [coin.symbol, getIdToken]);

  return state;
}

function WhaleFeedPanel({
  live,
}: {
  live: LiveWhales;
}) {
  const { whales, threshold, checkedAt } = live;
  const [, forceTick] = useState(0);
  const knownIdsRef = useRef<Set<string>>(
    new Set((whales?.transfers ?? []).map((t) => t.id)),
  );

  // Re-render every 10s so "Xdk önce" row ages and the scan ticker stay
  // honest between polls.
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 10000);
    return () => clearInterval(t);
  }, []);

  const transfers = whales?.transfers ?? [];
  const newIds = new Set(
    transfers.filter((t) => !knownIdsRef.current.has(t.id)).map((t) => t.id),
  );
  // Absorb after computing, so a row flashes for exactly one poll cycle.
  for (const t of transfers) knownIdsRef.current.add(t.id);

  return (
    <Panel
      title="Cüzdan hareketleri"
      right={
        <span className="flex items-center gap-2">
          <Live>
            Arkham · {threshold} · 24s
          </Live>
          <span className="text-[10px] font-bold text-slate-300">
            {checkedAt ? `tarama ${fmtAgo(checkedAt.getTime())}` : ''}
          </span>
        </span>
      }
    >
      {transfers.length > 0 ? (
        <div className="flex flex-col">
          {transfers.slice(0, 5).map((t) => (
            <WhaleRow key={t.id} t={t} fresh={newIds.has(t.id)} />
          ))}
        </div>
      ) : (
        <Empty>
          Son 24 saatte 250K$ üstü cüzdan hareketi yok — panel 45 sn&apos;de
          bir Arkham&apos;ı tarıyor.
        </Empty>
      )}
    </Panel>
  );
}

function WhaleRow({ t, fresh = false }: { t: FoxyWhaleTransfer; fresh?: boolean }) {
  const meta = flowMeta(t.flow);
  return (
    <div
      className={`flex items-center gap-3 border-t border-slate-100 px-[18px] py-3 transition-colors duration-1000 first:border-t-0 ${
        fresh ? 'bg-amber-50' : 'bg-transparent'
      }`}
    >
      <div className={`grid size-[34px] shrink-0 place-items-center rounded-[9px] text-[16px] ${meta.icBg} ${meta.icFg}`}>
        {meta.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-bold text-slate-900">
          {shortName(t.from.name)} → {shortName(t.to.name)}
        </div>
        <div className="mt-0.5 text-[11.5px] font-medium text-slate-400">
          <span className="font-bold text-slate-500">{fmtAgo(t.ts)}</span> ·{' '}
          {fmtUnit(t.unit_value)} {t.token_symbol} · {meta.label}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[14px] font-extrabold text-slate-900">{fmtUsd(t.usd_value)}</div>
        <div className={`text-[10px] font-extrabold uppercase tracking-[0.03em] ${meta.tagFg}`}>
          {meta.tag}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── traders ──────────────────────────── */

function TradersPanel({ setups, coin }: { setups: FoxySetupsByCoin | null; coin: CoinMatch }) {
  const active = setups?.active ?? [];
  const r = setups?.recent;
  return (
    <Panel
      title={`BottomUP trader'ları · ${coin.symbol}`}
      right={
        r ? (
          <span className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400">
            {active.length} aktif · %{Math.round((r.win_rate ?? 0) * 100)} isabet ·{' '}
            {r.total_r >= 0 ? '+' : ''}
            {r.total_r.toFixed(1)}R (30g)
          </span>
        ) : null
      }
    >
      {active.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-300">
                <th className="px-[18px] py-2.5 text-left">Trader</th>
                <th className="px-[18px] py-2.5 text-right">Yön</th>
                <th className="px-[18px] py-2.5 text-right">Giriş</th>
                <th className="px-[18px] py-2.5 text-right">Stop</th>
                <th className="px-[18px] py-2.5 text-right">Hedef</th>
                <th className="px-[18px] py-2.5 text-right">R</th>
              </tr>
            </thead>
            <tbody>
              {active.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 text-[14px] font-semibold text-slate-800">
                  <td className="px-[18px] py-3 text-left">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-7 place-items-center rounded-full bg-slate-200 text-[11px] font-extrabold text-slate-500">
                        {(s.trader_name ?? '?').slice(0, 1)}
                      </span>
                      <span className="flex flex-col leading-tight">
                        <span>{s.trader_name ?? 'Trader'}</span>
                        {fmtDay(s.created_at) ? (
                          <span className="text-[10.5px] font-semibold text-slate-400">
                            {fmtDay(s.created_at)} açıldı
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </td>
                  <td className="px-[18px] py-3 text-right">
                    {s.position ? (
                      <span
                        className={`rounded-md px-2.5 py-1 text-[11px] font-extrabold ${
                          s.position === 'long'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {s.position === 'long' ? 'LONG' : 'SHORT'}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-[18px] py-3 text-right">{fmtPriceOrDash(s.entry_value)}</td>
                  <td className="px-[18px] py-3 text-right">{fmtPriceOrDash(s.stop_value)}</td>
                  <td className="px-[18px] py-3 text-right">{fmtPriceOrDash(s.profit_taking_1)}</td>
                  <td className="px-[18px] py-3 text-right">
                    {s.r_value != null ? `${s.r_value >= 0 ? '+' : ''}${s.r_value.toFixed(1)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>Trader&apos;lar şu an bu coinde aktif pozisyon açmamış.</Empty>
      )}
    </Panel>
  );
}

/* ───────────────────────── shared bits ──────────────────────── */

function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,.04),0_4px_16px_rgba(16,24,40,.05)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-[18px] py-4">
        <span className="text-[15px] font-extrabold tracking-tight text-slate-900">{title}</span>
        {right}
      </div>
      {children}
    </section>
  );
}

function Live({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-emerald-600">
      <span className="size-[7px] animate-pulse rounded-full bg-emerald-500" />
      {children}
    </span>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="px-[18px] py-7 text-center text-[13px] font-medium text-slate-400">{children}</div>;
}

/* ───────────────────────── helpers ──────────────────────────── */

function verdictTheme(v: FoxyVerdict) {
  if (v === 'AL')
    return {
      cardBorder: 'border-emerald-200',
      accentBg: 'bg-emerald-500',
      badgeBg: 'bg-emerald-50',
      badgeFg: 'text-emerald-600',
      softBg: 'bg-emerald-50/70',
      softBorder: 'border-emerald-100',
    };
  if (v === 'SAT')
    return {
      cardBorder: 'border-rose-200',
      accentBg: 'bg-rose-500',
      badgeBg: 'bg-rose-50',
      badgeFg: 'text-rose-600',
      softBg: 'bg-rose-50/70',
      softBorder: 'border-rose-100',
    };
  return {
    cardBorder: 'border-amber-200',
    accentBg: 'bg-amber-500',
    badgeBg: 'bg-amber-50',
    badgeFg: 'text-amber-700',
    softBg: 'bg-amber-50/70',
    softBorder: 'border-amber-100',
  };
}

function flowMeta(flow: FoxyWhaleTransfer['flow']) {
  if (flow === 'cex_in')
    return {
      icon: '↘',
      icBg: 'bg-rose-50',
      icFg: 'text-rose-600',
      label: 'borsaya giriş',
      tag: 'satış riski',
      tagFg: 'text-rose-600',
    };
  if (flow === 'cex_out')
    return {
      icon: '↗',
      icBg: 'bg-emerald-50',
      icFg: 'text-emerald-600',
      label: 'borsadan çıkış',
      tag: 'tutuş',
      tagFg: 'text-emerald-600',
    };
  return {
    icon: '⇄',
    icBg: 'bg-indigo-50',
    icFg: 'text-indigo-600',
    label: 'cüzdanlar arası',
    tag: 'nötr',
    tagFg: 'text-indigo-600',
  };
}

function fmtPrice(n: number): string {
  const a = Math.abs(n);
  // Micro-caps get 4 significant digits — a fixed 4 decimals renders
  // SHIB/PEPE/SATS as a useless "$0.0000".
  const d =
    a >= 1000 ? 0
    : a >= 1 ? 2
    : a > 0 ? Math.max(4, Math.ceil(-Math.log10(a)) + 3)
    : 2;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

function fmtPriceOrDash(n: number | null): string {
  return n == null ? '—' : fmtPrice(n);
}

function signedPct(n: number): string {
  const s = n >= 0 ? '+' : '';
  return `${s}${n.toFixed(2)}%`;
}

function fmtUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

function fmtUnit(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function shortName(name: string): string {
  if (!name) return 'Bilinmeyen';
  if (/^0x[0-9a-f]+$/i.test(name) && name.length > 12)
    return `${name.slice(0, 6)}…${name.slice(-4)}`;
  return name.length > 22 ? `${name.slice(0, 21)}…` : name;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function fmtAgo(value: string | number): string {
  const ts = new Date(value).getTime();
  const diff = Date.now() - ts;
  if (!Number.isFinite(diff) || diff < 0) return '';
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

function fmtDay(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}
