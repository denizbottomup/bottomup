'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/lib/auth-context';
import { getFirebaseAuth, signInWithGoogle, signInWithApple } from '@/lib/firebase';
import { AuthCard } from '@/components/auth-card';

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/app');
  }, [loading, user, router]);

  const onEmailSignUp = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    } catch (x) {
      setErr((x as Error).message.replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Hesap oluştur"
      subtitle="30 saniyede başla"
      footer={
        <>
          Hesabın var mı?{' '}
          <Link href="/signin" className="text-brand hover:underline">
            Giriş yap
          </Link>
        </>
      }
    >
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => void signInWithGoogle().catch((x) => setErr((x as Error).message))}
          disabled={busy}
          className="btn-ghost w-full py-3"
        >
          Google ile devam et
        </button>
        <button
          type="button"
          onClick={() => void signInWithApple().catch((x) => setErr((x as Error).message))}
          disabled={busy}
          className="btn-ghost w-full py-3"
        >
          Apple ile devam et
        </button>
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs text-fg-dim">
          <span className="px-2 bg-bg-card">veya e-posta ile</span>
        </div>
      </div>

      <form onSubmit={onEmailSignUp} className="space-y-3">
        <input
          type="email"
          placeholder="E-posta"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          type="password"
          placeholder="Şifre (en az 6 karakter)"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
        <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
          {busy ? 'Hesap oluşturuluyor…' : 'Hesap oluştur'}
        </button>
        <p className="text-xs text-fg-dim text-center">
          Devam ederek{' '}
          <a href="https://www.bottomup.app/term_of_services" target="_blank" rel="noreferrer" className="underline hover:text-fg">
            şartları
          </a>{' '}
          ve{' '}
          <a href="https://www.bottomup.app/privacy_policy" target="_blank" rel="noreferrer" className="underline hover:text-fg">
            gizliliği
          </a>{' '}
          kabul etmiş sayılırsın.
        </p>
      </form>
    </AuthCard>
  );
}
