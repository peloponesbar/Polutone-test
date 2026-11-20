// Paid order → shipment in СДЭК; СДЭК's statuses → our order. Same rules as payments: a
// per-order lock, the carrier's own data is re-read (notices are not trusted), side effects
// (letters, Telegram) after the commit and never fatal.
import type { Payload } from 'payload'

import { sendOrderMail } from '@/lib/mail/orders'
import { sendTelegram } from '@/lib/notify/telegram'
import { inTransaction, lockOrder } from '@/lib/orders/tx'
import type { Order } from '@/payload-types'

import { getCarrier } from './index'
import { DELIVERY_DEFAULTS, type DeliverySettings, isForward, orderStatusFor, parcelFor } from './rules'
import { getDeliverySettings } from './settings'
import type { Carrier, ShipmentInput } from './types'

export type ShipDeps = {
  carrier?: Carrier | null
  notify?: (text: string) => Promise<unknown>
  mail?: typeof sendOrderMail
}

const carrierOf = (deps: ShipDeps) => (deps.carrier === undefined ? getCarrier() : deps.carrier)

type ShippableOrder = Pick<
  Order,
  'number' | 'customerName' | 'phone' | 'email' | 'items' | 'tariffCode' | 'pickupPoint' | 'cityCode' | 'address' | 'deliveryMethod' | 'deliveryCost'
>

/** What СДЭК gets for an order: recipient, point or address, one box, the items. Pure. */
export function shipmentInput(order: ShippableOrder, settings: DeliverySettings): ShipmentInput {
  if (!settings.shipmentPoint) throw new Error('В «Настройках сайта» → «Доставка» не указан пункт сдачи посылок.')
  if (!order.tariffCode) throw new Error('У заказа нет тарифа СДЭК: доставка не была рассчитана на сайте.')
  const toPoint = order.deliveryMethod === 'pickup'
  if (toPoint && !order.pickupPoint) throw new Error('У заказа не выбран пункт выдачи.')
  if (!toPoint && !order.cityCode) throw new Error('У заказа нет кода города СДЭК.')
  return {
    orderNumber: order.number,
    tariffCode: order.tariffCode,
    shipmentPoint: settings.shipmentPoint,
    recipient: { name: order.customerName, phone: order.phone, email: order.email },
    ...(toPoint ? { deliveryPoint: order.pickupPoint! } : { toAddress: { cityCode: order.cityCode!, address: order.address } }),
    parcel: parcelFor(order.items, settings),
    items: order.items.map((i) => ({
      name: [i.title, i.color, i.size].filter(Boolean).join(', '),
      sku: i.variantId,
      cost: i.price,
      weight: i.weight && i.weight > 0 ? i.weight : DELIVERY_DEFAULTS.itemWeight,
      qty: i.qty,
    })),
    deliveryPaid: order.deliveryCost ?? 0,
  }
}

export type ShipResult = 'created' | 'skipped' | 'failed'

/** Creates the СДЭК order for a paid order (once). On failure the shop gets a Telegram note. */
export async function shipOrder(payload: Payload, orderId: number, deps: ShipDeps = {}): Promise<ShipResult> {
  const carrier = carrierOf(deps)
  if (!carrier) return 'skipped'
  let number: number | null = null
  try {
    return await inTransaction(payload, async (req) => {
      await lockOrder(payload, req, orderId)
      const order = await payload.findByID({ collection: 'orders', id: orderId, depth: 0, req, overrideAccess: true })
      number = order.number
      const shippable = order.status === 'paid' || order.status === 'assembling'
      if (order.shipmentId || order.deliveryService !== 'cdek' || !order.tariffCode || !shippable) return 'skipped' as const
      const input = shipmentInput(order, await getDeliverySettings(payload, req))
      const { uuid } = await carrier.createShipment(input)
      await payload.update({ collection: 'orders', id: orderId, data: { shipmentId: uuid, shipmentStatus: 'CREATED' }, depth: 0, req, overrideAccess: true })
      return 'created' as const
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    payload.logger.error({ err: error, msg: `Order ${number ?? orderId}: СДЭК shipment failed` })
    try {
      await (deps.notify ?? sendTelegram)(
        `Заказ № ${number ?? orderId} не передан в СДЭК: ${reason}. Проверьте данные и нажмите «Передать в СДЭК» в заказе.`,
      )
    } catch (notifyError) {
      payload.logger.error({ err: notifyError, msg: 'Telegram failed' })
    }
    return 'failed'
  }
}

/**
 * Reads the shipment from СДЭК and records its track number and status. Moves the order
 * forward only («Передан в доставку» → «Доставлен»), and writes to the buyer when it ships.
 */
export async function syncShipment(payload: Payload, orderId: number, deps: ShipDeps = {}): Promise<Order> {
  const carrier = carrierOf(deps)
  const before = await payload.findByID({ collection: 'orders', id: orderId, depth: 0, overrideAccess: true })
  if (!carrier || !before.shipmentId) return before
  let state
  try {
    state = await carrier.getShipment(before.shipmentId)
  } catch (error) {
    payload.logger.error({ err: error, msg: `Order ${before.number}: could not read the СДЭК shipment` })
    return before
  }

  const { order, shipped } = await inTransaction(payload, async (req) => {
    await lockOrder(payload, req, orderId)
    const current = await payload.findByID({ collection: 'orders', id: orderId, depth: 0, req, overrideAccess: true })
    if (current.shipmentId !== state.uuid) return { order: current, shipped: false }
    const data: Partial<Order> = {}
    if (state.trackNumber && state.trackNumber !== current.trackNumber) data.trackNumber = state.trackNumber
    if (state.status && state.status !== current.shipmentStatus) data.shipmentStatus = state.status
    const target = orderStatusFor(state.status)
    if (target && current.status !== 'cancelled' && isForward(current.status, target)) data.status = target
    if (Object.keys(data).length === 0) return { order: current, shipped: false }
    const updated = await payload.update({ collection: 'orders', id: orderId, data, depth: 0, req, overrideAccess: true })
    return { order: updated, shipped: data.status !== undefined && current.status !== 'shipped' && current.status !== 'delivered' }
  })

  if (state.invalid && before.shipmentStatus !== 'INVALID') {
    await (deps.notify ?? sendTelegram)(`СДЭК не принял заказ № ${order.number}. Откройте его в личном кабинете СДЭК и исправьте данные.`).catch(() => {})
  }
  if (shipped) {
    try {
      await (deps.mail ?? sendOrderMail)(payload, order, 'shipped')
    } catch (error) {
      payload.logger.error({ err: error, msg: `Order ${order.number}: shipped email failed` })
    }
  }
  return order
}

/** СДЭК webhook: only the shipment id is used; everything else is read back from СДЭК. */
export async function handleShipmentNotice(payload: Payload, uuid: string, deps: ShipDeps = {}): Promise<'synced' | 'unknown'> {
  const found = await payload.find({ collection: 'orders', where: { shipmentId: { equals: uuid } }, limit: 1, depth: 0, overrideAccess: true })
  const order = found.docs[0]
  if (!order) return 'unknown'
  await syncShipment(payload, order.id, deps)
  return 'synced'
}
