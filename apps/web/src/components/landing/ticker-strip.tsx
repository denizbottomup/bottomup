import type { LandingPayload } from './landing-data';

export function TickerStrip({ pulse }: { pulse: LandingPayload['pulse'] }) {
  const items: Array<{ label: string; value: string; tone: string }> = [];

  if (pulse.fear_greed) {
    const fg = pulse.fear_greed.value;
    items.push({
      label: 'Fear & Greed',
      value: `${fg} · ${turkishFng(pulse.fear_greed.classification)}`,
      tone:
        fg >= 70
          ? 'text-emerald-300'
          : fg >= 50
            ? 'text-lime-300'
            : fg >= 30
              ? 'text-amber-300'
              : 'text-rose-300',
    });
  }
  if (pulse.dominance) {
    items.push({
      label: 'BTC Dom',
      value: `${pulse.dominance.btc.toFixed(1)}%`,
      tone: 'text-amber-300',
    });
  }
  if (pulse.dominance) {
    items.push({
      label: 'Toplam Cap',
      value: shortUsd(pulse.dominance.total_market_cap_usd),
      tone: 'text-fg',
    });
  }
  const topFund = pulse.top_funding[0];
  if (topFund) {
    const bps = topFund.funding_rate * 10000;
    items.push({
      label: 'Top Funding',
      value: `${topFund.symbol.replace('USDT', '')} ${bps >= 0 ? '+' : ''}${bps.toFixed(1)}bps`,
      tone: bps >= 0 ? 'text-emerald-300' : 'text-rose-300',
    });
  }
  const topLiq = pulse.liquidation[0];
  if (topLiq) {
    items.push({
      label: '24s Likid.',
      value: `${topLiq.symbol} ${shortUsd(topLiq.total_24h_usd)}`,
      tone: 'text-rose-300',
    });
  }
  const topOi = pulse.open_interest[0];
  if (topOi && topOi.oi_change_24h_pct != null) {
    items.push({
      label: 'OI Değişim',
      value: `${topOi.symbol} ${topOi.oi_change_24h_pct >= 0 ? '+' : ''}${topOi.oi_change_24h_pct.toFixed(2)}%`,
      tone: topOi.oi_change_24h_pct >= 0 ? 'text-emerald-300' : 'text-rose-300',
    });
  }

  if (items.length === 0) return null;

  const marqueeItems = [...items, ...items]; // duplicate for seamless scroll

  return (
    <div className="relative overflow-hidden border-y border-border bg-bg-card/50">
      <div className="animate-marquee flex gap-8 whitespace-nowrap py-2.5 text-[11px] md:text-xs">
        {marqueeItems.map((it, i) => (
          <div key={i} className="flex shrink-0 items-center gap-2">
            <span className="uppercase tracking-wider text-fg-dim">{it.label}</span>
            <span className={`font-mono font-semibold ${it.tone}`}>{it.value}</span>
            <span className="text-fg-dim">·</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function shortUsd(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

function turkishFng(cls: string): string {
  const map: Record<string, string> = {
    'Extreme Fear': 'Aşırı korku',
    Fear: 'Korku',
    Neutral: 'Nötr',
    Greed: 'Açgözlülük',
    'Extreme Greed': 'Aşırı açgözlülük',
  };
  return map[cls] ?? cls;
}
