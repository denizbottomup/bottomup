'use client';

import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface NewsItem {
  id: string;
  title: string | null;
  text: string | null;
  source_name: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  news_url: string | null;
  date: string | null;
  sentiment: string | null;
  tickers: string[];
  topics: string[];
}

interface CalendarItem {
  id: string;
  date: string | null;
  time: string | null;
  impact: string | null;
  title: string | null;
  source: string | null;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  description: string | null;
}

type Tab = 'news' | 'calendar';

export default function NewsPage() {
  const [tab, setTab] = useState<Tab>('news');
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [cal, setCal] = useState<CalendarItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api<{ items: NewsItem[] }>('/feed/news?limit=80'),
      api<{ items: CalendarItem[] }>('/feed/calendar?interval=week&limit=200'),
    ])
      .then(([n, c]) => {
        if (!alive) return;
        setNews(n.items);
        setCal(c.items);
      })
      .catch((x) => {
        if (!alive) return;
        const msg = x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message;
        setErr(msg);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="flex items-center gap-2">
        <TabButton active={tab === 'news'} onClick={() => setTab('news')} label="Haberler" count={news?.length ?? null} />
        <TabButton active={tab === 'calendar'} onClick={() => setTab('calendar')} label="Takvim" count={cal?.length ?? null} />
      </div>

      <div className="mt-5">
        {err ? (
          <EmptyState title="Yüklenemedi" hint={err} />
        ) : tab === 'news' ? (
          news == null ? (
            <SkeletonCards />
          ) : news.length === 0 ? (
            <EmptyState title="Haber yok" />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {news.map((n) => (
                <NewsCard key={n.id} n={n} />
              ))}
            </div>
          )
        ) : cal == null ? (
          <SkeletonList />
        ) : cal.length === 0 ? (
          <EmptyState title="Takvimde önümüzdeki hafta için olay yok" />
        ) : (
          <CalendarList items={cal} />
        )}
      </div>
    </div>
  );
}

function NewsCard({ n }: { n: NewsItem }) {
  const img = n.thumbnail_url || n.image_url;
  const sentimentTone =
    n.sentiment === 'positive' || n.sentiment === 'Positive'
      ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
      : n.sentiment === 'negative' || n.sentiment === 'Negative'
        ? 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
        : 'bg-white/5 text-fg-muted ring-white/10';

  const href = n.news_url ?? '#';
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition hover:border-white/20"
    >
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt=""
          className="h-40 w-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="h-40 w-full bg-gradient-to-br from-white/5 to-transparent" />
      )}
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-fg-dim">
          {n.source_name ? <span>{n.source_name}</span> : null}
          {n.date ? <span>· {formatAgo(n.date)}</span> : null}
          {n.sentiment ? (
            <span className={`rounded-md px-1.5 py-0.5 ring-1 ${sentimentTone}`}>{n.sentiment}</span>
          ) : null}
        </div>
        <h3 className="mt-2 line-clamp-3 text-sm font-semibold leading-snug text-fg group-hover:text-brand">
          {n.title ?? 'Başlıksız'}
        </h3>
        {n.text ? (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-fg-muted">{n.text}</p>
        ) : null}
        {n.tickers?.length ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {n.tickers.slice(0, 6).map((t) => (
              <span
                key={t}
                className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted ring-1 ring-white/10"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </a>
  );
}

function CalendarList({ items }: { items: CalendarItem[] }) {
  const byDate = new Map<string, CalendarItem[]>();
  for (const it of items) {
    const key = it.date ? it.date.slice(0, 10) : 'unknown';
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(it);
  }

  return (
    <div className="flex flex-col gap-5">
      {[...byDate.entries()].map(([day, events]) => (
        <section key={day}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            {formatDayHeader(day)}
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {events.map((e) => (
              <CalendarRow key={e.id} e={e} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function CalendarRow({ e }: { e: CalendarItem }) {
  const impactTone =
    e.impact?.toLowerCase() === 'high'
      ? 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
      : e.impact?.toLowerCase() === 'medium'
        ? 'bg-amber-300/10 text-amber-200 ring-amber-300/30'
        : e.impact?.toLowerCase() === 'low'
          ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
          : 'bg-white/5 text-fg-muted ring-white/10';

  return (
    <li className="grid grid-cols-[60px_auto_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
      <span className="font-mono text-xs text-fg-muted">{e.time ?? '—'}</span>
      <span
        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${impactTone}`}
      >
        {e.impact ?? '—'}
      </span>
      <div className="min-w-0">
        <div className="font-medium text-fg">{e.title ?? 'Bilinmiyor'}</div>
        {e.description ? (
          <div className="mt-0.5 line-clamp-2 text-xs text-fg-dim">{e.description}</div>
        ) : null}
      </div>
      <div className="flex flex-col items-end gap-0.5 font-mono text-[10px] text-fg-dim">
        {e.actual ? <span>A: {e.actual}</span> : null}
        {e.forecast ? <span>F: {e.forecast}</span> : null}
        {e.previous ? <span>P: {e.previous}</span> : null}
      </div>
    </li>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number | null;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-white/5 text-fg ring-1 ring-white/10' : 'text-fg-muted hover:text-fg'
      }`}
    >
      <span>{label}</span>
      {count != null ? (
        <span
          className={`ml-2 rounded-md px-1.5 py-0.5 font-mono text-[10px] ring-1 ${
            active ? 'bg-brand/15 text-brand ring-brand/30' : 'bg-white/5 text-fg-dim ring-white/10'
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
      ))}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
      ))}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
      <div className="text-base font-medium text-fg">{title}</div>
      {hint ? <div className="mt-1 text-sm text-fg-muted">{hint}</div> : null}
    </div>
  );
}

function formatAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diffS = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (diffS < 60) return `${diffS}s`;
  const m = Math.round(diffS / 60);
  if (m < 60) return `${m}dk`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}sa`;
  const d = Math.round(h / 24);
  return `${d}g`;
}

function formatDayHeader(iso: string): string {
  if (iso === 'unknown') return 'Tarihsiz';
  const d = new Date(`${iso}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return iso;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffD = Math.round((d.getTime() - today.getTime()) / (24 * 3600 * 1000));
  const tr = d.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  if (diffD === 0) return `Bugün · ${tr}`;
  if (diffD === 1) return `Yarın · ${tr}`;
  if (diffD === -1) return `Dün · ${tr}`;
  return tr;
}
