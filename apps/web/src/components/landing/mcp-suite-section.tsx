'use client';

import { useT } from '@/lib/i18n';

const MCP_ICONS = ['🛡', '⏱', '🧩', '🔬', '💎', '⚖', '⚠', '🎯', '🕵'];

/**
 * Light-theme MCP Suite section. Sandwiched between two dark sections
 * (Leaderboard above, Pulse below), the white surround turns this
 * into the second white "rest" in the section rhythm — same treatment
 * as the Hero, so the alternation reads as a deliberate cadence
 * rather than a one-off.
 */
export function McpSuiteSection() {
  const { t } = useT();
  return (
    <section
      id="mcp"
      className="relative border-y border-zinc-200 bg-zinc-50 text-zinc-900"
    >
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="flex max-w-3xl flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
              {t.mcp.label}
            </div>
            <h2 className="mt-1 text-3xl font-extrabold tracking-[-0.02em] md:text-5xl">
              <span className="logo-gradient">{t.mcp.headline_1}</span>{' '}
              {t.mcp.headline_2}
            </h2>
            <p className="mt-3 text-sm text-zinc-600 md:text-base">
              {t.mcp.subtitle}
            </p>
          </div>
          <span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[11px] text-brand">
            {t.mcp.coming_soon}
          </span>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {t.mcp.cards.map((m, i) => (
            <div
              key={m.title}
              className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(0,0,0,0.06)] transition hover:border-brand/30 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.10)]"
            >
              <div className="text-2xl">{MCP_ICONS[i] ?? '•'}</div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900">
                {m.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">
                {m.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
