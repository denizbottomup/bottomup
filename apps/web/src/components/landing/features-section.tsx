export function FeaturesSection() {
  return (
    <section id="features" className="relative">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
            Ne yapıyoruz
          </div>
          <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
            Sosyal kripto ticareti, tek ekranda
          </h2>
          <p className="mt-2 text-sm text-fg-muted md:text-base">
            Bottomup bir terminal değil — analistlerin çıkardığı setup'ları
            takip etmeni, anlayamadığın yerleri Foxy AI'a sormanı ve hazır
            olduğunda bir tıkla kopya trade yapmanı sağlıyor.
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon="📡"
            title="Canlı trader sinyalleri"
            body="En çok takip edilen analistlerin setup'larını giriş, stop ve TP seviyeleriyle saniyesinde gör. WebSocket üzerinden anlık güncellenir."
          />
          <FeatureCard
            icon="🧠"
            title="Foxy AI risk yorumu"
            body="Her setup'a özel AI analizi: entry-stop uyumu, R/R oranı, breakeven stop tespiti, haberlerle uyum. Sana rakam değil, yorum."
          />
          <FeatureCard
            icon="📊"
            title="Pazar pulsu"
            body="Fear & Greed, BTC dominance, funding rate, likidasyon, açık pozisyon. CoinGlass + Binance canlı veriyle tek panelde."
          />
          <FeatureCard
            icon="🤝"
            title="OKX kopya trade"
            body="Takımın canlıda başarılıysa OKX API'ni bağla, kopya trade worker'ı emirleri senin adına açar. Withdraw yetkisi hiçbir zaman istenmez."
          />
          <FeatureCard
            icon="💬"
            title="7 kanallı sohbet"
            body="Topluluk kanalları — sohbet, setuplar, fikirler, analiz, gem avı, FX, endeksler. Firestore ile gerçek-zaman."
          />
          <FeatureCard
            icon="⭐"
            title="Watchlist + arşiv"
            body="Alkışladığın ve izlediğin setup'lar otomatik arşivlenir. Kapandığında sonucunu hatırlarsın."
          />
          <FeatureCard
            icon="🔔"
            title="Push + web bildirimi"
            body="Takip ettiğin trader yeni emir açtığında telefonuna ya da tarayıcına anında düşer."
          />
          <FeatureCard
            icon="📈"
            title="Trader profili + PnL"
            body="Her trader'ın 180 günlük kümülatif kâr grafiği, win rate'i, risk profili. Gerçek performansı görüp karar ver."
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-bg-card p-5 transition hover:border-white/20">
      <div className="text-3xl">{icon}</div>
      <h3 className="mt-4 text-base font-semibold text-fg">{title}</h3>
      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-fg-muted">
        {body}
      </p>
    </div>
  );
}
