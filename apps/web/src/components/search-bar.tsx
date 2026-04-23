'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

interface SearchResults {
  coins: Array<{ code: string; name: string | null; image: string | null }>;
  traders: Array<{
    id: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    image: string | null;
    is_trending: boolean;
    followers: number;
  }>;
  setups: Array<{
    id: string;
    coin_name: string;
    status: string;
    position: string | null;
    trader_id: string | null;
    trader_name: string | null;
    trader_image: string | null;
    created_at: string | null;
  }>;
  tags: Array<{ tag: string; count: number }>;
}

/**
 * Keyboard-driven global search dropdown for the app shell.
 *   ⌘K / Ctrl-K focuses the input
 *   Esc blurs and closes the panel
 *   ↑ / ↓ navigate (TODO if useful — for now mouse + Enter-on-result)
 *   Enter on empty query routes to /app/feed (stay put)
 */
export function SearchBar() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // ⌘K focus
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // click-outside
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Debounced query
  useEffect(() => {
    if (q.trim().length < 1) {
      setResults(null);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const r = await api<SearchResults>(`/search?q=${encodeURIComponent(q.trim())}`);
        setResults(r);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(handle);
  }, [q]);

  const closeAndReset = useCallback(() => {
    setOpen(false);
    setQ('');
  }, []);

  const isEmpty =
    results != null &&
    results.coins.length === 0 &&
    results.traders.length === 0 &&
    results.setups.length === 0 &&
    results.tags.length === 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => q && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            (e.currentTarget as HTMLInputElement).blur();
            setOpen(false);
          }
        }}
        placeholder="Ara…  ⌘K"
        className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />

      {open && (q.trim().length > 0 || loading) ? (
        <div className="absolute left-0 right-0 top-full mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-bg-card p-2 shadow-xl ring-1 ring-black/40">
          {loading && !results ? (
            <div className="p-3 text-xs text-fg-dim">Aranıyor…</div>
          ) : isEmpty ? (
            <div className="p-3 text-xs text-fg-dim">Sonuç yok.</div>
          ) : results ? (
            <>
              {results.coins.length > 0 ? (
                <Section title="Coin">
                  {results.coins.map((c) => (
                    <Link
                      key={c.code}
                      href={`/app/coin/${encodeURIComponent(c.code)}`}
                      onClick={closeAndReset}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/5"
                    >
                      <CoinGlyph src={c.image} code={c.code} />
                      <span className="font-mono font-semibold text-fg">{c.code}</span>
                      {c.name ? <span className="text-xs text-fg-dim">{c.name}</span> : null}
                    </Link>
                  ))}
                </Section>
              ) : null}

              {results.traders.length > 0 ? (
                <Section title="Trader">
                  {results.traders.map((t) => {
                    const name =
                      t.name || [t.first_name, t.last_name].filter(Boolean).join(' ').trim() || 'Trader';
                    return (
                      <Link
                        key={t.id}
                        href={`/app/trader/${t.id}`}
                        onClick={closeAndReset}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/5"
                      >
                        <Avatar src={t.image} fallback={(name[0] ?? '?').toUpperCase()} />
                        <span className="font-medium text-fg">{name}</span>
                        {t.is_trending ? (
                          <span className="rounded bg-brand/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand">
                            Trend
                          </span>
                        ) : null}
                        <span className="ml-auto text-[11px] text-fg-dim">
                          {t.followers.toLocaleString('tr-TR')} takipçi
                        </span>
                      </Link>
                    );
                  })}
                </Section>
              ) : null}

              {results.setups.length > 0 ? (
                <Section title="Setup">
                  {results.setups.map((s) => (
                    <Link
                      key={s.id}
                      href={`/app/setup/${s.id}`}
                      onClick={closeAndReset}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/5"
                    >
                      <span className="font-mono font-semibold text-fg">{s.coin_name}</span>
                      {s.position ? (
                        <span
                          className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ${
                            s.position === 'long'
                              ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
                              : 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
                          }`}
                        >
                          {s.position}
                        </span>
                      ) : null}
                      {s.trader_name ? (
                        <span className="text-xs text-fg-dim">· {s.trader_name}</span>
                      ) : null}
                    </Link>
                  ))}
                </Section>
              ) : null}

              {results.tags.length > 0 ? (
                <Section title="Tag">
                  {results.tags.map((t) => (
                    <Link
                      key={t.tag}
                      href={`/app/tag/${encodeURIComponent(t.tag)}`}
                      onClick={closeAndReset}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/5"
                    >
                      <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[11px] text-fg">
                        #{t.tag}
                      </span>
                      <span className="ml-auto text-[11px] text-fg-dim">
                        {t.count.toLocaleString('tr-TR')} setup
                      </span>
                    </Link>
                  ))}
                </Section>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="px-2 pt-1 pb-0.5 text-[10px] uppercase tracking-wider text-fg-dim">{title}</div>
      {children}
    </div>
  );
}

function CoinGlyph({ src, code }: { src: string | null; code: string }) {
  const initial = code.slice(0, 3).toUpperCase() || '?';
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-white/10" />
  ) : (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 font-mono text-[9px] font-bold text-fg-muted">
      {initial}
    </div>
  );
}

function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-white/10" />
  ) : (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[11px] font-semibold text-fg ring-1 ring-white/10">
      {fallback}
    </div>
  );
}
