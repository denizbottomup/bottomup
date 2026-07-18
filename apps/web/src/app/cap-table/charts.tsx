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
