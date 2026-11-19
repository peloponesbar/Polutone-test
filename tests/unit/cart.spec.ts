import { describe, expect, it } from 'vitest'

import {
  addLine,
  countItems,
  MAX_LINES,
  MAX_QTY,
  priceCart,
  removeLine,
  sanitizeLines,
  setLineQty,
  type VariantInfo,
} from '@/lib/cart/cart'

const info = (variantId: string, available: number, price = 1000): VariantInfo => ({
  variantId,
  productId: 1,
  title: 'Футболка',
  slug: 'futbolka',
  color: 'Молочный',
  size: 'M',
  price,
  oldPrice: null,
  available,
  image: null,
})

describe('cart lines', () => {
  it('adds a new line and merges the same variant', () => {
    let lines = addLine([], 'a')
    lines = addLine(lines, 'b')
    lines = addLine(lines, 'a')
    expect(lines).toEqual([
      { variantId: 'a', qty: 2 },
      { variantId: 'b', qty: 1 },
    ])
    expect(countItems(lines)).toBe(3)
  })

  it('never goes above the known stock or the cap', () => {
    expect(addLine([{ variantId: 'a', qty: 2 }], 'a', 1, 2)).toEqual([{ variantId: 'a', qty: 2 }])
    expect(addLine([], 'a', 50)).toEqual([{ variantId: 'a', qty: MAX_QTY }])
    expect(addLine([], 'a', 1, 0)).toEqual([])
  })

  it('sets and removes quantities', () => {
    const lines = [{ variantId: 'a', qty: 2 }, { variantId: 'b', qty: 1 }]
    expect(setLineQty(lines, 'a', 5)).toEqual([{ variantId: 'a', qty: 5 }, { variantId: 'b', qty: 1 }])
    expect(setLineQty(lines, 'a', 0)).toEqual([{ variantId: 'b', qty: 1 }])
    expect(setLineQty(lines, 'a', 99)[0].qty).toBe(MAX_QTY)
    expect(removeLine(lines, 'b')).toEqual([{ variantId: 'a', qty: 2 }])
  })

  it('cleans untrusted stored data', () => {
    expect(sanitizeLines('nope')).toEqual([])
    expect(sanitizeLines(null)).toEqual([])
    expect(
      sanitizeLines([
        { variantId: 'a', qty: 1 },
        { variantId: 'a', qty: 2 },
        { variantId: 'b', qty: 0 },
        { variantId: 'c', qty: 1.5 },
        { variantId: '', qty: 1 },
        { qty: 1 },
        null,
      ]),
    ).toEqual([{ variantId: 'a', qty: 3 }])
    const many = Array.from({ length: MAX_LINES + 5 }, (_, i) => ({ variantId: `v${i}`, qty: 1 }))
    expect(sanitizeLines(many)).toHaveLength(MAX_LINES)
  })
})

describe('priceCart', () => {
  it('totals what can be bought and reports what changed', () => {
    const variants = new Map([
      ['a', info('a', 5, 1000)],
      ['b', info('b', 1, 2000)],
      ['c', info('c', 0, 3000)],
    ])
    const cart = priceCart(
      [
        { variantId: 'a', qty: 2 },
        { variantId: 'b', qty: 3 },
        { variantId: 'c', qty: 1 },
        { variantId: 'gone', qty: 1 },
      ],
      variants,
    )
    expect(cart.lines.map((l) => [l.variantId, l.qty, l.status, l.lineTotal])).toEqual([
      ['a', 2, 'ok', 2000],
      ['b', 1, 'reduced', 2000],
      ['c', 0, 'unavailable', 0],
    ])
    expect(cart.missing).toEqual([{ variantId: 'gone', requested: 1 }])
    expect(cart.count).toBe(3)
    expect(cart.total).toBe(4000)
  })

  it('treats negative stock as sold out', () => {
    const cart = priceCart([{ variantId: 'a', qty: 1 }], new Map([['a', info('a', -2)]]))
    expect(cart.lines[0]).toMatchObject({ qty: 0, status: 'unavailable' })
  })
})
