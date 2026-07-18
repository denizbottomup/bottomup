'use client';

import { useMemo, useRef, useState } from 'react';

/**
 * Cap table grafikleri. Palet dataviz validator'dan geçirildi
 * (dark yüzey #14171B): kurucular #E56B1A, ESOP #7C5CFF, yatırımcılar
 * #1FA576 kategorik üçlü; "unallocated" kasıtlı vurgusuz gri (#64748B)
 * — kimlik sınıfı değil, boşluk. Segment araları 2px, doğrudan etiket
 * + legend + tooltip ikincil kodlama olarak var.
 */

const COLORS = {
  founder: '#E56B1A',
  founderAlt: '#F19457',
  esop: '#7C5CFF',
  investor: '#1FA576',
  unallocated: '#64748B',
  line: '#FF8A4C',
  grid: '#23272D',
  round1: '#E56B1A',
  round2: '#7C5CFF',
};

export interface OwnershipSegment {
  label: string;
  share: number;
  kind: 'founder' | 'esop' | 'investor' | 'unallocated';
}

function pctLabel(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

function usdLabel(n: number): string {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function OwnershipChart({ segments }: { segments: OwnershipSegment[] }) {
  const [hover, setHover] = useState<number | null>(null);

  // Kurucular aynı turuncu ailesinde iki tonla dönüşümlü — kimlik
  // etiket + tooltip'te, ton sadece komşu segmentleri ayırır.
  let founderIdx = 0;
  const fills = segments.map((s) => {
    if (s.kind === 'founder') {
      founderIdx += 1;
      return founderIdx % 2 === 1 ? COLORS.founder : COLORS.founderAlt;
    }
    return COLORS[s.kind];
  });

  return (
    <div>
      <div className="flex h-7 w-full gap-[2px] overflow-hidden rounded-[4px]">
        {segments.map((s, i) => (
          <div
            key={s.label}
            className="relative flex items-center justify-center transition-opacity"
            style={{
              width: `${(s.share * 100).toFixed(2)}%`,
              backgroundColor: fills[i],
              opacity: hover === null || hover === i ? 1 : 0.35,
            }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            {s.share >= 0.08 ? (
              <span className="pointer-events-none select-none text-[10px] font-mono font-bold text-black/70">
                {pctLabel(s.share)}
              </span>
            ) : null}
            {hover === i ? (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-bg-elev px-3 py-1.5 text-xs shadow-lg">
                <span className="text-fg">{s.label}</span>{' '}
                <span className="font-mono text-fg-muted">{pctLabel(s.share)}</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-fg-muted">
        {segments.map((s, i) => (
          <div
            key={s.label}
            className="flex cursor-default items-center gap-1.5"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: fills[i] }}
            />
            {s.label} · <span className="font-mono">{pctLabel(s.share)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface RaisePoint {
  date: string; // ISO
  investor: string;
  amountUsd: number;
  cumulativeUsd: number;
  round: 1 | 2;
}

const W = 640;
const H = 230;
const M = { top: 16, right: 16, bottom: 28, left: 52 };

function usdShortLabel(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}B`; // $k cinsinden girdi
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}M`;
  return `${sign}$${abs.toFixed(0)}K`;
}

export function CapitalRaisedChart({ points }: { points: RaisePoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { path, area, dots, yTicks, xTicks, maxY } = useMemo(() => {
    const t0 = new Date(points[0]!.date).getTime();
    const t1 = new Date(points[points.length - 1]!.date).getTime();
    const span = Math.max(1, t1 - t0);
    const maxRaw = points[points.length - 1]!.cumulativeUsd;
    const maxY = Math.ceil(maxRaw / 100_000) * 100_000;

    const x = (iso: string) =>
      M.left + ((new Date(iso).getTime() - t0) / span) * (W - M.left - M.right);
    const y = (v: number) =>
      H - M.bottom - (v / maxY) * (H - M.top - M.bottom);

    // Step-after: kümülatif toplam her çek yazıldığı gün sıçrar.
    let d = `M ${x(points[0]!.date)} ${y(0)}`;
    let prevY = y(0);
    for (const p of points) {
      const px = x(p.date);
      d += ` L ${px} ${prevY}`;
      prevY = y(p.cumulativeUsd);
      d += ` L ${px} ${prevY}`;
    }
    d += ` L ${W - M.right} ${prevY}`;

    const area = `${d} L ${W - M.right} ${y(0)} Z`;

    const dots = points.map((p, i) => ({
      cx: x(p.date),
      cy: y(p.cumulativeUsd),
      i,
    }));

    const yTicks = [];
    for (let v = 0; v <= maxY; v += 100_000) {
      yTicks.push({ v, y: y(v) });
    }

    // Yıl başları + son nokta.
    const xTicks = [
      { label: '2025', x: x('2025-01-01') },
      { label: '2026', x: x('2026-01-01') },
    ];
    return { path: d, area, dots, yTicks, xTicks, maxY };
  }, [points]);

  const hovered = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Cumulative capital raised over time"
      >
        {yTicks.map((t) => (
          <g key={t.v}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={t.y}
              y2={t.y}
              stroke={COLORS.grid}
              strokeWidth={1}
            />
            <text
              x={M.left - 8}
              y={t.y + 3}
              textAnchor="end"
              fontSize={10}
              fill="#5A616B"
              fontFamily="monospace"
            >
              {t.v === 0 ? '0' : `$${t.v / 1000}K`}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text
            key={t.label}
            x={t.x}
            y={H - M.bottom + 16}
            textAnchor="middle"
            fontSize={10}
            fill="#5A616B"
            fontFamily="monospace"
          >
            {t.label}
          </text>
        ))}

        <path d={area} fill={COLORS.line} opacity={0.1} />
        <path d={path} fill="none" stroke={COLORS.line} strokeWidth={2} />

        {dots.map((d) => (
          <g key={d.i}>
            <circle
              cx={d.cx}
              cy={d.cy}
              r={hover === d.i ? 5 : 3.5}
              fill={points[d.i]!.round === 1 ? COLORS.round1 : COLORS.round2}
              stroke="#14171B"
              strokeWidth={2}
            />
            {/* Görünmez geniş hedef — 20px'lik hover alanı. */}
            <circle
              cx={d.cx}
              cy={d.cy}
              r={10}
              fill="transparent"
              onMouseEnter={() => setHover(d.i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}

        {/* Son değer doğrudan etiketli. */}
        <text
          x={dots[dots.length - 1]!.cx - 6}
          y={dots[dots.length - 1]!.cy - 10}
          textAnchor="end"
          fontSize={11}
          fontWeight={700}
          fill="#E8EAED"
          fontFamily="monospace"
        >
          {usdLabel(points[points.length - 1]!.cumulativeUsd)}
        </text>
      </svg>

      {hovered ? (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-bg-elev px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${((dots[hover!]!.cx / W) * 100).toFixed(1)}%`,
            top: `${((dots[hover!]!.cy / H) * 100).toFixed(1)}%`,
            transform: 'translate(-50%, -130%)',
          }}
        >
          <div className="text-fg">{hovered.investor}</div>
          <div className="font-mono text-fg-muted">
            {new Date(hovered.date).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}{' '}
            · +{usdLabel(hovered.amountUsd)}
          </div>
          <div className="font-mono text-fg">
            Total {usdLabel(hovered.cumulativeUsd)}
          </div>
        </div>
      ) : null}

      <div className="mt-1 flex gap-4 text-[11px] text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.round1 }} />
          Round 1 · $3M cap
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.round2 }} />
          Round 2 · $5M cap
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Finansal grafikler — girdiler $k cinsinden.                         */
/* ------------------------------------------------------------------ */

export interface StackedColumn {
  label: string;
  forecast?: boolean;
  values: number[]; // seri sırasıyla
}

export interface StackedSeries {
  name: string;
  color: string;
}

/**
 * Dikey stacked kolon grafiği — çeyreklik gelir ve yıllık gelir mix'i
 * için ortak. Forecast kolonları yarı saydam çizilir; hover'da kolonun
 * dökümü gösterilir.
 */
export function StackedColumnsChart({
  columns,
  series,
  percentMode = false,
}: {
  columns: StackedColumn[];
  series: StackedSeries[];
  percentMode?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const fmt = usdShortLabel;

  const CW = 640;
  const CH = 230;
  const m = { top: 14, right: 12, bottom: 26, left: percentMode ? 40 : 52 };
  const totals = columns.map((c) => c.values.reduce((s, v) => s + v, 0));
  const maxY = percentMode ? 1 : Math.max(...totals) * 1.08;
  const innerW = CW - m.left - m.right;
  const innerH = CH - m.top - m.bottom;
  const slot = innerW / columns.length;
  const barW = Math.min(38, slot * 0.6);

  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => (maxY / yTickCount) * i);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" role="img">
        {yTicks.map((v) => {
          const y = m.top + innerH - (v / maxY) * innerH;
          return (
            <g key={v}>
              <line x1={m.left} x2={CW - m.right} y1={y} y2={y} stroke="#23272D" strokeWidth={1} />
              <text x={m.left - 6} y={y + 3} textAnchor="end" fontSize={10} fill="#5A616B" fontFamily="monospace">
                {percentMode ? `${Math.round(v * 100)}%` : fmt(v)}
              </text>
            </g>
          );
        })}
        {columns.map((c, ci) => {
          const x = m.left + slot * ci + (slot - barW) / 2;
          const total = totals[ci]! || 1;
          let yCursor = m.top + innerH;
          return (
            <g
              key={c.label}
              opacity={hover === null || hover === ci ? (c.forecast ? 0.55 : 1) : 0.3}
              onMouseEnter={() => setHover(ci)}
              onMouseLeave={() => setHover(null)}
            >
              {c.values.map((v, si) => {
                const frac = percentMode ? v / total : v / maxY;
                const h = Math.max(0, frac * innerH);
                yCursor -= h;
                const y = yCursor;
                yCursor -= 2; // 2px yüzey boşluğu
                return (
                  <rect key={si} x={x} y={y} width={barW} height={Math.max(0, h - 0)} fill={series[si]!.color} rx={2} />
                );
              })}
              <text
                x={x + barW / 2}
                y={CH - m.bottom + 15}
                textAnchor="middle"
                fontSize={9.5}
                fill={c.forecast ? '#5A616B' : '#8B9097'}
                fontFamily="monospace"
              >
                {c.label}
              </text>
              {/* Hover hedefi tüm slot */}
              <rect x={m.left + slot * ci} y={m.top} width={slot} height={innerH} fill="transparent" />
            </g>
          );
        })}
      </svg>

      {hover !== null ? (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-bg-elev px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${(((m.left + slot * hover + slot / 2) / CW) * 100).toFixed(1)}%`,
            top: '8%',
            transform: hover > columns.length / 2 ? 'translate(-100%, 0)' : 'none',
          }}
        >
          <div className="mb-1 font-bold text-fg">
            {columns[hover]!.label}
            {columns[hover]!.forecast ? ' · forecast' : ''}
          </div>
          {series.map((s, si) => (
            <div key={s.name} className="flex items-center gap-1.5 font-mono text-fg-muted">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}: {fmt(columns[hover]!.values[si]!)}
              {percentMode ? ` (${((columns[hover]!.values[si]! / (totals[hover]! || 1)) * 100).toFixed(0)}%)` : ''}
            </div>
          ))}
          {!percentMode ? (
            <div className="mt-1 font-mono font-bold text-fg">Total: {fmt(totals[hover]!)}</div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-muted">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full opacity-50" style={{ backgroundColor: '#8B9097' }} />
          Faded = forecast/budget
        </span>
      </div>
    </div>
  );
}

export interface AnnualPoint {
  label: string;
  kind: 'actual' | 'forecast' | 'budget';
  revenue: number; // $k
  ebitda: number; // $k
}

/**
 * Yıllık gelir kolonları + EBITDA çizgisi, tek $ ekseni. EBITDA erken
 * yıllarda negatif olduğu için sıfır çizgisi vurgulu.
 */
export function RevenueEbitdaChart({ points }: { points: AnnualPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const CW = 640;
  const CH = 250;
  const m = { top: 18, right: 14, bottom: 26, left: 56 };
  const maxV = Math.max(...points.map((p) => p.revenue)) * 1.06;
  const minV = Math.min(0, ...points.map((p) => p.ebitda)) * 1.4;
  const innerW = CW - m.left - m.right;
  const innerH = CH - m.top - m.bottom;
  const y = (v: number) => m.top + innerH - ((v - minV) / (maxV - minV)) * innerH;
  const slot = innerW / points.length;
  const barW = Math.min(40, slot * 0.55);

  const ticks = [0, 10_000, 20_000, 30_000, 40_000].filter((v) => v <= maxV);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" role="img">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={m.left} x2={CW - m.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#3A4048' : '#23272D'} strokeWidth={v === 0 ? 1.5 : 1} />
            <text x={m.left - 6} y={y(v) + 3} textAnchor="end" fontSize={10} fill="#5A616B" fontFamily="monospace">
              {usdShortLabel(v)}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          const x = m.left + slot * i + (slot - barW) / 2;
          const h = ((p.revenue - 0) / (maxV - minV)) * innerH;
          return (
            <g key={p.label} opacity={hover === null || hover === i ? 1 : 0.35}>
              <rect
                x={x}
                y={y(p.revenue)}
                width={barW}
                height={Math.max(1, h)}
                rx={3}
                fill="#E56B1A"
                opacity={p.kind === 'actual' ? 1 : 0.5}
              />
              <text x={x + barW / 2} y={CH - m.bottom + 15} textAnchor="middle" fontSize={9.5} fill={p.kind === 'actual' ? '#8B9097' : '#5A616B'} fontFamily="monospace">
                {p.label}
              </text>
              <rect
                x={m.left + slot * i}
                y={m.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}
        <path
          d={points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${m.left + slot * i + slot / 2} ${y(p.ebitda)}`)
            .join(' ')}
          fill="none"
          stroke="#1FA576"
          strokeWidth={2}
        />
        {points.map((p, i) => (
          <circle
            key={p.label}
            cx={m.left + slot * i + slot / 2}
            cy={y(p.ebitda)}
            r={hover === i ? 5 : 3.5}
            fill="#1FA576"
            stroke="#14171B"
            strokeWidth={2}
          />
        ))}
      </svg>

      {hover !== null ? (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-bg-elev px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${(((m.left + slot * hover + slot / 2) / CW) * 100).toFixed(1)}%`,
            top: '6%',
            transform: hover > points.length / 2 ? 'translate(-100%, 0)' : 'none',
          }}
        >
          <div className="mb-1 font-bold text-fg">
            {points[hover]!.label}
            <span className="ml-1 font-normal text-fg-dim">({points[hover]!.kind})</span>
          </div>
          <div className="font-mono text-fg-muted">Revenue: {usdShortLabel(points[hover]!.revenue)}</div>
          <div className="font-mono text-fg-muted">EBITDA: {usdShortLabel(points[hover]!.ebitda)}</div>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#E56B1A' }} />
          Revenue (solid = actual, faded = plan)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#1FA576' }} />
          EBITDA
        </span>
      </div>
    </div>
  );
}

/** Tek serilik kullanıcı büyümesi — alan + uç etiket. */
export function UsersChart({
  points,
}: {
  points: { label: string; value: number; kind: 'actual' | 'forecast' | 'budget' }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const CW = 640;
  const CH = 200;
  const m = { top: 20, right: 20, bottom: 26, left: 52 };
  const maxV = Math.max(...points.map((p) => p.value)) * 1.08;
  const innerW = CW - m.left - m.right;
  const innerH = CH - m.top - m.bottom;
  const x = (i: number) => m.left + (i / (points.length - 1)) * innerW;
  const y = (v: number) => m.top + innerH - (v / maxV) * innerH;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');
  const area = `${line} L ${x(points.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" role="img">
        {[0, 250_000, 500_000].map((v) => (
          <g key={v}>
            <line x1={m.left} x2={CW - m.right} y1={y(v)} y2={y(v)} stroke="#23272D" strokeWidth={1} />
            <text x={m.left - 6} y={y(v) + 3} textAnchor="end" fontSize={10} fill="#5A616B" fontFamily="monospace">
              {v === 0 ? '0' : `${v / 1000}K`}
            </text>
          </g>
        ))}
        <path d={area} fill="#7C5CFF" opacity={0.12} />
        <path d={line} fill="none" stroke="#7C5CFF" strokeWidth={2} />
        {points.map((p, i) => (
          <g key={p.label}>
            <circle cx={x(i)} cy={y(p.value)} r={hover === i ? 5 : 3.5} fill="#7C5CFF" stroke="#14171B" strokeWidth={2} opacity={p.kind === 'actual' ? 1 : 0.6} />
            <circle cx={x(i)} cy={y(p.value)} r={12} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            <text x={x(i)} y={CH - m.bottom + 15} textAnchor="middle" fontSize={9.5} fill={p.kind === 'actual' ? '#8B9097' : '#5A616B'} fontFamily="monospace">
              {p.label}
            </text>
          </g>
        ))}
        <text x={x(points.length - 1)} y={y(points[points.length - 1]!.value) - 10} textAnchor="end" fontSize={11} fontWeight={700} fill="#E8EAED" fontFamily="monospace">
          {(points[points.length - 1]!.value / 1000).toFixed(0)}K users
        </text>
      </svg>
      {hover !== null ? (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-bg-elev px-3 py-1.5 text-xs shadow-lg"
          style={{
            left: `${((x(hover) / CW) * 100).toFixed(1)}%`,
            top: '4%',
            transform: hover > points.length / 2 ? 'translate(-100%, 0)' : 'none',
          }}
        >
          <span className="text-fg">{points[hover]!.label}</span>{' '}
          <span className="font-mono text-fg-muted">
            {points[hover]!.value.toLocaleString('en-US')} users ({points[hover]!.kind})
          </span>
        </div>
      ) : null}
    </div>
  );
}
