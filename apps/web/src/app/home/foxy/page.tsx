'use client';

import { useState, type FormEvent } from 'react';
import { extractCoin, KNOWN_COINS, type CoinMatch } from '@/lib/coin-extract';

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
            <PlaceholderCard
              title="BottomUp setups"
              hint={`${coin.symbol}'da aktif setup'lar — Phase 2'de açılıyor.`}
            />
            <PlaceholderCard
              title="Derivatives — CoinGlass"
              hint="Liquidations 24h · OI · Funding · Long/Short — Phase 3."
            />
            <PlaceholderCard
              title="Whale moves — Arkham"
              hint="$1M+ pozisyon açılışları + bakiye değişimleri — Phase 4."
            />
            <PlaceholderCard
              title="Foxy AI summary"
              hint="Claude API tüm verilerden doğal dil yorumu üretecek — Phase 5."
            />
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

function PlaceholderCard({ title, hint }: { title: string; hint: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-bg-card/40 px-5 py-6">
      <div className="mono-label">{title}</div>
      <div className="mt-2 text-sm text-fg-muted">{hint}</div>
    </section>
  );
}
