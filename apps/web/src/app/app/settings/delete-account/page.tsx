'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function DeleteAccountPage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canProceed = confirm.trim().toUpperCase() === 'SIL';

  const onDelete = async () => {
    setPending(true);
    setErr(null);
    try {
      await api<{ ok: true }>('/user/me', { method: 'DELETE' });
      await signOut();
      router.replace('/signin');
    } catch (x) {
      setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <Link href="/app/settings" className="text-xs text-fg-muted hover:text-fg">
        ← Ayarlar
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-fg">Hesabı sil</h1>

      <section className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/5 p-5 text-sm text-fg-muted">
        <p className="text-rose-300">Bu işlem geri alınamaz.</p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Profil bilgilerin 30 gün içinde kalıcı olarak silinir.</li>
          <li>Paylaştığın setup'lar arşivlenir; takipçilerinle bağlantı kesilir.</li>
          <li>Aktif bir aboneliğin varsa otomatik yenileme iptal edilmez — önce abonelik sağlayıcısından (App Store / Play Store) iptal etmelisin.</li>
          <li>Aynı e-posta ile yeniden kayıt olabilirsin ama eski verilerin geri gelmez.</li>
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <label className="block text-xs text-fg-muted">
          Devam etmek için <code className="font-mono text-rose-300">SIL</code> yaz
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="SIL"
            className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 font-mono text-sm text-fg placeholder:text-fg-dim focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
          />
        </label>
        {err ? <p className="mt-3 text-xs text-rose-300">{err}</p> : null}
        <div className="mt-4 flex items-center justify-end gap-2">
          <Link href="/app/settings" className="btn-ghost text-sm">
            Vazgeç
          </Link>
          <button
            onClick={() => void onDelete()}
            disabled={!canProceed || pending}
            className="rounded-lg bg-rose-500 px-3 py-2 text-sm font-medium text-white ring-1 ring-rose-500 hover:bg-rose-600 disabled:opacity-40"
          >
            {pending ? 'Siliniyor…' : 'Hesabı kalıcı olarak sil'}
          </button>
        </div>
      </section>
    </div>
  );
}
