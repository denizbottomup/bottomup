'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ApiError, api } from '@/lib/api';

export default function AppHome() {
  const { user } = useAuth();
  const [me, setMe] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api<Record<string, unknown>>('/user/me')
      .then((data) => setMe(data))
      .catch((x) => {
        if (x instanceof ApiError && x.status === 404) {
          setErr('Henüz bottomUP profili oluşturulmamış. İlk kayıt akışı gerekiyor.');
        } else {
          setErr((x as Error).message);
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center gap-3">
        {user?.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="h-12 w-12 rounded-full" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center text-brand font-semibold">
            {(user?.displayName || user?.email || '?')[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <div className="font-semibold">{user?.displayName || user?.email}</div>
          <div className="text-sm text-fg-muted">Firebase uid: {user?.uid.slice(0, 12)}…</div>
        </div>
      </div>

      <div className="mt-8 card p-6">
        <h2 className="font-semibold">API bağlantısı</h2>
        {loading ? (
          <p className="mt-2 text-sm text-fg-muted">/user/me sorgulanıyor…</p>
        ) : err ? (
          <p className="mt-2 text-sm text-red-400">{err}</p>
        ) : (
          <pre className="mt-3 overflow-auto rounded-md border border-border bg-bg p-3 text-xs text-fg-muted">
            {JSON.stringify(me, null, 2)}
          </pre>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Analitik', desc: 'BTC dominance, F&G, likidasyonlar', soon: true },
          { title: 'Setup\'lar', desc: "Trader'ların paylaştığı setup akışı", soon: true },
          { title: 'Foxy AI', desc: 'Portföy ve setup analizleri', soon: true },
        ].map((f) => (
          <div key={f.title} className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{f.title}</h3>
              {f.soon ? (
                <span className="text-[10px] uppercase tracking-wider text-brand/80 border border-brand/30 rounded px-1.5 py-0.5">
                  yakında
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-fg-muted">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
