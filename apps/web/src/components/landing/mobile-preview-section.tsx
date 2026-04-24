export function MobilePreviewSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/12 blur-[140px]" />
        <div className="absolute right-[10%] top-[30%] h-[320px] w-[320px] rounded-full bg-violet/12 blur-[110px]" />
      </div>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-8 px-4 pb-6 pt-2 md:px-8 md:pb-10 md:pt-4 lg:grid-cols-[1fr_620px] lg:gap-14">
        <div className="order-2 lg:order-1">
          <div className="mono-label">In your pocket</div>
          <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.02em] md:text-5xl">
            Signals, simulations, and{' '}
            <span className="logo-gradient">live copy trading</span> — all in
            the app.
          </h2>
          <p className="mt-4 max-w-xl text-sm text-fg-muted md:text-base">
            Follow the traders you picked, see Foxy's verdict next to every
            setup, and get pushed the moment something new hits the
            marketplace. No juggling tabs, no missed alerts.
          </p>

          <ul className="mt-6 grid grid-cols-1 gap-2 text-sm text-fg md:grid-cols-2">
            <li className="flex items-start gap-2">
              <Tick />
              <span>Real-time push on every new setup</span>
            </li>
            <li className="flex items-start gap-2">
              <Tick />
              <span>Foxy AI risk score on every card</span>
            </li>
            <li className="flex items-start gap-2">
              <Tick />
              <span>One-tap copy trade on connected OKX</span>
            </li>
            <li className="flex items-start gap-2">
              <Tick />
              <span>Portfolio simulator with virtual $10,000</span>
            </li>
          </ul>
        </div>

        <div className="order-1 flex items-center justify-center lg:order-2">
          <video
            src="https://statics.bottomup.app/www/main.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden
            className="mix-blend-lighten w-full max-w-[560px] drop-shadow-[0_20px_60px_rgba(124,92,255,0.25)]"
          />
        </div>
      </div>
    </section>
  );
}

function Tick() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint/15 text-mint ring-1 ring-mint/40">
      <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}
