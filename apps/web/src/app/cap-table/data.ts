/**
 * Bottomup cap table — tek doğruluk kaynağı bu dosya.
 *
 * Yatırımcı yüzdeleri SAFE post-money varsayımıyla işlemlerden türetilir
 * (hisse % = yatırım / değerleme cap). Kurucu ve ESOP oranları kurucu
 * beyanı (18.07.2026). İşlem listesi "bottomUP Financials" workbook'unun
 * Investments sekmesiyle mutabık (BS ile birebir tutuyor) — CSV'deki
 * eksik Omer Akarca kaydı ve Refia tarih farkı kurucu onayıyla Excel'e
 * eşitlendi (Tem 2026).
 */

export interface CapTableTransaction {
  /** ISO tarih (YYYY-MM-DD). Taahhüt satırlarında imza/karar tarihi. */
  date: string;
  investor: string;
  amountUsd: number;
  /** Turun post-money değerleme cap'i ($). */
  valuationCapUsd: number;
  round: 1 | 2;
  /** true → taahhüt edildi, henüz ödenmedi (CFO: "not paid up"). */
  pending?: boolean;
}

export interface FounderEntry {
  name: string;
  /**
   * Kuruluş (yatırım öncesi) oranı, 0–1. Kurucular + ESOP toplamı 1.0;
   * yatırımcı hissesi geldikçe herkes orantılı dilüte olur — net oran
   * sayfada `share × (1 - yatırımcı toplamı)` olarak türetilir.
   */
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
  { name: 'Erdogan Yucel', share: 0.15 },
  { name: 'Mehmet Karakucuk', share: 0.15 },
  { name: 'Alex Yusifli', share: 0.1 },
  { name: 'Employee stock pool (ESOP)', share: 0.1, pool: true },
];

export const transactions: CapTableTransaction[] = [
  { date: '2024-07-19', investor: 'Ekrem Ozan Olguner', amountUsd: 45_000, valuationCapUsd: 3_000_000, round: 1 },
  { date: '2024-07-19', investor: 'Ertekin Can Olguner', amountUsd: 45_000, valuationCapUsd: 3_000_000, round: 1 },
  { date: '2024-08-23', investor: 'Ertekin Can Olguner', amountUsd: 17_500, valuationCapUsd: 3_000_000, round: 1 },
  { date: '2024-09-10', investor: 'Ekrem Ozan Olguner', amountUsd: 17_500, valuationCapUsd: 3_000_000, round: 1 },
  { date: '2025-08-14', investor: 'Omer Akarca', amountUsd: 25_000, valuationCapUsd: 5_000_000, round: 2 },
  { date: '2025-08-14', investor: 'Omer Akarca', amountUsd: 50_000, valuationCapUsd: 5_000_000, round: 2, pending: true },
  { date: '2025-08-29', investor: 'Varol Civil', amountUsd: 10_000, valuationCapUsd: 5_000_000, round: 2 },
  { date: '2025-10-08', investor: 'Refia B Kucukkoylu', amountUsd: 25_000, valuationCapUsd: 5_000_000, round: 2 },
  { date: '2025-11-10', investor: 'Adil Esat Ugurlu', amountUsd: 10_000, valuationCapUsd: 5_000_000, round: 2 },
  { date: '2025-11-12', investor: 'Goktug Akarcay', amountUsd: 9_970, valuationCapUsd: 5_000_000, round: 2 },
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

/**
 * İşlemleri yatırımcı bazında toplar; hisseler CFO'nun sıralı dilüsyon
 * modeliyle hesaplanır (V2 workbook, Cap Table sekmesi): $3M turundaki
 * yatırımcılar $5M turu tarafından (1 − tur2Toplam/5M) çarpanıyla dilüte
 * olur, $5M turundakiler kendi ham oranını (tutar/5M) korur. Taahhüt
 * (pending) tutarlar CFO ile uyumlu olarak hisseye dahildir.
 */
export function aggregateInvestors(txs: CapTableTransaction[]): InvestorRow[] {
  const round2TotalUsd = txs
    .filter((t) => t.round === 2)
    .reduce((s, t) => s + t.amountUsd, 0);
  const round2Dilution = 1 - round2TotalUsd / ROUND_CAPS[2];

  const byName = new Map<string, InvestorRow>();
  for (const t of txs) {
    const row =
      byName.get(t.investor) ??
      { name: t.investor, round1Usd: 0, round2Usd: 0, totalUsd: 0, share: 0 };
    if (t.round === 1) row.round1Usd += t.amountUsd;
    else row.round2Usd += t.amountUsd;
    row.totalUsd += t.amountUsd;
    byName.set(t.investor, row);
  }
  for (const row of byName.values()) {
    row.share =
      (row.round1Usd / ROUND_CAPS[1]) * round2Dilution +
      row.round2Usd / ROUND_CAPS[2];
  }
  return [...byName.values()].sort((a, b) => b.share - a.share);
}
