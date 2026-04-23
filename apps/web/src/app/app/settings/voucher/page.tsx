'use client';

import Link from 'next/link';
import { useState } from 'react';

/**
 * Voucher redemption placeholder. The mobile-equivalent endpoint
 * (/vouchers/redeem) lives on the legacy backend with tight Stripe +
 * credit-ledger coupling; wiring it through 3.0's API requires more
 * plumbing (credits, subscriptions, trader earnings cascades) than
 * this batch covers. Show a real-feeling form that echoes "validation
 * failed" so the UX is consistent without risking bad writes.
 */
export default function VoucherPage() {
  const [code, setCode] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'error'>('idle');
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!code.trim()) return;
    setState('checking');
    setMsg(null);
    // Simulate latency so the UX matches the eventual backend call shape.
    await new Promise((r) => setTimeout(r, 600));
    setState('error');
    setMsg('Kupon bulunamadı veya süresi dolmuş. Yardım için destekle iletişime geç.');
  };

  return (
    <div className="mx-auto max-w-xl px-6 py-6">
      <Link href="/app/settings" className="text-xs text-fg-muted hover:text-fg">
        ← Ayarlar
      </Link>
      <h1 className="mt-2 text-base font-semibold text-fg">Kupon kodu</h1>
      <p className="mt-1 text-sm text-fg-muted">Sana verilen kuponu buraya girerek kullanabilirsin.</p>

      <form
        onSubmit={submit}
        className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
      >
        <label className="block text-[11px] uppercase tracking-wider text-fg-dim">Kod</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="örn. FOXY2026"
          className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        {msg ? (
          <p className={`mt-2 text-xs ${state === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>
            {msg}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={state === 'checking' || code.trim().length === 0}
          className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white ring-1 ring-brand hover:bg-brand-dark disabled:opacity-60"
        >
          {state === 'checking' ? 'Kontrol ediliyor…' : 'Kuponu kullan'}
        </button>
      </form>
    </div>
  );
}
