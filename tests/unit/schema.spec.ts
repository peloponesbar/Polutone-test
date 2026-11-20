import { describe, expect, it } from 'vitest'

import { breadcrumbSchema, organizationSchema, productSchema, serializeJsonLd } from '@/lib/schema'
import type { ContactLink } from '@/lib/settings/format'

const base = 'https://polutone.ru'
const contact = (kind: ContactLink['kind'], href: string, external: boolean): ContactLink => ({ kind, label: kind, text: kind, href, external })

describe('productSchema', () => {
  const input = { title: 'Худи', slug: 'hudi', article: 'H01', category: 'Худи', images: ['/api/media/file/a.webp'], price: 5000 }

  it('gives one Offer when all sizes cost the same, with an absolute image url', () => {
    const s = productSchema(base, { ...input, variants: [{ price: 5000, available: 2 }, { price: 5000, available: 0 }] }) as any
    expect(s.offers['@type']).toBe('Offer')
    expect(s.offers.price).toBe(5000)
    expect(s.offers.availability).toBe('https://schema.org/InStock')
    expect(s.image).toEqual(['https://polutone.ru/api/media/file/a.webp'])
    expect(s.sku).toBe('H01')
  })

  it('gives an AggregateOffer for a price range and marks sold-out products', () => {
    const s = productSchema(base, { ...input, variants: [{ price: 4000, available: 0 }, { price: 6000, available: 0 }] }) as any
    expect(s.offers).toMatchObject({ '@type': 'AggregateOffer', lowPrice: 4000, highPrice: 6000, offerCount: 2 })
    expect(s.offers.availability).toBe('https://schema.org/OutOfStock')
  })

  it('falls back to the product price when there are no variants', () => {
    const s = productSchema(base, { ...input, variants: [] }) as any
    expect(s.offers.price).toBe(5000)
  })
})

describe('organizationSchema', () => {
  it('collects social links and contact point', () => {
    const s = organizationSchema(base, [
      contact('telegram', 'https://t.me/polutone', true),
      contact('phone', 'tel:+79001234567', false),
      contact('email', 'mailto:hi@polutone.ru', false),
    ]) as any
    expect(s.sameAs).toEqual(['https://t.me/polutone'])
    expect(s.contactPoint).toMatchObject({ telephone: '+79001234567', email: 'hi@polutone.ru' })
  })
})

describe('breadcrumbSchema', () => {
  it('numbers items and leaves the last one without a link', () => {
    const s = breadcrumbSchema(base, [{ label: 'Главная', path: '/' }, { label: 'Каталог', path: '/catalog' }, { label: 'Худи' }]) as any
    expect(s.itemListElement.map((i: any) => i.position)).toEqual([1, 2, 3])
    expect(s.itemListElement[1].item).toBe('https://polutone.ru/catalog')
    expect(s.itemListElement[2].item).toBeUndefined()
  })
})

describe('serializeJsonLd', () => {
  it('escapes < so text cannot close the script tag', () => {
    expect(serializeJsonLd({ name: '</script><b>' })).not.toContain('<')
  })
})
