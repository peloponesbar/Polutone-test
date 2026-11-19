import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { quoteCart } from '@/lib/cart/quote'
import { syncCatalog } from '@/lib/catalog/sync'
import type { CatalogSource, SourceProduct } from '@/lib/catalog/types'
import type { OrderSink } from '@/lib/orders/moysklad'
import { FIRST_ORDER_NUMBER, placeOrder, type PlaceOrderDeps } from '@/lib/orders/place'

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
const variant = (id: string, available: number, price = 3900) => ({ externalId: id, size: 'M', color: 'Молочный', price, available })
const sourceOf = (products: SourceProduct[]): CatalogSource => ({ name: 'test', listProducts: async () => products })

const form = {
  name: 'Анна',
  phone: '8 900 123-45-67',
  email: 'Anna@Example.ru',
  deliveryService: 'cdek',
  deliveryMethod: 'pickup',
  city: 'Казань',
  address: 'ул. Баумана, 1, пункт СДЭК',
  paymentMethod: 'online',
  comment: '',
  consent: true,
}

/** Records MoySklad and Telegram calls instead of making them. */
function fakes(): PlaceOrderDeps & { sent: string[]; sunk: number[] } {
  const sent: string[] = []
  const sunk: number[] = []
  const sink: OrderSink = { name: 'fake', createOrder: async (o) => (sunk.push(o.number), `ms-${o.number}`) }
  return { sent, sunk, sink, notify: async (text) => sent.push(text) }
}

async function stockOf(variantId: string) {
  const cart = await quoteCart(payload, [{ variantId, qty: 1 }])
  return cart.lines[0]?.available ?? null
}

describe('placeOrder', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  beforeEach(async () => {
    await payload.delete({ collection: 'orders', where: { id: { exists: true } } })
    await payload.delete({ collection: 'products', where: { id: { exists: true } } })
    await payload.delete({ collection: 'categories', where: { id: { exists: true } } })
    await syncCatalog(payload, sourceOf([product('tee', [variant('tee-m', 3), variant('tee-l', 1)]), product('pants', [variant('pants-m', 2, 6500)])]))
    const all = await payload.find({ collection: 'products', depth: 0, limit: 10 })
    for (const doc of all.docs) await payload.update({ collection: 'products', id: doc.id, data: { _status: 'published' } })
  })

  it('creates the order with server prices, takes stock and hands it off', async () => {
    const deps = fakes()
    const lines = [
      { variantId: 'tee-m', qty: 2 },
      { variantId: 'pants-m', qty: 1 },
    ]
    const result = await placeOrder(payload, { lines, expectedTotal: 2 * 3900 + 6500, form }, deps)
    expect(result).toMatchObject({ ok: true, number: FIRST_ORDER_NUMBER })
    if (!result.ok) return

    const order = (await payload.find({ collection: 'orders', where: { token: { equals: result.token } } })).docs[0]
    expect(order).toMatchObject({
      status: 'awaiting_payment',
      total: 14300,
      customerName: 'Анна',
      phone: '+79001234567',
      email: 'anna@example.ru',
      moyskladId: `ms-${FIRST_ORDER_NUMBER}`,
    })
    expect(order.items.map((i) => [i.variantId, i.qty, i.price, i.title])).toEqual([
      ['tee-m', 2, 3900, 'Изделие tee'],
      ['pants-m', 1, 6500, 'Изделие pants'],
    ])
    expect(await stockOf('tee-m')).toBe(1)
    expect(await stockOf('pants-m')).toBe(1)
    expect(deps.sunk).toEqual([FIRST_ORDER_NUMBER])
    expect(deps.sent[0]).toContain(`Новый заказ № ${FIRST_ORDER_NUMBER}`)
  })

  it('numbers orders in sequence with unguessable page codes', async () => {
    const a = await placeOrder(payload, { lines: [{ variantId: 'tee-m', qty: 1 }], expectedTotal: 3900, form }, fakes())
    const b = await placeOrder(payload, { lines: [{ variantId: 'tee-m', qty: 1 }], expectedTotal: 3900, form }, fakes())
    if (!a.ok || !b.ok) throw new Error('orders failed')
    expect(b.number).toBe(a.number + 1)
    expect(a.token).not.toBe(b.token)
    expect(a.token.length).toBeGreaterThanOrEqual(24)
  })

  it('refuses when the price the buyer saw is not the current one', async () => {
    const result = await placeOrder(payload, { lines: [{ variantId: 'tee-m', qty: 1 }], expectedTotal: 3000, form }, fakes())
    expect(result).toMatchObject({ ok: false, reason: 'changed' })
    expect((await payload.count({ collection: 'orders' })).totalDocs).toBe(0)
    expect(await stockOf('tee-m')).toBe(3)
  })

  it('refuses more than in stock and sold-out items', async () => {
    const tooMany = await placeOrder(payload, { lines: [{ variantId: 'tee-l', qty: 2 }], expectedTotal: 7800, form }, fakes())
    expect(tooMany).toMatchObject({ ok: false, reason: 'changed' })

    const first = await placeOrder(payload, { lines: [{ variantId: 'tee-l', qty: 1 }], expectedTotal: 3900, form }, fakes())
    expect(first.ok).toBe(true)
    const second = await placeOrder(payload, { lines: [{ variantId: 'tee-l', qty: 1 }], expectedTotal: 3900, form }, fakes())
    expect(second).toMatchObject({ ok: false, reason: 'changed' })
    expect((await payload.count({ collection: 'orders' })).totalDocs).toBe(1)
  })

  it('sells the last item only once when two buyers check out at the same time', async () => {
    const [a, b] = await Promise.all([
      placeOrder(payload, { lines: [{ variantId: 'tee-l', qty: 1 }], expectedTotal: 3900, form }, fakes()),
      placeOrder(payload, { lines: [{ variantId: 'tee-l', qty: 1 }], expectedTotal: 3900, form }, fakes()),
    ])
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1)
    expect(await stockOf('tee-l')).toBe(0)
  })

  it('keeps the order when MoySklad or Telegram fail', async () => {
    const result = await placeOrder(
      payload,
      { lines: [{ variantId: 'tee-m', qty: 1 }], expectedTotal: 3900, form },
      {
        sink: { name: 'down', createOrder: vi.fn().mockRejectedValue(new Error('MoySklad is down')) },
        notify: vi.fn().mockRejectedValue(new Error('Telegram is down')),
      },
    )
    expect(result.ok).toBe(true)
    const order = (await payload.find({ collection: 'orders' })).docs[0]
    expect(order.moyskladId ?? null).toBeNull()
  })

  it('returns field errors and creates nothing for an invalid form', async () => {
    const result = await placeOrder(
      payload,
      { lines: [{ variantId: 'tee-m', qty: 1 }], expectedTotal: 3900, form: { ...form, phone: '123', consent: false } },
      fakes(),
    )
    expect(result).toMatchObject({ ok: false, reason: 'invalid' })
    if (result.ok || result.reason !== 'invalid') return
    expect(Object.keys(result.errors).sort()).toEqual(['consent', 'phone'])
    expect((await payload.count({ collection: 'orders' })).totalDocs).toBe(0)
  })

  it('visitors cannot read orders', async () => {
    await placeOrder(payload, { lines: [{ variantId: 'tee-m', qty: 1 }], expectedTotal: 3900, form }, fakes())
    await expect(payload.find({ collection: 'orders', overrideAccess: false })).rejects.toThrow()
    await expect(
      payload.create({ collection: 'orders', overrideAccess: false, data: {} as never }),
    ).rejects.toThrow()
  })
})
