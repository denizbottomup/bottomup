'use client';

import { useState, type FormEvent } from 'react';
import { extractCoin, type CoinMatch } from '@/lib/coin-extract';
import { useAuth } from '@/lib/auth-context';
import { FoxyPromptPanel } from '@/components/foxy/prompt-panel';
import { FoxyVerdictHero } from '@/components/foxy/verdict-hero';
import { FoxyTradingViewCard } from '@/components/foxy/tradingview-card';
import { FoxyDataStrip } from '@/components/foxy/data-strip';
import { FoxyTradesTable } from '@/components/foxy/trades-table';
import {
  type FoxyAnalysis,
  type FoxyAssetMarket,
  type FoxyDerivatives,
  type FoxyHistoryEntry,
  type FoxyQueryReply,
  type FoxySetupsByCoin,
  type FoxyWhales,
} from '@/components/foxy/types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

/** The supporting data the AI model reasoned over, surfaced as panels. */
interface BoardData {
  market: FoxyAssetMarket | null;
  derivatives: FoxyDerivatives | null;
  whales: FoxyWhales | null;
  setups: FoxySetupsByCoin | null;
}

/**
 * Foxy — the single post-login surface. The user writes a prompt and
 * gets a full decision board for that coin: our AI model's AL / SAT /
 * BEKLE call up top, then the live data behind it — price, derivatives,
 * whale flow, and what BottomUP traders are doing. The clean prompt is
 * the entry; the answer is data-dense by design.
 */
export default function FoxyPage() {
  const { user, getIdToken } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [coin, setCoin] = useState<CoinMatch | null>(null);
  const [analysis, setAnalysis] = useState<FoxyAnalysis | null>(null);
  const [board, setBoard] = useState<BoardData | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<FoxyHistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  // Last query so the data panels can re-fetch without retyping.
  const [lastQuery, setLastQuery] = useState<{
    text: string;
    match: CoinMatch;
  } | null>(null);

  async function runQuery(text: string, match: CoinMatch) {
    if (!user) return;
    setLoading(true);
    setError(null);
    setLastQuery({ text, match });

    const token = await getIdToken();
    if (!token) {
      setError('Oturum açılamadı — sayfayı yenile.');
      setLoading(false);
      return;
    }
    const auth = { Authorization: `Bearer ${token}` };

    try {
      const r = await fetch(`${API_BASE}/me/foxy/query`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, coin: match.symbol }),
      });

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

      const reply = (await r.json()) as Partial<FoxyQueryReply> & {
        // Legacy `{ reply: "..." }` shape — kept so the UI doesn't crash
        // against a backend that hasn't redeployed yet.
        reply?: string;
      };

      const verdict: FoxyAnalysis =
        reply?.analysis && typeof reply.analysis === 'object'
          ? reply.analysis
          : {
              verdict: 'BEKLE',
              headline: (reply?.reply ?? '').trim()
                ? 'Foxy yorumu (eski format)'
                : 'Foxy yapılandırılmış cevap döndüremedi.',
              reasons: (reply?.reply ?? '').trim()
                ? [(reply?.reply ?? '').trim()]
                : [],
              invalidation: '',
            };

      setAnalysis(verdict);
      setBoard({
        market: reply?.market ?? null,
        derivatives: reply?.derivatives ?? null,
        whales: reply?.whales ?? null,
        setups: reply?.setups ?? null,
      });
      setUpdatedAt(Date.now());

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
    setBoard(null);
    setActiveHistoryId(null);
    void runQuery(text, match);
  }

  function handlePickHistory(entry: FoxyHistoryEntry) {
    // Re-run the same prompt — cheaper than persisting the full payload
    // and keeps history-from-history coherent with backend state.
    if (!entry.coinSymbol) return;
    const match = extractCoin(entry.prompt);
    if (!match) return;
    setPrompt('');
    setError(null);
    setCoin(match);
    setAnalysis(null);
    setBoard(null);
    setActiveHistoryId(entry.id);
    void runQuery(entry.prompt, match);
  }

  function handleRefresh() {
    if (loading || !lastQuery) return;
    void runQuery(lastQuery.text, lastQuery.match);
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
          <div className="mx-auto flex max-w-[860px] flex-col gap-4">
            {analysis ? (
              <>
                <FoxyVerdictHero coin={coin} analysis={analysis} />
                <FoxyDataStrip
                  coin={coin}
                  setups={board?.setups ?? null}
                  derivatives={board?.derivatives ?? null}
                  whales={board?.whales ?? null}
                  loading={loading}
                />
                <FoxyTradingViewCard coin={coin} />
                <FoxyTradesTable
                  coin={coin}
                  setups={board?.setups ?? null}
                  loading={loading}
                  updatedAt={updatedAt}
                  refreshing={loading}
                  onRefresh={handleRefresh}
                />
              </>
            ) : (
              <VerdictSkeleton />
            )}
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
        Sol panelden istediğin coin&apos;i sor — Foxy net bir AL / SAT / BEKLE
        çağrısı verir, altında fiyat, türev verisi, balina akışı ve trader
        pozisyonlarını gösterir.
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
