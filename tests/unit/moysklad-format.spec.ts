import { describe, expect, it } from 'vitest'

import { mockAssortment } from '@/lib/catalog/mock-data'
import {
  idFromHref,
  kopecksToRubles,
  msDateToIso,
  normalizeAssortment,
  type MsAssortment,
} from '@/lib/catalog/moysklad-format'

const href = (id: string) => `https://api.moysklad.ru/api/remap/1.2/entity/product/${id}`

function assortment(overrides: Partial<MsAssortment> = {}): MsAssortment {
  return {
    products: [
      {
        id: 'p1',
        name: '  Жакет  ',
        article: 'A-1',
        pathName: 'Одежда/Жакеты',
        updated: '2026-11-10 12:00:00.000',
        salePrices: [
          { value: 1000000, priceType: { name: 'Цена продажи' } },
          { value: 1200000, priceType: { name: 'Старая цена' } },
        ],
        attributes: [
          { name: 'Состав', value: 'Шерсть' },
          { name: 'Уход', value: 'Химчистка' },
        ],
      },
    ],
    variants: [
      {
        id: 'v1',
        product: { meta: { href: href('p1') } },
        characteristics: [
          { name: 'Цвет', value: 'Графит' },
          { name: 'Размер', value: 'M' },
        ],
        salePrices: [],
        quantity: 3,
      },
      {
        id: 'v2',
        product: { meta: { href: `${href('p1')}?expand=x` } },
        characteristics: [
          { name: 'Цвет', value: 'Графит' },
          { name: 'Размер', value: 'L' },
        ],
        salePrices: [{ value: 1100000, priceType: { name: 'Цена продажи' } }],
        quantity: -2,
      },
    ],
    ...overrides,
  }
}

describe('normalizeAssortment', () => {
  it('maps a product with variants, prices in rubles and attributes', () => {
    const { products, skipped } = normalizeAssortment(assortment())
    expect(skipped).toEqual([])
    expect(products).toHaveLength(1)
    expect(products[0]).toMatchObject({
      externalId: 'p1',
      article: 'A-1',
      name: 'Жакет',
      category: 'Жакеты',
      price: 10000,
      oldPrice: 12000,
      composition: 'Шерсть',
      care: 'Химчистка',
      measurements: '',
      updatedAt: '2026-11-10T09:00:00.000Z',
    })
  })

  it('inherits the product price when a variant has none, and keeps its own otherwise', () => {
    const [product] = normalizeAssortment(assortment()).products
    expect(product.variants.map((v) => [v.size, v.price])).toEqual([
      ['M', 10000],
      ['L', 11000],
    ])
  })

  it('never reports negative availability', () => {
    const [product] = normalizeAssortment(assortment()).products
    expect(product.variants.find((v) => v.size === 'L')?.available).toBe(0)
  })

  it('drops an old price that is not higher than the current price', () => {
    const data = assortment()
    data.products[0].salePrices[1].value = 900000
    expect(normalizeAssortment(data).products[0].oldPrice).toBeNull()
  })

  it('skips products without a sale price or without variants', () => {
    const data = assortment()
    data.products.push({ ...data.products[0], id: 'p2', name: 'Без вариантов' })
    data.products.push({ ...data.products[0], id: 'p3', name: 'Без цены', salePrices: [] })
    const { products, skipped } = normalizeAssortment(data)
    expect(products.map((p) => p.externalId)).toEqual(['p1'])
    expect(skipped).toEqual([
      { id: 'p2', name: 'Без вариантов', reason: 'no variants' },
      { id: 'p3', name: 'Без цены', reason: 'no sale price' },
    ])
  })
})

describe('helpers', () => {
  it('kopecksToRubles', () => {
    expect(kopecksToRubles(1890000)).toBe(18900)
    expect(kopecksToRubles(150)).toBe(1.5)
  })

  it('idFromHref ignores query strings and fails loudly on garbage', () => {
    expect(idFromHref(`${href('abc')}?expand=product`)).toBe('abc')
    expect(() => idFromHref('')).toThrow()
  })

  it('msDateToIso treats MoySklad time as Moscow time', () => {
    expect(msDateToIso('2026-01-01 03:00:00.000')).toBe('2026-01-01T00:00:00.000Z')
    expect(() => msDateToIso('not a date')).toThrow()
  })
})

describe('mock assortment', () => {
  it('maps cleanly: 6 models × 5 colors × 5 sizes, unique ids, every product sellable', () => {
    const { products, skipped } = normalizeAssortment(mockAssortment())
    expect(skipped).toEqual([])
    expect(products.map((p) => p.article)).toEqual(['H01', 'H02', 'P01', 'P02', 'T01', 'T02'])
    expect(products.every((p) => p.variants.length === 25)).toBe(true)
    const variantIds = products.flatMap((p) => p.variants.map((v) => v.externalId))
    expect(new Set(variantIds).size).toBe(variantIds.length)
    expect(products.every((p) => p.variants.length > 0 && p.price > 0)).toBe(true)
  })
})
