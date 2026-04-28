'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';

interface AuthGateProps {
  children: ReactNode;
  /**
   * What to render to logged-out viewers. Two presets cover most
   * cases:
   *   - `'leaderboard-blur'`: 6 placeholder cards behind a blur with
   *     a centered "Sign up free" CTA. Used by the landing
   *     leaderboard section.
   *   - a custom node: full control.
   */
  fallback?: 'leaderboard-blur' | ReactNode;
  /**
   * Skeleton rendered while the Firebase listener is still resolving
   * the auth state on first paint. Keeps the section from flashing
   * the fallback before we know who the viewer is.
   */
  loading?: ReactNode;
}

/**
 * Render `children` only when the viewer is authenticated. Anonymous
 * viewers see the `fallback` (defaults to a leaderboard-style
 * paywall). Used to gate sections of the marketing landing that need
 * a free signup before the data shows up.
 */
export function AuthGate({ children, fallback, loading }: AuthGateProps) {
  const { user, loading: authLoading } = useAuth();
  if (authLoading) return <>{loading ?? null}</>;
  if (user) return <>{children}</>;
  if (fallback === 'leaderboard-blur' || fallback === undefined) {
    return <LeaderboardPaywall />;
  }
  return <>{fallback}</>;
}

/**
 * Default fallback for the landing leaderboard. Six blurred cards
 * with a centered overlay nudging the visitor to sign up — all the
 * trader data is now behind that wall.
 */
function LeaderboardPaywall() {
  return (
    <div className="relative">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 pointer-events-none select-none blur-sm opacity-60">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-bg-card p-5 h-[260px]"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/10" />
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-white/10" />
                <div className="h-2 w-16 rounded bg-white/5" />
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <div className="h-8 w-32 rounded bg-white/10" />
              <div className="h-2 w-20 rounded bg-white/5" />
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="h-12 rounded bg-white/5" />
                <div className="h-12 rounded bg-white/5" />
                <div className="h-12 rounded bg-white/5" />
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/5" />
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-2xl border border-border bg-bg-card/95 backdrop-blur-md px-6 py-8 text-center shadow-2xl max-w-md">
          <div className="mono-label !text-fg-dim">Premium signal access</div>
          <h3 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">
            Sign up free to see the live leaderboard
          </h3>
          <p className="mt-2 text-sm text-fg-muted">
            Watch elite traders run on a virtual $10,000 — every trade,
            every R, every win streak. Free accounts get every 5th
            trade unlocked.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="https://trade.bupcore.ai/signup"
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-black hover:bg-brand/90"
            >
              Sign up free →
            </Link>
            <Link
              href="https://trade.bupcore.ai/signin"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-fg hover:border-white/25"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
