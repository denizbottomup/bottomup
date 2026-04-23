'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <Link href="/app/settings" className="text-xs text-fg-muted hover:text-fg">
        ← Ayarlar
      </Link>
      <h1 className="mt-2 text-base font-semibold text-fg">Hakkında</h1>

      <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-fg-muted">
        <p>
          bottomUP, trader'ların fikir paylaştığı, takipçilerin bu fikirleri takip edip
          kopyalayabileceği bir kripto topluluğu.
        </p>
        <p>
          Burada gördüğün setup'lar yatırım tavsiyesi değildir. Her trader kendi sorumluluğunda paylaşır,
          sen de kendi sorumluluğunda takip edersin.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          <Row label="Sürüm" value="bupcore web — 2026.04" />
          <Row label="Mobil sürüm" value="2.2.1 (iOS) / build 166" />
          <Row label="Stack" value="Next.js 15 · NestJS 11 · Railway" />
          <Row label="Kaynaklar" value={<ExternalLinks />} />
        </dl>
      </div>

      <p className="mt-6 text-center text-[11px] text-fg-dim">
        © {new Date().getFullYear()} bottomUP
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-fg-dim">{label}</dt>
      <dd className="text-right text-xs text-fg">{value}</dd>
    </div>
  );
}

function ExternalLinks() {
  return (
    <span className="space-x-2">
      <a
        href="https://www.bottomup.app/term_of_services"
        target="_blank"
        rel="noreferrer"
        className="text-brand hover:underline"
      >
        Şartlar
      </a>
      <a
        href="https://www.bottomup.app/privacy_policy"
        target="_blank"
        rel="noreferrer"
        className="text-brand hover:underline"
      >
        Gizlilik
      </a>
    </span>
  );
}
