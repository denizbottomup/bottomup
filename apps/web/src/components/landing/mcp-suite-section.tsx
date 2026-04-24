'use client';

import { useT } from '@/lib/i18n';

const MCP_ICONS = ['🛡', '⏱', '🧩', '🔬', '💎', '⚖', '⚠', '🎯', '🕵'];

export function McpSuiteSection() {
  const { t } = useT();
  return (
    <section id="mcp" className="relative">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
            {t.mcp.label}
          </div>
          <h2 className="mt-1 text-3xl font-extrabold tracking-[-0.02em] md:text-5xl">
            <span className="logo-gradient">{t.mcp.headline_1}</span>{' '}
            {t.mcp.headline_2}
          </h2>
          <p className="mt-3 text-sm text-fg-muted md:text-base">
            {t.mcp.subtitle}
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {t.mcp.cards.map((m, i) => (
            <div
              key={m.title}
              className="flex flex-col rounded-2xl border border-border bg-bg-card p-5 transition hover:border-brand/30"
            >
              <div className="text-2xl">{MCP_ICONS[i] ?? '•'}</div>
              <h3 className="mt-4 text-base font-semibold text-fg">{m.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                {m.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
