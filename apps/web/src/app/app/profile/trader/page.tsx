'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface TraderProfile {
  id: string;
  cover_image: string | null;
  content: string | null;
  links: Array<{ label: string; url: string }>;
  referral_code: string | null;
  is_trader: boolean;
  viewer: {
    is_self: boolean;
  };
}

interface Me {
  id: string;
  is_trader: boolean;
}

interface LinkDraft {
  label: string;
  url: string;
}

export default function TraderProfileEditPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<TraderProfile | null>(null);
  const [cover, setCover] = useState('');
  const [content, setContent] = useState('');
  const [links, setLinks] = useState<LinkDraft[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copyToast, setCopyToast] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const m = await api<Me>('/user/me');
        if (!alive) return;
        setMe(m);
        if (!m.is_trader) return;
        const p = await api<TraderProfile>(`/trader/${m.id}`);
        if (!alive) return;
        setProfile(p);
        setCover(p.cover_image ?? '');
        setContent(p.content ?? '');
        setLinks((p.links ?? []).map((l) => ({ label: l.label, url: l.url })));
      } catch (x) {
        if (!alive) return;
        setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const save = useCallback(async () => {
    if (!me) return;
    setSaving(true);
    setErr(null);
    try {
      const cleanedLinks = links
        .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
        .filter((l) => l.url.length > 0);
      const updated = await api<TraderProfile>('/trader/me', {
        method: 'PATCH',
        body: JSON.stringify({
          cover_image: cover.trim() || null,
          content: content.trim() || null,
          links: cleanedLinks,
        }),
      });
      setProfile(updated);
      setLinks(updated.links.map((l) => ({ label: l.label, url: l.url })));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (x) {
      setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
    } finally {
      setSaving(false);
    }
  }, [me, cover, content, links]);

  const copyReferral = useCallback(async () => {
    if (!profile?.referral_code) return;
    const url = `${window.location.origin}/signup?ref=${profile.referral_code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 1600);
    } catch {
      /* ignore */
    }
  }, [profile]);

  if (err && !profile && !me) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <BackLink />
        <p className="mt-4 text-sm text-rose-300">Profil yüklenemedi: {err}</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <BackLink />
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-white/[0.02]" />
      </div>
    );
  }

  if (!me.is_trader) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <BackLink />
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-12 text-center">
          <div className="text-base font-medium text-fg">Trader yetkisi gerekli</div>
          <p className="mt-2 text-sm text-fg-muted">
            Bu sayfa sadece onaylı trader hesaplarında görünür.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <BackLink />
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-fg">Trader profili</h1>
        {profile ? (
          <Link
            href={`/app/trader/${profile.id}`}
            className="text-xs text-fg-muted hover:text-fg"
          >
            Kamuya açık görünüm →
          </Link>
        ) : null}
      </div>

      {profile?.referral_code ? (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-fg">Referans kodun</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-bg-card px-2 py-1 font-mono text-sm text-brand ring-1 ring-brand/30">
              {profile.referral_code}
            </code>
            <button
              onClick={() => void copyReferral()}
              className="rounded-md bg-white/5 px-2 py-1 text-xs text-fg-muted ring-1 ring-white/10 hover:text-fg"
            >
              {copyToast ? 'Kopyalandı ✓' : 'Kayıt linkini kopyala'}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-fg-dim">
            Kayıt sırasında bu kodu kullanan kullanıcıların abonelik gelirinden pay alırsın.
          </p>
        </section>
      ) : null}

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-fg">Hakkında</h2>
        <label className="mt-3 block text-xs text-fg-muted">
          Kapak görseli (URL)
          <input
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
        {cover ? (
          <div
            className="mt-3 h-28 rounded-xl ring-1 ring-white/10 bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(11,13,16,0.75) 100%), url(${cover})`,
            }}
          />
        ) : null}

        <label className="mt-4 block text-xs text-fg-muted">
          Kısa açıklama
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Kendinden / stratejinden bahset"
            className="mt-1 w-full resize-none rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <div className="mt-1 text-right text-[10px] text-fg-dim">
            {content.length} / 4000
          </div>
        </label>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">Linkler</h2>
          <button
            onClick={() =>
              setLinks((prev) =>
                prev.length >= 12 ? prev : [...prev, { label: '', url: '' }],
              )
            }
            className="rounded-md bg-white/5 px-2 py-1 text-xs text-fg-muted ring-1 ring-white/10 hover:text-fg"
          >
            + Link ekle
          </button>
        </div>
        {links.length === 0 ? (
          <p className="mt-3 text-xs text-fg-dim">Henüz link eklemedin.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {links.map((l, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  value={l.label}
                  onChange={(e) =>
                    setLinks((prev) =>
                      prev.map((p, idx) => (idx === i ? { ...p, label: e.target.value } : p)),
                    )
                  }
                  placeholder="Başlık"
                  className="w-40 rounded-lg border border-border bg-bg-card px-2 py-1.5 text-xs text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none"
                />
                <input
                  value={l.url}
                  onChange={(e) =>
                    setLinks((prev) =>
                      prev.map((p, idx) => (idx === i ? { ...p, url: e.target.value } : p)),
                    )
                  }
                  placeholder="https://…"
                  className="min-w-[180px] flex-1 rounded-lg border border-border bg-bg-card px-2 py-1.5 font-mono text-xs text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none"
                />
                <button
                  onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                  className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-fg-dim ring-1 ring-white/10 hover:text-rose-300"
                  aria-label="Kaldır"
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-[10px] text-fg-dim">
          Yalnızca http(s) ile başlayan linkler kaydedilir. En fazla 12 adet.
        </p>
      </section>

      {err ? <p className="mt-3 text-xs text-rose-300">{err}</p> : null}
      <div className="mt-4 flex items-center justify-end gap-2">
        {saved ? <span className="text-[11px] text-emerald-300">Kaydedildi ✓</span> : null}
        <button
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white ring-1 ring-brand hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/app/profile" className="text-xs text-fg-muted hover:text-fg">
      ← Profile dön
    </Link>
  );
}
