import { draftMode } from 'next/headers'
import Link from 'next/link'

import { asImage, MediaImage } from '@/components/site/MediaImage'
import { Price } from '@/components/site/Price'
import { ProductCard } from '@/components/site/ProductCard'
import { SectionHeader } from '@/components/site/SectionHeader'
import { buttonPrimary, buttonSecondary, container, focusRing, label } from '@/components/site/ui'
import { getHome, listCategories, listNewest } from '@/lib/catalog/queries'
import type { Product } from '@/payload-types'

export const dynamic = 'force-dynamic'

const section = 'border-t border-primary/10 py-16 md:py-24'

const paragraphs = (text?: string | null) =>
  (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

export default async function HomePage() {
  const [home, categories, newest] = await Promise.all([
    getHome({ draft: (await draftMode()).isEnabled }),
    listCategories(),
    listNewest(4),
  ])

  const heroImage = asImage(home.hero?.image)
  const aboutImage = asImage(home.about?.image)
  const featured = typeof home.featured?.product === 'object' ? (home.featured.product as Product) : null
  const featuredImage = asImage(home.featured?.image) ?? asImage(featured?.images?.[0])

  return (
    <>
      {/* 1. Hero: photo first, text below it — normal flow, so they never overlap at any width */}
      <section aria-labelledby="hero-title">
        {heroImage ? (
          // Desktop shows the whole 16:9 photo uncropped; phones crop to 4:5 around the centre figure.
          <div className="relative aspect-[4/5] overflow-hidden bg-surface md:aspect-[16/9]">
            <MediaImage media={heroImage} priority sizes="100vw" className="object-[62%_center] md:object-center" />
          </div>
        ) : null}
        {/* Heading and text sit side by side only from 1280 px, where the 64 px heading fits its column. */}
        <div className={`${container} grid grid-cols-12 gap-6 py-10 md:py-16 xl:items-end`}>
          <h1
            id="hero-title"
            className="col-span-12 font-display text-hero-m font-light text-primary md:text-hero xl:col-span-7"
          >
            {home.hero?.title || 'Выразительность в полутоне.'}
          </h1>
          <div className="col-span-12 flex flex-col gap-6 md:col-span-8 xl:col-span-5 xl:col-start-8">
            {home.hero?.text ? (
              <p className="max-w-[60ch] font-sans text-body-m tracking-body text-primary/80 md:text-body">
                {home.hero.text}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Link href="/catalog" className={buttonPrimary}>
                Смотреть коллекцию
              </Link>
              <Link href="#o-brende" className={buttonSecondary}>
                О бренде
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Categories */}
      {categories.length > 0 ? (
        <section aria-labelledby="kategorii" className={`${container} ${section}`}>
          <SectionHeader index="01" eyebrow="Каталог" title="Категории" id="kategorii" />
          <ul className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
            {categories.map((category, i) => {
              const image = asImage(category.image)
              return (
                <li key={category.id}>
                  <Link
                    href={`/catalog?category=${category.slug}`}
                    className={`group flex flex-col gap-4 ${focusRing}`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface md:aspect-[4/5]">
                      {image ? (
                        <MediaImage
                          media={image}
                          priority={i === 0}
                          sizes="(min-width: 768px) 33vw, 100vw"
                          className="object-top transition-transform duration-700 ease-out group-hover:scale-[1.03] md:object-center"
                        />
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between border-t border-primary/10 pt-4">
                      <span className={label}>{category.name}</span>
                      <span className="font-sans text-caption tracking-body text-primary/70 group-hover:text-primary">
                        Смотреть
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {/* 3. New */}
      {newest.length > 0 ? (
        <section aria-labelledby="novoe" className={`${container} ${section}`}>
          <SectionHeader
            index="02"
            eyebrow="Новое"
            title="Коллекция 01"
            id="novoe"
            link={{ href: '/catalog', label: 'Весь каталог' }}
          />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {newest.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} headingLevel="h3" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 4. About: text + photo with the one-module shift */}
      <section
        id="o-brende"
        aria-labelledby="o-brende-title"
        className={`${container} ${section} grid scroll-mt-28 grid-cols-4 items-center gap-10 md:grid-cols-12 md:gap-6`}
      >
        <div className="col-span-4 flex flex-col gap-6 md:col-span-5">
          <span className={`${label} text-primary/70`}>03 / О бренде</span>
          <h2 id="o-brende-title" className="font-display text-h2-m text-primary md:text-h2">
            {home.about?.title || 'Не громче. Точнее.'}
          </h2>
          {paragraphs(home.about?.text).map((p, i) => (
            <p key={i} className="max-w-[60ch] font-sans text-body-m tracking-body text-primary/80 md:text-body">
              {p}
            </p>
          ))}
        </div>
        {aboutImage ? (
          <div className="col-span-4 pr-6 pb-6 md:col-span-5 md:col-start-8 md:pr-10 md:pb-10">
            <div className="relative aspect-[4/5]">
              <div aria-hidden="true" className="absolute inset-0 translate-x-6 translate-y-6 bg-surface md:translate-x-10 md:translate-y-10" />
              <div className="relative h-full w-full overflow-hidden bg-surface">
                <MediaImage media={aboutImage} sizes="(min-width: 768px) 40vw, 100vw" />
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* 5. Featured product */}
      {featured ? (
        <section
          aria-labelledby="featured-title"
          className={`${container} ${section} grid grid-cols-4 items-end gap-10 md:grid-cols-12 md:gap-6`}
        >
          <div className="relative col-span-4 aspect-[4/5] overflow-hidden bg-surface md:col-span-6">
            {featuredImage ? <MediaImage media={featuredImage} sizes="(min-width: 768px) 50vw, 100vw" /> : null}
          </div>
          <div className="col-span-4 flex flex-col gap-6 md:col-span-4 md:col-start-8">
            <span className={`${label} text-primary/70`}>04 / {home.featured?.label || 'Вещь сезона'}</span>
            <h2 id="featured-title" className="font-display text-h2-m text-primary md:text-h2">
              {featured.title}
            </h2>
            {featured.description ? (
              <p className="font-sans text-body-m tracking-body text-primary/80 md:text-body">{featured.description}</p>
            ) : null}
            <Price
              price={featured.price}
              oldPrice={featured.oldPrice}
              className="font-sans text-body-m tracking-body md:text-body"
            />
            <Link href={`/catalog/${featured.slug}`} className={`${buttonPrimary} self-start`}>
              Смотреть изделие
            </Link>
          </div>
        </section>
      ) : null}
    </>
  )
}
