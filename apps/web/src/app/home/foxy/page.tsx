'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { extractCoin, KNOWN_COINS, type CoinMatch } from '@/lib/coin-extract';
import { useAuth } from '@/lib/auth-context';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

interface CoinSetup {
  id: string;
  status: string;
  position: 'long' | 'short' | null;
  entry_value: number | null;
  stop_value: number | null;
  profit_taking_1: number | null;
  r_value: number | null;
  trader_id: string | null;
  trader_name: string | null;
  trader_image: string | null;
  created_at: string | null;
  last_acted_at: string | null;
}

interface SetupsPayload {
  coin: string;
  active: CoinSetup[];
  recent: {
    count: number;
    wins: number;
    losses: number;
    break_even: number;
    win_rate: number | null;
    total_r: number;
  };
}

interface QuotaState {
  used: number;
  limit: number;
  window_starts_at: string;
  resets_at: string;
}

interface QueryReply {
  prompt: string;
  coin: string | null;
  reply: string;
  quota: QuotaState;
  entitlement: {
    tier: 'free' | 'trial' | 'premium';
    expires_at: string | null;
    is_trial: boolean;
  };
}

interface WhaleTransfer {
  id: string;
  ts: string;
  chain: string;
  token_symbol: string;
  unit_value: number;
  usd_value: number;
  from: { name: string; address: string; type: string | null };
  to: { name: string; address: string; type: string | null };
  flow: 'cex_in' | 'cex_out' | 'between';
  tx_hash: string;
}

interface WhalesPayload {
  coin: string;
  window_hours: number;
  min_usd: number;
  total: number;
  transfers: WhaleTransfer[];
  flows: {
    cex_in_usd: number;
    cex_out_usd: number;
    between_usd: number;
  };
}

interface DerivativesPayload {
  coin: string;
  liquidation: {
    long_24h_usd: number;
    short_24h_usd: number;
    total_24h_usd: number;
    total_4h_usd: number;
    total_1h_usd: number;
  } | null;
  oi: {
    oi_usd: number;
    change_4h_pct: number | null;
    change_24h_pct: number | null;
  } | null;
  long_short: {
    long_ratio: number;
    short_ratio: number;
    ts: number;
  } | null;
  funding: {
    rate: number;
    annualized_pct: number;
    next_funding_ts: number | null;
  } | null;
}

const SUGGESTIONS = [
  'Ethereum analizi yapar mısın?',
  'BTC için sinyaller var mı?',
  'Solana balina hareketleri',
  'BNB için liquidation seviyeleri',
];

/**
 * Foxy — the AI-prompt landing of `/home`. Phase 1 ships the chat
 * UI shell + a TradingView embed for the matched coin; the
 * BottomUp setups, CoinGlass derivatives, Arkham whales, and Claude
 * summary cards land in subsequent phases.
 *
 * The empty state is a centered prompt with suggestion chips; once
 * the user submits, the layout pivots to result-on-top, prompt
 * pinned at the bottom (chatGPT-style).
 */
export default function FoxyPage() {
  const [prompt, setPrompt] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [coin, setCoin] = useState<CoinMatch | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text) return;
    const match = extractCoin(text);
    if (!match) {
      setError(
        "Hangi coin olduğunu anlayamadım. ETH, BTC, SOL, BNB, XRP gibi bir sembolle dene.",
      );
      setCoin(null);
      return;
    }
    setError(null);
    setCoin(match);
    setSubmitted(text);
    setPrompt('');
  }

  function handleSuggestion(s: string) {
    setPrompt(s);
  }

  if (!submitted) {
    return <FoxyEmptyState
      prompt={prompt}
      setPrompt={setPrompt}
      onSubmit={handleSubmit}
      onSuggestion={handleSuggestion}
      error={error}
    />;
  }

  return (
    <FoxyResultView
      lastPrompt={submitted}
      coin={coin}
      prompt={prompt}
      setPrompt={setPrompt}
      onSubmit={handleSubmit}
      error={error}
    />
  );
}

