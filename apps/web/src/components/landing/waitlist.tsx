'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

interface WaitlistCtx {
  open: (source?: string) => void;
}

const WaitlistContext = createContext<WaitlistCtx | null>(null);

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [source, setSource] = useState<string>('landing');
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );
  const [err, setErr] = useState<string | null>(null);

  const open = useCallback((src?: string) => {
    setSource(src ?? 'landing');
    setEmail('');
    setPhase('idle');
    setErr(null);
    setVisible(true);
  }, []);

  const close = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (!visible) return undefined;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [visible, close]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErr(null);
      const trimmed = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setErr('Geçerli bir e-posta gir.');
        return;
      }
      setPhase('sending');
      try {
        const res = await fetch(`${API_BASE}/public/waitlist`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: trimmed, source }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setPhase('sent');
      } catch (x) {
        setPhase('error');
        setErr((x as Error).message);
      }
    },
    [email, source],
  );

  return (
    <WaitlistContext.Provider value={{ open }}>
      {children}
      {visible ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center"
          onClick={close}
        >
          <div
            className="animate-fade-in w-full max-w-md rounded-t-2xl border border-border bg-bg-card p-6 shadow-2xl md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
                  Waitlist
                </div>
                <h3 className="mt-1 text-xl font-semibold text-fg">
                  10.000$ kasan hazırlanıyor
                </h3>
                <p className="mt-1 text-sm text-fg-muted">
                  E-posta bırak, açılışta seni ilk biz haberdar edelim —
                  kasanla ilk giren sen olacaksın.
                </p>
              </div>
              <button
                onClick={close}
                aria-label="Kapat"
                className="text-fg-dim hover:text-fg text-lg leading-none"
              >
                ×
              </button>
            </div>

            {phase === 'sent' ? (
              <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">
                ✓ Listeye eklendin. Açılışta{' '}
                <span className="font-mono">{email}</span> adresinden haber
                vereceğiz.
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sen@ornek.com"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                {err ? <p className="text-xs text-rose-300">{err}</p> : null}
                <button
                  type="submit"
                  disabled={phase === 'sending'}
                  className="btn-primary justify-center py-3 text-sm font-semibold"
                >
                  {phase === 'sending' ? 'Ekleniyor…' : 'Beni bekleme listesine ekle'}
                </button>
                <p className="text-center text-[11px] text-fg-dim">
                  Bu sadece launch duyurusu içindir. Kimseyle paylaşmayız.
                </p>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </WaitlistContext.Provider>
  );
}

export function useWaitlist(): WaitlistCtx {
  const ctx = useContext(WaitlistContext);
  if (!ctx) throw new Error('useWaitlist must be used inside WaitlistProvider');
  return ctx;
}

/**
 * Client-side button that opens the waitlist modal. Drop-in replacement
 * for the old `Link href=/signup` CTAs; accepts the same visual styles
 * via className.
 */
export function WaitlistButton({
  className,
  children,
  source = 'landing',
}: {
  className?: string;
  children: ReactNode;
  source?: string;
}) {
  const { open } = useWaitlist();
  return (
    <button
      type="button"
      onClick={() => open(source)}
      className={className}
    >
      {children}
    </button>
  );
}
