import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/site/Breadcrumbs'
import { asImage, toImageData } from '@/components/site/MediaImage'
import { ProductCard } from '@/components/site/ProductCard'
import { ProductBlocks } from '@/components/site/product/ProductBlocks'
import { ProductInfo } from '@/components/site/product/ProductInfo'
import { ProductView } from '@/components/site/product/ProductView'
import { container, label } from '@/components/site/ui'
import { getProductBySlug, listRelated } from '@/lib/catalog/queries'
import type { Media } from '@/payload-types'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug)
  if (!product) return { title: 'Изделие не найдено — POLUTONE' }
  return {
    title: `${product.title} — POLUTONE`,
    description: product.description ?? undefined,
  }
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug((await params).slug)
  if (!product) notFound()

  const related = await listRelated(product)
  const category = typeof product.category === 'object' ? product.category : null
  const images = (product.images ?? [])
    .map(asImage)
    .filter((m): m is Media => m !== null)
    .map(toImageData)
  const variants = (product.variants ?? []).map((v) => ({
    externalId: v.externalId,
    size: v.size,
    color: v.color ?? '',
    price: v.price,
    available: v.available,
  }))

  return (
    <div className={`${container} pb-16 md:pb-24`}>
      <Breadcrumbs
        items={[
          { href: '/', label: 'Главная' },
          { href: '/catalog', label: 'Каталог' },
          { label: product.title },
        ]}
      />

      <ProductView
        productId={product.id}
        images={images}
        variants={variants}
        price={product.price}
        oldPrice={product.oldPrice ?? null}
        hasSizeChart={Boolean(product.measurements)}
        modelNote={product.modelNote}
        heading={
          <div className="flex flex-col gap-2">
            <span className={`${label} text-primary/70`}>
              POLUTONE{category ? ` · ${category.name}` : ''}
            </span>
            <h1 className="font-display text-h2-m text-primary md:text-h2">{product.title}</h1>
            {product.description ? (
              <p className="font-sans text-body-m tracking-body text-primary/80 md:text-body">
                {product.description}
              </p>
            ) : null}
          </div>
        }
        info={
          <ProductInfo
            composition={product.composition}
            care={product.care}
            measurements={product.measurements}
          />
        }
      />

      <div className="mt-16 md:mt-24">
        <ProductBlocks blocks={product.blocks} />
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related" className="border-t border-primary/10 pt-16">
          <h2 id="related" className="mb-10 font-display text-h2-m text-primary md:text-h2">
            Вам может подойти
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6 md:gap-y-16">
            {related.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} headingLevel="h3" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
