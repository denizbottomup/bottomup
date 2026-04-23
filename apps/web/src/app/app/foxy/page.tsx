'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    'Merhaba, ben Foxy. Kripto, trade, setup yorumları ya da uygulama hakkında ne sormak istersin?',
  ts: Date.now(),
};

const SUGGESTIONS = [
  'BTC bugün hangi direnç seviyelerine dikkat etmeli?',
  'RSI bölgesi 30 altındayken nasıl yorumlamalıyım?',
  'Long setup\'ta stop yerleşimi için kural var mı?',
  'Trader\'ın paylaştığı setup çift dip formasyonu mu?',
];

export default function FoxyChatPage() {
  const [msgs, setMsgs] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [msgs, pending]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;
      setErr(null);
      const now = Date.now();
      const next: ChatMessage[] = [
        ...msgs,
        { role: 'user', content: trimmed, ts: now },
      ];
      setMsgs(next);
      setInput('');
      setPending(true);
      try {
        const r = await api<{ reply: string }>('/foxy/chat', {
          method: 'POST',
          body: JSON.stringify({
            messages: next.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        setMsgs((prev) => [
          ...prev,
          { role: 'assistant', content: r.reply, ts: Date.now() },
        ]);
      } catch (x) {
        const msg = x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message;
        setErr(msg);
        setMsgs((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Bağlantı hatası, tekrar dener misin?',
            ts: Date.now(),
          },
        ]);
      } finally {
        setPending(false);
      }
    },
    [msgs, pending],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-6 py-6">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 ring-1 ring-brand/30">
          <FoxyGlyph />
        </div>
        <div>
          <h1 className="text-base font-semibold text-fg">Foxy AI</h1>
          <p className="text-[11px] text-fg-muted">Kripto, trade ve setup yorumları için hızlı yardımcı.</p>
        </div>
      </header>

      <div
        ref={scrollerRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4"
      >
        {msgs.map((m, i) => (
          <Bubble key={i} m={m} />
        ))}
        {pending ? (
          <div className="flex items-start gap-2">
            <FoxyAvatar />
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white/5 px-3 py-2 text-sm text-fg-muted">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fg-muted" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fg-muted" style={{ animationDelay: '120ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fg-muted" style={{ animationDelay: '240ms' }} />
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {err ? <p className="mt-2 text-xs text-rose-300">{err}</p> : null}

      {msgs.length <= 1 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => void send(s)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-fg-muted transition hover:border-brand/40 hover:text-fg"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-3 flex items-end gap-2">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder="Foxy'ye mesaj yaz… (Enter gönder, Shift+Enter yeni satır)"
          className="min-h-[48px] flex-1 resize-none rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="submit"
          disabled={pending || input.trim().length === 0}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white ring-1 ring-brand transition hover:bg-brand-dark disabled:opacity-50"
        >
          Gönder
        </button>
      </form>
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  if (m.role === 'user') {
    return (
      <div className="flex items-start justify-end gap-2">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand/15 px-3 py-2 text-sm text-fg ring-1 ring-brand/30">
          {m.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <FoxyAvatar />
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-white/[0.04] px-3 py-2 text-sm text-fg ring-1 ring-white/10">
        {m.content}
      </div>
    </div>
  );
}

function FoxyAvatar() {
  return (
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 ring-1 ring-brand/30">
      <FoxyGlyph small />
    </div>
  );
}

function FoxyGlyph({ small = false }: { small?: boolean }) {
  const s = small ? 12 : 16;
  return (
    <svg width={s} height={s} viewBox="0 0 20 20" aria-hidden>
      <path
        fill="currentColor"
        className="text-brand"
        d="M10 2c1.8 1.2 3 2.8 3 4.5 1.5.4 3 1.8 3 3.7 0 1.6-.9 3-2.2 3.6L13 17l-2-1.5L9 17l-.8-3.2C6.9 13.2 6 11.8 6 10.2c0-1.9 1.5-3.3 3-3.7C9 4.8 10 3.2 10 2Zm-1.7 8.2a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm3.4 0a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"
      />
    </svg>
  );
}
