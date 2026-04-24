'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface TeamInfo {
  id: string | null;
  name: string | null;
  trader_count: number;
}

interface TeamMember {
  team_trader_id: string;
  trader_id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  added_at: string | null;
}

interface Suggestion {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  monthly_roi: string | null;
  followers: number;
}

export default function TeamAdminPage() {
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, m, s] = await Promise.all([
        api<TeamInfo>('/copy_trade/team'),
        api<{ items: TeamMember[] }>('/copy_trade/team/members'),
        api<{ items: Suggestion[] }>('/user/me/suggestion?limit=10'),
      ]);
      setTeam(t);
      setMembers(m.items);
      setSuggestions(s.items);
      setNameDraft(t.name ?? '');
    } catch (x) {
      setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rename = async () => {
    if (!nameDraft.trim()) return;
    setPending(true);
    setErr(null);
    try {
      const updated = await api<TeamInfo>('/copy_trade/team', {
        method: 'PATCH',
        body: JSON.stringify({ name: nameDraft.trim() }),
      });
      setTeam(updated);
    } catch (x) {
      setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
    } finally {
      setPending(false);
    }
  };

  const add = async (traderId: string) => {
    try {
      await api<{ ok: true }>(`/copy_trade/team/trader/${traderId}`, { method: 'PUT' });
      await load();
    } catch (x) {
      setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
    }
  };

  const remove = async (traderId: string) => {
    if (!window.confirm("Trader takımdan çıkarılsın mı?")) return;
    try {
      await api<{ ok: true }>(`/copy_trade/team/trader/${traderId}`, { method: 'DELETE' });
      await load();
    } catch (x) {
      setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
    }
  };

  if (team == null || members == null) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <Link href="/app/together" className="text-xs text-fg-muted hover:text-fg">
          ← Kopya trade
        </Link>
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-white/[0.02]" />
      </div>
    );
  }

  const currentIds = new Set(members.map((m) => m.trader_id));
  const filteredSuggestions = (suggestions ?? []).filter((s) => !currentIds.has(s.id));

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <Link href="/app/together" className="text-xs text-fg-muted hover:text-fg">
        ← Kopya trade
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-fg">Takımımı yönet</h1>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-fg">Takım adı</h2>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Takımım"
            maxLength={60}
            className="flex-1 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <button
            onClick={() => void rename()}
            disabled={pending || nameDraft.trim() === (team.name ?? '').trim()}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white ring-1 ring-brand hover:bg-brand-dark disabled:opacity-60"
          >
            Kaydet
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-fg">
          Üyeler {members.length > 0 ? `(${members.length})` : ''}
        </h2>
        {members.length === 0 ? (
          <p className="mt-2 text-xs text-fg-dim">Takımında henüz trader yok.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {members.map((m) => {
              const display =
                m.name ||
                [m.first_name, m.last_name].filter(Boolean).join(' ').trim() ||
                '—';
              return (
                <div
                  key={m.team_trader_id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
                >
                  {m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-fg ring-1 ring-white/10">
                      {display[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <Link
                    href={`/app/trader/${m.trader_id}`}
                    className="flex-1 truncate text-sm text-fg hover:text-brand"
                  >
                    {display}
                  </Link>
                  <button
                    onClick={() => void remove(m.trader_id)}
                    className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-fg-dim ring-1 ring-white/10 hover:text-rose-300"
                  >
                    Çıkar
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {filteredSuggestions.length > 0 ? (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-fg">Takıma ekle</h2>
          <p className="mt-1 text-xs text-fg-muted">
            Önerilen trader'lar:
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {filteredSuggestions.map((s) => {
              const display =
                s.name ||
                [s.first_name, s.last_name].filter(Boolean).join(' ').trim() ||
                '—';
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
                >
                  {s.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-fg ring-1 ring-white/10">
                      {display[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-fg">{display}</div>
                    <div className="text-[11px] text-fg-dim">
                      {s.followers} takipçi
                      {s.monthly_roi ? ` · ROI ${s.monthly_roi}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => void add(s.id)}
                    className="rounded-md bg-brand/15 px-2 py-1 text-[11px] text-brand ring-1 ring-brand/30 hover:bg-brand/20"
                  >
                    Ekle
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {err ? <p className="mt-3 text-xs text-rose-300">{err}</p> : null}
    </div>
  );
}
