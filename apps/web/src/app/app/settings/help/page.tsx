'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Topic {
  slug: string;
  title: string;
  body: string;
}

const TOPICS: Topic[] = [
  {
    slug: 'what-is-setup',
    title: 'Setup nedir?',
    body:
      "Setup, bir trader'ın paylaştığı işlem fikridir — hangi coin, long/short, giriş fiyatı, " +
      "stop, bir veya birden fazla TP (kar alma) seviyesi içerir. Trader'ı takipteysen yeni " +
      'setup paylaştığında Akış sekmenin üstünde görünür.',
  },
  {
    slug: 'statuses',
    title: 'Durum (status) etiketleri',
    body:
      'Fırsat: giriş henüz tetiklenmemiş, bekleyen emir. Aktif: giriş fiyatı değmiş, pozisyon açık. ' +
      'Başarılı: TP vuruldu. Kapandı: trader elle kapattı. Stop: stop vuruldu. İptal: trader iptal etti.',
  },
  {
    slug: 'follow',
    title: 'Trader takibi ve bildirimler',
    body:
      "Bir trader'ı takibe aldığında yeni setup'ları Akış sekmende üstte çıkar. Bildirim " +
      'almak için ayrıca Bildirimler ayarının açık olması gerekir. Engellediğin trader\'ın ' +
      'paylaşımları sana gözükmez.',
  },
  {
    slug: 'copy-trade',
    title: 'Kopya trade nedir?',
    body:
      "Kopya trade, takip ettiğin bir trader'ın açtığı pozisyonları otomatik olarak kendi OKX " +
      'hesabında açmak demektir. Kopya Trade ekranından takım oluşturup trader ekleyebilirsin. ' +
      'OKX API anahtarı sadece okuma+işlem yetkisiyle kısıtlı olmalı; para çekme yetkisi ASLA verme.',
  },
  {
    slug: 'foxy',
    title: 'Foxy AI nedir?',
    body:
      'Foxy AI, kripto/trade konularında sohbet edebileceğin bir asistan. Bir setup detayını ' +
      'açtığında ekstra olarak o setup için risk skoru (0-100) ve yorum üretir. Bu yorum ' +
      'tavsiye değil, ek bir bakış açısıdır.',
  },
  {
    slug: 'breakeven',
    title: 'Stop girişe çekildi (breakeven) ne demek?',
    body:
      'Trader setup girişi vurduktan sonra stop fiyatını giriş seviyesine taşıdıysa, pozisyon ' +
      'artık risksizdir — kötü durumda bile sıfır kârla kapanır. Foxy AI bu durumu otomatik ' +
      'tespit edip risk skorunu düşürür.',
  },
  {
    slug: 'watchlist',
    title: 'Watchlist',
    body:
      "Bir setup'ın sağ üstündeki ★ simgesine basarak onu Watchlist'ine ekleyebilirsin. " +
      "Watchlist sekmesinde yıldızladığın tüm setup'lar tek yerde durur.",
  },
  {
    slug: 'tag',
    title: 'Etiketler',
    body:
      "Bazı setup'lar etiketlenir (ör. #scalp, #swing, #altcoin). Etikete tıklayınca o etiketle " +
      "paylaşılmış tüm setup'lar listelenir.",
  },
  {
    slug: 'delete-account',
    title: 'Hesabımı nasıl silerim?',
    body:
      'Profil → Düzenle ekranının altında "Hesabı sil" seçeneği hesabını ve tüm setup geçmişini ' +
      'kalıcı siler. Bu işlem geri alınamaz. Bağlı aktif bir aboneliğin varsa önce iptal etmeniz gerekir.',
  },
  {
    slug: 'api-key',
    title: 'OKX API key nasıl oluştururum?',
    body:
      'OKX → Profil → API → Create new key. Permissions: Read + Trade. Withdraw yetkisini kesinlikle ' +
      "VERMEYİN. IP whitelist boş bırakılabilir (Railway IP'lerimiz dinamik). API key, secret ve " +
      'passphrase\'i Kopya Trade → Bağlantı ekranında gir.',
  },
  {
    slug: 'find-uid',
    title: 'OKX UID nasıl bulunur?',
    body:
      'OKX uygulamasında Profil → Settings → Account → UID. Bu numarayı Kopya Trade bağlantısında ' +
      'kullanırız.',
  },
  {
    slug: 'trader-apply',
    title: "Trader olmak istiyorum",
    body:
      'Trader başvurusu şu an uygulama içinden değil, destek ekibi üzerinden alınıyor. ' +
      'info@bottomup.app adresine geçmiş performansın ve hedeflerinle yazabilirsin.',
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <Link href="/app/settings" className="text-xs text-fg-muted hover:text-fg">
        ← Ayarlar
      </Link>
      <h1 className="mt-2 text-base font-semibold text-fg">Yardım konuları</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Çok sorulan başlıklar. Aradığını bulamadıysan Foxy AI'a sorabilirsin.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {TOPICS.map((t) => {
          const isOpen = open === t.slug;
          return (
            <li key={t.slug} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
              <button
                onClick={() => setOpen(isOpen ? null : t.slug)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-fg transition hover:bg-white/[0.02]"
              >
                <span>{t.title}</span>
                <span className="text-fg-dim">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen ? (
                <div className="border-t border-white/5 px-4 py-3 text-sm leading-relaxed text-fg-muted">
                  {t.body}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
