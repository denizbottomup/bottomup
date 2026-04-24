'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { useTicker } from '@/lib/ticker';
import { SetupChart } from '@/components/setup-chart';

type Direction = 'long' | 'short';
type Category = 'spot' | 'futures';
type OrderType = 'market' | 'limit' | 'stop';

interface Draft {
  coin_name: string;
  category: Category;
  position: Direction;
  order_type: OrderType;
  entry_value: string;
  entry_value_end: string;
  stop_value: string;
  profit_taking_1: string;
  profit_taking_2: string;
  profit_taking_3: string;
  open_leverage: string;
  tags: string;
  note: string;
}

const EMPTY: Draft = {
  coin_name: '',
  category: 'futures',
  position: 'long',
  order_type: 'limit',
  entry_value: '',
  entry_value_end: '',
  stop_value: '',
  profit_taking_1: '',
  profit_taking_2: '',
  profit_taking_3: '',
  open_leverage: '',
  tags: '',
  note: '',
};

export default function NewSetupPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [me, setMe] = useState<{ is_trader?: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ is_trader?: boolean }>('/user/me')
      .then((r) => {
        if (!alive) return;
        setMe(r);
      })
      .catch(() => setMe({}));
    return () => {
      alive = false;
    };
  }, []);

  const n = (k: keyof Draft): number | null => {
    const v = Number(draft[k]);
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const entry = n('entry_value');
  const stop = n('stop_value');
  const tp1 = n('profit_taking_1');
  const tp2 = n('profit_taking_2');
  const tp3 = n('profit_taking_3');
  const entryEnd = n('entry_value_end');

  const symbol = draft.coin_name.trim().toUpperCase();
  const ticker = useTicker(symbol);
  const currentPrice = ticker ? Number(ticker.close) : null;

  const validate = (): string | null => {
    if (!symbol || !/^[A-Z0-9]{3,20}$/.test(symbol)) return 'Coin sembolü geçersiz (örn. BTCUSDT).';
    if (entry == null) return 'Giriş fiyatı pozitif bir sayı olmalı.';
    const isLong = draft.position === 'long';
    if (stop != null) {
      if (isLong && stop >= entry) return 'Long için stop girişin altında olmalı.';
      if (!isLong && stop <= entry) return 'Short için stop girişin üstünde olmalı.';
    }
    if (tp1 != null) {
      if (isLong && tp1 <= entry) return 'Long için TP1 girişin üstünde olmalı.';
      if (!isLong && tp1 >= entry) return 'Short için TP1 girişin altında olmalı.';
    }
    return null;
  };
  const validationError = validate();

  const rr =
    entry != null && stop != null && tp1 != null
      ? Math.abs(tp1 - entry) / Math.abs(entry - stop)
      : null;

  const submit = async (): Promise<void> => {
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      const tagsArr = draft.tags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);
      const lev = Number(draft.open_leverage);
      const r = await api<{ id: string }>('/setup', {
        method: 'POST',
        body: JSON.stringify({
          coin_name: symbol,
          category: draft.category,
          position: draft.position,
          order_type: draft.order_type,
          entry_value: entry,
          entry_value_end: entryEnd,
          stop_value: stop,
          profit_taking_1: tp1,
          profit_taking_2: tp2,
          profit_taking_3: tp3,
          open_leverage: Number.isFinite(lev) && lev > 0 ? lev : null,
          tags: tagsArr,
          note: draft.note.trim() || null,
        }),
      });
      router.push(`/app/setup/${r.id}`);
    } catch (x) {
      setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (me && me.is_trader === false) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <Link href="/app/feed" className="text-xs text-fg-muted hover:text-fg">
          ← Akış
        </Link>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-fg-muted">
          <div className="text-base font-medium text-fg">Trader yetkisi gerekli</div>
          <p className="mt-1">
            Setup paylaşabilmek için trader olman gerekir. Başvuru için{' '}
            <a
              href="mailto:info@bottomup.app?subject=Trader ba%C5%9Fvurusu"
              className="text-brand hover:underline"
            >
              info@bottomup.app
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <Link href="/app/feed" className="text-xs text-fg-muted hover:text-fg">
        ← Akış
      </Link>
      <h1 className="mt-2 text-base font-semibold text-fg">Yeni setup paylaş</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Giriş, stop ve en az bir TP ver. Takipçilerin akışında anında görünür.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Coin (örn. BTCUSDT)">
              <input
                value={draft.coin_name}
                onChange={(e) => setDraft({ ...draft, coin_name: e.target.value.toUpperCase() })}
                placeholder="BTCUSDT"
                className="input uppercase"
              />
            </Field>

            <Field label="Kategori">
              <Segmented
                value={draft.category}
                onChange={(v) => setDraft({ ...draft, category: v as Category })}
                options={[
                  { v: 'futures', l: 'Futures' },
                  { v: 'spot', l: 'Spot' },
                ]}
              />
            </Field>

            <Field label="Yön">
              <Segmented
                value={draft.position}
                onChange={(v) => setDraft({ ...draft, position: v as Direction })}
                options={[
                  { v: 'long', l: 'Long', tone: 'success' },
                  { v: 'short', l: 'Short', tone: 'danger' },
                ]}
              />
            </Field>

            <Field label="Emir tipi">
              <Segmented
                value={draft.order_type}
                onChange={(v) => setDraft({ ...draft, order_type: v as OrderType })}
                options={[
                  { v: 'limit', l: 'Limit' },
                  { v: 'market', l: 'Market' },
                  { v: 'stop', l: 'Stop' },
                ]}
              />
            </Field>

            <Field label="Giriş fiyatı">
              <input
                value={draft.entry_value}
                onChange={(e) => setDraft({ ...draft, entry_value: e.target.value })}
                placeholder={currentPrice ? currentPrice.toString() : '0.00'}
                className="input"
                inputMode="decimal"
              />
            </Field>
            <Field label="Giriş üst sınır (opsiyonel aralık)">
              <input
                value={draft.entry_value_end}
                onChange={(e) => setDraft({ ...draft, entry_value_end: e.target.value })}
                placeholder="0.00"
                className="input"
                inputMode="decimal"
              />
            </Field>

            <Field label="Stop">
              <input
                value={draft.stop_value}
                onChange={(e) => setDraft({ ...draft, stop_value: e.target.value })}
                placeholder="0.00"
                className="input"
                inputMode="decimal"
              />
            </Field>
            <Field label="TP 1">
              <input
                value={draft.profit_taking_1}
                onChange={(e) => setDraft({ ...draft, profit_taking_1: e.target.value })}
                placeholder="0.00"
                className="input"
                inputMode="decimal"
              />
            </Field>
            <Field label="TP 2 (opsiyonel)">
              <input
                value={draft.profit_taking_2}
                onChange={(e) => setDraft({ ...draft, profit_taking_2: e.target.value })}
                placeholder="0.00"
                className="input"
                inputMode="decimal"
              />
            </Field>
            <Field label="TP 3 (opsiyonel)">
              <input
                value={draft.profit_taking_3}
                onChange={(e) => setDraft({ ...draft, profit_taking_3: e.target.value })}
                placeholder="0.00"
                className="input"
                inputMode="decimal"
              />
            </Field>

            {draft.category === 'futures' ? (
              <Field label="Kaldıraç (opsiyonel)">
                <input
                  value={draft.open_leverage}
                  onChange={(e) => setDraft({ ...draft, open_leverage: e.target.value })}
                  placeholder="10"
                  className="input"
                  inputMode="numeric"
                />
              </Field>
            ) : (
              <div />
            )}

            <Field label="Etiketler (virgülle ayır)">
              <input
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                placeholder="scalp, swing, altcoin"
                className="input"
              />
            </Field>
          </div>

          <Field label="Not">
            <textarea
              rows={4}
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="Teknik analiz, tetikleyici olaylar, yönetim kuralları…"
              className="input resize-none"
            />
          </Field>

          {validationError ? (
            <p className="mt-3 text-xs text-amber-300">{validationError}</p>
          ) : null}
          {err ? <p className="mt-2 text-xs text-rose-300">{err}</p> : null}

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-[11px] text-fg-dim">
              {rr != null ? (
                <>
                  Risk/Ödül: <span className="font-mono text-fg">{rr.toFixed(2)}</span>
                </>
              ) : (
                'Giriş + Stop + TP1 ver, R/R otomatik hesaplanır.'
              )}
            </div>
            <button
              disabled={submitting || !!validationError}
              onClick={() => void submit()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white ring-1 ring-brand hover:bg-brand-dark disabled:opacity-60"
            >
              {submitting ? 'Paylaşılıyor…' : 'Paylaş'}
            </button>
          </div>
        </section>

        <aside className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="text-[11px] uppercase tracking-wider text-fg-dim">Önizleme</div>
            {currentPrice != null ? (
              <div className={`font-mono text-sm ${ticker?.color === 'g' ? 'text-emerald-300' : 'text-rose-300'}`}>
                {currentPrice.toLocaleString('en-US', { maximumFractionDigits: 4 })}
              </div>
            ) : null}
          </div>
          {symbol && entry ? (
            <SetupChart
              symbol={symbol}
              entry={entry}
              entryHigh={entryEnd}
              stop={stop}
              tp1={tp1}
              tp2={tp2}
              tp3={tp3}
              position={draft.position}
              height={260}
            />
          ) : (
            <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-fg-dim">
              Coin + giriş fiyatı yazınca grafik görünür.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-fg-muted">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-fg-dim">{label}</span>
      {children}
    </label>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ v: string; l: string; tone?: 'success' | 'danger' }>;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1 ring-1 ring-white/10">
      {options.map((o) => {
        const active = value === o.v;
        const toneClass =
          active && o.tone === 'success'
            ? 'bg-emerald-400/15 text-emerald-300'
            : active && o.tone === 'danger'
              ? 'bg-rose-400/15 text-rose-300'
              : active
                ? 'bg-white/10 text-fg'
                : 'text-fg-muted hover:text-fg';
        return (
          <button
            type="button"
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${toneClass}`}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}
