'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

/**
 * Live Macro — finansla ilgili kim canlıdaysa, kullanıcı arar, izler,
 * kendi dilinde simültane çeviri görür.
 *
 *   1. Kullanıcı arama kutusuna sorgu yazar (powell, fomc, lagarde,
 *      bitcoin trading live, fed kashkari, ...).
 *   2. Backend YouTube Data API v3'te `eventType=live` aramasını yapar.
 *   3. Kullanıcı bir kanal seçer; sayfa hemen sunucuya bir SSE bağlantısı
 *      açar (`/me/livecast/stream/:videoId?lang=…`). Sunucu yt-dlp +
 *      ffmpeg ile yayını yakalar, 8 saniyelik ses bloklarını Whisper'a,
 *      transkripti Claude'a yollayıp orijinal + çeviriyi event olarak
 *      döner. Hiçbir tarayıcı sekme paylaşımı, hiçbir izin penceresi
 *      yok — tüm yakalama sunucuda.
 */

interface SearchHit {
  video_id: string;
  embed_url: string;
  title: string;
  channel: string;
  channel_url: string | null;
  thumbnail: string | null;
  is_live: boolean;
  viewers: number | null;
  started_at: string | null;
}

interface TranscriptLine {
  id: string;
  original: string;
  translated: string;
  ts: string;
}

const SUPPORTED_TARGETS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh-Hans', label: '中文' },
  { code: 'ko', label: '한국어' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'id', label: 'Bahasa Indonesia' },
];

const QUICK_QUERIES = [
  'powell',
  'fomc',
  'ecb lagarde',
  'bloomberg',
  'cnbc',
  'bitcoin live',
  'reuters',
];

type StreamState =
  | 'idle'
  | 'connecting'
  | 'streaming'
  | 'error'
  | 'unavailable';

