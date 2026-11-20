import type { Metadata } from 'next'
import Link from 'next/link'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/site/Breadcrumbs'
import { SizeChartTable } from '@/components/site/SizeChartTable'
import { container, focusRing, label } from '@/components/site/ui'
import { listProducts } from '@/lib/catalog/queries'
import { JsonLd } from '@/components/site/JsonLd'
import { breadcrumbSchema } from '@/lib/schema'
import { metaDescription, pageOpenGraph, settingsOgImage } from '@/lib/seo'
import { siteUrl } from '@/lib/site-url'
import { getInfoPage, listInfoLinks, paragraphs } from '@/lib/info'
import { getSiteSettings } from '@/lib/settings'
import { ContactRows } from '@/components/site/ContactList'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getInfoPage((await params).slug, { draft: (await draftMode()).isEnabled })
  if (!page) return { title: 'Страница не найдена' }
  const { seo } = await getSiteSettings()
  const description =
    metaDescription(page.intro) ?? metaDescription(page.sections?.[0]?.text) ?? `${page.title} — интернет-магазин POLUTONE.`
  const path = `/info/${page.slug}`
  return {
    title: page.title,
    description,
    alternates: { canonical: path },
    openGraph: pageOpenGraph({ title: `${page.title} — POLUTONE`, description, path, image: settingsOgImage(seo.image) }),
  }
}

export default async function InfoPageView({ params }: Props) {
  const { slug } = await params
  const [page, links] = await Promise.all([
    getInfoPage(slug, { draft: (await draftMode()).isEnabled }),
    listInfoLinks(),
  ])
  if (!page) notFound()

  const settings = page.showContacts ? await getSiteSettings() : null
  const charts = page.showSizeCharts
    ? (await listProducts({ sort: 'new' })).filter((p) => p.measurements)
    : []

  return (
    <div className={`${container} pb-16 md:pb-24`}>
      <JsonLd
        data={breadcrumbSchema(siteUrl(), [
          { label: 'Главная', path: '/' },
          { label: 'Информация', path: '/info' },
          { label: page.title },
        ])}
      />
      <Breadcrumbs
        items={[{ href: '/', label: 'Главная' }, { href: '/info', label: 'Информация' }, { label: page.title }]}
      />

      <div className="grid grid-cols-4 gap-10 pt-6 md:grid-cols-12 md:gap-6">
        {/* Section menu: a list on desktop, hidden on phones (the header menu has the same links) */}
        <nav aria-label="Информация" className="hidden md:col-span-3 md:block">
          <ul className="sticky top-[132px] flex flex-col border-t border-primary/10">
            {links.map((link) => {
              const active = link.href === `/info/${page.slug}`
              return (
                <li key={link.href} className="border-b border-primary/10">
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-[44px] items-center font-sans text-caption tracking-body ${
                      active ? 'text-primary' : 'text-primary/70 hover:text-primary'
                    } ${focusRing}`}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <article className="col-span-4 flex flex-col gap-10 md:col-span-8 md:col-start-5">
          <header className="flex flex-col gap-4">
            <h1 className="font-display text-h1-m text-primary md:text-h1">{page.title}</h1>
            {page.intro ? (
              <p className="max-w-[60ch] font-sans text-body-m tracking-body text-primary/80 md:text-body">
                {page.intro}
              </p>
            ) : null}
          </header>

          {(page.sections ?? []).map((section) => (
            <section key={section.id} className="flex flex-col gap-4 border-t border-primary/10 pt-6">
              {section.heading ? <h2 className={label}>{section.heading}</h2> : null}
              {paragraphs(section.text).map((p, i) => (
                <p key={i} className="max-w-[60ch] font-sans text-body-m tracking-body text-primary/80 md:text-body">
                  {p}
                </p>
              ))}
            </section>
          ))}

          {settings ? (
            <section className="flex flex-col gap-4 border-t border-primary/10 pt-6">
              <h2 className={label}>Связь</h2>
              {settings.contacts.length > 0 ? (
                <ContactRows contacts={settings.contacts} hours={settings.hours} />
              ) : (
                <p className="max-w-[60ch] font-sans text-body-m tracking-body text-primary/80 md:text-body">
                  Контакты для связи скоро появятся на этой странице.
                </p>
              )}
              {settings.legal ? (
                <p className="max-w-[60ch] font-sans text-caption tracking-body text-primary/80">Продавец: {settings.legal}</p>
              ) : null}
            </section>
          ) : null}

          {charts.map((product) => (
            <section key={product.id} className="flex flex-col gap-4 border-t border-primary/10 pt-6">
              <h2 className="font-display text-h2-m text-primary md:text-h2">
                <Link href={`/catalog/${product.slug}`} className={`hover:underline hover:decoration-accent ${focusRing}`}>
                  {product.title}
                </Link>
              </h2>
              <div className="font-sans text-caption tracking-body text-primary/80">
                <SizeChartTable text={product.measurements!} />
              </div>
            </section>
          ))}
        </article>
      </div>
    </div>
  )
}
