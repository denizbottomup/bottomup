/**
 * Bottomup finansalları — tek doğruluk kaynağı "bottomUP Financials -
 * FY24A, FY25A, FY26F & FY27-31 Budget (5-year), AY update Jul-26"
 * workbook'u. Rakamlar oradaki cached değerlerden aynen taşındı;
 * türetilebilir her şey (toplamlar, marjlar, mix) sayfada hesaplanır ki
 * tek satır güncellemek her görünümü düzeltsin. Tutarlar $k.
 */

export type YearKind = 'actual' | 'forecast' | 'budget';

export interface AnnualPnl {
  year: string; // "FY24"
  kind: YearKind;
  subscriptionRevenue: number;
  tradingRevenue: number;
  inAppRevenue: number;
  totalCos: number;
  adminWages: number;
  marketing: number;
  otherAdmin: number;
  ebitda: number;
  totalUsers: number;
  paidUsers: number;
}

export const annualPnl: AnnualPnl[] = [
  { year: 'FY24', kind: 'actual', subscriptionRevenue: 52.8, tradingRevenue: 15.4, inAppRevenue: 0, totalCos: -47.88, adminWages: -25, marketing: -1, otherAdmin: -2, ebitda: -7.68, totalUsers: 17_706, paidUsers: 192 },
  { year: 'FY25', kind: 'actual', subscriptionRevenue: 120.88, tradingRevenue: 161.122, inAppRevenue: 0, totalCos: -103, adminWages: -147, marketing: 0, otherAdmin: -68, ebitda: -35.998, totalUsers: 44_928, paidUsers: 402 },
  { year: 'FY26', kind: 'forecast', subscriptionRevenue: 177.92, tradingRevenue: 238.264, inAppRevenue: 0, totalCos: -136.296, adminWages: -337.855, marketing: 0, otherAdmin: -17.858, ebitda: -75.824, totalUsers: 60_636, paidUsers: 557 },
  { year: 'FY27', kind: 'budget', subscriptionRevenue: 1270.93, tradingRevenue: 6449.36, inAppRevenue: 0, totalCos: -1062.25, adminWages: -643, marketing: -5000, otherAdmin: -231.609, ebitda: 783.437, totalUsers: 124_830, paidUsers: 6241 },
  { year: 'FY28', kind: 'budget', subscriptionRevenue: 1973.45, tradingRevenue: 10_722, inAppRevenue: 2643.43, totalCos: -2879.46, adminWages: -1540.8, marketing: -7000, otherAdmin: -460.166, ebitda: 3458.44, totalUsers: 178_343, paidUsers: 8917 },
  { year: 'FY29', kind: 'budget', subscriptionRevenue: 2819.27, tradingRevenue: 15_335.9, inAppRevenue: 3776.41, totalCos: -4115.81, adminWages: -2707.2, marketing: -10_000, otherAdmin: -657.946, ebitda: 4450.58, totalUsers: 254_777, paidUsers: 12_739 },
  { year: 'FY30', kind: 'budget', subscriptionRevenue: 4181.45, tradingRevenue: 22_747, inAppRevenue: 5601.05, totalCos: -6104.6, adminWages: -3110.4, marketing: -15_000, otherAdmin: -975.885, ebitda: 7338.62, totalUsers: 381_290, paidUsers: 19_065 },
  { year: 'FY31', kind: 'budget', subscriptionRevenue: 5730.18, tradingRevenue: 31_172.2, inAppRevenue: 7675.58, totalCos: -8365.65, adminWages: -3513.6, marketing: -20_000, otherAdmin: -1337.34, ebitda: 11_361.4, totalUsers: 511_244, paidUsers: 25_562 },
];

export function totalRevenue(y: AnnualPnl): number {
  return y.subscriptionRevenue + y.tradingRevenue + y.inAppRevenue;
}
export function grossProfit(y: AnnualPnl): number {
  return totalRevenue(y) + y.totalCos;
}
export function totalOpex(y: AnnualPnl): number {
  return y.adminWages + y.marketing + y.otherAdmin;
}

export interface QuarterActuals {
  quarter: string; // "Q3-24"
  forecast?: boolean;
  subscriptionRevenue: number; // $k
  tradingRevenue: number; // $k (exchange)
  dau: number | null;
  mau: number | null;
  downloads: number | null;
  paidUsers: number | null;
  employees: number | null;
}

