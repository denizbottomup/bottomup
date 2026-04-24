'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface NewsRow {
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

export default function NewsDetailPage() {
  const params = useParams<{ newsId: string }>();
  const newsId = params?.newsId;
  const [row, setRow] = useState<NewsRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!newsId) return;
    let alive = true;
    api<NewsRow>(`/feed/news/${newsId}`)
      .then((r) => alive && setRow(r))
      .catch((x) => {
        if (!alive) return;
        setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
      });
    return () => {
      alive = false;
    };
  }, [newsId]);

  if (err) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <BackLink />
        <p className="mt-4 text-sm text-rose-300">Haber yüklenemedi: {err}</p>
      </div>
    );
  }
  if (!row) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <BackLink />
        <div className="mt-4 h-48 animate-pulse rounded-2xl bg-white/[0.02]" />
      </div>
    );
  }

  const tone =
    row.sentiment === 'positive'
      ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
      : row.sentiment === 'negative'
        ? 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
        : 'bg-white/5 text-fg-muted ring-white/10';

  return (
    <article className="mx-auto max-w-3xl px-6 py-6">
      <BackLink />
      {row.image_url ? (
        <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={row.image_url}
            alt=""
            className="max-h-96 w-full object-cover"
          />
        </div>
      ) : null}
      <h1 className="mt-4 text-2xl font-semibold leading-tight text-fg">
        {row.title ?? '—'}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
        {row.source_name ? <span>{row.source_name}</span> : null}
        {row.date ? (
          <span>· {new Date(row.date).toLocaleString('tr-TR')}</span>
        ) : null}
        {row.sentiment ? (
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] uppercase ring-1 ${tone}`}>
            {row.sentiment}
          </span>
        ) : null}
      </div>

      {row.tickers && row.tickers.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {row.tickers.map((t) => (
            <Link
              key={t}
              href={`/app/coin/${t}`}
              className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[11px] text-fg-muted ring-1 ring-white/10 hover:text-fg"
            >
              {t}
            </Link>
          ))}
        </div>
      ) : null}

      {row.text ? (
        <div className="mt-5 space-y-3 text-sm leading-relaxed text-fg whitespace-pre-line">
          {row.text}
        </div>
      ) : null}

      {row.news_url ? (
        <a
          href={row.news_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-1 rounded-md bg-brand/15 px-3 py-1.5 text-xs text-brand ring-1 ring-brand/30 hover:bg-brand/20"
        >
          Kaynaktan oku →
        </a>
      ) : null}
    </article>
  );
}

function BackLink() {
  return (
    <Link href="/app/news" className="text-xs text-fg-muted hover:text-fg">
      ← Haberler
    </Link>
  );
}
