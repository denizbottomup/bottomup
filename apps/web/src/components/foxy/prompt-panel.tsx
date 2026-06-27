'use client';

import { type FormEvent } from 'react';
import type { FoxyHistoryEntry, FoxyVerdict } from './types';

const SUGGESTIONS = [
  'ETH şu an alınır mı?',
  'BTC için satış sinyali var mı?',
  'SOL balina hareketleri ne durumda?',
  'BNB için anlık yön ne?',
];

interface Props {
  prompt: string;
  setPrompt: (s: string) => void;
  onSubmit: (e: FormEvent) => void;
  loading: boolean;
  error: string | null;
  history: FoxyHistoryEntry[];
  onPickHistory: (entry: FoxyHistoryEntry) => void;
  activeHistoryId: string | null;
}

const LABEL = 'text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400';

export function FoxyPromptPanel({
  prompt,
  setPrompt,
  onSubmit,
  loading,
  error,
  history,
  onPickHistory,
  activeHistoryId,
}: Props) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white md:w-[340px] md:min-w-[340px]">
      <div className="border-b border-slate-100 p-5">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate-900">
          Foxy <span className="text-indigo-600">· AI market analyst</span>
        </div>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
          Bir coin sor. AL · SAT · BEKLE çağrısı; canlı tahta, cüzdan
          hareketleri ve borsa verisiyle birlikte.
        </p>
      </div>

      <form onSubmit={onSubmit} className="border-b border-slate-100 p-5">
        <label htmlFor="foxy-prompt" className={LABEL}>
          Sorgu
        </label>
        <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-slate-900/25 focus-within:bg-white">
          <textarea
            id="foxy-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="ETH analizi yapar mısın?"
            rows={3}
            disabled={loading}
            className="w-full resize-none bg-transparent px-4 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e as unknown as FormEvent);
              }
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? 'Analiz ediliyor…' : 'Analiz et →'}
        </button>
        {error ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
            {error}
          </div>
        ) : null}

        {history.length === 0 ? (
          <div className="mt-5">
            <div className={`${LABEL} mb-2`}>Hızlı başlangıç</div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPrompt(s)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </form>

      <div className="flex-1 overflow-y-auto p-5">
        {history.length > 0 ? (
          <>
            <div className={`${LABEL} mb-3`}>Bu oturum</div>
            <ul className="space-y-1.5">
              {history.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => onPickHistory(h)}
                    className={`group block w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                      h.id === activeHistoryId
                        ? 'border-slate-300 bg-slate-50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">
                        {h.coinDisplay ?? h.prompt}
                      </span>
                      <VerdictPill verdict={h.verdict} />
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-400">
                      {h.prompt}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="text-xs font-medium text-slate-400">
            Henüz bir analiz yok. Yukarıdan bir coin sor.
          </div>
        )}
      </div>
    </aside>
  );
}

function VerdictPill({ verdict }: { verdict: FoxyVerdict }) {
  const tone =
    verdict === 'AL'
      ? 'bg-emerald-50 text-emerald-600'
      : verdict === 'SAT'
        ? 'bg-rose-50 text-rose-600'
        : 'bg-amber-50 text-amber-700';
  return (
    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-extrabold ${tone}`}>
      {verdict}
    </span>
  );
}
