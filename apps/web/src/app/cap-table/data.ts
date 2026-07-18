/**
 * Bottomup cap table — tek doğruluk kaynağı bu dosya.
 *
 * Yatırımcı yüzdeleri SAFE post-money varsayımıyla işlemlerden türetilir
 * (hisse % = yatırım / değerleme cap). Kurucu ve ESOP oranları kurucu
 * beyanı (18.07.2026). Kaynak işlem listesi: yatırım CSV'si — Excel
 * karşılığı repo dışında cap-table.xlsx olarak tutuluyor.
 */

export interface CapTableTransaction {
  /** ISO tarih (YYYY-MM-DD). */
  date: string;
  investor: string;
  amountUsd: number;
  /** Turun post-money değerleme cap'i ($). */
  valuationCapUsd: number;
  round: 1 | 2;
}

export interface FounderEntry {
  name: string;
  /** 0–1 arası oran. */
  share: number;
  /** true → kurucu değil, çalışan hisse havuzu. */
  pool?: boolean;
}

export const ROUND_CAPS: Record<1 | 2, number> = {
  1: 3_000_000,
  2: 5_000_000,
};

export const founders: FounderEntry[] = [
  { name: 'Deniz Saglam', share: 0.5 },
  { name: 'Erdogan Yucel', share: 0.1 },
  { name: 'Mehmet Karakucuk', share: 0.1 },
  { name: 'Alex Yusifli', share: 0.05 },
  { name: 'Employee stock pool (ESOP)', share: 0.1, pool: true },
];

export const transactions: CapTableTransaction[] = [
  { date: '2024-07-19', investor: 'Ekrem Ozan Olguner', amountUsd: 45_000, valuationCapUsd: 3_000_000, round: 1 },
  { date: '2024-07-19', investor: 'Ertekin Can Olguner', amountUsd: 45_000, valuationCapUsd: 3_000_000, round: 1 },
  { date: '2024-08-23', investor: 'Ertekin Can Olguner', amountUsd: 17_500, valuationCapUsd: 3_000_000, round: 1 },
  { date: '2024-09-10', investor: 'Ekrem Ozan Olguner', amountUsd: 17_500, valuationCapUsd: 3_000_000, round: 1 },
  { date: '2025-08-29', investor: 'Varol Civil', amountUsd: 10_000, valuationCapUsd: 5_000_000, round: 2 },
  { date: '2025-11-10', investor: 'Adil Esat Ugurlu', amountUsd: 10_000, valuationCapUsd: 5_000_000, round: 2 },
  { date: '2025-11-12', investor: 'Goktug Akarcay', amountUsd: 9_970, valuationCapUsd: 5_000_000, round: 2 },
  { date: '2025-12-01', investor: 'Refia B Kucukkoylu', amountUsd: 25_000, valuationCapUsd: 5_000_000, round: 2 },
  { date: '2026-01-20', investor: 'Hasan Eray Dogan', amountUsd: 29_999, valuationCapUsd: 5_000_000, round: 2 },
  { date: '2026-04-06', investor: 'Alp Resat Capa', amountUsd: 29_900, valuationCapUsd: 5_000_000, round: 2 },
  { date: '2026-04-08', investor: 'Fethi Saruhan Tan', amountUsd: 50_000, valuationCapUsd: 5_000_000, round: 2 },
  { date: '2026-04-27', investor: 'Gorkem Guven', amountUsd: 25_000, valuationCapUsd: 5_000_000, round: 2 },
  { date: '2026-05-07', investor: 'Kaan Boyner', amountUsd: 25_000, valuationCapUsd: 5_000_000, round: 2 },
  { date: '2026-06-25', investor: 'Fethi Saruhan Tan', amountUsd: 25_000, valuationCapUsd: 5_000_000, round: 2 },
  { date: '2026-06-26', investor: 'Adil Esat Ugurlu', amountUsd: 10_000, valuationCapUsd: 5_000_000, round: 2 },
];

export interface InvestorRow {
  name: string;
  round1Usd: number;
  round2Usd: number;
  totalUsd: number;
  share: number;
}

/** İşlemleri yatırımcı bazında toplar, hisse oranına göre sıralar. */
export function aggregateInvestors(txs: CapTableTransaction[]): InvestorRow[] {
  const byName = new Map<string, InvestorRow>();
  for (const t of txs) {
    const row =
      byName.get(t.investor) ??
      { name: t.investor, round1Usd: 0, round2Usd: 0, totalUsd: 0, share: 0 };
    if (t.round === 1) row.round1Usd += t.amountUsd;
    else row.round2Usd += t.amountUsd;
    row.totalUsd += t.amountUsd;
    row.share += t.amountUsd / t.valuationCapUsd;
    byName.set(t.investor, row);
  }
  return [...byName.values()].sort((a, b) => b.share - a.share);
}
