export function IntroVideoSection() {
  return (
    <section id="intro" className="relative">
      <div className="mx-auto max-w-[1100px] px-4 py-10 md:px-8 md:py-16">
        <header className="text-center">
          <div className="mono-label">Watch the intro</div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-4xl">
            60 seconds on{' '}
            <span className="brand-gradient">how bupcore works.</span>
          </h2>
        </header>

        <div className="relative mt-8">
          <div className="pointer-events-none absolute -inset-6 -z-10">
            <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-[32px] bg-brand/10 blur-[80px]" />
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border bg-bg-card p-[1px] shadow-2xl corner-ticks">
            <div className="relative aspect-video w-full overflow-hidden rounded-[calc(1rem-1px)]">
              <iframe
                src="https://www.youtube.com/embed/2qUBtGgj_WQ?rel=0&modestbranding=1"
                title="bupcore — product intro"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
