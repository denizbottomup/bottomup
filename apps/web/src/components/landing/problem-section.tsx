export function ProblemSection() {
  return (
    <section id="problem" className="relative">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="mx-auto max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-rose-300">
            The problem
          </div>
          <h2 className="mt-1 text-3xl font-semibold md:text-4xl">
            Retail trading is broken.
          </h2>
          <p className="mt-3 text-sm text-fg-muted md:text-base">
            Fragmented, siloed, and dangerously unprotected. Today's copy
            trading platforms just mirror human errors — no filter, no audit,
            no way out.
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <ProblemCard
            title="The blind-copying trap"
            body="eToro-style platforms force you to copy human mistakes or unverified black-box bots. Zero active risk mitigation. Your capital is exposed the moment the trader hits send."
          />
          <ProblemCard
            title="Scattered creator economy"
            body="Top traders and bot developers have no home. They juggle Telegram groups, Discord servers, and separate exchange accounts just to reach followers — and you have to juggle the same mess to follow them."
          />
          <ProblemCard
            title="Siloed markets"
            body="Retail is trapped between Crypto and TradFi. Stocks on one app, forex on another, crypto on three more. No unified view. No cross-asset strategy."
          />
        </div>
      </div>
    </section>
  );
}

function ProblemCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.03] p-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-400/10 text-rose-300">
        ✕
      </div>
      <h3 className="mt-4 text-base font-semibold text-fg">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}
