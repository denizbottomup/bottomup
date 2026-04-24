type CellValue = boolean | 'partial';

const ROWS: Array<{
  feature: string;
  bup: CellValue;
  etoro: CellValue;
  public: CellValue;
  threec: CellValue;
  kryll: CellValue;
  zignaly: CellValue;
}> = [
  { feature: 'AI risk firewall (Foxy AI)', bup: true, etoro: false, public: false, threec: false, kryll: false, zignaly: false },
  { feature: 'Multi-asset (Crypto + TradFi)', bup: true, etoro: true, public: true, threec: false, kryll: false, zignaly: false },
  { feature: 'AI agent marketplace', bup: true, etoro: false, public: false, threec: false, kryll: false, zignaly: false },
  { feature: 'Bot marketplace', bup: true, etoro: false, public: false, threec: true, kryll: true, zignaly: false },
  { feature: 'Human trader copying', bup: true, etoro: true, public: false, threec: false, kryll: false, zignaly: true },
  { feature: 'No exchange dependency', bup: true, etoro: false, public: false, threec: true, kryll: true, zignaly: true },
  { feature: 'Creator economy (shops)', bup: true, etoro: false, public: false, threec: false, kryll: 'partial', zignaly: false },
  { feature: 'Social content (Shorts / Live)', bup: true, etoro: true, public: true, threec: false, kryll: false, zignaly: false },
  { feature: 'Regulatory (Delaware / VARA)', bup: true, etoro: true, public: true, threec: false, kryll: false, zignaly: false },
];

const COLS = [
  { id: 'bup', label: 'bupcore', sub: '' },
  { id: 'etoro', label: 'eToro', sub: 'Social finance' },
  { id: 'public', label: 'Public', sub: 'Social finance' },
  { id: 'threec', label: '3Commas', sub: 'Algo/bot' },
  { id: 'kryll', label: 'Kryll', sub: 'Algo/bot' },
  { id: 'zignaly', label: 'Zignaly', sub: 'Portfolio mgmt' },
] as const;

export function CompetitiveSection() {
  return (
    <section id="compare" className="border-y border-border bg-bg-card/30">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
            Landscape
          </div>
          <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
            The only platform that audits what you copy.
          </h2>
          <p className="mt-3 text-sm text-fg-muted md:text-base">
            eToro, Public, 3Commas, Kryll, Zignaly — none of them run an
            AI firewall on incoming signals. Bupcore is built on it.
          </p>
        </header>

        <div className="mt-10 overflow-x-auto rounded-2xl border border-border bg-bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-fg-dim">
                <th className="px-4 py-3 text-left font-medium">Feature</th>
                {COLS.map((c) => (
                  <th
                    key={c.id}
                    className={`px-3 py-3 text-center font-medium ${
                      c.id === 'bup' ? 'text-brand' : ''
                    }`}
                  >
                    <div className="whitespace-nowrap">{c.label}</div>
                    {c.sub ? (
                      <div className="mt-0.5 text-[9px] normal-case text-fg-dim">
                        {c.sub}
                      </div>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.feature} className="border-t border-white/5">
                  <td className="px-4 py-3 text-fg">{r.feature}</td>
                  <Cell value={r.bup} primary />
                  <Cell value={r.etoro} />
                  <Cell value={r.public} />
                  <Cell value={r.threec} />
                  <Cell value={r.kryll} />
                  <Cell value={r.zignaly} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Cell({
  value,
  primary,
}: {
  value: CellValue;
  primary?: boolean;
}) {
  if (value === 'partial') {
    return (
      <td className="px-3 py-3 text-center text-[11px] text-amber-300">
        Partial
      </td>
    );
  }
  const yes = value === true;
  return (
    <td className="px-3 py-3 text-center">
      {yes ? (
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
            primary
              ? 'bg-brand/20 text-brand ring-1 ring-brand/40'
              : 'bg-emerald-400/10 text-emerald-300'
          }`}
        >
          ✓
        </span>
      ) : (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-xs text-fg-dim">
          ✕
        </span>
      )}
    </td>
  );
}
