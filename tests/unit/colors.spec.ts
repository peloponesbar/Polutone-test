import { describe, expect, it } from 'vitest'

import { cardColors, colorHex, textOnSwatch } from '@/lib/catalog/colors'

describe('colorHex', () => {
  it('maps brand color names regardless of case and spaces', () => {
    expect(colorHex('Шалфей')).toBe('#9EA99B')
    expect(colorHex('  пыльная роза ')).toBe('#B4A1AA')
    expect(colorHex('Дымчатый синий')).toBe('#9FAEB8')
  })

  it('returns null for unknown colors', () => {
    expect(colorHex('Фуксия')).toBeNull()
  })
})

describe('cardColors', () => {
  const variants = [
    { color: 'Молочный', available: 0 },
    { color: 'Молочный', available: 2 },
    { color: 'Шалфей', available: 0 },
    { color: 'Фуксия', available: 1 },
  ]
  const images = [
    { id: 1, color: 'Шалфей' },
    { id: 2, color: 'Молочный' },
    { id: 3, color: null },
  ]

  it('lists each color once, in source order, with stock and its first photo', () => {
    expect(cardColors(variants, images)).toEqual([
      { name: 'Молочный', hex: '#F2EFE9', inStock: true, image: { id: 2, color: 'Молочный' } },
      { name: 'Шалфей', hex: '#9EA99B', inStock: false, image: { id: 1, color: 'Шалфей' } },
      // No photo of its own: falls back to a color-less photo, never another color's.
      { name: 'Фуксия', hex: null, inStock: true, image: { id: 3, color: null } },
    ])
  })

  it('has no photo for a color when only other colors are photographed', () => {
    expect(cardColors([{ color: 'Графит', available: 1 }], [{ id: 1, color: 'Шалфей' }])[0].image).toBeNull()
  })

  it('ignores variants without a color', () => {
    expect(cardColors([{ color: null, available: 1 }, { color: '', available: 1 }], [])).toEqual([])
  })
})

describe('textOnSwatch', () => {
  it('puts milk text on graphite and graphite text on the light brand colors', () => {
    expect(textOnSwatch(colorHex('Графит')!)).toBe('light')
    for (const name of ['Молочный', 'Шалфей', 'Пыльная роза', 'Дымчатый синий', 'Камень']) {
      expect(textOnSwatch(colorHex(name)!)).toBe('dark')
    }
  })
})
