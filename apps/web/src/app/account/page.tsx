'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Logo } from '@/components/logo';
import { useAuth } from '@/lib/auth-context';

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/signin');
  }, [loading, user, router]);

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

        <section className="mt-8 rounded-2xl border border-brand/30 bg-brand/5 p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-[11px] text-brand">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            Web app coming soon
          </div>
          <h2 className="mt-3 text-xl font-semibold text-fg">
            Your account is ready. Continue on mobile for now.
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            The BottomUP web app is under active development. In the meantime
            you can access all setups, Foxy AI notes, and your team from the
            iOS and Android apps using this same account.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="https://apps.apple.com/tr/app/bottomup-social/id1661474993"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost px-3 py-2 text-xs"
            >
              App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.bottomup.bottomupapp"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost px-3 py-2 text-xs"
            >
              Google Play
            </a>
          </div>
        </section>

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
