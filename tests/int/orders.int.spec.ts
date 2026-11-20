import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { FIRST_ORDER_NUMBER, placeOrder } from '@/lib/orders/place'

import { fakes, form, resetShop, stockOf } from '../helpers/shop'

let payload: Payload

describe('placeOrder', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  beforeEach(async () => {
    await resetShop(payload)
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
    expect(await stockOf(payload, 'tee-m')).toBe(1)
    expect(await stockOf(payload, 'pants-m')).toBe(1)
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
    expect(await stockOf(payload, 'tee-m')).toBe(3)
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
    expect(await stockOf(payload, 'tee-l')).toBe(0)
  })

  it('keeps the order when MoySklad or Telegram fail', async () => {
    const result = await placeOrder(
      payload,
      { lines: [{ variantId: 'tee-m', qty: 1 }], expectedTotal: 3900, form },
      {
        sink: { ...fakes().sink, name: 'down', createOrder: vi.fn().mockRejectedValue(new Error('MoySklad is down')) },
        mail: vi.fn().mockRejectedValue(new Error('Mail is down')),
        notify: vi.fn().mockRejectedValue(new Error('Telegram is down')),
        carrier: null,
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