export const quarterlyActuals: QuarterActuals[] = [
  { quarter: 'Q3-24', subscriptionRevenue: 14.4, tradingRevenue: 4.2, dau: 950, mau: 3600, downloads: 6367, paidUsers: 165, employees: 1 },
  { quarter: 'Q4-24', subscriptionRevenue: 16.8, tradingRevenue: 4.9, dau: 1280, mau: 5700, downloads: 7593, paidUsers: 192, employees: 2 },
  { quarter: 'Q1-25', subscriptionRevenue: 22.05, tradingRevenue: 27.05, dau: 1644, mau: 6529, downloads: 11_450, paidUsers: 252, employees: 4 },
  { quarter: 'Q2-25', subscriptionRevenue: 27.84, tradingRevenue: 52.892, dau: 2124, mau: 8955, downloads: 9410, paidUsers: 305, employees: 5 },
  { quarter: 'Q3-25', subscriptionRevenue: 34.13, tradingRevenue: 55.28, dau: 2583, mau: 10_478, downloads: 15_924, paidUsers: 379, employees: 6 },
  { quarter: 'Q4-25', subscriptionRevenue: 36.86, tradingRevenue: 25.9, dau: 2752, mau: 11_296, downloads: 12_557, paidUsers: 402, employees: 6 },
  { quarter: 'Q1-26', subscriptionRevenue: 40.14, tradingRevenue: 51.52, dau: 3144, mau: 12_726, downloads: 14_849, paidUsers: 446, employees: 8 },
  { quarter: 'Q2-26', subscriptionRevenue: 43.56, tradingRevenue: 59.04, dau: 3834, mau: 13_274, downloads: 15_380, paidUsers: 484, employees: 11 },
  { quarter: 'Q3-26', forecast: true, subscriptionRevenue: 44.867, tradingRevenue: 60.811, dau: null, mau: null, downloads: null, paidUsers: null, employees: 12 },
  { quarter: 'Q4-26', forecast: true, subscriptionRevenue: 49.354, tradingRevenue: 66.892, dau: null, mau: null, downloads: null, paidUsers: null, employees: 13 },
];

/** Q1-26'da açılan auto-trade metriği (Live trades altyapısı). */
export const autoTrade = {
  latestQuarter: 'Q2-26',
  users: 287,
  volumeUsd: 369_000_000,
};

export const unitEconomics = {
  regions: [
    { region: 'Türkiye', cpi: 10, cacPerActiveUser: 40, ltv: 130, roas: 3.25, monthlyVolumePerUser: 100_000 },
    { region: 'Global', cpi: 15, cacPerActiveUser: 60, ltv: 260, roas: 4.33, monthlyVolumePerUser: 200_000 },
    { region: 'Blended', cpi: 13.5, cacPerActiveUser: 54, ltv: 221, roas: 4.01, monthlyVolumePerUser: 170_000 },
  ],
  monthlyNetChurn: 0.1,
  customerLifespanMonths: 10,
};

export interface FundingRound {
  name: string;
  raiseUsdM: number;
  timing: string; // "2027"
  postMoneyUsdM: number;
  equitySold: number; // 0–1
}

export const fundingPlan: FundingRound[] = [
  { name: 'Seed', raiseUsdM: 5, timing: '2027', postMoneyUsdM: 30, equitySold: 0.1667 },
  { name: 'Series A.1', raiseUsdM: 7, timing: '2028', postMoneyUsdM: 40.5, equitySold: 0.1727 },
  { name: 'Series A.2', raiseUsdM: 10, timing: '2029', postMoneyUsdM: 80.5, equitySold: 0.1242 },
  { name: 'Series B.1', raiseUsdM: 15, timing: '2030', postMoneyUsdM: 115.1, equitySold: 0.1303 },
  { name: 'Series B.2', raiseUsdM: 20, timing: '2031', postMoneyUsdM: 170.8, equitySold: 0.1171 },
];

/** VC yöntemi değerleme yürüyüşü — Valuation sekmesindeki adımlar. */
export const valuationWalk = {
  exitYearRevenueUsdM: 44.578,
  revenueMultiple: 5.25,
  exitValuationUsdM: 234.03,
  vcRateOfReturn: 0.35,
  exitYears: 5,
  postMoneyTodayUsdM: 52.19,
  discountedInvestmentUsdM: 27.79,
  preMoneyTodayUsdM: 24.4,
  seedPostMoneyUsdM: 30,
};

export interface BalanceSheetCol {
  label: string;
  cashAtBank: number;
  cashAtCex: number;
  liabilities: number;
  shareCapital: number;
  retainedEarnings: number;
}

export const balanceSheet: BalanceSheetCol[] = [
  { label: 'Dec-24', cashAtBank: 12.28, cashAtCex: 8.45, liabilities: 168, shareCapital: 83, retainedEarnings: -230.32 },
  { label: 'Dec-25', cashAtBank: 14.52, cashAtCex: 28.18, liabilities: 146, shareCapital: 162.97, retainedEarnings: -266.32 },
  { label: 'Jun-26', cashAtBank: 15.553, cashAtCex: 50.593, liabilities: 0, shareCapital: 357.869, retainedEarnings: -291.76 },
];

export const planAssumptions: string[] = [
  'Marketing budget equals 100% of each raise, spread monthly — 25% Türkiye, 75% Global.',
  'Cost per install: $10 Türkiye, $20 Global; 5% of users convert to paid at $20/month.',
  'Monthly active users ≈ 25% of total users; monthly gross churn 20%.',
  'Trading volume income: $10–20 per free MAU and $30–60 per paid user per month.',
  'Trader fees at 10% of revenue; other admin 3%; other cost of sales 2%.',
  'In-app purchases (boosts, trader switches, prize spins) launch in FY28.',
  'Trader network grows from 55 (2026) to 146 by 2031.',
];
