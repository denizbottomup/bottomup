'use client';

import { useEffect, useState } from 'react';
import { fetchNews, type LandingPayload } from './landing-data';
import { useT } from '@/lib/i18n';

type NewsItem = LandingPayload['news'][0];

export function NewsSection({ news }: { news: LandingPayload['news'] }) {
  const { t, locale } = useT();
  const [active, setActive] = useState<NewsItem | null>(null);
  // SSR pre-renders English copy; once the client mounts we refetch in
  // the user's locale. If translations haven't been generated yet, the
  // API gracefully falls back to the English source — so the cards
  // never go blank.
  const [items, setItems] = useState<NewsItem[]>(news);

  useEffect(() => {
    let cancelled = false;
    if (locale === 'en') {
      setItems(news);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      const fresh = await fetchNews(locale, 6);
      if (!cancelled && fresh.length > 0) setItems(fresh);
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, news]);

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

  if (items.length === 0) return null;

  return (
    <section className="border-y border-border bg-bg-card/30">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mono-label">{t.news.label}</div>
            <h2 className="mt-1 text-3xl font-extrabold tracking-[-0.02em] md:text-5xl">
              {t.news.headline_1}{' '}
              <span className="logo-gradient">{t.news.headline_2}</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-fg-muted">
              {t.news.subtitle}
            </p>
          </div>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((n) => (
            <NewsCard key={n.id} n={n} onOpen={() => setActive(n)} />
          ))}
        </div>
      </div>

      {active ? (
        <NewsModal
          item={active}
          onClose={() => setActive(null)}
          noSummary={t.news.no_summary}
        />
      ) : null}
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

function NewsModal({
  item,
  onClose,
  noSummary,
}: {
  item: NewsItem;
  onClose: () => void;
  noSummary: string;
}) {
  const tone =
    item.sentiment === 'positive' || item.sentiment === 'Positive'
      ? 'bg-mint/15 text-mint ring-mint/40'
      : item.sentiment === 'negative' || item.sentiment === 'Negative'
        ? 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
        : 'bg-white/5 text-fg-muted ring-white/10';
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md md:items-center md:p-6"
      onClick={onClose}
    >
      {/* Same pattern as TraderDetailModal: scroll lives on the
          modal itself (capped to dvh), close button is in a sticky
          header so the mobile URL bar can't strand it offscreen. The
          article body is just a div now — no nested overflow-y, so
          the outer modal scrolls naturally on touch and long
          articles aren't trapped in a 60vh window. */}
      <div
        className="relative flex w-full max-w-2xl flex-col bg-bg-card shadow-2xl max-h-[100dvh] md:max-h-[90vh] md:rounded-2xl md:border md:border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-30 flex items-center justify-end border-b border-border bg-bg-card/95 px-3 py-2.5 backdrop-blur">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-lg text-fg ring-1 ring-white/10 hover:bg-black/80"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain">
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
              <div className="mt-5 whitespace-pre-line text-sm leading-relaxed text-fg-muted">
                {item.text}
              </div>
            ) : (
              <p className="mt-5 text-sm text-fg-dim">{noSummary}</p>
            )}

            {/* "Read more" exit — addresses the mobile feedback that
                short summaries felt like a teaser the user wanted to
                expand. Sends the visitor to the original article on
                the publisher's site. */}
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-card px-4 py-2 text-sm font-medium text-fg transition hover:border-white/20 hover:bg-white/[0.04]"
              >
                Read full article{item.source ? ` on ${item.source}` : ''} ↗
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
