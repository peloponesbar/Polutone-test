import { describe, expect, it } from 'vitest'

import { parseMeasurements, sortSizes } from '@/lib/catalog/sizes'
import { getCatalogSource, MockCatalogSource } from '@/lib/catalog/source'
import {
  colorsOf,
  defaultColor,
  defaultSize,
  findVariant,
  isInStock,
  sizeOptions,
  type PickerVariant,
} from '@/lib/catalog/variants'
import { formatPrice } from '@/lib/format'
import { pluralize } from '@/lib/plural'
import { slugify } from '@/lib/slug'

const v = (color: string, size: string, available: number, price = 100): PickerVariant => ({
  externalId: `${color}-${size}`,
  color,
  size,
  available,
  price,
})

describe('sortSizes', () => {
  it('orders letter sizes, then numeric, then unknown labels in original order', () => {
    expect(sortSizes(['XL', 'm', 'XS', '48', 'Особый', '44', 'S'])).toEqual([
      'XS',
      'S',
      'm',
      'XL',
      '44',
      '48',
      'Особый',
    ])
  })
})

describe('parseMeasurements', () => {
  it('parses a pipe table', () => {
    expect(parseMeasurements('Размер | Длина\nS | 70\n\nM | 72 ')).toEqual({
      headers: ['Размер', 'Длина'],
      rows: [
        ['S', '70'],
        ['M', '72'],
      ],
    })
  })

  it('returns null for text that is not a consistent table', () => {
    expect(parseMeasurements('')).toBeNull()
    expect(parseMeasurements('Свободная посадка')).toBeNull()
    expect(parseMeasurements('Размер | Длина\nS | 70 | 5')).toBeNull()
    expect(parseMeasurements('Размер |\nS | 70')).toBeNull()
  })
})

describe('variant picker logic', () => {
  const variants = [v('Графит', 'S', 2), v('Графит', 'M', 0), v('Камень', 'M', 1, 120), v('Камень', 'XS', 0)]

  it('lists colors once, in source order', () => {
    expect(colorsOf(variants)).toEqual(['Графит', 'Камень'])
  })

  it('lists every size of the product with availability for the chosen color', () => {
    expect(sizeOptions(variants, 'Графит')).toEqual([
      { size: 'XS', available: false },
      { size: 'S', available: true },
      { size: 'M', available: false },
    ])
    expect(sizeOptions(variants, 'Камень').filter((o) => o.available).map((o) => o.size)).toEqual(['M'])
  })

  it('finds the variant for a color and size', () => {
    expect(findVariant(variants, 'Камень', 'M')?.price).toBe(120)
    expect(findVariant(variants, 'Камень', null)).toBeNull()
    expect(findVariant(variants, 'Камень', 'S')).toBeNull()
  })

  it('defaults to the first color that has stock', () => {
    expect(defaultColor([v('A', 'S', 0), v('B', 'S', 1)])).toBe('B')
    expect(defaultColor([v('A', 'S', 0)])).toBe('A')
    expect(defaultColor([])).toBeNull()
  })

  it('preselects the only size when it is available', () => {
    expect(defaultSize([v('A', 'ONE SIZE', 2)], 'A')).toBe('ONE SIZE')
    expect(defaultSize([v('A', 'ONE SIZE', 0)], 'A')).toBeNull()
    expect(defaultSize(variants, 'Графит')).toBeNull()
  })

  it('isInStock', () => {
    expect(isInStock(variants)).toBe(true)
    expect(isInStock([v('A', 'S', 0)])).toBe(false)
  })
})

describe('slugify', () => {
  it('transliterates Russian and collapses separators', () => {
    expect(slugify('Пальто-халат №2')).toBe('palto-halat-2')
    expect(slugify('  Джемпер тонкой вязки ')).toBe('dzhemper-tonkoy-vyazki')
    expect(slugify('PT-JK-001')).toBe('pt-jk-001')
    expect(slugify('!!!')).toBe('')
  })
})

describe('formatPrice', () => {
  it('formats rubles with non-breaking spaces', () => {
    expect(formatPrice(18900)).toBe('18 900 ₽')
    expect(formatPrice(390)).toBe('390 ₽')
  })
})

describe('pluralize', () => {
  const forms: [string, string, string] = ['изделие', 'изделия', 'изделий']
  it.each([
    [1, 'изделие'],
    [3, 'изделия'],
    [5, 'изделий'],
    [11, 'изделий'],
    [21, 'изделие'],
    [112, 'изделий'],
    [0, 'изделий'],
  ])('%i → %s', (n, expected) => {
    expect(pluralize(n, forms)).toBe(expected)
  })
})

describe('getCatalogSource', () => {
  it('defaults to the mock source', () => {
    expect(getCatalogSource({})).toBeInstanceOf(MockCatalogSource)
    expect(getCatalogSource({ CATALOG_SOURCE: 'mock' }).name).toBe('mock')
  })

  it('rejects unknown and not-yet-connected sources', () => {
    expect(() => getCatalogSource({ CATALOG_SOURCE: 'excel' })).toThrow('Unknown CATALOG_SOURCE')
    expect(() => getCatalogSource({ CATALOG_SOURCE: 'moysklad' })).toThrow('not connected yet')
  })
})