export default function LiveMacroPage() {
  const { user, getIdToken } = useAuth();
  const [targetLang, setTargetLang] = useState<string>('tr');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(true);
  const [streamReady, setStreamReady] = useState(false);
  const [selected, setSelected] = useState<SearchHit | null>(null);

  const [streamState, setStreamState] = useState<StreamState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Bootstrap: pull config + remember language.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fromUserLang = window.localStorage.getItem('liveMacro.lang');
    if (fromUserLang) setTargetLang(fromUserLang);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const t = await getIdToken();
        if (!t) return;
        const res = await fetch(`${API_BASE}/me/livecast/config`, {
          headers: { Authorization: `Bearer ${t}` },
          cache: 'no-store',
        });
        if (!res.ok) return;
        const j = (await res.json()) as {
          stream_enabled?: boolean;
          search_enabled?: boolean;
        };
        if (alive) {
          setStreamReady(!!j.stream_enabled);
          setSearchEnabled(j.search_enabled !== false);
        }
      } catch {
        // Best-effort probe.
      }
    })();
    return () => {
      alive = false;
    };
  }, [getIdToken]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines.length]);

  // Open / re-open the SSE connection whenever the selected channel or
  // target language changes. Closing & reopening on lang change is fine —
  // the server caches per-stream transcripts so a re-subscribe immediately
  // gets the recent context translated into the new language.
  useEffect(() => {
    if (!selected) return;
    if (!streamReady) {
      setStreamState('unavailable');
      return;
    }

    let cancelled = false;
    setStreamState('connecting');
    setErrorMsg(null);
    setLines([]);

    (async () => {
      const token = await getIdToken();
      if (cancelled) return;
      if (!token) {
        setStreamState('error');
        setErrorMsg('Oturum bulunamadı, sayfayı yenile.');
        return;
      }
      const url = new URL(
        `${API_BASE}/me/livecast/stream/${encodeURIComponent(
          selected.video_id,
        )}`,
      );
      url.searchParams.set('lang', targetLang);
      url.searchParams.set('token', token);

      const es = new EventSource(url.toString());
      esRef.current = es;

      es.addEventListener('ready', () => {
        if (cancelled) return;
        setStreamState('streaming');
      });
      es.addEventListener('chunk', (ev) => {
        if (cancelled) return;
        try {
          const data = JSON.parse((ev as MessageEvent).data) as {
            ts: string;
            original: string;
            translated: string;
          };
          if (!data.original) return;
          setLines((prev) => [
            ...prev,
            {
              id: `${data.ts}-${Math.random().toString(36).slice(2, 8)}`,
              original: data.original,
              translated: data.translated,
              ts: data.ts,
            },
          ]);
        } catch {
          /* malformed event — skip */
        }
      });
      es.addEventListener('error', () => {
        if (cancelled) return;
        // EventSource fires `error` both for transient drops (it'll
        // reconnect on its own) and final closes. Surface it once.
        if (es.readyState === EventSource.CLOSED) {
          setStreamState('error');
          setErrorMsg(
            'Yayın akışı kapandı. Yayın sona ermiş olabilir veya sunucuya ulaşılamıyor.',
          );
        }
      });
    })();

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
    };
  }, [selected?.video_id, targetLang, streamReady, getIdToken]);

  const updateLang = (code: string) => {
    setTargetLang(code);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('liveMacro.lang', code);
    }
  };

  const runSearch = async (q: string) => {
    setSearching(true);
    setQuery(q);
    try {
      const t = await getIdToken();
      if (!t) {
        setResults([]);
        return;
      }
      const url = new URL(`${API_BASE}/me/livecast/search`);
      url.searchParams.set('q', q);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${t}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        setResults([]);
        return;
      }
      const json = (await res.json()) as { items?: SearchHit[] };
      setResults(json.items ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const onSelect = (hit: SearchHit) => {
    setSelected(hit);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border px-4 py-4 md:px-8 md:py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="mono-label !text-brand">Live Macro · canlı yayın çevirisi</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
              Powell, Lagarde, Bloomberg.{' '}
              <span className="logo-gradient">Sen ara, sen oku.</span>
            </h1>
          </div>
          <LangPicker value={targetLang} onChange={updateLang} />
        </div>
        <p className="mt-1 max-w-3xl text-sm text-fg-muted">
          Kim şu an konuşuyor? Ara, izle, kendi dilinde simültane çeviriyi
          aşağıdaki panelden oku. Yayını yakalama, transkripsiyon ve çeviri
          tamamen sunucuda — tarayıcı izin penceresi açılmaz.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-6xl space-y-5">
          <SearchBar
            value={query}
            onSubmit={(q) => runSearch(q.trim())}
            searching={searching}
            searchEnabled={searchEnabled}
          />

          {results !== null ? (
            <ResultsGrid
              hits={results}
              selectedId={selected?.video_id ?? null}
              onSelect={onSelect}
            />
          ) : (
            <EmptyState
              searchEnabled={searchEnabled}
              quickQueries={QUICK_QUERIES}
              onPick={(q) => runSearch(q)}
            />
          )}

          {selected ? (
            <PlayerSection
              hit={selected}
              targetLang={targetLang}
              streamReady={streamReady}
              streamState={streamState}
              errorMsg={errorMsg}
              lines={lines}
              transcriptEndRef={transcriptEndRef}
            />
          ) : null}

          {user ? null : (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/[0.06] p-4 text-sm text-rose-200">
              Yayını izlemek için giriş yapman gerekiyor.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchBar({
  value,
  onSubmit,
  searching,
  searchEnabled,
}: {
  value: string;
  onSubmit: (q: string) => void;
  searching: boolean;
  searchEnabled: boolean;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (local.trim()) onSubmit(local.trim());
      }}
      className="rounded-2xl border border-border bg-bg-card p-4"
    >
      <div className="flex items-center gap-2">
        <span className="text-fg-dim" aria-hidden>
          🔎
        </span>
        <input
          autoFocus
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder="powell · fomc · lagarde · bloomberg · bitcoin live …"
          className="flex-1 bg-transparent text-fg outline-none placeholder:text-fg-dim"
        />
        <button
          type="submit"
          disabled={!local.trim() || searching}
          className="rounded-full bg-brand px-3 py-1.5 text-[11px] font-semibold text-bg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {searching ? 'arıyor…' : 'ara'}
        </button>
      </div>
      {!searchEnabled ? (
        <div className="mt-2 text-[11px] text-amber-300">
          YouTube Data API key sunucuda set edilmemiş — şimdilik küratör
          finans kanal listesi üzerinde isim eşleşmesi yapılır.
        </div>
      ) : null}
    </form>
  );
}

function EmptyState({
  searchEnabled,
  quickQueries,
  onPick,
}: {
  searchEnabled: boolean;
  quickQueries: string[];
  onPick: (q: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-bg/40 p-8 text-center">
      <div className="mono-label !text-fg-dim">Bir şey ara</div>
      <p className="mx-auto mt-2 max-w-xl text-sm text-fg-muted">
        Bir merkez bankacısı, bir Bloomberg yayını, bir trader — kim canlıysa
        onu bul, izle, kendi dilinde oku.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {quickQueries.map((q) => (
          <button
            key={q}
            onClick={() => onPick(q)}
            className="rounded-full border border-white/10 bg-bg-card px-3 py-1 text-[11px] text-fg-muted hover:border-white/30 hover:text-fg transition"
          >
            {q}
          </button>
        ))}
      </div>
      {!searchEnabled ? (
        <div className="mt-4 text-[10px] text-fg-dim">
          (YouTube key'i Railway env'e eklenince gerçek canlı arama aktif olur.)
        </div>
      ) : null}
    </div>
  );
}

function ResultsGrid({
  hits,
  selectedId,
  onSelect,
}: {
  hits: SearchHit[];
  selectedId: string | null;
  onSelect: (h: SearchHit) => void;
}) {
  if (hits.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
        Eşleşen canlı yayın bulunamadı. Sorguyu değiştirip tekrar dene.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {hits.map((h) => (
        <ResultCard
          key={h.video_id || h.channel}
          hit={h}
          active={h.video_id === selectedId}
          onClick={() => onSelect(h)}
        />
      ))}
    </div>
  );
}

function ResultCard({
  hit,
  active,
  onClick,
}: {
  hit: SearchHit;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border bg-bg-card text-left transition ${
        active
          ? 'border-brand/60 shadow-[0_0_18px_-8px_rgba(255,140,32,0.5)]'
          : 'border-border hover:border-white/25'
      }`}
    >
      <div className="aspect-video w-full bg-black">
        {hit.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hit.thumbnail}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-fg-dim">
            önizleme yok
          </div>
        )}
        {hit.is_live ? (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            CANLI
          </span>
        ) : (
          <span className="absolute left-2 top-2 rounded-full bg-bg/70 px-2 py-0.5 text-[10px] uppercase text-fg-dim ring-1 ring-white/10">
            şu an canlı değil
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="line-clamp-2 text-sm font-semibold text-fg">
          {hit.title || hit.channel}
        </div>
        <div className="mt-1 text-[11px] text-fg-dim">{hit.channel}</div>
      </div>
    </button>
  );
}

function PlayerSection({
  hit,
  targetLang,
  streamReady,
  streamState,
  errorMsg,
  lines,
  transcriptEndRef,
}: {
  hit: SearchHit;
  targetLang: string;
  streamReady: boolean;
  streamState: StreamState;
  errorMsg: string | null;
  lines: TranscriptLine[];
  transcriptEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  const embedSrc = (() => {
    try {
      const u = new URL(hit.embed_url);
      u.searchParams.set('autoplay', '1');
      u.searchParams.set('cc_load_policy', '1');
      u.searchParams.set('cc_lang_pref', targetLang);
      u.searchParams.set('hl', targetLang);
      u.searchParams.set('modestbranding', '1');
      return u.toString();
    } catch {
      return hit.embed_url;
    }
  })();

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {/* Player */}
      <div className="overflow-hidden rounded-2xl border border-border bg-bg-card">
        <div className="aspect-video w-full bg-black">
          <iframe
            key={`${hit.video_id}-${targetLang}`}
            src={embedSrc}
            title={hit.title || hit.channel}
            allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-[11px] text-fg-dim">
          <div className="flex items-center gap-2">
            {hit.is_live ? (
              <>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                <span>canlı</span>
              </>
            ) : (
              <span className="text-amber-300">canlı değil — son yayın</span>
            )}
            <span className="text-fg-dim">·</span>
            <span>{hit.channel}</span>
          </div>
          <div>
            hedef dil: <span className="text-fg">{labelOfLang(targetLang)}</span>
          </div>
        </div>
      </div>

      {/* Transcript pane (always visible — no permissions, no buttons) */}
      <TranscriptPanel
        streamReady={streamReady}
        streamState={streamState}
        errorMsg={errorMsg}
        lines={lines}
        targetLang={targetLang}
        transcriptEndRef={transcriptEndRef}
      />
    </section>
  );
}

function TranscriptPanel({
  streamReady,
  streamState,
  errorMsg,
  lines,
  targetLang,
  transcriptEndRef,
}: {
  streamReady: boolean;
  streamState: StreamState;
  errorMsg: string | null;
  lines: TranscriptLine[];
  targetLang: string;
  transcriptEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex h-full max-h-[calc(100vh-12rem)] flex-col rounded-2xl border border-border bg-bg-card overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <div className="mono-label !text-brand">Simültane çeviri</div>
          <div className="mt-0.5 text-[11px] text-fg-dim">
            Whisper · Claude · {labelOfLang(targetLang)} · 8 saniyelik bloklarla
          </div>
        </div>
        <StreamBadge state={streamState} streamReady={streamReady} />
      </header>

      {!streamReady ? (
        <div className="px-5 py-6 text-sm text-fg-muted">
          Çevirili transcript pasif — sunucuda <code className="text-fg">OPENAI_API_KEY</code> ayarlı değil.
          Yayın altyazısı için: video sağ alttaki CC → ⚙ → Auto-translate → {labelOfLang(targetLang)}.
        </div>
      ) : null}

      {errorMsg ? (
        <div className="border-b border-rose-400/20 bg-rose-500/[0.06] px-5 py-3 text-[12px] text-rose-200">
          {errorMsg}
        </div>
      ) : null}

      {streamReady && lines.length === 0 && streamState === 'streaming' ? (
        <div className="px-5 py-6 text-sm text-fg-muted">
          Sunucu yayını yakalıyor; ilk blok 8-15 saniye içinde burada
          görünmeye başlayacak.
        </div>
      ) : null}

      {streamReady && lines.length === 0 && streamState === 'connecting' ? (
        <div className="px-5 py-6 text-sm text-fg-muted">
          Akış başlatılıyor…
        </div>
      ) : null}

      {lines.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          <ol className="divide-y divide-border">
            {lines.map((l) => (
              <li key={l.id} className="px-5 py-3">
                <div className="text-[10px] uppercase tracking-wider text-brand/70">
                  {labelOfLang(targetLang)} · {timeOf(l.ts)}
                </div>
                <div className="mt-1 text-[14px] leading-relaxed text-fg">
                  {l.translated || (
                    <span className="text-fg-dim italic">çevriliyor…</span>
                  )}
                </div>
                {l.original ? (
                  <div className="mt-2 text-[12px] leading-relaxed text-fg-muted">
                    <span className="text-fg-dim">orijinal:</span> {l.original}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
          <div ref={transcriptEndRef} />
        </div>
      ) : null}
    </div>
  );
}

function StreamBadge({
  state,
  streamReady,
}: {
  state: StreamState;
  streamReady: boolean;
}) {
  if (!streamReady) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-mono text-amber-200">
        pasif
      </span>
    );
  }
  if (state === 'connecting') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-[10px] font-mono text-brand">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
        bağlanıyor
      </span>
    );
  }
  if (state === 'streaming') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-mono text-emerald-200">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        canlı çeviri
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[10px] font-mono text-rose-200">
        durdu
      </span>
    );
  }
  return null;
}

function LangPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-bg-card px-3 py-1.5 text-[12px]">
      <span aria-hidden>🌐</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent outline-none"
      >
        {SUPPORTED_TARGETS.map((s) => (
          <option key={s.code} value={s.code} className="bg-bg-card text-fg">
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function labelOfLang(code: string): string {
  return SUPPORTED_TARGETS.find((s) => s.code === code)?.label ?? code;
}

function timeOf(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}
