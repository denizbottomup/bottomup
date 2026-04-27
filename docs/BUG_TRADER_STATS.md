# Trader stats — backend bug fixed (2026-04-27)

> **Status:** Root-cause-identified and fixed in
> `apps/api/src/public/public.service.ts`. Frontend cosmetic fixes also
> shipped in `apps/web/src/components/landing/trader-detail-modal.tsx`.

## What users saw

ELAYN, on `bottomup.app/#leaderboard`:

- **Card** (monthly): $11,046.46 (+10.5%), 4 trades, 4 wins, 100% win rate.
- **Detail modal** (all-time): $7,157, −28.43% from $10,000, 48 trades, 12W/36L, 25% win rate, total R −28.43R, total PnL −$2.84K.

Three user-visible inconsistencies:

1. The detail-modal equity curve trended **upward** (line going up-and-to-the-right) despite the trader being −28% lifetime.
2. The Monthly R chart showed three **green** (positive) bars only — no February 2026 — yet total R was −28.43R. Math impossible: positive months only cannot sum to a negative total.
3. `Best $$348.22 · Worst $-$166.66` — double dollar sign in the equity-chart caption.

It also showed up across the leaderboard: every visible card except Lumex had `monthly_trades == monthly_wins` (100% win rate this month). That's not survivor bias — that was a bug.

## Root cause

`apps/api/src/public/public.service.ts` had two SQL queries that **filtered/joined on `s.close_date`** without falling back to alternate timestamps. In our `setup` table, `close_date` is null for a large fraction of stopped trades — the user's stop-loss triggered, the trade was marked `status = 'stopped'`, but `close_date` was never populated. The other date columns (`tp1_date`, `p.updated_at`, `p.created_at`) carry the actual close moment for those trades.

`trader.service.ts` already used the right pattern in its query:

```sql
DATE_TRUNC('day',
  COALESCE(s.close_date, s.tp1_date, p.updated_at, p.created_at)
)
```

`public.service.ts` did not. Two query sites suffered:

### 1. `getTrader()` — drops stopped trades from the equity curve and monthly array

Original SQL selected only `s.close_date`. The TypeScript loop then
guards `if (closeAt)` before pushing to `equity_curve` and the monthly
map. Stopped trades with null `close_date` therefore:

- **were** counted in `stats.trades / wins / losses / total_pnl / total_r / virtual_balance_usd / virtual_return_pct` (those run through `runningBalance += pnl` unconditionally), but
- **were not** counted in `equity_curve` or `monthly[*]`.

Result: the equity curve shows the running balance after only the
manually-closed (mostly winning) trades, ending much higher than the
true `virtual_balance_usd`. The monthly aggregation skips the stopped
trades, so its `net_r` sum can be net-positive even when the trader's
true `total_r` is deeply negative. February 2026 was missing for ELAYN
because every Feb-2026 trade was stopped without a `close_date`.

For ELAYN specifically: 9 of 48 trades had `close_date` populated. The
other 39 (mostly stopped losses) were silently dropped from
`equity_curve` and `monthly`, but still moved `total_r` and
`total_pnl`. Hence the apparent contradiction.

### 2. `topTraders()` — drops stopped trades from the monthly window

Original SQL filtered the monthly CTE on `s.close_date >= DATE_TRUNC('month', NOW())`. Stopped trades with null `close_date` failed that filter and were excluded from each trader's monthly aggregate, even when their actual close happened this month.

Effect on the leaderboard: every visible trader card except Lumex showed
100% win rate, because every losing stop-loss closure was filtered out
of the monthly aggregate. The cards looked unrealistically clean.

## The fix

Both queries now use the same fallback chain `trader.service.ts`
already uses:

```sql
COALESCE(s.close_date, s.tp1_date, p.updated_at, p.created_at)
```

- In `getTrader()`: select that as `close_date` and order by it. The
  TypeScript loop is unchanged — it now sees a non-null timestamp for
  every trade and pushes everything to `equity_curve` / `monthly`.
- In `topTraders()` monthly CTE: filter on the COALESCEd date so
  stopped trades with null `close_date` join the monthly window
  correctly.

## Frontend fixes shipped at the same time

In `apps/web/src/components/landing/trader-detail-modal.tsx`:

- Removed double `$` in the "Best · Worst" caption (`formatUsd` already prefixes `$`).
- Sort `equity_curve` by `t` ascending before rendering. The API now returns chronologically-sorted curves, but the defensive sort is cheap and protects against any caller that doesn't.

## Verification

After deploy, the following invariants should hold for every trader
returned by `/public/trader/<analyst>`:

1. `equity_curve[-1].balance ≈ stats.virtual_balance_usd` (within 0.01 USD).
2. `sum(monthly[*].net_r) ≈ stats.total_r` (within 0.01R).
3. `sum(monthly[*].trades) == stats.trades`.

Recommend wiring these into a single integration test using ELAYN as the regression case (since pre-fix she fails all three).
