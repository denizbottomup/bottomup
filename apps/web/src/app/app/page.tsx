'use client';

import { TradingViewChart } from '@/components/tradingview-chart';

export default function AppHome() {
  return (
    <div className="h-full w-full">
      <TradingViewChart symbol="BINANCE:BTCUSDT" interval="60" />
    </div>
  );
}
