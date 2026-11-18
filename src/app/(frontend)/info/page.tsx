import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/site/Breadcrumbs'
import { container, focusRing } from '@/components/site/ui'
import { listInfoLinks } from '@/lib/info'

export const metadata: Metadata = { title: 'Информация — POLUTONE' }
export const dynamic = 'force-dynamic'

/** All «Информация» pages in one list (also the no-JS fallback for the header dropdown). */
export default async function InfoIndexPage() {
  const links = await listInfoLinks()

  return (
    <div className={`${container} pb-16 md:pb-24`}>
      <Breadcrumbs items={[{ href: '/', label: 'Главная' }, { label: 'Информация' }]} />
      <h1 className="pt-6 pb-10 font-display text-h1-m text-primary md:text-h1">Информация</h1>
      <ul className="grid grid-cols-1 border-t border-primary/10 md:grid-cols-2 md:gap-x-6">
        {links.map((link) => (
          <li key={link.href} className="border-b border-primary/10">
            <Link
              href={link.href}
              className={`group flex min-h-16 items-center justify-between font-sans text-body-m tracking-body text-primary md:text-body ${focusRing}`}
            >
              {link.label}
              <span aria-hidden="true" className="text-primary/70 transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
