'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { useAuth } from '@/lib/auth-context';
import { getFirebaseAuth, signInWithGoogle, signInWithApple } from '@/lib/firebase';
import { AuthCard } from '@/components/auth-card';

type Mode = 'email' | 'phone';

export default function SignInPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+90');
  const [otp, setOtp] = useState('');
  const [confirmer, setConfirmer] = useState<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/account');
  }, [loading, user, router]);

  const onEmailSignIn = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    } catch (x) {
      setErr((x as Error).message.replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  };

  const ensureRecaptcha = (): RecaptchaVerifier => {
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
    const auth = getFirebaseAuth();
    const verifier = new RecaptchaVerifier(auth, recaptchaRef.current!, {
      size: 'invisible',
    });
    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  const onPhoneSend = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const verifier = ensureRecaptcha();
      const c = await signInWithPhoneNumber(getFirebaseAuth(), phone.trim(), verifier);
      setConfirmer(c);
    } catch (x) {
      setErr((x as Error).message.replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  };

  const onPhoneVerify = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!confirmer) return;
    setErr(null);
    setBusy(true);
    try {
      await confirmer.confirm(otp.trim());
    } catch (x) {
      setErr((x as Error).message.replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  };

  const onOAuth = async (provider: 'google' | 'apple'): Promise<void> => {
    setErr(null);
    setBusy(true);
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithApple();
    } catch (x) {
      setErr((x as Error).message.replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Tekrar hoş geldin"
      subtitle="Hesabına giriş yap"
      footer={
        <>
          Hesabın yok mu?{' '}
          <Link href="/signup" className="text-brand hover:underline">
            Kayıt ol
          </Link>
        </>
      }
    >
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => void onOAuth('google')}
          disabled={busy}
          className="btn-ghost w-full py-3"
        >
          <GoogleIcon /> Google ile devam et
        </button>
        <button
          type="button"
          onClick={() => void onOAuth('apple')}
          disabled={busy}
          className="btn-ghost w-full py-3"
        >
          <AppleIcon /> Apple ile devam et
        </button>
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs text-fg-dim">
          <span className="px-2 bg-bg-card">veya</span>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-1 rounded-lg bg-white/5 p-1 ring-1 ring-white/10">
        <button
          type="button"
          onClick={() => {
            setMode('email');
            setConfirmer(null);
            setErr(null);
          }}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            mode === 'email' ? 'bg-bg-card text-fg ring-1 ring-white/10' : 'text-fg-muted'
          }`}
        >
          E-posta
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('phone');
            setErr(null);
          }}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            mode === 'phone' ? 'bg-bg-card text-fg ring-1 ring-white/10' : 'text-fg-muted'
          }`}
        >
          Telefon
        </button>
      </div>

      {mode === 'email' ? (
        <form onSubmit={onEmailSignIn} className="space-y-3">
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
            placeholder="Şifre"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
          <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>
        </form>
      ) : !confirmer ? (
        <form onSubmit={onPhoneSend} className="space-y-3">
          <input
            type="tel"
            placeholder="+90 555 123 4567"
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            required
          />
          <p className="text-[11px] text-fg-dim">
            Ülke koduyla birlikte yaz (örn. +90).
          </p>
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
          <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Kod gönderiliyor…' : 'Kod gönder'}
          </button>
        </form>
      ) : (
        <form onSubmit={onPhoneVerify} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            placeholder="SMS kodu"
            className="input font-mono tracking-widest"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            required
          />
          <p className="text-[11px] text-fg-dim">
            {phone} numarasına gönderilen 6 haneli kodu gir.
          </p>
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
          <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Doğrulanıyor…' : 'Doğrula'}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmer(null);
              setOtp('');
            }}
            className="w-full text-xs text-fg-muted hover:text-fg"
          >
            Numarayı değiştir
          </button>
        </form>
      )}

      <div ref={recaptchaRef} className="mt-3" />
    </AuthCard>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.83.87-3.05.87-2.35 0-4.33-1.58-5.04-3.72H.96v2.33A9 9 0 009 18z" fill="#34A853" />
      <path d="M3.96 10.71A5.41 5.41 0 013.68 9c0-.6.1-1.17.28-1.71V4.96H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.04l3-2.33z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 009 0 9 9 0 00.96 4.96l3 2.33C4.67 5.16 6.65 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="fill-current">
      <path d="M11.18 8.41c-.02-1.78 1.45-2.64 1.52-2.68-.83-1.22-2.12-1.38-2.58-1.4-1.1-.11-2.14.65-2.7.65-.56 0-1.42-.63-2.33-.62-1.2.02-2.31.7-2.93 1.77-1.25 2.17-.32 5.37.9 7.13.6.86 1.31 1.83 2.23 1.8.9-.04 1.24-.58 2.33-.58 1.09 0 1.4.58 2.35.56.97-.02 1.59-.88 2.18-1.74.69-1 .97-1.97.98-2.02-.02-.01-1.88-.72-1.9-2.87zM9.48 3.16c.5-.6.83-1.44.74-2.28-.72.03-1.59.48-2.1 1.08-.46.53-.86 1.39-.75 2.21.8.06 1.61-.41 2.11-1.01z" />
    </svg>
  );
}
