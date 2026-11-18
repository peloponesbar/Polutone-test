// Temporary home page; the full storefront home (mockup/shop.html) is a separate task.
import Link from 'next/link'

import { buttonPrimary, container } from '@/components/site/ui'

export default function HomePage() {
  return (
    <section
      className={`${container} grid grid-cols-4 items-end gap-4 py-16 md:grid-cols-12 md:gap-6 md:py-24`}
    >
      <div className="col-span-4 space-y-6 md:col-span-6">
        <h1 className="font-display text-hero-m font-light text-primary md:text-hero">
          Выразительность
          <br />в полутоне.
        </h1>
        <p className="max-w-[60ch] font-sans text-body-m tracking-body text-primary/80 md:text-body">
          POLUTONE. Одежда без лишнего шума, которая подчёркивает вас.
        </p>
        <Link href="/catalog" className={buttonPrimary}>
          В каталог
        </Link>
      </div>
      {/* Padding reserves room for the one-module shift so the plane stays inside the grid */}
      <div className="col-span-4 pr-6 pb-6 md:col-span-5 md:col-start-8 md:pr-10 md:pb-10">
        <div className="relative aspect-[4/5]" aria-hidden="true">
          <div className="absolute inset-0 bg-surface" />
          <div className="absolute inset-0 translate-x-6 translate-y-6 bg-accent md:translate-x-10 md:translate-y-10" />
        </div>
      </div>
    </section>
  )
}
