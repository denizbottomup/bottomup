'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/logo';
import { useAuth } from '@/lib/auth-context';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

interface Entitlement {
  tier: 'free' | 'trial' | 'premium';
  expires_at: string | null;
  is_trial: boolean;
}

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, signOut, getIdToken } = useAuth();
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/signin');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const token = await getIdToken();
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/me/entitlement`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = (await res.json()) as Entitlement;
        if (alive) setEntitlement(json);
      } catch {
        // Soft fail — entitlement card just stays empty.
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, getIdToken]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-fg-muted">
        Yükleniyor…
      </div>
    );
  }

  const display = user.displayName || user.email || user.phoneNumber || '—';

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-4 md:px-8">
          <Link href="/">
            <Logo variant="lockup" size="sm" />
          </Link>
          <button
            onClick={() => void signOut().then(() => router.replace('/'))}
            className="btn-ghost"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-4 py-16 md:px-8">
        <div className="flex items-center gap-4">
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt=""
              className="h-16 w-16 rounded-full object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-2xl font-semibold text-fg ring-1 ring-white/10">
              {display[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-fg md:text-3xl">
              Welcome{user.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}!
            </h1>
            <p className="mt-1 text-sm text-fg-muted">{display}</p>
          </div>
        </div>

        <SubscriptionCard entitlement={entitlement} />

        <section className="mt-4 rounded-2xl border border-border bg-bg-card/40 p-6 text-sm">
          <h3 className="font-semibold text-fg">Account info</h3>
          <dl className="mt-3 grid grid-cols-1 gap-y-2 md:grid-cols-2">
            <Row label="Email" value={user.email ?? '—'} />
            <Row label="Phone" value={user.phoneNumber ?? '—'} />
            <Row
              label="Provider"
              value={user.providerData.map((p) => p.providerId.replace('.com', '')).join(', ') || 'password'}
            />
            <Row
              label="Member since"
              value={
                user.metadata.creationTime
                  ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—'
              }
            />
          </dl>
        </section>

        <div className="mt-6 flex items-center justify-between text-xs text-fg-dim">
          <Link href="/" className="hover:text-fg">
            ← Home
          </Link>
          <span>We'll email you when web access goes live.</span>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.02] px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wider text-fg-dim">{label}</dt>
      <dd className="truncate text-right text-fg">{value}</dd>
    </div>
  );
}

function SubscriptionCard({
  entitlement,
}: {
  entitlement: { tier: 'free' | 'trial' | 'premium'; expires_at: string | null; is_trial: boolean } | null;
}) {
  // Loading: skeleton card.
  if (!entitlement) {
    return (
      <section className="mt-8 rounded-2xl border border-border bg-bg-card/40 p-6">
        <div className="h-5 w-40 rounded bg-white/5" />
        <div className="mt-3 h-3 w-64 rounded bg-white/5" />
      </section>
    );
  }

  if (entitlement.tier === 'free') {
    return (
      <section className="mt-8 rounded-2xl border border-brand/30 bg-brand/5 p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-[11px] text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Free plan
        </div>
        <h2 className="mt-3 text-xl font-semibold text-fg">
          You're on the free plan.
        </h2>
        <p className="mt-2 text-sm text-fg-muted">
          Free accounts see every 5th trade unlocked, get a 20% slice of
          new copy trades, and 5 Bup AI queries per week. Premium opens
          all of it — every trade, every signal, full auto-copy, and
          higher AI query limits.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href="https://apps.apple.com/tr/app/bottomup-social/id1661474993"
            target="_blank"
            rel="noreferrer"
            className="btn-primary px-4 py-2 text-xs"
          >
            Upgrade on App Store →
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=com.bottomup.bottomupapp"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost px-3 py-2 text-xs"
          >
            Upgrade on Google Play
          </a>
        </div>
        <p className="mt-3 text-[11px] text-fg-dim">
          Web payments are coming soon. For now, premium subscriptions
          are managed from the iOS / Android apps using the same
          account.
        </p>
      </section>
    );
  }

  const expiresFmt = entitlement.expires_at
    ? new Date(entitlement.expires_at).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  const isTrial = entitlement.tier === 'trial' || entitlement.is_trial;
  return (
    <section className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.04] p-6">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {isTrial ? 'Trial · Premium access' : 'Premium'}
      </div>
      <h2 className="mt-3 text-xl font-semibold text-fg">
        {isTrial
          ? 'You’re on a premium trial.'
          : 'You’re on the premium plan.'}
      </h2>
      <p className="mt-2 text-sm text-fg-muted">
        Every trade unlocked, full auto-copy on every signal, higher
        Bup AI quota. Renews / expires on{' '}
        <span className="text-fg font-medium">{expiresFmt}</span>.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href="https://apps.apple.com/tr/app/bottomup-social/id1661474993"
          target="_blank"
          rel="noreferrer"
          className="btn-ghost px-3 py-2 text-xs"
        >
          Manage on App Store
        </a>
        <a
          href="https://play.google.com/store/apps/details?id=com.bottomup.bottomupapp"
          target="_blank"
          rel="noreferrer"
          className="btn-ghost px-3 py-2 text-xs"
        >
          Manage on Google Play
        </a>
      </div>
    </section>
  );
}
