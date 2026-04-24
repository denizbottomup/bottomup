'use client';

import Link from 'next/link';

const GROUPS: Array<{
  title: string;
  items: Array<{ href: string; label: string; desc?: string; external?: boolean }>;
}> = [
  {
    title: 'Hesap',
    items: [
      { href: '/app/profile', label: 'Profil', desc: 'İsim, bio, sosyal linkler.' },
      { href: '/app/profile/following', label: 'Takip ettiklerim' },
      { href: '/app/profile/archive', label: 'Arşivim' },
      { href: '/app/profile/subscription', label: 'Aboneliklerim' },
      { href: '/app/settings/blocked', label: 'Engellenenler' },
      { href: '/app/settings/voucher', label: 'Kupon kodu' },
    ],
  },
  {
    title: 'Uygulama',
    items: [
      { href: '/app/notifications', label: 'Bildirimler' },
      { href: '/app/settings/plans', label: 'Planları incele' },
      { href: '/app/settings/about', label: 'Hakkında' },
    ],
  },
  {
    title: 'Yardım',
    items: [
      { href: '/app/settings/help', label: 'Yardım konuları' },
      { href: '/app/settings/terms', label: 'Kullanım şartları' },
      { href: '/app/settings/privacy', label: 'Gizlilik' },
    ],
  },
  {
    title: 'Tehlikeli bölge',
    items: [
      { href: '/app/settings/delete-account', label: 'Hesabı sil', desc: 'Bu işlem geri alınamaz.' },
    ],
  },
];

export default function SettingsIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <h1 className="text-base font-semibold text-fg">Ayarlar</h1>
      <div className="mt-4 flex flex-col gap-5">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="text-[11px] uppercase tracking-wider text-fg-muted">{g.title}</h2>
            <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
              {g.items.map((item, i) => {
                const isLast = i === g.items.length - 1;
                const cls = `flex items-center justify-between px-4 py-3 text-sm text-fg transition hover:bg-white/[0.02] ${
                  isLast ? '' : 'border-b border-white/5'
                }`;
                const body = (
                  <>
                    <div>
                      <div>{item.label}</div>
                      {item.desc ? (
                        <div className="mt-0.5 text-[11px] text-fg-dim">{item.desc}</div>
                      ) : null}
                    </div>
                    <span className="text-fg-dim">→</span>
                  </>
                );
                return item.external ? (
                  <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className={cls}>
                    {body}
                  </a>
                ) : (
                  <Link key={item.href} href={item.href} className={cls}>
                    {body}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
