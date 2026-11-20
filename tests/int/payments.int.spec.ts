import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { placeOrder } from '@/lib/orders/place'
import { applyPayment, expireUnpaidOrders, handlePaymentNotice, type PaymentDeps, startPayment, syncOrderPayment } from '@/lib/payments/flow'
import { MockGateway } from '@/lib/payments/mock'
import type { GatewayPayment, PaymentGateway } from '@/lib/payments/types'
import type { Order } from '@/payload-types'

import { fakes, form, resetShop, stockOf } from '../helpers/shop'

let payload: Payload

const HOUR = 60 * 60_000

/** Checkout of one tee (3 900 ₽) with a fresh fake gateway and recorded side effects. */
async function setup() {
  const gateway = new MockGateway()
  const shop = fakes()
  const deps: PaymentDeps & ReturnType<typeof fakes> = { ...shop, gateway }
  const placed = await placeOrder(payload, { lines: [{ variantId: 'tee-l', qty: 1 }], expectedTotal: 3900, form }, deps)
  if (!placed.ok) throw new Error('checkout failed')
  const order = async () => (await payload.find({ collection: 'orders', where: { token: { equals: placed.token } }, depth: 0 })).docs[0] as Order
  return { gateway, deps, token: placed.token, order }
}

const later = (order: Order, ms: number) => () => new Date(new Date(order.createdAt).getTime() + ms)

describe('payments', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  beforeEach(async () => {
    await resetShop(payload)
  })

  it('sends the buyer to the payment page and reuses the open payment', async () => {
    const { deps, token, order } = await setup()
    const first = await startPayment(payload, token, deps)
    expect(first.kind).toBe('redirect')
    const again = await startPayment(payload, token, deps)
    expect(again).toEqual(first)
    expect(await order()).toMatchObject({ paymentAttempts: 1, status: 'awaiting_payment' })
  })

  it('marks the order paid once, from the webhook, and tells the shop and the buyer', async () => {
    const { gateway, deps, token, order } = await setup()
    await startPayment(payload, token, deps)
    const { paymentId } = await order()
    gateway.finish(paymentId!, 'succeeded')

    expect(await handlePaymentNotice(payload, paymentId!, deps)).toBe('paid')
    expect(await handlePaymentNotice(payload, paymentId!, deps)).toBe('none')

    expect(await order()).toMatchObject({ status: 'paid', paymentId })
    expect((await order()).paidAt).toBeTruthy()
    expect(deps.sent.filter((t) => t.includes('оплачен'))).toHaveLength(1)
    expect(deps.mail).toHaveBeenCalledWith(payload, expect.objectContaining({ token }), 'paid')
    expect(await startPayment(payload, token, deps)).toEqual({ kind: 'paid' })
  })

  it('also picks up the payment when the buyer returns before the webhook', async () => {
    const { gateway, deps, token, order } = await setup()
    await startPayment(payload, token, deps)
    gateway.finish((await order()).paymentId!, 'succeeded')
    const { order: synced } = await syncOrderPayment(payload, await order(), deps)
    expect(synced.status).toBe('paid')
  })

  it('lets the buyer try again after giving up on a payment', async () => {
    const { gateway, deps, token, order } = await setup()
    await startPayment(payload, token, deps)
    const firstId = (await order()).paymentId!
    gateway.finish(firstId, 'canceled')

    const retry = await startPayment(payload, token, deps)
    expect(retry.kind).toBe('redirect')
    const current = await order()
    expect(current.paymentAttempts).toBe(2)
    expect(current.paymentId).not.toBe(firstId)
    expect(current.status).toBe('awaiting_payment')
  })

  it('ignores payments for another order or with another amount', async () => {
    const { deps, order } = await setup()
    const target = await order()
    const forged = (over: Partial<GatewayPayment>): GatewayPayment => ({
      id: 'forged-payment-1',
      status: 'succeeded',
      amount: target.total,
      confirmationUrl: null,
      orderToken: target.token,
      ...over,
    })
    expect(await applyPayment(payload, target.id, forged({ orderToken: 'someone-elses-order-token' }), deps)).toBe('mismatch')
    expect(await applyPayment(payload, target.id, forged({ amount: 1 }), deps)).toBe('mismatch')
    expect((await order()).status).toBe('awaiting_payment')
  })

  it('a webhook only passes a payment id: the payment itself is read from ЮKassa', async () => {
    const { deps, order } = await setup()
    const target = await order()
    const asked: string[] = []
    const gateway: PaymentGateway = {
      name: 'mock',
      createPayment: async () => {
        throw new Error('not used')
      },
      getPayment: async (id) => {
        asked.push(id)
        return { id, status: 'pending', amount: target.total, confirmationUrl: null, orderToken: target.token }
      },
    }
    expect(await handlePaymentNotice(payload, 'claimed-succeeded-1', { ...deps, gateway })).toBe('none')
    expect(asked).toEqual(['claimed-succeeded-1'])
    expect((await order()).status).toBe('awaiting_payment')
  })

  it('cancels orders unpaid past the hour and puts the items back on sale', async () => {
    const { deps, order } = await setup()
    expect(await stockOf(payload, 'tee-l')).toBe(0)
    const placedAt = await order()

    expect(await expireUnpaidOrders(payload, { ...deps, now: later(placedAt, HOUR - 60_000) })).toEqual({ cancelled: [] })
    const result = await expireUnpaidOrders(payload, { ...deps, now: later(placedAt, HOUR + 60_000) })

    expect(result.cancelled).toEqual([placedAt.number])
    expect(await order()).toMatchObject({ status: 'cancelled', cancelReason: 'unpaid' })
    expect(await stockOf(payload, 'tee-l')).toBe(1)
    expect(deps.sent.some((t) => t.includes('не оплачен'))).toBe(true)
    // Running again changes nothing.
    expect(await expireUnpaidOrders(payload, { ...deps, now: later(placedAt, 2 * HOUR) })).toEqual({ cancelled: [] })
    expect(await stockOf(payload, 'tee-l')).toBe(1)
  })

  it('does not cancel an order paid at the last minute', async () => {
    const { gateway, deps, token, order } = await setup()
    await startPayment(payload, token, deps)
    gateway.finish((await order()).paymentId!, 'succeeded')
    const result = await expireUnpaidOrders(payload, { ...deps, now: later(await order(), HOUR + 60_000) })
    expect(result.cancelled).toEqual([])
    expect((await order()).status).toBe('paid')
    expect(await stockOf(payload, 'tee-l')).toBe(0)
  })

  it('flags money that arrives after the order was cancelled', async () => {
    const { gateway, deps, token, order } = await setup()
    await startPayment(payload, token, deps)
    const paymentId = (await order()).paymentId!
    // The webhook can't reach us and the buyer pays after the hour: expiry sees a pending payment.
    await expireUnpaidOrders(payload, { ...deps, now: later(await order(), HOUR + 60_000) })
    gateway.finish(paymentId, 'succeeded')

    expect(await handlePaymentNotice(payload, paymentId, deps)).toBe('paid-after-cancel')
    const cancelled = await order()
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.note).toContain('нужен возврат')
    expect(deps.sent.some((t) => t.includes('Оплата по отменённому заказу'))).toBe(true)
  })

  it('refuses to start a payment after the hour or without a payment service', async () => {
    const { deps, token, order } = await setup()
    expect(await startPayment(payload, token, { ...deps, gateway: null })).toEqual({ kind: 'unavailable' })
    expect(await startPayment(payload, token, { ...deps, now: later(await order(), HOUR + 1) })).toEqual({ kind: 'closed' })
    expect((await order()).status).toBe('cancelled')
  })
})
