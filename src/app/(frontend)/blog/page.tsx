import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/site/Breadcrumbs'
import { buttonSecondary, container } from '@/components/site/ui'

export const metadata: Metadata = { title: 'Блог — POLUTONE' }
// Dynamic so the header menu (from the admin) is always current.
export const dynamic = 'force-dynamic'

/** Placeholder until blog posts are built (decided 2026-11-18: menu item first, posts later). */
export default function BlogPage() {
  return (
    <div className={`${container} pb-16 md:pb-24`}>
      <Breadcrumbs items={[{ href: '/', label: 'Главная' }, { label: 'Блог' }]} />
      <div className="flex max-w-[60ch] flex-col gap-6 pt-6">
        <h1 className="font-display text-h1-m text-primary md:text-h1">Блог</h1>
        <p className="font-sans text-body-m tracking-body text-primary/80 md:text-body">
          Здесь будут истории о вещах: о крое, ткани и деталях, которые не видны с первого взгляда. Первые записи
          появятся вместе с коллекцией.
        </p>
        <Link href="/catalog" className={`${buttonSecondary} self-start`}>
          Смотреть каталог
        </Link>
      </div>
    </div>
  )
}
