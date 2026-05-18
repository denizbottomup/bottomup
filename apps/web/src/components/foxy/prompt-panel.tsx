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
    <aside className="flex h-full w-full flex-col border-r border-border bg-bg/60 md:w-[340px] md:min-w-[340px]">
      <div className="border-b border-border p-5">
        <div className="mono-label !text-brand">Foxy · AI market analyst</div>
        <p className="mt-2 text-sm text-fg-muted">
          Bir coin sor. AL · SAT · BEKLE çağrısı, BottomUP trader'lar,
          Arkham balina akışı ve borsa verisinden çıkarılır.
        </p>
      </div>

      <form onSubmit={onSubmit} className="border-b border-border p-5">
        <label htmlFor="foxy-prompt" className="mono-label !text-fg-dim">
          Sorgu
        </label>
        <div className="mt-2 rounded-2xl border border-border bg-bg-card focus-within:border-white/25 transition">
          <textarea
            id="foxy-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="ETH analizi yapar mısın?"
            rows={3}
            disabled={loading}
            className="w-full resize-none bg-transparent px-4 py-3 text-sm text-fg placeholder-fg-dim outline-none disabled:opacity-60"
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
          className="mt-3 w-full rounded-full bg-brand px-4 py-2 text-sm font-semibold text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand/90 transition"
        >
          {loading ? 'Analiz ediliyor…' : 'Analiz et →'}
        </button>
        {error ? (
          <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/[0.06] px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        {history.length === 0 ? (
          <div className="mt-5">
            <div className="mono-label !text-fg-dim mb-2">Hızlı başlangıç</div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPrompt(s)}
                  className="rounded-full border border-border bg-bg-card px-3 py-1.5 text-xs text-fg-muted hover:border-white/25 hover:text-fg transition"
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
            <div className="mono-label !text-fg-dim mb-3">Bu oturum</div>
            <ul className="space-y-1.5">
              {history.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => onPickHistory(h)}
                    className={`group block w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                      h.id === activeHistoryId
                        ? 'border-white/25 bg-bg-elev text-fg'
                        : 'border-border bg-bg-card text-fg-muted hover:border-white/15 hover:text-fg'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">
                        {h.coinDisplay ?? h.prompt}
                      </span>
                      <VerdictPill verdict={h.verdict} small />
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-fg-dim">
                      {h.prompt}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="text-xs text-fg-dim">
            Henüz bir analiz yok. Yukarıdan bir coin sor.
          </div>
        )}
      </div>
    </aside>
  );
}

function VerdictPill({
  verdict,
  small,
}: {
  verdict: FoxyVerdict;
  small?: boolean;
}) {
  const tone =
    verdict === 'AL'
      ? 'border-mint/40 bg-mint/10 text-mint-soft'
      : verdict === 'SAT'
        ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
        : 'border-brand/40 bg-brand/10 text-brand-soft';
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 font-mono ${
        small ? 'text-[10px]' : 'text-[11px]'
      } ${tone}`}
    >
      {verdict}
    </span>
  );
}
