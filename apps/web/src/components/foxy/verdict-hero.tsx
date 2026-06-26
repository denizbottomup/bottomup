'use client';

import type { CoinMatch } from '@/lib/coin-extract';
import type { FoxyAnalysis, FoxyVerdict } from './types';

interface Props {
  coin: CoinMatch;
  analysis: FoxyAnalysis;
}

/**
 * Hero card at the top of the result column. Big AL / SAT / BEKLE
 * badge + headline; bullet list of analyst-voice reasons; single-line
 * invalidation footer. No raw confluence scores — every reason must
 * read like a desk-analyst observation.
 */
export function FoxyVerdictHero({ coin, analysis }: Props) {
  const palette = paletteFor(analysis.verdict);

  return (
    <section
      className={`rounded-2xl border ${palette.border} bg-bg-card overflow-hidden`}
    >
      <div className="flex items-stretch">
        <div
          className={`flex w-[140px] shrink-0 flex-col items-center justify-center gap-1 ${palette.heroBg} py-6`}
        >
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-dim">
            Foxy çağrısı
          </div>
          <div className={`text-4xl font-black tracking-tight ${palette.heroFg}`}>
            {analysis.verdict}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-dim">
            {coin.symbol}/USDT
          </div>
        </div>

        <div className="flex-1 p-5">
          <h2 className="text-lg font-semibold leading-snug text-fg md:text-xl">
            {analysis.headline}
          </h2>

          {analysis.takeaway ? (
            <div
              className={`mt-4 rounded-xl border ${palette.border} ${palette.heroBg} px-4 py-3`}
            >
              <div className="mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-dim">
                <span aria-hidden>🦊</span> Senin için
              </div>
              <p className="text-sm font-medium leading-relaxed text-fg">
                {analysis.takeaway}
              </p>
            </div>
          ) : null}

          {analysis.reasons.length > 0 ? (
            <ul className="mt-4 space-y-2.5">
              {analysis.reasons.map((r, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-fg">
                  <span className={`mt-1 inline-block size-1.5 shrink-0 rounded-full ${palette.bullet}`} />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-fg-muted">
              Şu an net bir sebep dizisi çıkaramadık — bağlam verisi yetersiz.
            </p>
          )}

          {analysis.invalidation ? (
            <div className="mt-4 rounded-xl border border-border bg-bg-elev px-3 py-2.5 text-xs leading-relaxed text-fg-muted">
              <span className="mono-label !text-fg-dim">Ne zaman fikrim değişir</span>
              <span className="ml-2 text-fg">{analysis.invalidation}</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function paletteFor(v: FoxyVerdict): {
  border: string;
  heroBg: string;
  heroFg: string;
  bullet: string;
} {
  if (v === 'AL') {
    return {
      border: 'border-mint/30',
      heroBg: 'bg-mint/[0.08]',
      heroFg: 'text-mint-soft',
      bullet: 'bg-mint',
    };
  }
  if (v === 'SAT') {
    return {
      border: 'border-rose-400/30',
      heroBg: 'bg-rose-500/[0.07]',
      heroFg: 'text-rose-200',
      bullet: 'bg-rose-400',
    };
  }
  return {
    border: 'border-brand/25',
    heroBg: 'bg-brand/[0.07]',
    heroFg: 'text-brand-soft',
    bullet: 'bg-brand',
  };
}
