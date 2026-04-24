'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface OkxStatus {
  connected: boolean;
  uid: string | null;
  masked_key: string | null;
  market: 'okx';
  is_demo: boolean;
  last_checked_at: string | null;
}

interface OkxBalance {
  total_equity_usd: number;
  balances: Array<{
    ccy: string;
    eq: number;
    usdEq: number;
    availBal: number;
  }>;
  updated_at: number;
}

export default function OkxConnectPage() {
  const [status, setStatus] = useState<OkxStatus | null>(null);
  const [balance, setBalance] = useState<OkxBalance | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [pairing, setPairing] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const s = await api<OkxStatus>('/user/me/okx/status');
      setStatus(s);
      if (s.connected) {
        try {
          const b = await api<OkxBalance>('/user/me/okx/balance');
          setBalance(b);
        } catch {
          setBalance(null);
        }
      }
    } catch (x) {
      setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const pair = async (e: React.FormEvent) => {
    e.preventDefault();
    setPairing(true);
    setErr(null);
    try {
      const s = await api<OkxStatus>('/user/me/okx/pair', {
        method: 'POST',
        body: JSON.stringify({
          api_key: apiKey.trim(),
          api_secret: apiSecret.trim(),
          passphrase: passphrase.trim(),
          is_demo: isDemo,
        }),
      });
      setStatus(s);
      setApiKey('');
      setApiSecret('');
      setPassphrase('');
      await loadStatus();
    } catch (x) {
      setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
    } finally {
      setPairing(false);
    }
  };

  const unpair = async () => {
    if (!window.confirm('OKX bağlantısı kaldırılsın mı? Kopya trade bu noktadan sonra çalışmaz.')) {
      return;
    }
    try {
      await api<{ ok: true }>('/user/me/okx/pair', { method: 'DELETE' });
      setBalance(null);
      await loadStatus();
    } catch (x) {
      setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <Link href="/app/together" className="text-xs text-fg-muted hover:text-fg">
        ← Kopya trade
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-fg">OKX hesabını bağla</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Kopya trade özelliği için OKX API anahtarı gerekli. Anahtar Read + Trade izinlerine
        sahip olmalı; çekim (Withdraw) izni asla verme.
      </p>

      {status == null ? (
        <div className="mt-4 h-24 animate-pulse rounded-2xl bg-white/[0.02]" />
      ) : status.connected ? (
        <section className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-semibold text-emerald-300">
              OKX bağlı
            </span>
            {status.is_demo ? (
              <span className="rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
                Demo
              </span>
            ) : null}
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-y-1 text-sm text-fg-muted md:grid-cols-2">
            <Row label="UID" value={status.uid ?? '—'} />
            <Row label="API Key" value={status.masked_key ?? '—'} />
            {status.last_checked_at ? (
              <Row
                label="Son doğrulama"
                value={new Date(status.last_checked_at).toLocaleString('tr-TR')}
              />
            ) : null}
          </dl>
          {balance ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-bg-card/60 p-4">
              <div className="text-[10px] uppercase tracking-wider text-fg-dim">
                Toplam equity
              </div>
              <div className="mt-1 text-2xl font-semibold text-fg">
                ${balance.total_equity_usd.toFixed(2)}
              </div>
              {balance.balances.length > 0 ? (
                <div className="mt-3 flex flex-col gap-1 font-mono text-[11px]">
                  {balance.balances.slice(0, 6).map((b) => (
                    <div
                      key={b.ccy}
                      className="flex items-center justify-between text-fg-muted"
                    >
                      <span>{b.ccy}</span>
                      <span className="text-fg">
                        {b.eq.toFixed(4)} · ${b.usdEq.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => void loadStatus()}
              className="rounded-md bg-white/5 px-3 py-1.5 text-xs text-fg-muted ring-1 ring-white/10 hover:text-fg"
            >
              Yenile
            </button>
            <button
              onClick={() => void unpair()}
              className="rounded-md bg-rose-500/15 px-3 py-1.5 text-xs text-rose-300 ring-1 ring-rose-400/30 hover:bg-rose-500/20"
            >
              Bağlantıyı kaldır
            </button>
          </div>
        </section>
      ) : (
        <form
          onSubmit={pair}
          className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
        >
          <h2 className="text-sm font-semibold text-fg">OKX API bilgileri</h2>
          <p className="mt-1 text-[11px] text-fg-dim">
            OKX → Profil → API → Create V5 API Key. Read + Trade seç, Withdraw'ı kapatırken
            IP kısıtlaması koyabilirsin.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <Field label="API Key" value={apiKey} onChange={setApiKey} mono />
            <Field
              label="API Secret"
              value={apiSecret}
              onChange={setApiSecret}
              type="password"
              mono
            />
            <Field
              label="Passphrase"
              value={passphrase}
              onChange={setPassphrase}
              type="password"
              mono
            />
            <label className="flex items-center gap-2 text-xs text-fg-muted">
              <input
                type="checkbox"
                checked={isDemo}
                onChange={(e) => setIsDemo(e.target.checked)}
              />
              Demo ortamı (OKX simulated trading)
            </label>
          </div>
          {err ? <p className="mt-3 text-xs text-rose-300">{err}</p> : null}
          <div className="mt-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={pairing}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white ring-1 ring-brand hover:bg-brand-dark disabled:opacity-60"
            >
              {pairing ? 'Doğrulanıyor…' : 'Doğrula ve bağla'}
            </button>
          </div>
        </form>
      )}

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-xs text-fg-muted">
        <h2 className="text-sm font-semibold text-fg">Güvenlik notu</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Anahtar sadece sunucuda saklanır, asla tarayıcıya geri dönmez.</li>
          <li>Withdraw izni asla verme. Yalnızca Read + Trade yeterli.</li>
          <li>OKX'te IP kısıtlaması eklersen Railway çıkış IP'sini beyaz listeye al.</li>
          <li>Şüphe duyarsan OKX'ten anahtarı hemen iptal et, aşağıdan "Bağlantıyı kaldır" tuşuna bas.</li>
        </ul>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-bg-card/40 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wider text-fg-dim">{label}</dt>
      <dd className="font-mono text-xs text-fg truncate">{value}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  mono?: boolean;
}) {
  return (
    <label className="block text-xs text-fg-muted">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required
        autoComplete="off"
        className={`mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 ${mono ? 'font-mono' : ''}`}
      />
    </label>
  );
}
