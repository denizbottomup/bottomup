'use client';

import { useEffect, useState } from 'react';
import type { LandingPayload } from './landing-data';

type NewsItem = LandingPayload['news'][0];

export function NewsSection({ news }: { news: LandingPayload['news'] }) {
  const [active, setActive] = useState<NewsItem | null>(null);

  useEffect(() => {
    if (!active) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [active]);

  if (news.length === 0) return null;

  return (
    <section className="border-y border-border bg-bg-card/30">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mono-label">News feed</div>
            <h2 className="mt-1 text-3xl font-extrabold tracking-[-0.02em] md:text-5xl">
              Crypto news, tagged with{' '}
              <span className="logo-gradient">sentiment.</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-fg-muted">
              Every story labelled positive / negative and linked to the coins
              it moves. Open any item right here — no new tab, no
              context-switch.
            </p>
          </div>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {news.slice(0, 6).map((n) => (
            <NewsCard key={n.id} n={n} onOpen={() => setActive(n)} />
          ))}
        </div>
      </div>

      {active ? <NewsModal item={active} onClose={() => setActive(null)} /> : null}
    </section>
  );
}

function NewsCard({
  n,
  onOpen,
}: {
  n: NewsItem;
  onOpen: () => void;
}) {
  const tone =
    n.sentiment === 'positive' || n.sentiment === 'Positive'
      ? 'bg-mint/15 text-mint ring-mint/40'
      : n.sentiment === 'negative' || n.sentiment === 'Negative'
        ? 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
        : 'bg-white/5 text-fg-muted ring-white/10';
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-bg-card text-left transition hover:border-white/20"
    >
      {n.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={n.image}
          alt=""
          className="h-36 w-full object-cover transition group-hover:scale-[1.02]"
        />
      ) : (
        <div className="h-36 w-full bg-gradient-to-br from-white/5 to-transparent" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-dim">
          {n.source ? <span>{n.source}</span> : null}
          {n.date ? (
            <span>
              · {new Date(n.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
            </span>
          ) : null}
          {n.sentiment ? (
            <span className={`rounded-md px-1.5 py-0.5 ring-1 ${tone}`}>
              {n.sentiment}
            </span>
          ) : null}
        </div>
        <h3 className="line-clamp-3 flex-1 text-sm font-semibold leading-snug text-fg">
          {n.title ?? '—'}
        </h3>
        {n.tickers.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {n.tickers.slice(0, 4).map((t) => (
              <span
                key={t}
                className="rounded-full bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-fg-muted ring-1 ring-white/10"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </button>
  );
}

function NewsModal({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  const tone =
    item.sentiment === 'positive' || item.sentiment === 'Positive'
      ? 'bg-mint/15 text-mint ring-mint/40'
      : item.sentiment === 'negative' || item.sentiment === 'Negative'
        ? 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
        : 'bg-white/5 text-fg-muted ring-white/10';
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/80 backdrop-blur-md md:items-center"
      onClick={onClose}
    >
      <div
        className="relative my-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-fg ring-1 ring-white/10 backdrop-blur hover:bg-black/80"
          aria-label="Close"
        >
          ×
        </button>

        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            className="max-h-80 w-full object-cover"
          />
        ) : null}

        <div className="p-6">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-dim">
            {item.source ? <span>{item.source}</span> : null}
            {item.date ? (
              <span>
                ·{' '}
                {new Date(item.date).toLocaleString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            ) : null}
            {item.sentiment ? (
              <span className={`rounded-md px-1.5 py-0.5 ring-1 ${tone}`}>
                {item.sentiment}
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 text-2xl font-extrabold leading-tight tracking-[-0.01em] text-fg md:text-3xl">
            {item.title ?? '—'}
          </h3>

          {item.tickers.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tickers.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] text-fg-muted ring-1 ring-white/10"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          {item.text ? (
            <div className="mt-5 max-h-80 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-fg-muted">
              {item.text}
            </div>
          ) : (
            <p className="mt-5 text-sm text-fg-dim">
              No additional summary available for this article.
            </p>
          )}

          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-white/5 px-3 py-1.5 text-xs text-fg-muted ring-1 ring-white/10 hover:text-fg"
            >
              Read the full article at the source ↗
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
