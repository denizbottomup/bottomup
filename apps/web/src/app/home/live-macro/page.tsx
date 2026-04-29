'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

/**
 * Live Macro — finansla ilgili kim canlıdaysa, kullanıcı arar, izler,
 * kendi dilinde çeviri görür.
 *
 *   1. Kullanıcı arama kutusuna sorgu yazar (powell, fomc, lagarde,
 *      bitcoin trading live, fed kashkari, ...).
 *   2. Backend YouTube Data API v3'te `eventType=live` aramasını yapar.
 *      YT_API_KEY yoksa curated finans kanalı listesinde fuzzy match.
 *   3. Sonuçlar canlı yayın kartları olarak listelenir; tıklayınca
 *      seçilen kanal embed olur ve "çevirili transcript başlat"
 *      butonuyla Whisper + Claude pipeline devreye girer.
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

const CHUNK_MS = 8000;

export default function LiveMacroPage() {
  const { user, getIdToken } = useAuth();
  const [targetLang, setTargetLang] = useState<string>('tr');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(true);
  const [transcribeEnabled, setTranscribeEnabled] = useState(false);
  const [selected, setSelected] = useState<SearchHit | null>(null);

  // Recorder state for the in-tab audio capture pipeline.
  const [recState, setRecState] = useState<
    'idle' | 'starting' | 'recording' | 'denied' | 'unsupported' | 'error'
  >('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

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
          transcribe_enabled?: boolean;
          search_enabled?: boolean;
        };
        if (alive) {
          setTranscribeEnabled(!!j.transcribe_enabled);
          setSearchEnabled(j.search_enabled !== false); // default true if absent
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

  useEffect(() => {
    return () => {
      stopRecorder();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Stop any ongoing recording before switching streams — different
    // tab audio source means we'd be transcribing the wrong thing.
    stopRecorder();
    setLines([]);
    setSelected(hit);
  };

  const stopRecorder = () => {
    try {
      recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    recorderRef.current = null;
    setRecState('idle');
  };

  const startRecorder = async () => {
    setErrorMsg(null);
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      setRecState('unsupported');
      setErrorMsg('Tarayıcın sekme ses paylaşımını desteklemiyor.');
      return;
    }
    setRecState('starting');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      if (stream.getAudioTracks().length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        setRecState('error');
        setErrorMsg(
          'Sekme sesini paylaşmadın. Tekrar dene ve "Sekme sesini paylaş" kutusunu işaretle.',
        );
        return;
      }
      stream.getVideoTracks().forEach((t) => t.stop());
      const audioOnly = new MediaStream(stream.getAudioTracks());
      mediaStreamRef.current = audioOnly;

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(audioOnly, { mimeType: mime });
      recorderRef.current = rec;

      rec.ondataavailable = async (ev) => {
        if (!ev.data || ev.data.size < 1024) return;
        const blob = ev.data;
        const buf = await blob.arrayBuffer();
        const b64 = bufferToBase64(buf);
        const token = await getIdToken();
        if (!token) return;
        try {
          const res = await fetch(`${API_BASE}/me/livecast/audio`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audio_b64: b64,
              mime: blob.type || 'audio/webm',
              target_lang: targetLang,
            }),
          });
          if (!res.ok) return;
          const data = (await res.json()) as {
            original: string;
            translated: string;
            ts: string;
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
          /* single chunk failure — next chunk will try again */
        }
      };

      rec.onerror = () => {
        setRecState('error');
        setErrorMsg('Kayıt sırasında hata oluştu.');
        stopRecorder();
      };

      audioOnly.getAudioTracks()[0]?.addEventListener('ended', () => {
        stopRecorder();
      });

      rec.start(CHUNK_MS);
      setRecState('recording');
    } catch (err) {
      setRecState('denied');
      setErrorMsg(
        (err as Error).message || 'İzin verilmedi veya kayıt başlatılamadı.',
      );
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border px-4 py-4 md:px-8 md:py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="mono-label !text-brand">Live Macro · canlı yayın araması</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
              Powell, Lagarde, Bloomberg.{' '}
              <span className="logo-gradient">Sen ara, sen oku.</span>
            </h1>
          </div>
          <LangPicker value={targetLang} onChange={updateLang} />
        </div>
        <p className="mt-1 max-w-3xl text-sm text-fg-muted">
          Kim şu an konuşuyor? Ara, izle, kendi dilinde transcript al.
          Whisper + Claude finansal-ton çeviri 8 saniyelik bloklarla
          panelde belirir.
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
              transcribeEnabled={transcribeEnabled}
              recState={recState}
              errorMsg={errorMsg}
              lines={lines}
              onStart={startRecorder}
              onStop={stopRecorder}
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
  transcribeEnabled,
  recState,
  errorMsg,
  lines,
  onStart,
  onStop,
  transcriptEndRef,
}: {
  hit: SearchHit;
  targetLang: string;
  transcribeEnabled: boolean;
  recState: string;
  errorMsg: string | null;
  lines: TranscriptLine[];
  onStart: () => void;
  onStop: () => void;
  transcriptEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  const recording = recState === 'recording';
  const starting = recState === 'starting';
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
    <section className="space-y-4">
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
            hedef dil:{' '}
            <span className="text-fg">
              {labelOfLang(targetLang)}
            </span>
          </div>
        </div>
      </div>

      {transcribeEnabled ? (
        <TranscriptPanel
          recState={recState}
          recording={recording}
          starting={starting}
          errorMsg={errorMsg}
          lines={lines}
          onStart={onStart}
          onStop={onStop}
          targetLang={targetLang}
          transcriptEndRef={transcriptEndRef}
        />
      ) : (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5 text-sm text-fg-muted">
          Çevirili transcript pasif — sunucuda OPENAI_API_KEY ayarlı değil.
          YouTube'un kendi auto-translate altyazısını kullan: video sağ
          alttaki CC → ⚙ → Auto-translate → {labelOfLang(targetLang)}.
        </div>
      )}
    </section>
  );
}

