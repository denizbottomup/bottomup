'use client';

import { useState, type FormEvent } from 'react';
import { extractCoin, coinFromSymbol, type CoinMatch } from '@/lib/coin-extract';
import { useAuth } from '@/lib/auth-context';
import { FoxyPromptPanel } from '@/components/foxy/prompt-panel';
import { FoxyBoard } from '@/components/foxy/board';
import {
  type FoxyAnalysis,
  type FoxyAssetMarket,
  type FoxyDerivatives,
  type FoxyHistoryEntry,
  type FoxyOrderBook,
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
  orderbook: FoxyOrderBook | null;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<FoxyHistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  async function runQuery(text: string, match: CoinMatch | null) {
    if (!user) return;
    setLoading(true);
    setError(null);

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
        body: JSON.stringify({ prompt: text, coin: match?.symbol ?? null }),
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

      // The backend resolves the coin against the full OKX universe.
      // Trust its answer (it knows coins the local table doesn't); fall
      // back to the local guess. If neither found a coin, say so.
      const resolved =
        (reply?.coin && coinFromSymbol(reply.coin)) || match;
      if (!resolved) {
        throw new Error(
          "Bu coini bulamadım — OKX'te işlem gören bir sembolle dene (ör. BTC, JTO, WIF).",
        );
      }

      setCoin(resolved);
      setAnalysis(verdict);
      setBoard({
        market: reply?.market ?? null,
        derivatives: reply?.derivatives ?? null,
        whales: reply?.whales ?? null,
        setups: reply?.setups ?? null,
        orderbook: reply?.orderbook ?? null,
      });

      const entry: FoxyHistoryEntry = {
        id: crypto.randomUUID(),
        prompt: text,
        coinSymbol: resolved.symbol,
        coinDisplay: resolved.display,
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
    // No client-side gate: a local match (when we have one) just gives an
    // instant header + hint; otherwise the backend resolves the coin from
    // the prompt against the full OKX universe.
    const match = extractCoin(text);
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
    const match = extractCoin(entry.prompt);
    setPrompt('');
    setError(null);
    setCoin(match);
    setAnalysis(null);
    setBoard(null);
    setActiveHistoryId(entry.id);
    void runQuery(entry.prompt, match);
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50 md:flex-row">
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

      <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-7">
        {coin && analysis ? (
          <FoxyBoard
            coin={coin}
            analysis={analysis}
            market={board?.market ?? null}
            derivatives={board?.derivatives ?? null}
            whales={board?.whales ?? null}
            setups={board?.setups ?? null}
            orderbook={board?.orderbook ?? null}
          />
        ) : loading ? (
          <div className="mx-auto max-w-[920px]">
            <VerdictSkeleton />
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
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
        Foxy AI
      </div>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
        Bir coin sor.
      </h1>
      <p className="mt-2 text-sm font-medium text-slate-500">
        Sol panelden istediğin coin&apos;i sor — Foxy net bir AL / SAT / BEKLE
        çağrısı verir, altında fiyat, türev verisi, canlı tahta, cüzdan
        hareketleri ve trader pozisyonlarını gösterir.
      </p>
    </div>
  );
}

function VerdictSkeleton() {
  return (
    <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
      <div className="space-y-3 p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-24 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-20 w-full animate-pulse rounded-2xl bg-slate-50" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-4/6 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-3/6 animate-pulse rounded bg-slate-100" />
      </div>
    </section>
  );
}
