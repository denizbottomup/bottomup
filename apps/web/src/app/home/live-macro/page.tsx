'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

/**
 * Live Macro V1.5 — YouTube canlı embed + isteğe bağlı kendi
 * Whisper-Claude transcript pipeline'ımız.
 *
 * V1 katmanı: YouTube canlı yayın iframe + native CC auto-translate.
 * V1.5 katmanı: kullanıcı "Çevirili transcript başlat" derse:
 *   1. getDisplayMedia({ audio: true }) ile bu sekmenin sesini paylaşır.
 *   2. MediaRecorder 8sn'lik audio/webm chunk'lar üretir.
 *   3. Her chunk POST /me/livecast/audio'ya base64 olarak gider.
 *   4. Server: Whisper transcribe → Claude (finansal-ton) çeviri.
 *   5. Dual-language transcript paneli her chunk'ı ekler, scroll bottom.
 *
 * V2 (sonra): server-side yt-dlp/ffmpeg ile single-source capture +
 * SSE broadcast (single-cost across viewers), key-phrase highlight,
 * konuşma sonrası Foxy AI özet.
 */

const DEFAULT_URL =
  process.env.NEXT_PUBLIC_LIVE_MACRO_URL ||
  'https://www.youtube.com/embed/live_stream?channel=UCKc0c5DwIKjxN-AjYQwM6QQ';

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

const CHUNK_MS = 8000;

interface TranscriptLine {
  id: string;
  original: string;
  translated: string;
  ts: string;
}

export default function LiveMacroPage() {
  const { user, getIdToken } = useAuth();
  const [url, setUrl] = useState<string>(DEFAULT_URL);
  const [targetLang, setTargetLang] = useState<string>('tr');
  const [transcribeEnabled, setTranscribeEnabled] = useState<boolean>(false);
  const [recState, setRecState] = useState<
    'idle' | 'starting' | 'recording' | 'denied' | 'unsupported' | 'error'
  >('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lines, setLines] = useState<TranscriptLine[]>([]);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // URL + lang bootstrap.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fromQuery = new URLSearchParams(window.location.search).get('url');
    const fromStorage = window.localStorage.getItem('liveMacro.url');
    const fromUserLang = window.localStorage.getItem('liveMacro.lang');
    if (fromQuery) {
      setUrl(fromQuery);
      window.localStorage.setItem('liveMacro.url', fromQuery);
    } else if (fromStorage) {
      setUrl(fromStorage);
    }
    if (fromUserLang) setTargetLang(fromUserLang);
  }, []);

  // Probe whether server-side Whisper is configured. Lets us hide the
  // recorder button entirely when OPENAI_API_KEY isn't set on Railway.
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
        const j = (await res.json()) as { transcribe_enabled: boolean };
        if (alive) setTranscribeEnabled(!!j.transcribe_enabled);
      } catch {
        // best-effort probe; failure just means no transcript button.
      }
    })();
    return () => {
      alive = false;
    };
  }, [getIdToken]);

  // Auto-scroll transcript pane on every new line.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines.length]);

  // Stop everything on unmount so a backgrounded user doesn't keep
  // burning Whisper credits forever.
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
      // Ask the user to share the YouTube tab WITH AUDIO. The video
      // surface is irrelevant; we discard it after stream picks up.
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      // If they didn't tick "share tab audio", `stream.getAudioTracks()`
      // will be empty — fail explicitly so the user knows what happened.
      if (stream.getAudioTracks().length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        setRecState('error');
        setErrorMsg(
          'Sekme sesini paylaşmadın. Tekrar dene ve "Sekme sesini paylaş" kutusunu işaretle.',
        );
        return;
      }
      // Drop the video track to save CPU — only audio matters.
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
          if (!data.original) return; // silence / non-speech
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
          // Single chunk failure is non-fatal; next chunk will retry.
        }
      };

      rec.onerror = () => {
        setRecState('error');
        setErrorMsg('Kayıt sırasında hata oluştu.');
        stopRecorder();
      };

      // The user closes the share — clean up.
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

  const embedSrc = (() => {
    try {
      const u = new URL(url);
      u.searchParams.set('cc_load_policy', '1');
      u.searchParams.set('cc_lang_pref', targetLang);
      u.searchParams.set('hl', targetLang);
      u.searchParams.set('autoplay', '1');
      u.searchParams.set('modestbranding', '1');
      return u.toString();
    } catch {
      return url;
    }
  })();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border px-4 py-4 md:px-8 md:py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="mono-label !text-brand">Live Macro · canlı yayın</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
              Powell konuşuyor.{' '}
              <span className="logo-gradient">Sen okuyorsun.</span>
            </h1>
          </div>
          <LangPicker value={targetLang} onChange={updateLang} />
        </div>
        <p className="mt-1 max-w-3xl text-sm text-fg-muted">
          FOMC, ECB, BoE konuşmaları gibi piyasayı anlık hareket ettiren
          olayları aşağıdaki canlı yayın penceresinden takip et.{' '}
          <span className="text-fg">
            "Çevirili transcript başlat" butonuyla yayının audio'sunu paylaş
          </span>{' '}
          — Whisper transcribe edip Claude finans terimlerine duyarlı
          şekilde {labelOfLang(targetLang)} diline anlık çevirir.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-bg-card">
            <div className="aspect-video w-full bg-black">
              <iframe
                key={`${embedSrc}-${targetLang}`}
                src={embedSrc}
                title="Live macro broadcast"
                allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-[11px] text-fg-dim">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                <span>canlı kaynak · {hostnameOf(url)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span>
                  hedef dil:{' '}
                  <span className="text-fg">{labelOfLang(targetLang)}</span>
                </span>
              </div>
            </div>
          </div>

          {transcribeEnabled ? (
            <TranscriptPanel
              recState={recState}
              errorMsg={errorMsg}
              lines={lines}
              onStart={startRecorder}
              onStop={stopRecorder}
              targetLang={targetLang}
              transcriptEndRef={transcriptEndRef}
            />
          ) : (
            <FallbackInstructions />
          )}

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

