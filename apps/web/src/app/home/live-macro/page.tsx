'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

/**
 * Live Macro — Powell, FOMC, ECB, BoE gibi macro events için canlı yayın.
 *
 * V1 (bu dosya): YouTube canlı embed + tarayıcının native auto-caption +
 * auto-translate özelliği. URL Railway env (NEXT_PUBLIC_LIVE_MACRO_URL)
 * üzerinden konfigure edilir; admin yayın başlamadan önce o variable'ı
 * günceller, deploy yenisini gösterir. Power-user için ?url= query
 * param'ıyla geçici override de mümkün.
 *
 * V2 (sonra): server-side Whisper transcription + Claude çeviri pipeline,
 * dual-language transcript paneli (orijinal + Türkçe), 5 dakika geri-sar.
 * V1 hızlı çözüm; V2 kalıcı çözüm.
 */

const DEFAULT_URL =
  process.env.NEXT_PUBLIC_LIVE_MACRO_URL ||
  // Federal Reserve official YouTube live channel — when no event is on,
  // this shows the channel's most-recent broadcast or upcoming-stream
  // placeholder, which is fine as a default.
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

export default function LiveMacroPage() {
  const { user } = useAuth();
  const [url, setUrl] = useState<string>(DEFAULT_URL);
  const [targetLang, setTargetLang] = useState<string>('tr');

  // Read overrides on mount: ?url= query param wins, then localStorage,
  // then the env-driven default. Persist any explicit override locally so
  // re-opens don't lose the URL.
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

  const updateLang = (code: string) => {
    setTargetLang(code);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('liveMacro.lang', code);
    }
  };

  // Build embed URL with auto-captions + target translation hint. YouTube
  // honors `cc_load_policy=1` to show captions and `cc_lang_pref=<code>`
  // to pick translation. Doesn't translate every speech but works on most
  // major Federal Reserve / Bloomberg / CNBC live streams.
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
          olayları aşağıdaki canlı yayın penceresinden takip edebilirsin.
          YouTube'un auto-caption + simultane çeviri özelliği seçtiğin
          dile altyazıları çevirir.
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
                  <span className="text-fg">
                    {SUPPORTED_TARGETS.find((s) => s.code === targetLang)?.label ??
                      targetLang}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <CaptionInstructions />
          <RoadmapNotice />

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

/**
 * Until our own Whisper+Claude pipeline ships (V2), we lean on YouTube's
 * own caption + auto-translate. This block tells the user how to enable
 * it because YouTube doesn't always honour `cc_lang_pref` automatically
 * across live streams — sometimes the user has to flip the toggle by
 * hand the first time.
 */
function CaptionInstructions() {
  return (
    <div className="rounded-2xl border border-brand/20 bg-brand/[0.04] p-5">
      <div className="mono-label !text-brand">Çeviri altyazıyı nasıl açarım?</div>
      <ol className="mt-3 space-y-1.5 text-sm text-fg-muted">
        <li>
          <span className="font-semibold text-fg">1.</span> Video sağ alt
          köşedeki{' '}
          <span className="rounded border border-white/10 bg-bg/60 px-1 font-mono text-[11px]">
            CC
          </span>{' '}
          (altyazı) butonuna tıkla.
        </li>
        <li>
          <span className="font-semibold text-fg">2.</span> Yanındaki{' '}
          <span className="rounded border border-white/10 bg-bg/60 px-1 font-mono text-[11px]">
            ⚙
          </span>{' '}
          (ayarlar) → <span className="text-fg">Subtitles/CC</span> →{' '}
          <span className="text-fg">Auto-translate</span> →{' '}
          <span className="text-fg">Türkçe</span>.
        </li>
        <li>
          <span className="font-semibold text-fg">3.</span> Konuşma başladığında
          altyazı seçtiğin dile anlık çevrilir.
        </li>
      </ol>
      <div className="mt-3 text-[11px] text-fg-dim">
        Not: çeviri kalitesi YouTube'un kendi otomatik çevirisidir; finansal
        terimlerde kayma olabilir. V2'de kendi Claude pipeline'ımız transkript +
        çeviri kalitesini üstlenecek.
      </div>
    </div>
  );
}

function RoadmapNotice() {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-bg/40 p-5">
      <div className="mono-label !text-fg-dim">Yakında · V2</div>
      <ul className="mt-2 space-y-1.5 text-[12px] text-fg-muted">
        <li>
          • Server-side Whisper transcription + Claude finansal-terimli
          çeviri (kendi panel, YouTube CC'den daha iyi)
        </li>
        <li>
          • Dual-language transcript akışı (orijinal İngilizce + seçtiğin dil
          yan yana, scroll edilebilir geçmiş)
        </li>
        <li>• Anahtar cümleleri otomatik vurgu (rate cut hint, balance sheet, etc.)</li>
        <li>
          • Konuşma sonrası: Foxy AI'dan tek-paragraf trader-odaklı özet
        </li>
      </ul>
    </div>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'youtube.com';
  }
}
