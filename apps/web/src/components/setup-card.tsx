'use client';

export interface SetupCard {
  id: string;
  status: 'incoming' | 'active' | 'cancelled' | 'stopped' | 'success' | 'closed';
  category: 'spot' | 'futures';
  position: 'long' | 'short' | null;
  order_type: string;
  coin_name: string;
  entry_value: number;
  entry_value_end: number | null;
  stop_value: number | null;
  profit_taking_1: number | null;
  profit_taking_2: number | null;
  profit_taking_3: number | null;
  r_value: number | null;
  is_tp1: boolean | null;
  is_tp2: boolean | null;
  is_tp3: boolean | null;
  trader: {
    id: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    image: string | null;
  };
  coin: {
    code: string;
    display_name: string | null;
    image: string | null;
  };
}

export function SetupCardView({ setup }: { setup: SetupCard }) {
  const isLong = setup.position === 'long';
  const isShort = setup.position === 'short';
  const traderName = setup.trader.name
    || [setup.trader.first_name, setup.trader.last_name].filter(Boolean).join(' ').trim()
    || 'Trader';
  const traderInitial = traderName[0]?.toUpperCase() ?? '?';
  const coinCode = (setup.coin.code || setup.coin_name || '').toUpperCase();
  const accentClass = isLong
    ? 'from-emerald-400/40 via-cyan-400/30 to-transparent'
    : isShort
      ? 'from-rose-400/40 via-fuchsia-400/30 to-transparent'
      : 'from-brand/40 via-amber-300/20 to-transparent';

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-[1px] transition hover:border-white/20">
      {/* Glow accent */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-24 -right-16 h-48 w-48 rounded-full bg-gradient-to-br ${accentClass} blur-3xl opacity-60 transition group-hover:opacity-90`}
      />
      {/* Grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />

      <div className="relative rounded-[15px] bg-[#0E1114]/85 backdrop-blur-sm p-4">
        {/* Header: trader (left) + coin (right) */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <TraderAvatar src={setup.trader.image} fallback={traderInitial} />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-fg">{traderName}</div>
              <div className="text-[11px] uppercase tracking-wider text-fg-dim">
                {setup.category === 'futures' ? 'Futures' : 'Spot'} · {setup.order_type}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PositionBadge position={setup.position} />
            <CoinIcon src={setup.coin.image} code={coinCode} />
          </div>
        </div>

        {/* Coin code + name line */}
        <div className="mt-3 flex items-baseline gap-2">
          <div className="font-mono text-xl font-semibold tracking-tight text-fg">
            {coinCode}
          </div>
          {setup.coin.display_name && setup.coin.display_name.toUpperCase() !== coinCode ? (
            <div className="text-xs text-fg-dim truncate">{setup.coin.display_name}</div>
          ) : null}
          {setup.r_value != null ? (
            <div className="ml-auto rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-fg-muted">
              R {setup.r_value.toFixed(1)}
            </div>
          ) : null}
        </div>

        {/* Price grid */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <PriceCell
            label="Giriş"
            value={formatRange(setup.entry_value, setup.entry_value_end)}
            tone="neutral"
          />
          <PriceCell
            label="Stop"
            value={formatNum(setup.stop_value)}
            tone="danger"
          />
          <PriceCell
            label="TP 1"
            value={formatNum(setup.profit_taking_1)}
            tone="success"
            hit={!!setup.is_tp1}
          />
          <PriceCell
            label="TP 2"
            value={formatNum(setup.profit_taking_2)}
            tone="success"
            hit={!!setup.is_tp2}
          />
          {setup.profit_taking_3 != null ? (
            <PriceCell
              label="TP 3"
              value={formatNum(setup.profit_taking_3)}
              tone="success"
              hit={!!setup.is_tp3}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TraderAvatar({ src, fallback }: { src: string | null; fallback: string }) {
  return (
    <div className="relative h-10 w-10 shrink-0">
      <div
        aria-hidden
        className="absolute inset-0 rounded-full bg-gradient-to-br from-brand/30 via-fuchsia-400/20 to-cyan-400/30 blur-[6px]"
      />
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="relative h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            const next = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (next) next.style.display = 'flex';
          }}
        />
      ) : null}
      <div
        style={{ display: src ? 'none' : 'flex' }}
        className="relative h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 text-sm font-semibold text-fg"
      >
        {fallback}
      </div>
    </div>
  );
}

function CoinIcon({ src, code }: { src: string | null; code: string }) {
  const initial = code.slice(0, 3) || '?';
  return (
    <div className="relative h-9 w-9 shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            const next = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (next) next.style.display = 'flex';
          }}
        />
      ) : null}
      <div
        style={{ display: src ? 'none' : 'flex' }}
        className="h-9 w-9 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 font-mono text-[10px] font-bold text-fg-muted"
      >
        {initial}
      </div>
    </div>
  );
}

function PositionBadge({ position }: { position: 'long' | 'short' | null }) {
  if (!position) return null;
  const long = position === 'long';
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${
        long
          ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
          : 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
      }`}
    >
      {long ? 'Long' : 'Short'}
    </span>
  );
}

type PriceTone = 'neutral' | 'success' | 'danger';
function PriceCell({
  label,
  value,
  tone,
  hit,
}: {
  label: string;
  value: string;
  tone: PriceTone;
  hit?: boolean;
}) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-300'
      : tone === 'danger'
        ? 'text-rose-300'
        : 'text-fg';
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        hit ? 'border-emerald-400/40 bg-emerald-400/5' : 'border-white/5 bg-white/[0.02]'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-dim">
        {label}
        {hit ? (
          <span className="rounded bg-emerald-400/20 px-1 text-[9px] text-emerald-200">
            ✓
          </span>
        ) : null}
      </div>
      <div className={`mt-0.5 font-mono text-sm ${toneClass}`}>{value}</div>
    </div>
  );
}

function formatNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  // Smart precision: small prices get more decimals
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

function formatRange(a: number, b: number | null): string {
  if (b == null || b === a) return formatNum(a);
  return `${formatNum(a)} – ${formatNum(b)}`;
}