function TranscriptPanel({
  recording,
  starting,
  errorMsg,
  lines,
  onStart,
  onStop,
  targetLang,
  transcriptEndRef,
}: {
  recState: string;
  recording: boolean;
  starting: boolean;
  errorMsg: string | null;
  lines: TranscriptLine[];
  onStart: () => void;
  onStop: () => void;
  targetLang: string;
  transcriptEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <div className="mono-label !text-brand">Çevirili transcript</div>
          <div className="mt-0.5 text-[11px] text-fg-dim">
            Whisper · Claude · {labelOfLang(targetLang)} · 8 saniyelik bloklarla
          </div>
        </div>
        <button
          type="button"
          onClick={recording ? onStop : onStart}
          disabled={starting}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-mono transition disabled:opacity-50 disabled:cursor-not-allowed ${
            recording
              ? 'border-rose-400/40 bg-rose-400/10 text-rose-200'
              : 'border-brand/40 bg-brand/10 text-brand'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              recording ? 'bg-rose-400 animate-pulse' : 'bg-brand'
            }`}
            aria-hidden
          />
          {starting
            ? 'başlatılıyor…'
            : recording
              ? 'transkripti durdur'
              : 'çevirili transcript başlat'}
        </button>
      </header>

      {!recording && lines.length === 0 ? (
        <div className="space-y-3 px-5 py-6 text-sm text-fg-muted">
          <p>
            Çevirili transcript başlat butonuna tıkla. Tarayıcı{' '}
            <span className="font-semibold text-fg">"Sekme paylaş"</span>{' '}
            penceresi açar — bu sekmeyi seç ve{' '}
            <span className="font-semibold text-fg">"Sekme sesini paylaş"</span>{' '}
            kutusunu işaretle.
          </p>
        </div>
      ) : null}

      {errorMsg ? (
        <div className="border-b border-rose-400/20 bg-rose-500/[0.06] px-5 py-3 text-[12px] text-rose-200">
          {errorMsg}
        </div>
      ) : null}

      {lines.length > 0 ? (
        <div className="max-h-[480px] overflow-y-auto">
          <ol className="divide-y divide-border">
            {lines.map((l) => (
              <li
                key={l.id}
                className="grid grid-cols-1 gap-3 px-5 py-3 md:grid-cols-2"
              >
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-fg-dim">
                    Orijinal · {timeOf(l.ts)}
                  </div>
                  <div className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                    {l.original}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-brand/70">
                    {labelOfLang(targetLang)}
                  </div>
                  <div className="mt-1 text-[13px] leading-relaxed text-fg">
                    {l.translated || (
                      <span className="text-fg-dim italic">çevriliyor…</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div ref={transcriptEndRef} />
        </div>
      ) : null}
    </div>
  );
}

function LangPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-white/10 bg-bg-card px-3 py-1.5 text-[11px] font-mono text-fg-muted">
      <span aria-hidden>🌐</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-fg outline-none"
      >
        {SUPPORTED_TARGETS.map((s) => (
          <option key={s.code} value={s.code}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 0x8000;
  for (let i = 0; i < len; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
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
