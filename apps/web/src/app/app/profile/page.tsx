'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, api } from '@/lib/api';

interface Me {
  id: string;
  email: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  instagram: string | null;
  telegram: string | null;
  twitter: string | null;
  is_trader: boolean;
  is_admin: boolean;
  monthly_roi: string | null;
}

type Editable = Pick<
  Me,
  'name' | 'first_name' | 'last_name' | 'instagram' | 'telegram' | 'twitter' | 'monthly_roi'
>;

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Editable | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    api<Me>('/user/me')
      .then((r) => {
        if (!alive) return;
        setMe(r);
      })
      .catch((x) => {
        if (!alive) return;
        setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
      });
    return () => {
      alive = false;
    };
  }, []);

  const startEdit = useCallback(() => {
    if (!me) return;
    setDraft({
      name: me.name,
      first_name: me.first_name,
      last_name: me.last_name,
      instagram: me.instagram,
      telegram: me.telegram,
      twitter: me.twitter,
      monthly_roi: me.monthly_roi,
    });
    setEditing(true);
    setSaved(false);
  }, [me]);

  const save = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setErr(null);
    try {
      const updated = await api<Me>('/user/me', {
        method: 'PATCH',
        body: JSON.stringify(draft),
      });
      setMe(updated);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (x) {
      setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
    } finally {
      setSaving(false);
    }
  }, [draft]);

  if (err && !me) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <p className="text-sm text-rose-300">Profil yüklenemedi: {err}</p>
      </div>
    );
  }
  if (!me) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <div className="h-40 animate-pulse rounded-2xl bg-white/[0.02]" />
      </div>
    );
  }

  const displayName =
    me.name || [me.first_name, me.last_name].filter(Boolean).join(' ').trim() || me.email || '—';

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        {me.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.image} alt="" className="h-20 w-20 rounded-full object-cover ring-1 ring-white/10" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-2xl font-semibold text-fg ring-1 ring-white/10">
            {displayName[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-fg truncate">{displayName}</h1>
            {me.is_trader ? (
              <span className="rounded-md bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand ring-1 ring-brand/30">
                Trader
              </span>
            ) : null}
            {me.is_admin ? (
              <span className="rounded-md bg-rose-400/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300 ring-1 ring-rose-400/30">
                Admin
              </span>
            ) : null}
          </div>
          {me.email ? <div className="mt-0.5 text-sm text-fg-muted">{me.email}</div> : null}
          {me.is_trader ? (
            <Link
              href={`/app/trader/${me.id}`}
              className="mt-2 inline-block text-xs text-brand hover:underline"
            >
              Kamuya açık trader sayfamı gör →
            </Link>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          {!editing ? (
            <button onClick={startEdit} className="btn-ghost text-sm">
              Düzenle
            </button>
          ) : null}
          {saved ? <span className="text-[11px] text-emerald-300">Kaydedildi ✓</span> : null}
        </div>
      </div>

      {editing && draft ? (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-fg">Profili düzenle</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field
              label="İsim"
              value={draft.first_name ?? ''}
              onChange={(v) => setDraft({ ...draft, first_name: v })}
              placeholder="Adın"
            />
            <Field
              label="Soyisim"
              value={draft.last_name ?? ''}
              onChange={(v) => setDraft({ ...draft, last_name: v })}
              placeholder="Soyadın"
            />
            <Field
              label="Kullanıcı adı"
              value={draft.name ?? ''}
              onChange={(v) => setDraft({ ...draft, name: v })}
              placeholder="örn. deniz"
            />
            <Field
              label="Aylık ROI"
              value={draft.monthly_roi ?? ''}
              onChange={(v) => setDraft({ ...draft, monthly_roi: v })}
              placeholder="%12"
            />
            <Field
              label="Twitter / X"
              value={draft.twitter ?? ''}
              onChange={(v) => setDraft({ ...draft, twitter: v })}
              placeholder="@kullanici"
            />
            <Field
              label="Telegram"
              value={draft.telegram ?? ''}
              onChange={(v) => setDraft({ ...draft, telegram: v })}
              placeholder="@kullanici"
            />
            <Field
              label="Instagram"
              value={draft.instagram ?? ''}
              onChange={(v) => setDraft({ ...draft, instagram: v })}
              placeholder="@kullanici"
            />
          </div>
          {err ? <p className="mt-3 text-xs text-rose-300">{err}</p> : null}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setEditing(false);
                setDraft(null);
                setErr(null);
              }}
              className="btn-ghost text-sm"
            >
              İptal
            </button>
            <button
              onClick={() => void save()}
              disabled={saving}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white ring-1 ring-brand hover:bg-brand-dark disabled:opacity-60"
            >
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </section>
      ) : (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-fg">Profil bilgileri</h2>
          <dl className="mt-3 grid grid-cols-1 gap-y-2 text-sm md:grid-cols-2 md:gap-x-6">
            <Row label="İsim" value={me.first_name} />
            <Row label="Soyisim" value={me.last_name} />
            <Row label="Kullanıcı adı" value={me.name} />
            <Row label="Aylık ROI" value={me.monthly_roi} tone="success" />
            <Row label="Twitter / X" value={me.twitter} />
            <Row label="Telegram" value={me.telegram} />
            <Row label="Instagram" value={me.instagram} />
          </dl>
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-fg">Hızlı erişim</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <QuickLink href="/app/watchlist" label="Watchlist" />
          <QuickLink href="/app/notifications" label="Bildirimler" />
          <QuickLink href="/app/profile/following" label="Takip ettiklerim" />
          <QuickLink href="/app/profile/archive" label="Arşivim" />
          <QuickLink href="/app/together" label="Kopya trade" />
          <QuickLink href="/app/profile/subscription" label="Aboneliklerim" />
          {me.is_trader ? (
            <>
              <QuickLink href="/app/profile/trader" label="Trader profili" />
              <QuickLink href="/app/profile/followers" label="Takipçilerim" />
              <QuickLink href="/app/profile/earnings" label="Trader kazançlarım" />
            </>
          ) : null}
          <QuickLink href="/app/settings" label="Ayarlar" />
          <QuickLink href="/app/settings/help" label="Yardım" />
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs text-fg-muted">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}

function Row({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string | null;
  tone?: 'neutral' | 'success';
}) {
  const toneClass = tone === 'success' ? 'text-emerald-300' : 'text-fg';
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wider text-fg-dim">{label}</dt>
      <dd className={`truncate text-right text-sm ${value ? toneClass : 'text-fg-dim'}`}>
        {value || '—'}
      </dd>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-fg-muted transition hover:border-white/20 hover:text-fg"
    >
      <span>{label}</span>
      <span className="text-fg-dim">→</span>
    </Link>
  );
}
