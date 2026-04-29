export function MenuOrderHero() {
  return (
    <section>
      <div className="absolute inset-x-0 top-0 h-4" />
      <div className="absolute -right-24 top-24 hidden h-72 w-72 rounded-full lg:block" />
      <div className="animate-fade-up relative mx-auto max-w-6xl pb-8 pt-8 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] max-[380px]:pl-3 max-[380px]:pr-3 sm:pb-10 sm:pl-6 sm:pr-6 sm:pt-14">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-center">
          <div className="min-w-0 max-w-2xl">
            <span className="brand-kicker inline-flex items-center rounded-full bg-[var(--primary-soft)] px-3 py-1">Club54 signature picks</span>
            <h1 className="brand-title mt-3 text-[clamp(1.85rem,5.5vw+0.85rem,4.45rem)] leading-[0.98] sm:mt-4">
              When life gets busy, trade it for coffee.
            </h1>
            <p className="mt-4 max-w-xl text-[0.9375rem] leading-[1.75] text-[var(--text-muted)] sm:mt-5 sm:text-base">
              Shake up your taste buds with creamy drinks, fresh bakery bites, and quick pickup from Club54.
            </p>
          </div>

          <div className="relative hidden min-h-[22rem] items-center justify-end lg:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/image/coffee.png"
              alt="Cup of coffee"
              className="h-[21rem] w-[22rem] object-contain object-center"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
