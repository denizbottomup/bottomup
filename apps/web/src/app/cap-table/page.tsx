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
  RevenueEbitdaChart,
  StackedColumnsChart,
  UsersChart,
  type OwnershipSegment,
  type RaisePoint,
} from './charts';
import {
  annualPnl,
  autoTrade,
  balanceSheet,
  exitPlan,
  fundingPlan,
  grossProfit,
  planAssumptions,
  quarterlyActuals,
  totalOpex,
  totalRevenue,
  unitEconomics,
} from './financials';
import { investorProfiles } from './profiles';
import { InvestorSimulator } from './simulator';

export const metadata: Metadata = {
  title: 'Financials and Cap Table — Bottomup',
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
  const ltmRevenue = quarterlyActuals
    .filter((q) => !q.forecast)
    .slice(-4)
    .reduce((s, q) => s + q.subscriptionRevenue + q.tradingRevenue, 0);
  const investors = aggregateInvestors(transactions);
  const investorShare = investors.reduce((s, r) => s + r.share, 0);
  const investorTotalUsd = investors.reduce((s, r) => s + r.totalUsd, 0);
  const round1Usd = investors.reduce((s, r) => s + r.round1Usd, 0);
  const round2Usd = investors.reduce((s, r) => s + r.round2Usd, 0);
  // Kuruluş dağılımı (kurucular + ESOP) 1.0'a tamamlanır; yatırımcı
  // hissesi herkesi orantılı dilüte eder.
  const dilution = 1 - investorShare;
  const founderNet = (share: number) => share * dilution;
  const foundersOnlyNet = founders
    .filter((f) => !f.pool)
    .reduce((s, f) => s + founderNet(f.share), 0);
  const esopNet = founders
    .filter((f) => f.pool)
    .reduce((s, f) => s + founderNet(f.share), 0);
  const founderInitialTotal = founders.reduce((s, f) => s + f.share, 0);

  const sortedTxs = [...transactions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const ownershipSegments: OwnershipSegment[] = [
    ...founders.map((f) => ({
      label: f.name,
      share: founderNet(f.share),
      kind: f.pool ? ('esop' as const) : ('founder' as const),
    })),
    { label: 'Investors', share: investorShare, kind: 'investor' },
  ];

  // Çıkış senaryoları: her turda kümülatif dilüsyon sonrası hissenin o
  // turun post-money değerlemesindeki karşılığı. stake × retention × post
  // = stake × (o turdan sonraki efektif değer) — tek çarpan olarak tutulur.
  let retention = 1;
  const exitStages = fundingPlan.map((r) => {
    retention *= 1 - r.equitySold;
    return {
      name: `${r.name} '${r.timing.slice(2, 4)}`,
      effectiveValueUsd: retention * r.postMoneyUsdM * 1e6,
    };
  });
  exitStages.push({
    name: `Exit $${exitPlan.valuationUsdM / 1000}B '${exitPlan.timing.slice(2, 4)}`,
    effectiveValueUsd: retention * exitPlan.valuationUsdM * 1e6,
  });

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
        <div className="mono-label !text-brand">Bottomup · Investor page</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
          Financials and Cap Table
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          Ownership, actuals, and the five-year plan in one place. Investor
          stakes are computed on a post-money basis (stake % = investment /
          valuation cap); financials follow the FY24A–FY31B model (AY update,
          Jul 2026).
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Total invested" value={usd(investorTotalUsd)} />
            <StatTile label="Founders (net)" value={pct(foundersOnlyNet)} />
            <StatTile label="ESOP (net)" value={pct(esopNet)} />
            <StatTile label="Investors" value={pct(investorShare)} />
          </div>

          <Card
            title="Ownership breakdown"
            hint="Fully diluted · as of Jul 2026 — future rounds will dilute further"
          >
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

          <Card
            title="Founders & employee pool"
            hint="Initial = founding split · Net = after dilution to date (Jul 2026)"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-fg-dim">
                  <th className="px-5 py-2 font-medium">Shareholder</th>
                  <th className="px-5 py-2 text-right font-medium">Initial</th>
                  <th className="px-5 py-2 text-right font-medium">Net after dilution</th>
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
                    <td className="px-5 py-2.5 text-right font-mono text-fg-muted">
                      {pct(f.share)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono">
                      {pct(founderNet(f.share))}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="px-5 py-2.5 text-fg-muted">Investors</td>
                  <td className="px-5 py-2.5 text-right font-mono text-fg-dim">—</td>
                  <td className="px-5 py-2.5 text-right font-mono text-fg-muted">
                    {pct(investorShare)}
                  </td>
                </tr>
                <tr className="border-t border-border font-bold">
                  <td className="px-5 py-2.5">Total</td>
                  <td className="px-5 py-2.5 text-right font-mono">
                    {pct(founderInitialTotal)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono">
                    {pct(founderInitialTotal * dilution + investorShare)}
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

          <Card
            title="Investor profiles"
            hint="Angel investors backing Bottomup · bios via Galata Business Angels"
          >
            <div className="grid gap-x-6 gap-y-5 px-5 py-5 md:grid-cols-2">
              {investorProfiles.map((p) => {
                const inv = investors.find((r) => r.name === p.investorName);
                return (
                  <div key={p.investorName} className="flex gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.photo}
                      alt={p.displayName}
                      width={72}
                      height={72}
                      className="h-[72px] w-[72px] shrink-0 rounded-xl border border-border object-cover"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-bold">{p.displayName}</span>
                        {inv ? (
                          <span className="font-mono text-[11px] text-fg-dim">
                            {usd(inv.totalUsd)} · {pct(inv.share)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                        {p.bio}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="border-t border-border px-5 py-3 text-[11px] text-fg-dim">
              Bios condensed from Galata Business Angels member pages (Jul
              2026). Remaining investors are private individuals without public
              profiles.
            </p>
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

          <SectionHeader
            label="Simulator"
            title="What would your investment return?"
            sub="Pick an investment, an entry valuation, and an exit scenario. Dilution from the planned follow-on rounds is applied automatically."
          />

          <Card title="Investor return simulator" hint="Illustrative only — not an offer">
            <InvestorSimulator />
          </Card>

          <SectionHeader
            label="Traction"
            title="Financial actuals"
            sub="Eight quarters of actuals plus the H2-2026 forecast. Revenue in $k."
          />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="LTM revenue" value={usdK(ltmRevenue)} />
            <StatTile label="MAU (Q2-26)" value={num(13_274)} />
            <StatTile label="Paid users (Q2-26)" value={num(484)} />
            <StatTile
              label={`Auto-trade volume (${autoTrade.latestQuarter})`}
              value={`$${Math.round(autoTrade.volumeUsd / 1e6)}M`}
            />
          </div>

          <Card title="Quarterly revenue" hint="$k · subscription + trading commissions">
            <div className="px-5 py-4">
              <StackedColumnsChart
                columns={quarterlyActuals.map((q) => ({
                  label: q.quarter,
                  forecast: q.forecast,
                  values: [q.subscriptionRevenue, q.tradingRevenue],
                }))}
                series={[
                  { name: 'Subscription', color: '#E56B1A' },
                  { name: 'Trading commissions', color: '#7C5CFF' },
                ]}
              />
            </div>
          </Card>

          <Card title="Quarterly KPIs">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-fg-dim">
                  <th className="px-5 py-2 font-medium">Metric</th>
                  {quarterlyActuals.filter((q) => !q.forecast).map((q) => (
                    <th key={q.quarter} className="px-3 py-2 text-right font-medium">
                      {q.quarter}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['Daily active users', (q: (typeof quarterlyActuals)[number]) => q.dau],
                    ['Monthly active users', (q: (typeof quarterlyActuals)[number]) => q.mau],
                    ['Downloads', (q: (typeof quarterlyActuals)[number]) => q.downloads],
                    ['Paid users', (q: (typeof quarterlyActuals)[number]) => q.paidUsers],
                    ['Team size', (q: (typeof quarterlyActuals)[number]) => q.employees],
                  ] as const
                ).map(([label, pick]) => (
                  <tr key={label} className="border-t border-border">
                    <td className="px-5 py-2.5">{label}</td>
                    {quarterlyActuals.filter((q) => !q.forecast).map((q) => (
                      <td key={q.quarter} className="px-3 py-2.5 text-right font-mono text-fg-muted">
                        {pick(q) == null ? '—' : num(pick(q)!)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Balance sheet" hint="$k · condensed">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-fg-dim">
                  <th className="px-5 py-2 font-medium">$k</th>
                  {balanceSheet.map((c) => (
                    <th key={c.label} className="px-5 py-2 text-right font-medium">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['Cash at bank', (c: (typeof balanceSheet)[number]) => c.cashAtBank],
                    ['Cash at exchanges', (c: (typeof balanceSheet)[number]) => c.cashAtCex],
                    ['Total assets', (c: (typeof balanceSheet)[number]) => c.cashAtBank + c.cashAtCex, true],
                    ['Liabilities', (c: (typeof balanceSheet)[number]) => -c.liabilities],
                    ['Share capital', (c: (typeof balanceSheet)[number]) => c.shareCapital],
                    ['Retained earnings', (c: (typeof balanceSheet)[number]) => c.retainedEarnings],
                  ] as const
                ).map(([label, pick, bold]) => (
                  <tr key={label} className={`border-t border-border ${bold ? 'font-bold' : ''}`}>
                    <td className="px-5 py-2.5">{label}</td>
                    {balanceSheet.map((c) => (
                      <td key={c.label} className={`px-5 py-2.5 text-right font-mono ${bold ? '' : 'text-fg-muted'}`}>
                        {kNum(pick(c))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <SectionHeader
            label="Plan"
            title="Five-year plan (FY27–FY31)"
            sub="Budget scenario funded by the staged raise. Faded bars are plan, solid are actuals."
          />

          <Card title="Revenue & EBITDA" hint="$k · FY24A–FY31B">
            <div className="px-5 py-4">
              <RevenueEbitdaChart
                points={annualPnl.map((y) => ({
                  label: y.year,
                  kind: y.kind,
                  revenue: totalRevenue(y),
                  ebitda: y.ebitda,
                }))}
              />
            </div>
          </Card>

          <Card title="P&L summary" hint="$k · A = actual, F = forecast, B = budget">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-fg-dim">
                  <th className="px-5 py-2 font-medium">$k</th>
                  {annualPnl.map((y) => (
                    <th key={y.year} className="px-3 py-2 text-right font-medium">
                      {y.year}
                      {y.kind === 'actual' ? 'A' : y.kind === 'forecast' ? 'F' : 'B'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['Subscription revenue', (y: (typeof annualPnl)[number]) => y.subscriptionRevenue],
                    ['Trading volume income', (y: (typeof annualPnl)[number]) => y.tradingRevenue],
                    ['In-app purchases', (y: (typeof annualPnl)[number]) => y.inAppRevenue],
                    ['Total revenue', (y: (typeof annualPnl)[number]) => totalRevenue(y), true],
                    ['Cost of sales', (y: (typeof annualPnl)[number]) => y.totalCos],
                    ['Gross profit', (y: (typeof annualPnl)[number]) => grossProfit(y), true],
                    ['Wages & salaries', (y: (typeof annualPnl)[number]) => y.adminWages],
                    ['Marketing', (y: (typeof annualPnl)[number]) => y.marketing],
                    ['Other admin', (y: (typeof annualPnl)[number]) => y.otherAdmin],
                    ['Total OPEX', (y: (typeof annualPnl)[number]) => totalOpex(y), true],
                    ['EBITDA', (y: (typeof annualPnl)[number]) => y.ebitda, true],
                  ] as const
                ).map(([label, pick, bold]) => (
                  <tr key={label} className={`border-t border-border ${bold ? 'font-bold' : ''}`}>
                    <td className="px-5 py-2">{label}</td>
                    {annualPnl.map((y) => (
                      <td key={y.year} className={`px-3 py-2 text-right font-mono ${bold ? '' : 'text-fg-muted'}`}>
                        {kNum(pick(y))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Revenue mix" hint="Share of total revenue per year">
            <div className="px-5 py-4">
              <StackedColumnsChart
                percentMode
                columns={annualPnl.map((y) => ({
                  label: y.year,
                  forecast: y.kind !== 'actual',
                  values: [y.subscriptionRevenue, y.tradingRevenue, y.inAppRevenue],
                }))}
                series={[
                  { name: 'Subscription', color: '#E56B1A' },
                  { name: 'Trading volume', color: '#7C5CFF' },
                  { name: 'In-app purchases', color: '#1FA576' },
                ]}
              />
            </div>
          </Card>

          <Card title="User base" hint="Total registered users, year end">
            <div className="px-5 py-4">
              <UsersChart
                points={annualPnl.map((y) => ({
                  label: y.year,
                  value: y.totalUsers,
                  kind: y.kind,
                }))}
              />
            </div>
          </Card>

          <Card title="Key plan assumptions">
            <ul className="list-disc space-y-1.5 px-5 py-4 pl-10 text-sm text-fg-muted">
              {planAssumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </Card>

          <SectionHeader
            label="Unit economics"
            title="CAC & LTV"
            sub="Current blended figures at ~4:1 LTV/CAC. Net churn 10%/month, ~10-month customer lifespan."
          />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="CAC per active user" value="$54" />
            <StatTile label="LTV" value="$221" />
            <StatTile label="LTV / CAC" value="4.0×" />
            <StatTile label="Net monthly churn" value="10%" />
          </div>

          <Card title="By region">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-fg-dim">
                  <th className="px-5 py-2 font-medium">Region</th>
                  <th className="px-5 py-2 text-right font-medium">CPI</th>
                  <th className="px-5 py-2 text-right font-medium">CAC / AU</th>
                  <th className="px-5 py-2 text-right font-medium">LTV</th>
                  <th className="px-5 py-2 text-right font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {unitEconomics.regions.map((r) => (
                  <tr key={r.region} className={`border-t border-border ${r.region === 'Blended' ? 'font-bold' : ''}`}>
                    <td className="px-5 py-2.5">{r.region}</td>
                    <td className="px-5 py-2.5 text-right font-mono">${r.cpi}</td>
                    <td className="px-5 py-2.5 text-right font-mono">${r.cacPerActiveUser}</td>
                    <td className="px-5 py-2.5 text-right font-mono">${r.ltv}</td>
                    <td className="px-5 py-2.5 text-right font-mono">{r.roas.toFixed(2)}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <SectionHeader
            label="Funding"
            title="Funding plan & valuation"
            sub="Seed $5M at $30M (H2 2026) → Series A $19.5M at $130M (H1 2028) → Series B $50M at $500M (H2 2029), targeting a $1B IPO or sale in H2 2031."
          />

          <Card title="Planned rounds">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-fg-dim">
                  <th className="px-5 py-2 font-medium">Round</th>
                  <th className="px-5 py-2 text-right font-medium">Raise</th>
                  <th className="px-5 py-2 text-right font-medium">Timing</th>
                  <th className="px-5 py-2 text-right font-medium">Est. post-money</th>
                  <th className="px-5 py-2 text-right font-medium">Equity sold</th>
                </tr>
              </thead>
              <tbody>
                {fundingPlan.map((r) => (
                  <tr key={r.name} className="border-t border-border">
                    <td className="px-5 py-2.5">{r.name}</td>
                    <td className="px-5 py-2.5 text-right font-mono">${r.raiseUsdM}M</td>
                    <td className="px-5 py-2.5 text-right font-mono text-fg-muted">{r.timing}</td>
                    <td className="px-5 py-2.5 text-right font-mono">${r.postMoneyUsdM}M</td>
                    <td className="px-5 py-2.5 text-right font-mono">{pct(r.equitySold)}</td>
                  </tr>
                ))}
                <tr className="border-t border-border font-bold">
                  <td className="px-5 py-2.5">Total</td>
                  <td className="px-5 py-2.5 text-right font-mono">
                    ${fundingPlan.reduce((s, r) => s + r.raiseUsdM, 0)}M
                  </td>
                  <td colSpan={3} />
                </tr>
              </tbody>
            </table>
          </Card>

          <Card title="Exit target">
            <div className="grid gap-0 text-sm md:grid-cols-2">
              <ValuationRow label="Target exit valuation" value={`$${exitPlan.valuationUsdM / 1000}B`} bold />
              <ValuationRow label="Exit window" value={exitPlan.timing} />
              <ValuationRow label="Path" value={exitPlan.path} />
              <ValuationRow
                label="Growth from seed post-money"
                value={`${(exitPlan.valuationUsdM / fundingPlan[0]!.postMoneyUsdM).toFixed(1)}×`}
              />
            </div>
          </Card>

          <Card
            title="Investor exit outcomes"
            hint="Value of each current stake if sold in that round, after cumulative dilution"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-fg-dim">
                  <th className="px-5 py-2 font-medium">Investor</th>
                  <th className="px-4 py-2 text-right font-medium">Invested</th>
                  <th className="px-4 py-2 text-right font-medium">Stake</th>
                  {exitStages.map((st) => (
                    <th key={st.name} className="px-4 py-2 text-right font-medium">
                      {st.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {investors.map((r) => (
                  <tr key={r.name} className="border-t border-border">
                    <td className="px-5 py-2.5">{r.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-fg-muted">
                      {usdCompact(r.totalUsd)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-fg-muted">
                      {pct(r.share)}
                    </td>
                    {exitStages.map((st) => (
                      <td key={st.name} className="px-4 py-2.5 text-right font-mono">
                        {usdCompact(r.share * st.effectiveValueUsd)}
                        <span className="ml-1 text-[10px] text-fg-dim">
                          {(r.share * st.effectiveValueUsd / r.totalUsd).toFixed(1)}×
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-border font-bold">
                  <td className="px-5 py-2.5">Total</td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {usdCompact(investorTotalUsd)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {pct(investorShare)}
                  </td>
                  {exitStages.map((st) => (
                    <td key={st.name} className="px-4 py-2.5 text-right font-mono">
                      {usdCompact(investorShare * st.effectiveValueUsd)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="border-t border-border px-5 py-3 text-[11px] leading-relaxed text-fg-dim">
              Each column assumes the investor sells their full stake in that
              round at that round's post-money valuation, after being diluted by
              every round up to and including it. Exit assumes no further rounds
              after Series B. Illustrative only.
            </p>
          </Card>

          <p className="text-[11px] leading-relaxed text-fg-dim">
            Founding split as declared by the founders (July 2026): 50/15/15/10
            across the four founders plus a 10% employee pool, totalling 100%
            pre-investment. Investor stakes are derived from the transaction
            list under a post-money SAFE assumption and dilute founders and the
            pool pro-rata. Net stakes reflect dilution <em>to date</em> only —
            the planned Seed, Series A, and Series B rounds will dilute founders and the pool
            further (see the funding plan and simulator above). Actual
            conversion terms are governed by the round documents. Financials per the "bottomUP Financials
            FY24A–FY31B" model (AY update, Jul 2026): FY24–FY25 audited-basis
            actuals, FY26 forecast, FY27–FY31 budget contingent on the staged
            raise. This page is unlisted — only people with the link can see
            it.
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

function SectionHeader({
  label,
  title,
  sub,
}: {
  label: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mt-6 border-t border-border pt-6">
      <div className="mono-label !text-brand">{label}</div>
      <h2 className="mt-1 text-xl font-extrabold tracking-tight md:text-2xl">
        {title}
      </h2>
      {sub ? <p className="mt-1 max-w-2xl text-sm text-fg-muted">{sub}</p> : null}
    </div>
  );
}

function ValuationRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-t border-border px-5 py-2.5 first:border-t-0 md:[&:nth-child(2)]:border-t-0 ${bold ? 'font-bold' : ''}`}
    >
      <span className={bold ? '' : 'text-fg-muted'}>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
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

function num(n: number): string {
  return n.toLocaleString('en-US');
}

/** $k girdiyi okunur string'e çevirir (68.2 → "68", 7720.29 → "7,720"). */
function kNum(n: number): string {
  const r = Math.round(n);
  if (r === 0 && n === 0) return '—';
  return r.toLocaleString('en-US');
}

/** $k tutarı $ etiketine çevirir (346.43 → "$346K"). */
function usdK(n: number): string {
  return n >= 1000 ? `$${(n / 1000).toFixed(2)}M` : `$${n.toFixed(0)}K`;
}

/** $ tutarı kompakt etikete çevirir (520833 → "$521K", 11.1e6 → "$11.11M"). */
function usdCompact(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
