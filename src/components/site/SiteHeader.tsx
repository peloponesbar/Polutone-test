import Link from 'next/link'

import { NavLink } from './NavLink'
import { container, focusRing } from './ui'

const NAV = [{ href: '/catalog', label: 'Каталог' }]

export function SiteHeader() {
  return (
    <div className="sticky top-0 z-20">
      <div className="bg-surface">
        <div className={`${container} flex min-h-9 items-center justify-center py-1`}>
          <span className="font-sans text-caption tracking-body">Первая коллекция в разработке</span>
        </div>
      </div>
      <header className="border-b border-primary/10 bg-background/90 backdrop-blur-md">
        <div
          className={`${container} grid h-16 grid-cols-[auto_1fr] items-center md:h-[72px] md:grid-cols-[1fr_auto_1fr]`}
        >
          <nav aria-label="Основная навигация" className="hidden gap-8 md:flex">
            {NAV.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Link
            href="/"
            aria-label="POLUTONE — на главную"
            className={`inline-flex min-h-[44px] items-center ${focusRing}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- brand SVG at fixed width */}
            <img src="/logos/POLUTONE_sage_light.svg" alt="" width={180} height={40} />
          </Link>
          <nav aria-label="Основная навигация" className="flex justify-end gap-6 md:hidden">
            {NAV.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden md:block" />
        </div>
      </header>
    </div>
  )
}
