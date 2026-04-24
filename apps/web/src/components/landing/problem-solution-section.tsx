'use client';

import { useT } from '@/lib/i18n';

export function ProblemSolutionSection() {
  const { t } = useT();
  return (
    <section id="why" className="relative">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="mx-auto max-w-3xl text-center">
          <div className="mono-label">{t.ps.label}</div>
          <h2 className="mt-2 text-4xl font-extrabold tracking-[-0.02em] md:text-6xl">
            {t.ps.headline_1}{' '}
            <span className="logo-gradient">{t.ps.headline_2}</span>
          </h2>
          <p className="mt-4 text-base text-fg-muted md:text-lg">
            {t.ps.subtitle}
          </p>
        </header>

        <div className="mt-12 overflow-hidden rounded-3xl border border-border bg-bg-card/50">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="border-b border-border bg-rose-500/[0.06] px-5 py-3 md:border-b-0 md:border-r">
              <div className="mono-label !text-rose-300">{t.ps.before}</div>
            </div>
            <div className="bg-mint/[0.08] px-5 py-3">
              <div className="mono-label !text-mint">{t.ps.with}</div>
            </div>
          </div>

          {t.ps.rows.map((r, i) => (
            <div
              key={r.problem_title}
              className={`grid grid-cols-1 md:grid-cols-2 ${
                i > 0 ? 'border-t border-border' : ''
              }`}
            >
              <div className="flex gap-4 border-b border-border bg-rose-500/[0.02] p-5 md:border-b-0 md:border-r">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-lg text-rose-300 ring-1 ring-rose-500/30">
                  ✕
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-fg md:text-lg">
                    {r.problem_title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                    {r.problem_body}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 bg-mint/[0.04] p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint/15 text-lg text-mint ring-1 ring-mint/40">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-fg md:text-lg">
                    {r.solution_title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                    {r.solution_body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
