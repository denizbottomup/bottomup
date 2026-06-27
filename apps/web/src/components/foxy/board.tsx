'use client';

import type { ReactNode } from 'react';
import type { CoinMatch } from '@/lib/coin-extract';
import type {
  FoxyAnalysis,
  FoxyAssetMarket,
  FoxyDerivatives,
  FoxyOrderBook,
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
}: Props) {
  const v = verdictTheme(analysis.verdict);

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
          <h2 className="text-[19px] font-bold leading-tight tracking-tight text-slate-900">
            {analysis.headline}
          </h2>
        </div>

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

      <MetricGrid derivatives={derivatives} whales={whales} />

      <div className="grid gap-3.5 md:grid-cols-[1fr_1.25fr]">
        <OrderBookPanel orderbook={orderbook} coin={coin} />
        <WhaleFeedPanel whales={whales} />
      </div>

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
}: {
  derivatives: FoxyDerivatives | null;
  whales: FoxyWhales | null;
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
            ? 'Son 24 saatte 1M$+ giriş/çıkış yok. Büyük para kenarda bekliyor.'
            : net > 0
              ? 'Net borsaya giriş ağır basıyor — satış baskısı riski.'
              : 'Net borsadan çıkış ağır basıyor — tutma eğilimi.'}
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

function OrderBookPanel({
  orderbook,
  coin,
}: {
  orderbook: FoxyOrderBook | null;
  coin: CoinMatch;
}) {
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
        className={`absolute inset-y-0 right-0 -z-[1] ${ask ? 'bg-rose-50' : 'bg-emerald-50'}`}
        style={{ width: `${w}%` }}
      />
      <span className={ask ? 'text-rose-600' : 'text-emerald-600'}>{fmtPrice(level.px)}</span>
      <span className="text-slate-500">{level.sz.toFixed(2)}</span>
    </div>
  );
}

/* ───────────────────────── whale feed ───────────────────────── */

function WhaleFeedPanel({ whales }: { whales: FoxyWhales | null }) {
  const transfers = whales?.transfers ?? [];
  return (
    <Panel title="Cüzdan hareketleri" right={<Live>Arkham · 1M$+ · 24s</Live>}>
      {transfers.length > 0 ? (
        <div className="flex flex-col">
          {transfers.slice(0, 5).map((t) => (
            <WhaleRow key={t.id} t={t} />
          ))}
        </div>
      ) : (
        <Empty>Son 24 saatte 1M$ üstü büyük cüzdan hareketi yok.</Empty>
      )}
    </Panel>
  );
}

function WhaleRow({ t }: { t: FoxyWhaleTransfer }) {
  const meta = flowMeta(t.flow);
  return (
    <div className="flex items-center gap-3 border-t border-slate-100 px-[18px] py-3 first:border-t-0">
      <div className={`grid size-[34px] shrink-0 place-items-center rounded-[9px] text-[16px] ${meta.icBg} ${meta.icFg}`}>
        {meta.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-bold text-slate-900">
          {shortName(t.from.name)} → {shortName(t.to.name)}
        </div>
        <div className="mt-0.5 text-[11.5px] font-medium text-slate-400">
          {fmtTime(t.ts)} · {fmtUnit(t.unit_value)} {t.token_symbol} · {meta.label}
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
                      {s.trader_name ?? 'Trader'}
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
  const d = n >= 1000 ? 0 : n >= 1 ? 2 : 4;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

function fmtPriceOrDash(n: number | null): string {
  return n == null ? '—' : fmtPrice(n);
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
