'use client';

import {
  addDoc,
  collection,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getFirestoreDb } from '@/lib/firebase';

interface ChatChannel {
  code: string;
  label: string;
  emoji: string;
  desc: string;
}

const CHANNELS: ChatChannel[] = [
  { code: 'chat', label: 'Sohbet', emoji: '💬', desc: 'Genel sohbet' },
  { code: 'setups', label: 'Setuplar', emoji: '📊', desc: 'Setup paylaşımları' },
  { code: 'user_ideas', label: 'Fikirler', emoji: '💡', desc: 'Kullanıcı fikirleri' },
  { code: 'market_analysis', label: 'Analiz', emoji: '🔍', desc: 'Piyasa analizi' },
  { code: 'gem_hunt', label: 'Gem avı', emoji: '💎', desc: 'Yeni coin avı' },
  { code: 'fx', label: 'FX', emoji: '💱', desc: 'Döviz piyasası' },
  { code: 'indices', label: 'Endeksler', emoji: '📈', desc: 'Borsa endeksleri' },
];

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string | null;
  sender_image: string | null;
  text: string;
  created_at: Timestamp | null;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [channel, setChannel] = useState<string>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const db = useMemo(() => (typeof window !== 'undefined' ? getFirestoreDb() : null), []);

  useEffect(() => {
    if (!db) return undefined;
    setMessages([]);
    setErr(null);
    const q = query(
      collection(db, 'global_channels', channel, 'messages'),
      orderBy('created_at', 'desc'),
      fsLimit(100),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: ChatMessage[] = [];
        snap.forEach((doc) => {
          const d = doc.data() as Record<string, unknown>;
          rows.push({
            id: doc.id,
            sender_id: String(d.sender_id ?? ''),
            sender_name: (d.sender_name as string | null) ?? null,
            sender_image: (d.sender_image as string | null) ?? null,
            text: String(d.text ?? ''),
            created_at: (d.created_at as Timestamp | null) ?? null,
          });
        });
        rows.reverse();
        setMessages(rows);
        // Scroll to bottom on new messages
        requestAnimationFrame(() => {
          const el = scrollRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        });
      },
      (e) => setErr(e.message),
    );
    return () => unsub();
  }, [db, channel]);

  const send = useCallback(async () => {
    if (!db || !user) return;
    const text = draft.trim();
    if (text.length === 0 || text.length > 1000) return;
    setSending(true);
    setErr(null);
    try {
      await addDoc(collection(db, 'global_channels', channel, 'messages'), {
        sender_id: user.uid,
        sender_name: user.displayName ?? user.email ?? null,
        sender_image: user.photoURL ?? null,
        text,
        created_at: serverTimestamp(),
      });
      setDraft('');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  }, [db, draft, user, channel]);

  const active = CHANNELS.find((c) => c.code === channel)!;

  return (
    <div className="mx-auto flex h-[calc(100vh-4.5rem)] max-w-6xl flex-col px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg">Global sohbet</h1>
        <span className="text-[11px] text-fg-dim">
          Firestore · canlı
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {CHANNELS.map((c) => (
          <button
            key={c.code}
            onClick={() => setChannel(c.code)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              channel === c.code
                ? 'bg-brand text-white ring-1 ring-brand'
                : 'bg-white/5 text-fg-muted ring-1 ring-white/10 hover:text-fg'
            }`}
          >
            <span className="mr-1">{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="border-b border-white/5 px-4 py-2 text-[11px] text-fg-muted">
          {active.emoji} {active.desc}
        </div>

        <div
          ref={scrollRef}
          className="flex h-full flex-col gap-3 overflow-y-auto px-4 pb-16 pt-3"
          style={{ maxHeight: 'calc(100% - 32px)' }}
        >
          {err ? (
            <div className="rounded-lg bg-rose-400/10 p-3 text-xs text-rose-300 ring-1 ring-rose-400/30">
              {err}
              <br />
              <span className="text-fg-dim">
                Firestore kurallarını güncellemen gerekebilir (giriş yapmış kullanıcılara
                read/write izni).
              </span>
            </div>
          ) : null}
          {messages.length === 0 && !err ? (
            <div className="flex h-32 items-center justify-center text-xs text-fg-dim">
              Bu kanalda henüz mesaj yok. İlk yazan sen ol.
            </div>
          ) : null}
          {messages.map((m) => {
            const mine = user?.uid === m.sender_id;
            const display =
              m.sender_name ||
              (mine ? (user?.email ?? 'Sen') : m.sender_id.slice(0, 6));
            return (
              <div
                key={m.id}
                className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}
              >
                {m.sender_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.sender_image}
                    alt=""
                    className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-semibold text-fg ring-1 ring-white/10">
                    {display[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <div className={`max-w-[70%] ${mine ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`text-[10px] ${mine ? 'text-right text-brand' : 'text-fg-muted'}`}
                  >
                    {display}
                    {m.created_at ? (
                      <span className="ml-1 text-fg-dim">
                        · {formatTs(m.created_at)}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={`mt-0.5 rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? 'bg-brand/20 text-fg ring-1 ring-brand/30'
                        : 'bg-white/5 text-fg ring-1 ring-white/10'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`#${active.code} kanalına mesaj`}
          maxLength={1000}
          disabled={sending || !user}
          className="flex-1 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="submit"
          disabled={sending || !user || draft.trim().length === 0}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white ring-1 ring-brand hover:bg-brand-dark disabled:opacity-40"
        >
          {sending ? '…' : 'Gönder'}
        </button>
      </form>
    </div>
  );
}

function formatTs(ts: Timestamp): string {
  try {
    const d = ts.toDate();
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