function TranscriptPanel({
  recState,
  errorMsg,
  lines,
  onStart,
  onStop,
  targetLang,
  transcriptEndRef,
}: {
  recState: string;
  errorMsg: string | null;
  lines: TranscriptLine[];
  onStart: () => void;
  onStop: () => void;
  targetLang: string;
  transcriptEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  const recording = recState === 'recording';
  const starting = recState === 'starting';

  return (
    <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <div className="mono-label !text-brand">Çevirili transcript</div>
          <div className="mt-0.5 text-[11px] text-fg-dim">
            Whisper · Claude · {labelOfLang(targetLang)} ·{' '}
            8 saniyelik bloklarla
          </div>
        </div>
        <button
          type="button"
          onClick={recording ? onStop : onStart}
          disabled={starting}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-mono transition ${
            recording
              ? 'border-rose-400/40 bg-rose-400/10 text-rose-200 hover:border-rose-400/60'
              : 'border-brand/40 bg-brand/10 text-brand hover:border-brand/60'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
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
            penceresi açacak — bu sekmeyi (Live Macro) seç ve{' '}
            <span className="font-semibold text-fg">"Sekme sesini paylaş"</span>{' '}
            kutusunu işaretle.
          </p>
          <p className="text-[12px] text-fg-dim">
            Whisper konuşmayı 8 saniyelik bloklarla yazıya geçirir. Claude
            Haiku finansal terimlere duyarlı çeviri üretir. Sayfayı kapatınca
            otomatik durur.
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
    </section>
  );
}

function FallbackInstructions() {
  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5">
      <div className="mono-label !text-amber-300">
        Çevirili transcript pasif
      </div>
      <p className="mt-2 text-sm text-fg-muted">
        Sunucuda OPENAI_API_KEY ayarlı olduğunda kendi Whisper + Claude
        transcript pipeline'ımız aktif olur. Şu an YouTube'un kendi
        auto-translate altyazısını kullanabilirsin (CC butonu → ⚙ →
        Auto-translate → dil seç).
      </p>
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

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'youtube.com';
  }
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
