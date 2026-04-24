export function TractionSection() {
  return (
    <section id="traction" className="relative">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
            Traction
          </div>
          <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
            Explosive organic growth. Zero paid CAC.
          </h2>
          <p className="mt-3 text-sm text-fg-muted md:text-base">
            Bupcore has never run a paid acquisition campaign. Every user
            found us through word of mouth or creator referrals. The numbers
            are real, and they're growing.
          </p>
        </header>

        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi
            label="Trade volume"
            value="$1.59B"
            sub="Lifetime"
          />
          <Kpi
            label="Revenue FY25"
            value="$282K"
            sub="+315% YoY"
            tone="success"
          />
          <Kpi
            label="Downloads"
            value="107K+"
            sub="$0 CAC · organic"
          />
          <Kpi
            label="Paid users"
            value="5,064"
            sub="9.7% conversion"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="MAU Q1'26" value="18.4K" sub="+45% QoQ" />
          <Kpi label="DAU / MAU" value="24.1%" sub="Top-decile engagement" />
          <Kpi label="12-mo retention" value="28.1%" sub="Monthly 89.95%" />
          <Kpi
            label="Trustpilot"
            value="4.4 / 5"
            sub="Excellent"
            tone="success"
          />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          <UnitCard
            label="LTV / CAC"
            value="4.5×"
            body="Blended across APAC, LATAM, MENA — industry top 10%."
          />
          <UnitCard
            label="Burn multiple"
            value="0.49"
            body="$138K net burn against $282K revenue. Capital efficient by construction."
          />
          <UnitCard
            label="Volume per paid user"
            value="$1.89M"
            body="Each active subscriber drives six-figure monthly trading flow."
          />
        </div>
      </div>
    </section>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'neutral' | 'success';
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-semibold md:text-3xl ${
          tone === 'success' ? 'text-emerald-300' : 'text-fg'
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-fg-muted">{sub}</div>
    </div>
  );
}

function UnitCard({
  label,
  value,
  body,
}: {
  label: string;
  value: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-brand/30 bg-brand/[0.04] p-5">
      <div className="text-[11px] uppercase tracking-wider text-brand">
        {label}
      </div>
      <div className="mt-1 text-3xl font-semibold text-fg">{value}</div>
      <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}
