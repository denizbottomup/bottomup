'use client';

import { useState, type FormEvent } from 'react';
import { extractCoin, type CoinMatch } from '@/lib/coin-extract';
import { useAuth } from '@/lib/auth-context';
import { FoxyPromptPanel } from '@/components/foxy/prompt-panel';
import { FoxyVerdictHero } from '@/components/foxy/verdict-hero';
import { FoxyTradingViewCard } from '@/components/foxy/tradingview-card';
import { FoxyDataStrip } from '@/components/foxy/data-strip';
import type {
  FoxyAnalysis,
  FoxyDerivatives,
  FoxyHistoryEntry,
  FoxyQueryReply,
  FoxySetupsByCoin,
  FoxyWhales,
} from '@/components/foxy/types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

/**
 * Foxy — AI market analyst. The product surface is two columns:
 *
 *   ┌─ left ──────────┬─ right ──────────────────────────┐
 *   │ Prompt + history │ Verdict hero (AL/SAT/BEKLE)      │
 *   │                  │ TradingView chart                 │
 *   │                  │ BottomUP / Borsa / Arkham cards   │
 *   └──────────────────┴───────────────────────────────────┘
 *
 * The hero call is non-negotiable — every reason inside it must read
 * like a desk-analyst observation, never a raw confluence score.
 */
export default function FoxyPage() {
  const { user, getIdToken } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [coin, setCoin] = useState<CoinMatch | null>(null);
  const [analysis, setAnalysis] = useState<FoxyAnalysis | null>(null);
  const [setups, setSetups] = useState<FoxySetupsByCoin | null>(null);
  const [derivatives, setDerivatives] = useState<FoxyDerivatives | null>(null);
  const [whales, setWhales] = useState<FoxyWhales | null>(null);
  const [loading, setLoading] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<FoxyHistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  async function runQuery(text: string, match: CoinMatch) {
    if (!user) return;
    setLoading(true);
    setCardsLoading(true);
    setError(null);

    const token = await getIdToken();
    if (!token) {
      setError('Oturum açılamadı — sayfayı yenile.');
      setLoading(false);
      setCardsLoading(false);
      return;
    }
    const auth = { Authorization: `Bearer ${token}` };

    // Fan out: cards + verdict at the same time. Cards land first
    // (cheap), then the Claude verdict resolves and re-renders the
    // hero. The user always sees *something* moving on the right.
    const cardsPromise = Promise.all([
      fetch(`${API_BASE}/me/foxy/setups/${encodeURIComponent(match.symbol)}`, {
        headers: auth,
      })
        .then((r) => (r.ok ? (r.json() as Promise<FoxySetupsByCoin>) : null))
        .catch(() => null),
      fetch(
        `${API_BASE}/me/foxy/derivatives/${encodeURIComponent(match.symbol)}`,
        { headers: auth },
      )
        .then((r) => (r.ok ? (r.json() as Promise<FoxyDerivatives>) : null))
        .catch(() => null),
      fetch(`${API_BASE}/me/foxy/whales/${encodeURIComponent(match.symbol)}`, {
        headers: auth,
      })
        .then((r) => (r.ok ? (r.json() as Promise<FoxyWhales>) : null))
        .catch(() => null),
    ]).then(([s, d, w]) => {
      setSetups(s);
      setDerivatives(d);
      setWhales(w);
      setCardsLoading(false);
    });

    const queryPromise = fetch(`${API_BASE}/me/foxy/query`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text, coin: match.symbol }),
    })
      .then(async (r) => {
        if (r.status === 403) {
          const body = (await r.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(
            body?.message ??
              'Foxy haftalık sorgu limitin doldu — Premium ile devam et.',
          );
        }
        if (!r.ok) throw new Error('Foxy şu an cevap veremedi.');
        return (await r.json()) as FoxyQueryReply;
      })
      .then((reply) => reply.analysis);

    try {
      const verdict = await queryPromise;
      setAnalysis(verdict);

      const entry: FoxyHistoryEntry = {
        id: crypto.randomUUID(),
        prompt: text,
        coinSymbol: match.symbol,
        coinDisplay: match.display,
        verdict: verdict.verdict,
        at: Date.now(),
      };
      setHistory((prev) => [entry, ...prev].slice(0, 20));
      setActiveHistoryId(entry.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }

    await cardsPromise.catch(() => {
      setCardsLoading(false);
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || loading) return;
    const match = extractCoin(text);
    if (!match) {
      setError(
        'Hangi coin olduğunu çıkaramadım — ETH, BTC, SOL, BNB, XRP gibi bir sembolle dene.',
      );
      return;
    }
    setError(null);
    setPrompt('');
    setCoin(match);
    setAnalysis(null);
    setSetups(null);
    setDerivatives(null);
    setWhales(null);
    setActiveHistoryId(null);
    void runQuery(text, match);
  }

  function handlePickHistory(entry: FoxyHistoryEntry) {
    // Re-run the same prompt — cheaper than persisting the full
    // payload and keeps history-from-history coherent with the
    // most recent backend state.
    if (!entry.coinSymbol) return;
    const match = extractCoin(entry.prompt);
    if (!match) return;
    setPrompt('');
    setError(null);
    setCoin(match);
    setAnalysis(null);
    setSetups(null);
    setDerivatives(null);
    setWhales(null);
    setActiveHistoryId(entry.id);
    void runQuery(entry.prompt, match);
  }

  return (
    <div className="flex h-screen flex-col md:flex-row">
      <FoxyPromptPanel
        prompt={prompt}
        setPrompt={setPrompt}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        history={history}
        onPickHistory={handlePickHistory}
        activeHistoryId={activeHistoryId}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {coin ? (
          <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
            {analysis ? (
              <FoxyVerdictHero coin={coin} analysis={analysis} />
            ) : (
              <VerdictSkeleton />
            )}
            <FoxyTradingViewCard coin={coin} />
            <FoxyDataStrip
              coin={coin}
              setups={setups}
              derivatives={derivatives}
              whales={whales}
              loading={cardsLoading}
            />
          </div>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center">
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-dim">
        Foxy AI
      </div>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-fg">
        Bir coin sor.
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        Sol panelden istediğin coin'i sor — Foxy 3 kaynaktan veri sentezi
        yapıp net bir AL / SAT / BEKLE çağrısı çıkartsın.
      </p>
    </div>
  );
}

function VerdictSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <div className="flex items-stretch">
        <div className="flex w-[140px] shrink-0 flex-col items-center justify-center gap-2 bg-bg-elev py-6">
          <div className="h-3 w-16 animate-pulse rounded bg-border" />
          <div className="h-9 w-20 animate-pulse rounded bg-border" />
        </div>
        <div className="flex-1 space-y-3 p-5">
          <div className="h-5 w-3/4 animate-pulse rounded bg-bg-elev" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-bg-elev" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-bg-elev" />
          <div className="h-3 w-3/6 animate-pulse rounded bg-bg-elev" />
        </div>
      </div>
    </section>
  );
}
