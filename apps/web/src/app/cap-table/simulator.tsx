'use client';

import { useMemo, useState } from 'react';
import { fundingPlan, valuationWalk } from './financials';

/**
 * Yatırımcı getiri simülatörü. Üç girdi: yatırım tutarı, giriş
 * (post-money) değerlemesi, exit değerlemesi. Çıktı: hisse, exit'teki
 * değer, kâr ve kat — hem dilüsyonsuz hem planlanan sonraki turların
 * dilüsyonu düşülmüş halde. Dilüsyon çarpanı funding planındaki
 * "equity sold" oranlarından türetilir: girilen değerlemeden SONRAKİ
 * her tur için (1 - satılan hisse) çarpımı.
 */

const EXIT_PRESETS = [
  { label: 'Low · 3.3× revenue', valuation: 147_000_000 },
  { label: 'Base · 5.25× revenue', valuation: 234_000_000 },
  { label: 'High · 7.2× revenue', valuation: 321_000_000 },
];

function fmtUsd(n: number): string {
  if (!isFinite(n)) return '—';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

/** Girilen post-money'den sonra gelmesi planlanan turların dilüsyonu. */
function retentionAfterEntry(entryValuation: number): number {
  return fundingPlan
    .filter((r) => r.postMoneyUsdM * 1e6 > entryValuation)
    .reduce((acc, r) => acc * (1 - r.equitySold), 1);
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-fg-dim">
          {label}
        </span>
        {hint ? <span className="text-[10px] text-fg-dim">{hint}</span> : null}
      </div>
      <div className="mt-1 flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.min(max, Math.max(min, value))}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-brand"
        />
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-32 rounded-lg border border-border bg-bg px-2 py-1.5 text-right font-mono text-sm text-fg outline-none focus:border-brand/60"
        />
      </div>
      <div className="mt-1 text-right font-mono text-xs text-fg-muted">
        {fmtUsd(value)}
      </div>
    </label>
  );
}

export function InvestorSimulator() {
  const [investment, setInvestment] = useState(100_000);
  const [valuation, setValuation] = useState(
    valuationWalk.seedPostMoneyUsdM * 1e6,
  );
  const [exit, setExit] = useState(
    Math.round(valuationWalk.exitValuationUsdM) * 1e6,
  );

  const r = useMemo(() => {
    if (valuation <= 0 || investment <= 0 || exit <= 0) return null;
    const stake = Math.min(1, investment / valuation);
    const retention = retentionAfterEntry(valuation);
    const gross = stake * exit;
    const diluted = stake * retention * exit;
    return {
      stake,
      retention,
      gross,
      grossMultiple: gross / investment,
      diluted,
      dilutedMultiple: diluted / investment,
      dilutedProfit: diluted - investment,
    };
  }, [investment, valuation, exit]);

  return (
    <div className="grid gap-6 px-5 py-4 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <NumberField
          label="Your investment"
          value={investment}
          onChange={setInvestment}
          min={10_000}
          max={5_000_000}
          step={10_000}
        />
        <NumberField
          label="Entry valuation (post-money)"
          value={valuation}
          onChange={setValuation}
          min={5_000_000}
          max={200_000_000}
          step={1_000_000}
          hint={`planned seed: $${valuationWalk.seedPostMoneyUsdM}M`}
        />
        <NumberField
          label="Exit valuation"
          value={exit}
          onChange={setExit}
          min={20_000_000}
          max={1_000_000_000}
          step={5_000_000}
          hint="model exit: FY31"
        />
        <div className="flex flex-wrap gap-2">
          {EXIT_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setExit(p.valuation)}
              className={`rounded-full border px-3 py-1 text-[11px] transition ${
                exit === p.valuation
                  ? 'border-brand/60 bg-brand/10 text-brand'
                  : 'border-white/10 text-fg-muted hover:border-white/25 hover:text-fg'
              }`}
            >
              {p.label} · {fmtUsd(p.valuation)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col justify-center gap-3 rounded-xl border border-border bg-bg p-4">
        {r ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-fg-muted">Ownership at entry</span>
              <span className="font-mono font-bold">
                {(r.stake * 100).toFixed(3)}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-fg-muted">
                Value at exit (no dilution)
              </span>
              <span className="font-mono font-bold">
                {fmtUsd(r.gross)}{' '}
                <span className="text-fg-dim">
                  ({r.grossMultiple.toFixed(1)}×)
                </span>
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-fg-muted">
                After planned rounds dilute you to{' '}
                {(r.stake * r.retention * 100).toFixed(3)}%
              </span>
              <span className="font-mono font-bold text-brand">
                {fmtUsd(r.diluted)}{' '}
                <span className="text-fg-dim">
                  ({r.dilutedMultiple.toFixed(1)}×)
                </span>
              </span>
            </div>
            <div className="mt-1 border-t border-border pt-3 text-sm leading-relaxed text-fg-muted">
              {fmtUsd(investment)} at a {fmtUsd(valuation)} post-money buys{' '}
              <span className="font-mono text-fg">
                {(r.stake * 100).toFixed(3)}%
              </span>
              . If Bottomup exits at {fmtUsd(exit)}, that stake returns{' '}
              <span className="font-mono text-fg">{fmtUsd(r.diluted)}</span>{' '}
              after the planned follow-on rounds — a profit of{' '}
              <span className="font-mono text-fg">
                {fmtUsd(r.dilutedProfit)}
              </span>{' '}
              ({r.dilutedMultiple.toFixed(1)}× your money).
            </div>
          </>
        ) : (
          <div className="text-sm text-fg-muted">
            Enter positive amounts to see the outcome.
          </div>
        )}
      </div>
    </div>
  );
}