function FoxyEmptyState({
  prompt,
  setPrompt,
  onSubmit,
  onSuggestion,
  error,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onSuggestion: (s: string) => void;
  error: string | null;
}) {
  return (
    <div className="flex min-h-[calc(100vh-0px)] flex-col items-center justify-center px-4 md:px-8">
      <div className="w-full max-w-2xl">
        <div className="text-center">
          <div className="mono-label !text-brand">Foxy · AI market analyst</div>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
            Bir coin sor.{' '}
            <span className="logo-gradient">Cevabı Foxy çıkartsın.</span>
          </h1>
          <p className="mt-3 text-sm text-fg-muted md:text-base">
            BottomUp trader sinyalleri, CoinGlass türev verileri, Arkham
            balina hareketleri ve canlı TradingView grafiği — hepsi tek
            ekranda.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8">
          <div className="rounded-2xl border border-border bg-bg-card focus-within:border-white/25 transition">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ethereum analizi yapar mısın?"
              rows={3}
              className="w-full resize-none bg-transparent px-4 py-3 text-fg placeholder-fg-dim outline-none"
              autoFocus
            />
            <div className="flex items-center justify-between border-t border-border px-3 py-2">
              <div className="text-[11px] text-fg-dim">
                Free: 5 sorgu / hafta
              </div>
              <button
                type="submit"
                disabled={!prompt.trim()}
                className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand/90"
              >
                Analiz et →
              </button>
            </div>
          </div>
          {error ? (
            <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/[0.06] px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
        </form>

        <div className="mt-6">
          <div className="mono-label !text-fg-dim mb-2">Hızlı başlangıç</div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onSuggestion(s)}
                className="rounded-full border border-border bg-bg-card px-3 py-1.5 text-xs text-fg-muted hover:border-white/25 hover:text-fg transition"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[11px] text-fg-dim">
          <span>Desteklenen coinler:</span>
          {KNOWN_COINS.map((c) => (
            <span
              key={c.symbol}
              className="rounded-full border border-white/10 px-2 py-0.5 font-mono"
            >
              {c.symbol}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FoxyResultView({
  lastPrompt,
  coin,
  prompt,
  setPrompt,
  onSubmit,
  error,
}: {
  lastPrompt: string;
  coin: CoinMatch | null;
  prompt: string;
  setPrompt: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  error: string | null;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border px-4 py-3 md:px-8">
        <div className="text-[11px] text-fg-dim">Sorduğun</div>
        <div className="mt-1 text-sm text-fg">{lastPrompt}</div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {coin ? (
          <div className="mx-auto max-w-5xl space-y-6">
            <CoinHeader coin={coin} />
            <TradingViewCard coin={coin} />
            <SetupsCard coin={coin} />
            <DerivativesCard coin={coin} />
            <WhalesCard coin={coin} />
            <AISummaryCard prompt={lastPrompt} coin={coin} />
          </div>
        ) : null}
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 border-t border-border bg-bg/95 backdrop-blur px-4 py-3 md:px-8"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Yeni bir coin sor…"
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-border bg-bg-card px-4 py-2 text-sm text-fg placeholder-fg-dim outline-none focus:border-white/25"
          />
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand/90"
          >
            Sor
          </button>
        </div>
        {error ? (
          <div className="mx-auto mt-2 max-w-3xl text-xs text-rose-200">
            {error}
          </div>
        ) : null}
      </form>
    </div>
  );
}

function CoinHeader({ coin }: { coin: CoinMatch }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-brand font-bold">
        {coin.symbol[0]}
      </div>
      <div>
        <div className="mono-label !text-fg-dim">Asset</div>
        <h2 className="text-2xl font-extrabold tracking-tight">
          {coin.display}{' '}
          <span className="text-fg-dim font-mono text-base">{coin.symbol}</span>
        </h2>
      </div>
    </div>
  );
}

function TradingViewCard({ coin }: { coin: CoinMatch }) {
  // Lightweight TradingView "advanced chart" embed via the public
  // widget URL. We pin the symbol query param and let TV handle the
  // rest. iframe has a fixed aspect to avoid CLS during route change.
  const src = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
    coin.tvTicker,
  )}&interval=240&theme=dark&style=1&toolbarbg=rgba(0,0,0,0)&hideideas=1&withdateranges=1&timezone=Etc/UTC`;
  return (
    <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="mono-label">TradingView · {coin.symbol}/USDT</div>
        <a
          href={`https://www.tradingview.com/symbols/${coin.tvTicker.replace(':', '-')}/`}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-fg-dim hover:text-fg"
        >
          TV'de aç ↗
        </a>
      </div>
      <iframe
        src={src}
        title={`${coin.symbol} TradingView`}
        className="h-[480px] w-full"
        loading="lazy"
      />
    </section>
  );
}

function SetupsCard({ coin }: { coin: CoinMatch }) {
  const { getIdToken } = useAuth();
  const [data, setData] = useState<SetupsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    setData(null);
    (async () => {
      const token = await getIdToken();
      if (!token) {
        if (alive) {
          setErr('Auth gerekli.');
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch(
          `${API_BASE}/me/foxy/setups/${encodeURIComponent(coin.symbol)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as SetupsPayload;
        if (alive) {
          setData(json);
          setLoading(false);
        }
      } catch (x) {
        if (alive) {
          setErr((x as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [coin.symbol, getIdToken]);

  return (
    <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <div className="mono-label">BottomUp setups · {coin.symbol}</div>
          {data ? (
            <div className="mt-1 text-[11px] text-fg-dim">
              {data.active.length} aktif · son 30 gün:{' '}
              {data.recent.count} işlem,{' '}
              {data.recent.win_rate != null
                ? `${Math.round(data.recent.win_rate * 100)}% WR`
                : '—'}
              , {data.recent.total_r >= 0 ? '+' : ''}
              {data.recent.total_r.toFixed(2)}R
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="p-5 text-sm text-fg-muted">
          BottomUp setupları yükleniyor…
        </div>
      ) : err ? (
        <div className="p-5 text-sm text-rose-200">
          Setup verisi alınamadı: {err}
        </div>
      ) : data && data.active.length > 0 ? (
        <div className="divide-y divide-border">
          {data.active.map((s) => (
            <SetupRow key={s.id} setup={s} />
          ))}
        </div>
      ) : (
        <div className="p-5 text-sm text-fg-muted">
          {coin.symbol}'da şu an aktif setup yok.{' '}
          {data && data.recent.count > 0
            ? `Son 30 günde ${data.recent.count} kapanmış işlem var.`
            : null}
        </div>
      )}
    </section>
  );
}

function SetupRow({ setup }: { setup: CoinSetup }) {
  const posTone =
    setup.position === 'long'
      ? 'text-emerald-300 bg-emerald-400/10 ring-emerald-400/30'
      : 'text-rose-300 bg-rose-400/10 ring-rose-400/30';
  const statusTone =
    setup.status === 'active'
      ? 'text-emerald-300'
      : setup.status === 'incoming'
        ? 'text-amber-300'
        : 'text-fg-dim';
  return (
    <div className="grid grid-cols-12 items-center gap-3 px-5 py-3 text-[12px] font-mono">
      <div className="col-span-4 flex items-center gap-2 min-w-0">
        {setup.trader_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={setup.trader_image}
            alt=""
            className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-[10px] text-fg ring-1 ring-white/10">
            {setup.trader_name?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div className="truncate">
          <div className="truncate font-sans text-[13px] font-semibold text-fg">
            {setup.trader_name ?? 'Unknown'}
          </div>
          <div className={`text-[10px] uppercase tracking-wider ${statusTone}`}>
            {setup.status}
          </div>
        </div>
      </div>

      <div className="col-span-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ring-1 ${posTone}`}>
          {setup.position === 'long' ? '↑ LONG' : setup.position === 'short' ? '↓ SHORT' : '—'}
        </span>
      </div>

      <div className="col-span-2 text-fg">
        <div className="text-[10px] uppercase text-fg-dim">Entry</div>
        <div>{setup.entry_value != null ? formatPrice(setup.entry_value) : '—'}</div>
      </div>
      <div className="col-span-2 text-rose-300">
        <div className="text-[10px] uppercase text-fg-dim">Stop</div>
        <div>{setup.stop_value != null ? formatPrice(setup.stop_value) : '—'}</div>
      </div>
      <div className="col-span-2 text-emerald-300">
        <div className="text-[10px] uppercase text-fg-dim">TP1</div>
        <div>{setup.profit_taking_1 != null ? formatPrice(setup.profit_taking_1) : '—'}</div>
      </div>
    </div>
  );
}

function DerivativesCard({ coin }: { coin: CoinMatch }) {
  const { getIdToken } = useAuth();
  const [data, setData] = useState<DerivativesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    setData(null);
    (async () => {
      const token = await getIdToken();
      if (!token) {
        if (alive) {
          setErr('Auth gerekli.');
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch(
          `${API_BASE}/me/foxy/derivatives/${encodeURIComponent(coin.symbol)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DerivativesPayload;
        if (alive) {
          setData(json);
          setLoading(false);
        }
      } catch (x) {
        if (alive) {
          setErr((x as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [coin.symbol, getIdToken]);

  return (
    <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <div className="mono-label">Derivatives · {coin.symbol}</div>
        <div className="mt-0.5 text-[11px] text-fg-dim">
          CoinGlass aggregate · Binance futures · 5dk cache
        </div>
      </div>

      {loading ? (
        <div className="p-5 text-sm text-fg-muted">Türev verileri yükleniyor…</div>
      ) : err ? (
        <div className="p-5 text-sm text-rose-200">Veri alınamadı: {err}</div>
      ) : data ? (
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <LiquidationBlock liq={data.liquidation} />
          <OiBlock oi={data.oi} />
          <LongShortBlock ls={data.long_short} />
          <FundingBlock fund={data.funding} />
        </div>
      ) : null}
    </section>
  );
}

function LiquidationBlock({ liq }: { liq: DerivativesPayload['liquidation'] }) {
  if (!liq) {
    return <Block title="Liquidations 24h" body={<DataDash />} />;
  }
  const longPct = liq.total_24h_usd > 0 ? (liq.long_24h_usd / liq.total_24h_usd) * 100 : 50;
  return (
    <Block
      title="Liquidations 24h"
      body={
        <div>
          <div className="text-2xl font-bold text-fg">
            {formatUsdShort(liq.total_24h_usd)}
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-rose-400/20">
            <div className="bg-emerald-400" style={{ width: `${longPct.toFixed(1)}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-fg-dim font-mono">
            <span className="text-emerald-300">Long {formatUsdShort(liq.long_24h_usd)}</span>
            <span className="text-rose-300">{formatUsdShort(liq.short_24h_usd)} Short</span>
          </div>
        </div>
      }
    />
  );
}

function OiBlock({ oi }: { oi: DerivativesPayload['oi'] }) {
  if (!oi) {
    return <Block title="Open interest" body={<DataDash />} />;
  }
  const tone24 =
    oi.change_24h_pct == null
      ? 'text-fg-dim'
      : oi.change_24h_pct >= 0
        ? 'text-emerald-300'
        : 'text-rose-300';
  return (
    <Block
      title="Open interest"
      body={
        <div>
          <div className="text-2xl font-bold text-fg">{formatUsdShort(oi.oi_usd)}</div>
          <div className="mt-1 flex gap-3 text-[11px] font-mono">
            <span className={tone24}>
              24h{' '}
              {oi.change_24h_pct == null
                ? '—'
                : `${oi.change_24h_pct >= 0 ? '+' : ''}${oi.change_24h_pct.toFixed(2)}%`}
            </span>
            <span className="text-fg-dim">
              4h{' '}
              {oi.change_4h_pct == null
                ? '—'
                : `${oi.change_4h_pct >= 0 ? '+' : ''}${oi.change_4h_pct.toFixed(2)}%`}
            </span>
          </div>
        </div>
      }
    />
  );
}

function LongShortBlock({ ls }: { ls: DerivativesPayload['long_short'] }) {
  if (!ls) {
    return <Block title="Long / Short ratio" body={<DataDash />} />;
  }
  const total = ls.long_ratio + ls.short_ratio || 1;
  const longPct = (ls.long_ratio / total) * 100;
  return (
    <Block
      title="Long / Short ratio"
      body={
        <div>
          <div className="text-2xl font-bold text-fg">
            {(ls.long_ratio / Math.max(0.01, ls.short_ratio)).toFixed(2)}{' '}
            <span className="text-xs text-fg-dim">L:S</span>
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-rose-400/20">
            <div className="bg-emerald-400" style={{ width: `${longPct.toFixed(1)}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-fg-dim font-mono">
            <span className="text-emerald-300">{(ls.long_ratio * 100).toFixed(1)}% Long</span>
            <span className="text-rose-300">{(ls.short_ratio * 100).toFixed(1)}% Short</span>
          </div>
        </div>
      }
    />
  );
}

function FundingBlock({ fund }: { fund: DerivativesPayload['funding'] }) {
  if (!fund) {
    return <Block title="Funding rate" body={<DataDash />} />;
  }
  const tone = fund.rate >= 0 ? 'text-emerald-300' : 'text-rose-300';
  const next = fund.next_funding_ts
    ? new Date(fund.next_funding_ts).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  return (
    <Block
      title="Funding rate"
      body={
        <div>
          <div className={`text-2xl font-bold ${tone}`}>
            {(fund.rate * 100).toFixed(4)}%
          </div>
          <div className="mt-1 text-[11px] font-mono text-fg-dim">
            Yıllık ≈ {fund.annualized_pct >= 0 ? '+' : ''}
            {fund.annualized_pct.toFixed(1)}%
            {next ? ` · sonraki ${next}` : ''}
          </div>
        </div>
      }
    />
  );
}

function Block({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <div className="mono-label !text-fg-dim">{title}</div>
      <div className="mt-2">{body}</div>
    </div>
  );
}

function DataDash() {
  return <div className="text-sm text-fg-dim">Veri yok.</div>;
}

function formatUsdShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatPrice(n: number): string {
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.01) return n.toFixed(5);
  return n.toFixed(8);
}

function WhalesCard({ coin }: { coin: CoinMatch }) {
  const { getIdToken } = useAuth();
  const [data, setData] = useState<WhalesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    setData(null);
    (async () => {
      const token = await getIdToken();
      if (!token) {
        if (alive) {
          setErr('Auth gerekli.');
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch(
          `${API_BASE}/me/foxy/whales/${encodeURIComponent(coin.symbol)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as WhalesPayload;
        if (alive) {
          setData(json);
          setLoading(false);
        }
      } catch (x) {
        if (alive) {
          setErr((x as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [coin.symbol, getIdToken]);

  return (
    <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <div className="mono-label">Whale moves · {coin.symbol}</div>
        <div className="mt-0.5 text-[11px] text-fg-dim">
          Arkham on-chain transfers · $
          {data ? formatUsdShort(data.min_usd).slice(1) : '1M'}+ · son{' '}
          {data?.window_hours ?? 24}h
        </div>
      </div>

      {loading ? (
        <div className="p-5 text-sm text-fg-muted">Balina hareketleri yükleniyor…</div>
      ) : err ? (
        <div className="p-5 text-sm text-rose-200">Veri alınamadı: {err}</div>
      ) : data && data.transfers.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-3 border-b border-border px-5 py-4">
            <FlowStat
              label="Borsalara giriş"
              tone="rose"
              value={data.flows.cex_in_usd}
              hint="CEX'e gönderildi"
            />
            <FlowStat
              label="Borsadan çıkış"
              tone="emerald"
              value={data.flows.cex_out_usd}
              hint="CEX'ten çekildi"
            />
            <FlowStat
              label="Aralarında"
              tone="neutral"
              value={data.flows.between_usd}
              hint="OTC / DeFi / wallet"
            />
          </div>
          <div className="divide-y divide-border">
            {data.transfers.map((t) => (
              <WhaleRow key={t.id} t={t} />
            ))}
          </div>
          {data.total > data.transfers.length ? (
            <div className="border-t border-border px-5 py-3 text-[11px] text-fg-dim">
              Listedeki {data.transfers.length} işlem en büyükleri.{' '}
              {data.window_hours} saat içinde toplam {data.total} kayıt var.
            </div>
          ) : null}
        </>
      ) : (
        <div className="p-5 text-sm text-fg-muted">
          Son {data?.window_hours ?? 24} saatte ${formatUsdShort(data?.min_usd ?? 1_000_000).slice(1)}+
          büyüklükte transfer yok. (Bu coin için Arkham haritalı değilse veri boş gelir.)
        </div>
      )}
    </section>
  );
}

function FlowStat({
  label,
  tone,
  value,
  hint,
}: {
  label: string;
  tone: 'rose' | 'emerald' | 'neutral';
  value: number;
  hint: string;
}) {
  const cls =
    tone === 'rose'
      ? 'text-rose-300'
      : tone === 'emerald'
        ? 'text-emerald-300'
        : 'text-fg';
  return (
    <div className="rounded-xl border border-border bg-bg p-3">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">{label}</div>
      <div className={`mt-1 text-lg font-bold ${cls}`}>{formatUsdShort(value)}</div>
      <div className="mt-0.5 text-[10px] text-fg-dim">{hint}</div>
    </div>
  );
}

function WhaleRow({ t }: { t: WhaleTransfer }) {
  const time = t.ts ? new Date(t.ts) : null;
  const flowLabel =
    t.flow === 'cex_in'
      ? '↗ to CEX'
      : t.flow === 'cex_out'
        ? '↙ from CEX'
        : 'wallet → wallet';
  const flowTone =
    t.flow === 'cex_in'
      ? 'text-rose-300'
      : t.flow === 'cex_out'
        ? 'text-emerald-300'
        : 'text-fg-dim';
  return (
    <div className="grid grid-cols-12 items-center gap-3 px-5 py-3 text-[12px] font-mono">
      <div className="col-span-2 text-fg-dim">
        {time
          ? time.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—'}
      </div>
      <div className="col-span-3 truncate text-fg">{compactName(t.from.name)}</div>
      <div className="col-span-1 text-center text-fg-dim">→</div>
      <div className="col-span-3 truncate text-fg">{compactName(t.to.name)}</div>
      <div className="col-span-2 text-right text-fg font-bold">
        {formatUsdShort(t.usd_value)}
      </div>
      <div className={`col-span-1 text-right text-[10px] uppercase ${flowTone}`}>
        {flowLabel}
      </div>
    </div>
  );
}

function compactName(s: string): string {
  if (!s) return '—';
  if (s.startsWith('0x') && s.length > 12) return `${s.slice(0, 6)}…${s.slice(-4)}`;
  return s.length > 22 ? `${s.slice(0, 22)}…` : s;
}

function AISummaryCard({ prompt, coin }: { prompt: string; coin: CoinMatch }) {
  const { getIdToken } = useAuth();
  const [data, setData] = useState<QueryReply | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<{ message: string; quota?: QuotaState } | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    setData(null);
    (async () => {
      const token = await getIdToken();
      if (!token) {
        if (alive) {
          setErr({ message: 'Auth gerekli.' });
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/me/foxy/query`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt, coin: coin.symbol }),
        });
        if (res.status === 403) {
          const j = (await res.json()) as { message?: string; quota?: QuotaState };
          if (alive) {
            setErr({
              message: j.message ?? 'Foxy quota dolu.',
              quota: j.quota,
            });
            setLoading(false);
          }
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as QueryReply;
        if (alive) {
          setData(json);
          setLoading(false);
        }
      } catch (x) {
        if (alive) {
          setErr({ message: (x as Error).message });
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [prompt, coin.symbol, getIdToken]);

  return (
    <section className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/[0.06] to-transparent overflow-hidden">
      <div className="flex items-center justify-between border-b border-brand/20 px-5 py-3">
        <div>
          <div className="mono-label !text-brand">Foxy AI · özet</div>
          <div className="mt-0.5 text-[11px] text-fg-dim">
            Claude · {coin.symbol} bağlamlı analiz
          </div>
        </div>
        {data?.quota ? (
          <div className="text-right text-[11px] text-fg-dim font-mono">
            {data.quota.used}/{data.quota.limit} bu hafta
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="p-5 text-sm text-fg-muted animate-pulse">
          Foxy düşünüyor… ({coin.symbol} setupları, türev verileri ve balina
          akışları okunuyor)
        </div>
      ) : err ? (
        <div className="p-5">
          <div className="text-sm text-rose-200">{err.message}</div>
          {err.quota ? (
            <div className="mt-3 flex flex-col items-start gap-2">
              <div className="text-[11px] text-fg-dim font-mono">
                {err.quota.used}/{err.quota.limit} sorgu kullanıldı · sıfırlanma{' '}
                {new Date(err.quota.resets_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </div>
              <a
                href="/account"
                className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-black hover:bg-brand/90"
              >
                Premium ile sınırsız sor →
              </a>
            </div>
          ) : null}
        </div>
      ) : data ? (
        <div className="p-5">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-fg">
            {data.reply}
          </div>
          <div className="mt-4 border-t border-border pt-3 text-[10px] uppercase tracking-wider text-fg-dim">
            Foxy AI yorumu yatırım tavsiyesi değildir.
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PlaceholderCard({ title, hint }: { title: string; hint: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-bg-card/40 px-5 py-6">
      <div className="mono-label">{title}</div>
      <div className="mt-2 text-sm text-fg-muted">{hint}</div>
    </section>
  );
}
