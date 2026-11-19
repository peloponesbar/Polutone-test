import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { getCartQuote } from '@/app/(frontend)/cart/actions'
import { quoteCart } from '@/lib/cart/quote'
import { syncCatalog } from '@/lib/catalog/sync'
import type { CatalogSource, SourceProduct } from '@/lib/catalog/types'

let payload: Payload

const product = (id: string, variants: SourceProduct['variants']): SourceProduct => ({
  externalId: id,
  article: `ART-${id}`,
  name: `Изделие ${id}`,
  category: 'Футболки',
  price: Math.min(...variants.map((v) => v.price)),
  oldPrice: null,
  composition: '',
  care: '',
  measurements: '',
  updatedAt: '2026-11-10T09:00:00.000Z',
  variants,
})

const variant = (id: string, available: number, price = 3900) => ({
  externalId: id,
  size: 'M',
  color: 'Молочный',
  price,
  available,
})

const sourceOf = (products: SourceProduct[]): CatalogSource => ({ name: 'test', listProducts: async () => products })

async function publish(externalId: string) {
  const found = await payload.find({ collection: 'products', where: { externalId: { equals: externalId } }, depth: 0 })
  await payload.update({ collection: 'products', id: found.docs[0].id, data: { _status: 'published' } })
}

describe('cart quote', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  beforeEach(async () => {
    await payload.delete({ collection: 'products', where: { id: { exists: true } } })
    await payload.delete({ collection: 'categories', where: { id: { exists: true } } })
    await syncCatalog(
      payload,
      sourceOf([
        product('tee', [variant('tee-m', 3), variant('tee-l', 0)]),
        product('pants', [variant('pants-m', 5, 6500)]),
        product('draft', [variant('draft-m', 5)]),
      ]),
    )
    await publish('tee')
    await publish('pants')
  })

  it('prices lines from the database, not from the browser', async () => {
    const cart = await quoteCart(payload, [
      { variantId: 'tee-m', qty: 2 },
      { variantId: 'pants-m', qty: 1 },
    ])
    expect(cart.lines.map((l) => [l.variantId, l.qty, l.price, l.status])).toEqual([
      ['tee-m', 2, 3900, 'ok'],
      ['pants-m', 1, 6500, 'ok'],
    ])
    expect(cart.lines[0]).toMatchObject({ title: 'Изделие tee', color: 'Молочный', size: 'M' })
    expect(cart.total).toBe(2 * 3900 + 6500)
    expect(cart.count).toBe(3)
  })

  it('clamps to stock and flags sold-out variants', async () => {
    const cart = await quoteCart(payload, [
      { variantId: 'tee-m', qty: 5 },
      { variantId: 'tee-l', qty: 1 },
    ])
    expect(cart.lines.map((l) => [l.variantId, l.qty, l.status])).toEqual([
      ['tee-m', 3, 'reduced'],
      ['tee-l', 0, 'unavailable'],
    ])
    expect(cart.total).toBe(3 * 3900)
  })

  it('never sells unpublished or unknown variants', async () => {
    const cart = await quoteCart(payload, [
      { variantId: 'draft-m', qty: 1 },
      { variantId: 'no-such', qty: 1 },
    ])
    expect(cart.lines).toEqual([])
    expect(cart.missing.map((m) => m.variantId)).toEqual(['draft-m', 'no-such'])
    expect(cart.total).toBe(0)
  })

  it('treats products removed from MoySklad as gone', async () => {
    await syncCatalog(payload, sourceOf([product('pants', [variant('pants-m', 5, 6500)])]))
    const cart = await quoteCart(payload, [{ variantId: 'tee-m', qty: 1 }])
    expect(cart.missing.map((m) => m.variantId)).toEqual(['tee-m'])
  })

  it('follows price and stock changes from the next sync', async () => {
    await syncCatalog(
      payload,
      sourceOf([product('tee', [variant('tee-m', 1, 4200), variant('tee-l', 0)]), product('pants', [variant('pants-m', 5, 6500)])]),
    )
    const cart = await quoteCart(payload, [{ variantId: 'tee-m', qty: 2 }])
    expect(cart.lines[0]).toMatchObject({ price: 4200, qty: 1, status: 'reduced' })
  })

  it('the page action cleans untrusted input', async () => {
    const result = await getCartQuote([
      { variantId: 'tee-m', qty: 1 },
      { variantId: 'tee-m', qty: 1 },
      { variantId: 'pants-m', qty: -4 },
      { variantId: 42, qty: 1 },
      'junk',
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.cart.lines.map((l) => [l.variantId, l.qty])).toEqual([['tee-m', 2]])
    expect(await getCartQuote('not an array')).toMatchObject({ ok: true, cart: { lines: [], total: 0 } })
  })
})
