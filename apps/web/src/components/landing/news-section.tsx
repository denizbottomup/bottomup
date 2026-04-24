import type { LandingPayload } from './landing-data';

export function NewsSection({ news }: { news: LandingPayload['news'] }) {
  if (news.length === 0) return null;

  return (
    <section className="border-y border-border bg-bg-card/30">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
              Haber akışı
            </div>
            <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
              Kripto haberleri, duygu skoruyla birlikte
            </h2>
            <p className="mt-2 max-w-xl text-sm text-fg-muted">
              Her haber pozitif/negatif duygu etiketiyle gelir, ilgili coin'leri
              işaretler. Setup aldığında o coin'e dair son gelişmeleri tek
              tıkla görürsün.
            </p>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {news.slice(0, 6).map((n) => (
            <NewsCard key={n.id} n={n} />
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsCard({ n }: { n: LandingPayload['news'][0] }) {
  const tone =
    n.sentiment === 'positive' || n.sentiment === 'Positive'
      ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
      : n.sentiment === 'negative' || n.sentiment === 'Negative'
        ? 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
        : 'bg-white/5 text-fg-muted ring-white/10';
  return (
    <a
      href={n.url ?? '#'}
      target="_blank"
      rel="noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-bg-card transition hover:border-white/20"
    >
      {n.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={n.image}
          alt=""
          className="h-36 w-full object-cover transition group-hover:scale-[1.02]"
        />
      ) : (
        <div className="h-36 w-full bg-gradient-to-br from-white/5 to-transparent" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-dim">
          {n.source ? <span>{n.source}</span> : null}
          {n.date ? (
            <span>
              · {new Date(n.date).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          ) : null}
          {n.sentiment ? (
            <span className={`rounded-md px-1.5 py-0.5 ring-1 ${tone}`}>
              {n.sentiment}
            </span>
          ) : null}
        </div>
        <h3 className="line-clamp-3 flex-1 text-sm font-medium leading-snug text-fg">
          {n.title ?? '—'}
        </h3>
        {n.tickers.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {n.tickers.slice(0, 4).map((t) => (
              <span
                key={t}
                className="rounded-full bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-fg-muted ring-1 ring-white/10"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </a>
  );
}
