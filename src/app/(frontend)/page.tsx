// Temporary home page for phase 0: verifies brand tokens, fonts and grid.
// Replaced by the real storefront in phase 1.
import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <header className="border-b border-primary/10">
        <div className="mx-auto flex max-w-[1440px] items-center px-6 md:px-20">
          <Link
            href="/"
            aria-label="POLUTONE — на главную"
            className="inline-flex min-h-[44px] items-center py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- brand SVG, fixed size */}
            <img src="/logos/POLUTONE_sage_light.svg" alt="POLUTONE" width={180} height={40} />
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1440px] grid-cols-4 items-end gap-4 px-6 py-16 md:grid-cols-12 md:gap-6 md:px-20 md:py-24">
        <div className="col-span-4 space-y-6 md:col-span-6">
          <h1 className="font-display text-hero-m font-light text-primary md:text-hero">
            Выразительность
            <br />в полутоне.
          </h1>
          <p className="max-w-[60ch] font-sans text-body-m tracking-body text-primary/80 md:text-body">
            POLUTONE. Одежда без лишнего шума, которая подчёркивает вас.
          </p>
          <p className="font-sans text-caption tracking-body text-primary/70">
            Первая коллекция в разработке.
          </p>
        </div>
        {/* Padding reserves room for the one-module shift so the plane stays inside the grid */}
        <div className="col-span-4 pr-6 pb-6 md:col-span-5 md:col-start-8 md:pr-10 md:pb-10">
          <div className="relative aspect-[4/5]" aria-hidden="true">
            <div className="absolute inset-0 bg-surface" />
            <div className="absolute inset-0 translate-x-6 translate-y-6 bg-accent md:translate-x-10 md:translate-y-10" />
          </div>
        </div>
      </section>
    </main>
  )
}
