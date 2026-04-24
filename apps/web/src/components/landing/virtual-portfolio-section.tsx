import Link from 'next/link';

const TRADE = process.env.NEXT_PUBLIC_TRADE_URL ?? '';

export function VirtualPortfolioSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-[140px]" />
      </div>
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_560px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/15 px-3 py-1 text-xs text-brand">
              <span className="font-mono font-bold">$10,000</span> · sanal kasa
              herkese hediye
            </div>
            <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl lg:text-5xl">
              Para koymadan dene.{' '}
              <span className="text-brand">Kazandığında</span> canlıya geç.
            </h2>
            <p className="mt-5 max-w-xl text-base text-fg-muted">
              Üye olur olmaz hesabına <strong className="text-fg">10.000$</strong>{' '}
              sanal kasa yatırıyoruz. Sen de Bottomup'taki en iyi trader'lardan
              bir takım kuruyorsun. Takımın setup'ları kasada canlı çalışıyor;
              30 gün sonunda performansı kara kara üstünde görüyorsun.
            </p>

            <ol className="mt-8 space-y-3">
              <Step
                n="1"
                title="10.000$ sanal kasa"
                body="Üye olduğunda otomatik tanımlanır. Kredi kartı istemiyoruz."
              />
              <Step
                n="2"
                title="Takımını kur"
                body="6 trader'a kadar seç. Her birinin açtığı setup kasanda long/short olarak açılır."
              />
              <Step
                n="3"
                title="30 gün izle"
                body="Gerçek fiyatlarla simüle edilir. Kazançlar, kayıplar, R/R, drawdown — her şey gerçek gibi."
              />
              <Step
                n="4"
                title="Canlıya geç"
                body="Sonuçtan memnunsan OKX'e Bottomup ref'iyle üye ol, API'ni bağla, aynı takımla gerçek trade'e devam et."
              />
            </ol>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`${TRADE}/signup`}
                className="btn-primary px-5 py-3 text-base"
              >
                Kasayı al — ücretsiz
              </Link>
              <Link
                href="#pricing"
                className="btn-ghost px-5 py-3 text-base"
              >
                Fiyatları gör
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-border bg-bg-card/80 p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-fg-dim">
                  Sanal Kasam
                </div>
                <span className="rounded-md bg-brand/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-brand ring-1 ring-brand/30">
                  30 gün sürüyor
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-semibold text-fg">$12,847</span>
                <span className="font-mono text-sm text-emerald-300">+28.47%</span>
              </div>
              <div className="mt-1 text-[11px] text-fg-dim">
                12 Mart — 11 Nisan 2026 · 23 kapanan işlem
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <MiniStat label="Başarı" value="%71" tone="success" />
                <MiniStat label="Ort. R/R" value="1.8" tone="neutral" />
                <MiniStat label="Max DD" value="-%4.2" tone="danger" />
              </div>

              <div className="mt-5 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-fg-dim">
                  Takımım
                </div>
                <MockTraderRow
                  name="Özgür T."
                  tone="emerald"
                  value="+$2,104"
                />
                <MockTraderRow
                  name="Cansu K."
                  tone="emerald"
                  value="+$1,388"
                />
                <MockTraderRow name="Mert Y." tone="rose" value="-$645" />
              </div>

              <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs text-emerald-200">
                ✓ Canlıya geçmeye hazırsın — OKX'te bottomUP ref'iyle üye ol
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15 font-mono text-sm font-semibold text-brand ring-1 ring-brand/30">
        {n}
      </span>
      <div>
        <div className="text-sm font-semibold text-fg">{title}</div>
        <div className="mt-0.5 text-[13px] text-fg-muted">{body}</div>
      </div>
    </li>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'danger' | 'neutral';
}) {
  const t =
    tone === 'success'
      ? 'text-emerald-300'
      : tone === 'danger'
        ? 'text-rose-300'
        : 'text-fg';
  return (
    <div className="rounded-lg bg-white/[0.03] p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div className={`mt-0.5 text-base font-semibold ${t}`}>{value}</div>
    </div>
  );
}

function MockTraderRow({
  name,
  tone,
  value,
}: {
  name: string;
  tone: 'emerald' | 'rose';
  value: string;
}) {
  const t = tone === 'emerald' ? 'text-emerald-300' : 'text-rose-300';
  const initial = name[0]?.toUpperCase() ?? '?';
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] px-3 py-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-[10px] font-semibold text-fg ring-1 ring-white/10">
        {initial}
      </div>
      <span className="flex-1 text-xs text-fg">{name}</span>
      <span className={`font-mono text-xs ${t}`}>{value}</span>
    </div>
  );
}
