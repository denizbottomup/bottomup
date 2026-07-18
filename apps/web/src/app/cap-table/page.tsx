import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
  ROUND_CAPS,
  aggregateInvestors,
  founders,
  transactions,
} from './data';
import {
  CapitalRaisedChart,
  OwnershipChart,
  type OwnershipSegment,
  type RaisePoint,
} from './charts';

export const metadata: Metadata = {
  title: 'Cap Table — Bottomup',
  robots: { index: false, follow: false },
};

/**
 * Cap Table — hissedar yapısı. Statik veri data.ts'ten gelir; sayfa
 * hesaplamaların hepsini oradan türetir ki tek işlem eklemek tabloyu
 * baştan aşağı güncellesin. Bilerek liste dışı (unlisted): login yok,
 * navigasyondan link verilmez, noindex — sayfayı sadece linki bilen açar.
 * Sayfa dili İngilizce (yatırımcılarla paylaşılıyor).
 */
export default function CapTablePage() {
  const investors = aggregateInvestors(transactions);
  const investorShare = investors.reduce((s, r) => s + r.share, 0);
  const investorTotalUsd = investors.reduce((s, r) => s + r.totalUsd, 0);
  const round1Usd = investors.reduce((s, r) => s + r.round1Usd, 0);
  const round2Usd = investors.reduce((s, r) => s + r.round2Usd, 0);
  const founderShare = founders.reduce((s, f) => s + f.share, 0);
  const unallocated = 1 - founderShare - investorShare;

  const sortedTxs = [...transactions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const ownershipSegments: OwnershipSegment[] = [
    ...founders.map((f) => ({
      label: f.name,
      share: f.share,
      kind: f.pool ? ('esop' as const) : ('founder' as const),
    })),
    { label: 'Investors', share: investorShare, kind: 'investor' },
    { label: 'Unallocated', share: unallocated, kind: 'unallocated' },
  ];

  let running = 0;
  const raisePoints: RaisePoint[] = sortedTxs.map((t) => {
    running += t.amountUsd;
    return {
      date: t.date,
      investor: t.investor,
      amountUsd: t.amountUsd,
      cumulativeUsd: running,
      round: t.round,
    };
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-col gap-1 border-b border-border px-4 py-4 md:px-8 md:py-5">
        <div className="mono-label !text-brand">Cap Table · Ownership</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
          Who owns Bottomup?
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          Founding team, employee stock pool, and the investors across two SAFE
          rounds. Investor stakes are computed on a post-money basis: stake % =
          investment / valuation cap.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Total invested" value={usd(investorTotalUsd)} />
            <StatTile label="Founders + ESOP" value={pct(founderShare)} />
            <StatTile label="Investors" value={pct(investorShare)} />
            <StatTile label="Unallocated" value={pct(unallocated)} />
          </div>

          <Card title="Ownership breakdown">
            <div className="px-5 py-4">
              <OwnershipChart segments={ownershipSegments} />
            </div>
          </Card>

          <Card
            title="Capital raised"
            hint={`${usd(investorTotalUsd)} across ${sortedTxs.length} checks`}
          >
            <div className="px-5 py-4">
              <CapitalRaisedChart points={raisePoints} />
            </div>
          </Card>

          <Card title="Founders & employee pool">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-fg-dim">
                  <th className="px-5 py-2 font-medium">Shareholder</th>
                  <th className="px-5 py-2 text-right font-medium">Stake</th>
                </tr>
              </thead>
              <tbody>
                {founders.map((f) => (
                  <tr key={f.name} className="border-t border-border">
                    <td className="px-5 py-2.5">
                      {f.name}
                      {f.pool ? (
                        <span className="ml-2 rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-fg-dim">
                          Pool
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono">
                      {pct(f.share)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border font-bold">
                  <td className="px-5 py-2.5">Total</td>
                  <td className="px-5 py-2.5 text-right font-mono">
                    {pct(founderShare)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>

          <Card
            title="Investors"
            hint={`Round 1: ${usd(ROUND_CAPS[1])} cap (2024) · Round 2: ${usd(ROUND_CAPS[2])} cap (2025–2026)`}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-fg-dim">
                  <th className="px-5 py-2 font-medium">Investor</th>
                  <th className="px-5 py-2 text-right font-medium">Round 1</th>
                  <th className="px-5 py-2 text-right font-medium">Round 2</th>
                  <th className="px-5 py-2 text-right font-medium">Total</th>
                  <th className="px-5 py-2 text-right font-medium">Stake</th>
                </tr>
              </thead>
              <tbody>
                {investors.map((r) => (
                  <tr key={r.name} className="border-t border-border">
                    <td className="px-5 py-2.5">{r.name}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-fg-muted">
                      {r.round1Usd ? usd(r.round1Usd) : '—'}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-fg-muted">
                      {r.round2Usd ? usd(r.round2Usd) : '—'}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono">
                      {usd(r.totalUsd)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono">
                      {pct(r.share)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border font-bold">
                  <td className="px-5 py-2.5">Total</td>
                  <td className="px-5 py-2.5 text-right font-mono">
                    {usd(round1Usd)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono">
                    {usd(round2Usd)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono">
                    {usd(investorTotalUsd)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono">
                    {pct(investorShare)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>

          <Card title="Transaction history" hint={`${sortedTxs.length} checks`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-fg-dim">
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Investor</th>
                  <th className="px-5 py-2 text-right font-medium">Amount</th>
                  <th className="px-5 py-2 text-right font-medium">Cap</th>
                  <th className="px-5 py-2 text-right font-medium">Stake</th>
                </tr>
              </thead>
              <tbody>
                {sortedTxs.map((t, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-5 py-2.5 font-mono text-fg-muted">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-5 py-2.5">{t.investor}</td>
                    <td className="px-5 py-2.5 text-right font-mono">
                      {usd(t.amountUsd)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-fg-muted">
                      {usdShort(t.valuationCapUsd)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono">
                      {pct(t.amountUsd / t.valuationCapUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <p className="text-[11px] leading-relaxed text-fg-dim">
            Founder and ESOP allocations as declared by the founders (July
            2026). Investor stakes are derived from the transaction list under a
            post-money SAFE assumption; actual conversion terms are governed by
            the round documents. This page is unlisted — only people with the
            link can see it.
          </p>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3">
        <h2 className="text-sm font-bold">{title}</h2>
        {hint ? <div className="text-[11px] text-fg-dim">{hint}</div> : null}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold font-mono">{value}</div>
    </div>
  );
}

function usd(n: number): string {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function usdShort(n: number): string {
  return n >= 1e6 ? `$${(n / 1e6).toLocaleString('en-US')}M` : usd(n);
}

function pct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
