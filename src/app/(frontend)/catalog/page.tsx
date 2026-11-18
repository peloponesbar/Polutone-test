import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/site/Breadcrumbs'
import { ProductCard } from '@/components/site/ProductCard'
import { SortSelect } from '@/components/site/SortSelect'
import { container, tab, tabOff, tabOn } from '@/components/site/ui'
import { listCategories, listProducts, parseSort, SORT_OPTIONS } from '@/lib/catalog/queries'
import { pluralize } from '@/lib/plural'

export const metadata: Metadata = { title: 'Каталог — POLUTONE' }
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ category?: string; sort?: string }> }

export default async function CatalogPage({ searchParams }: Props) {
  const params = await searchParams
  const sort = parseSort(params.sort)
  const [categories, products] = await Promise.all([
    listCategories(),
    listProducts({ categorySlug: params.category, sort }),
  ])
  const active = categories.find((c) => c.slug === params.category)?.slug

  const hrefFor = (category?: string) => {
    const query = new URLSearchParams()
    if (category) query.set('category', category)
    if (sort !== 'new') query.set('sort', sort)
    const qs = query.toString()
    return qs ? `/catalog?${qs}` : '/catalog'
  }

  return (
    <div className={`${container} pb-16 md:pb-24`}>
      <Breadcrumbs items={[{ href: '/', label: 'Главная' }, { label: 'Каталог' }]} />

      <div className="flex flex-col gap-4 pt-6 pb-10">
        <h1 className="font-display text-h1-m text-primary md:text-h1">Каталог</h1>
        <p className="max-w-[60ch] font-sans text-body-m tracking-body text-primary/80 md:text-body">
          Свободный крой, унисекс, спокойные цвета.
        </p>
      </div>

      <div className="mb-10 flex flex-col gap-4 border-y border-primary/10 py-6 md:flex-row md:items-end md:justify-between md:gap-6">
        <nav aria-label="Категории" className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
          {[{ slug: undefined, name: 'Все' }, ...categories].map((category) => {
            const isActive = category.slug === active
            return (
              <Link
                key={category.name}
                href={hrefFor(category.slug)}
                aria-current={isActive ? 'page' : undefined}
                className={`${tab} ${isActive ? tabOn : tabOff} ${category.slug ? '' : 'col-span-2 md:col-span-1'}`}
                scroll={false}
              >
                {category.name}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center justify-between gap-4">
          <span role="status" className="font-sans text-caption tracking-body text-primary/70">
            {products.length} {pluralize(products.length, ['изделие', 'изделия', 'изделий'])}
          </span>
          <SortSelect value={sort} options={SORT_OPTIONS} />
        </div>
      </div>

      {products.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6 md:gap-y-16">
          {products.map((product, index) => (
            <li key={product.id}>
              <ProductCard product={product} priority={index < 4} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-sans text-body-m tracking-body text-primary/80 md:text-body">
          В этой категории пока ничего нет.{' '}
          <Link href="/catalog" className="underline decoration-accent underline-offset-4">
            Весь каталог
          </Link>
        </p>
      )}
    </div>
  )
}
