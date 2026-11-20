import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { MockCarrier } from '@/lib/delivery/mock'
import { handleShipmentNotice, shipOrder, syncShipment } from '@/lib/delivery/ship'
import { placeOrder } from '@/lib/orders/place'
import { handlePaymentNotice, startPayment } from '@/lib/payments/flow'
import { MockGateway } from '@/lib/payments/mock'
import type { Order } from '@/payload-types'

import { fakes, form, resetShop } from '../helpers/shop'

let payload: Payload
const KAZAN = 90006

/** Price the mock carrier asks for a parcel to Kazan, the way checkout shows it. */
async function kazanPrice(carrier: MockCarrier, grams: number) {
  const quote = await carrier.quote({ tariffCode: 136, fromCity: 90001, toCity: KAZAN, parcel: { weight: grams, length: 30, width: 25, height: 10 } })
  return Math.ceil(quote.price)
}

async function setup() {
  const carrier = new MockCarrier()
  const gateway = new MockGateway()
  const shop = fakes()
  const deps = { ...shop, carrier, gateway }
  const [point] = await carrier.pickupPoints(KAZAN)
  // One tee: test category weight is the default 500 g + 150 g packaging.
  const price = await kazanPrice(carrier, 500 + 150)
  const pickupForm = { ...form, deliveryMethod: 'pickup', address: '', cityCode: String(KAZAN), pickupPoint: point.code }
  const order = async (token: string) => (await payload.find({ collection: 'orders', where: { token: { equals: token } }, depth: 0 })).docs[0] as Order
  return { carrier, gateway, deps, point, price, pickupForm, order }
}

describe('delivery with СДЭК', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  beforeEach(async () => {
    await resetShop(payload)
    await payload.updateGlobal({ slug: 'site-settings', data: { delivery: { freeFrom: null } } })
  })

  afterAll(async () => {
    await payload.updateGlobal({ slug: 'site-settings', data: { delivery: { freeFrom: null } } })
  })

  it('adds the server-side delivery price to the order and takes the point address from СДЭК', async () => {
    const { deps, point, price, pickupForm, order } = await setup()
    const placed = await placeOrder(payload, { lines: [{ variantId: 'tee-m', qty: 1 }], expectedTotal: 3900 + price, form: pickupForm }, deps)
    expect(placed.ok).toBe(true)
    if (!placed.ok) return
    const saved = await order(placed.token)
    expect(saved).toMatchObject({ itemsTotal: 3900, deliveryCost: price, total: 3900 + price, tariffCode: 136, pickupPoint: point.code, cityCode: KAZAN })
    expect(saved.address).toContain(point.address)
    expect(saved.deliveryDays).toMatch(/дн/)
  })

  it('refuses when the delivery price the buyer saw is not the current one', async () => {
    const { deps, price, pickupForm } = await setup()
    const placed = await placeOrder(payload, { lines: [{ variantId: 'tee-m', qty: 1 }], expectedTotal: 3900, form: pickupForm }, deps)
    expect(placed).toMatchObject({ ok: false, reason: 'changed', delivery: price })
    expect((await payload.count({ collection: 'orders' })).totalDocs).toBe(0)
  })

  it('refuses a pickup point that is not in the chosen city', async () => {
    const { deps, pickupForm } = await setup()
    const placed = await placeOrder(payload, { lines: [{ variantId: 'tee-m', qty: 1 }], expectedTotal: 3900, form: { ...pickupForm, pickupPoint: 'TEST90002-1' } }, deps)
    expect(placed).toMatchObject({ ok: false, reason: 'delivery' })
  })

  it('makes delivery free from the threshold in the settings', async () => {
    const { deps, pickupForm, order } = await setup()
    await payload.updateGlobal({ slug: 'site-settings', data: { delivery: { freeFrom: 7000 } } })
    const placed = await placeOrder(payload, { lines: [{ variantId: 'tee-m', qty: 2 }], expectedTotal: 7800, form: pickupForm }, deps)
    expect(placed.ok).toBe(true)
    if (placed.ok) expect(await order(placed.token)).toMatchObject({ deliveryCost: 0, total: 7800 })
  })

  it('after payment: ships to СДЭК, then follows its statuses forward only', async () => {
    const { carrier, gateway, deps, point, price, pickupForm, order } = await setup()
    const placed = await placeOrder(payload, { lines: [{ variantId: 'tee-m', qty: 1 }], expectedTotal: 3900 + price, form: pickupForm }, deps)
    if (!placed.ok) throw new Error('checkout failed')
    await startPayment(payload, placed.token, deps)
    const paymentId = (await order(placed.token)).paymentId!
    gateway.finish(paymentId, 'succeeded')
    expect(await handlePaymentNotice(payload, paymentId, deps)).toBe('paid')

    const paid = await order(placed.token)
    expect(paid.shipmentId).toBeTruthy()
    const sent = carrier.lastInput(paid.shipmentId!)
    expect(sent).toMatchObject({ tariffCode: 136, deliveryPoint: point.code, shipmentPoint: 'TEST90001-1', deliveryPaid: price })
    // Paid once → shipped once.
    expect(await shipOrder(payload, paid.id, deps)).toBe('skipped')

    carrier.advance(paid.shipmentId!, 'ACCEPTED')
    expect(await handleShipmentNotice(payload, paid.shipmentId!, deps)).toBe('synced')
    const shipped = await order(placed.token)
    expect(shipped).toMatchObject({ status: 'shipped', shipmentStatus: 'ACCEPTED' })
    expect(shipped.trackNumber).toMatch(/^10\d+/)
    expect(deps.mail).toHaveBeenCalledWith(payload, expect.objectContaining({ token: placed.token }), 'shipped')

    carrier.advance(paid.shipmentId!, 'DELIVERED')
    await syncShipment(payload, paid.id, deps)
    expect((await order(placed.token)).status).toBe('delivered')
    // A late, older status never moves the order back.
    carrier.advance(paid.shipmentId!, 'ACCEPTED')
    await syncShipment(payload, paid.id, deps)
    expect((await order(placed.token)).status).toBe('delivered')
    expect(vi.mocked(deps.mail!).mock.calls.filter((c) => c[2] === 'shipped')).toHaveLength(1)
  })

  it('tells the shop when СДЭК refuses the shipment, and can try again', async () => {
    const { carrier, gateway, deps, price, pickupForm, order } = await setup()
    const failing = Object.assign(Object.create(carrier), { createShipment: vi.fn().mockRejectedValue(new Error('СДЭК responded 400: bad phone')) })
    const placed = await placeOrder(payload, { lines: [{ variantId: 'tee-m', qty: 1 }], expectedTotal: 3900 + price, form: pickupForm }, deps)
    if (!placed.ok) throw new Error('checkout failed')
    await startPayment(payload, placed.token, deps)
    const paymentId = (await order(placed.token)).paymentId!
    gateway.finish(paymentId, 'succeeded')
    await handlePaymentNotice(payload, paymentId, { ...deps, carrier: failing })

    const paid = await order(placed.token)
    expect(paid.status).toBe('paid')
    expect(paid.shipmentId ?? null).toBeNull()
    expect(deps.sent.some((t) => t.includes('не передан в СДЭК') && t.includes('bad phone'))).toBe(true)

    expect(await shipOrder(payload, paid.id, deps)).toBe('created')
  })

  it('ignores notices about shipments it does not know', async () => {
    const { deps } = await setup()
    expect(await handleShipmentNotice(payload, '00000000-0000-0000-0000-000000000000', deps)).toBe('unknown')
  })
})
