import { randomBytes } from 'node:crypto'

import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload, type PayloadRequest } from 'payload'

import { type PricedCart, sanitizeLines } from '@/lib/cart/cart'
import { quoteCart } from '@/lib/cart/quote'
import { formatPrice } from '@/lib/format'
import { getCarrier } from '@/lib/delivery'
import { type DeliveryQuote, quoteDelivery } from '@/lib/delivery/quote'
import { buyerPrice, daysLabel, type DeliveryPrice } from '@/lib/delivery/rules'
import { getDeliverySettings } from '@/lib/delivery/settings'
import type { Carrier, PickupPoint } from '@/lib/delivery/types'
import { sendOrderMail } from '@/lib/mail/orders'
import { sendTelegram } from '@/lib/notify/telegram'
import { expireUnpaidOrders } from '@/lib/payments/flow'
import type { Order } from '@/payload-types'

import { type CheckoutData, type CheckoutErrors, formatPhone, validateCheckout } from './checkout'
import { getOrderSink, type OrderSink } from './moysklad'
import { DELIVERY_METHODS, DELIVERY_SERVICES, labelOf } from './options'
import { changeStock } from './stock'
import { advisoryLock, CHECKOUT_LOCK } from './tx'

export const FIRST_ORDER_NUMBER = 1001

export type PlaceOrderInput = {
  lines: unknown
  /** The total the buyer saw; a different total means the cart changed meanwhile. */
  expectedTotal: unknown
  form: Record<string, unknown>
}

export type PlaceOrderResult =
  | { ok: true; number: number; token: string }
  | { ok: false; reason: 'invalid'; errors: CheckoutErrors }
  | { ok: false; reason: 'empty' }
  | { ok: false; reason: 'changed'; cart: PricedCart; delivery: number | null }
  | { ok: false; reason: 'delivery'; message: string }
  | { ok: false; reason: 'error'; message: string }

export type PlaceOrderDeps = {
  sink?: OrderSink
  notify?: (text: string) => Promise<unknown>
  mail?: typeof sendOrderMail
  /** null — no carrier (delivery agreed later); undefined — from the environment. */
  carrier?: Carrier | null
}

/** True when prices or stock moved since the buyer looked: never charge for something else. */
function cartChanged(cart: PricedCart, expectedTotal: unknown, delivery: number): boolean {
  return (
    cart.lines.length === 0 ||
    cart.missing.length > 0 ||
    cart.lines.some((l) => l.status !== 'ok') ||
    cart.total + delivery !== expectedTotal
  )
}

async function nextOrderNumber(payload: Payload, req: PayloadRequest): Promise<number> {
  const last = await payload.find({ collection: 'orders', sort: '-number', limit: 1, depth: 0, req, select: { number: true } })
  return Math.max(FIRST_ORDER_NUMBER, (last.docs[0]?.number ?? 0) + 1)
}

type OrderDelivery = DeliveryPrice & { tariffCode: number; point: PickupPoint | null }

function orderData(number: number, token: string, data: CheckoutData, cart: PricedCart, delivery: OrderDelivery | null) {
  const point = delivery?.point
  const deliveryCost = delivery ? delivery.price : null
  return {
    title: `№ ${number} · ${data.name}`,
    number,
    token,
    status: 'awaiting_payment' as const,
    items: cart.lines.map((l) => ({
      product: l.productId,
      variantId: l.variantId,
      title: l.title,
      color: l.color,
      size: l.size,
      price: l.price,
      qty: l.qty,
      lineTotal: l.lineTotal,
      weight: l.weight ?? null,
    })),
    itemsTotal: cart.total,
    deliveryCost,
    total: cart.total + (deliveryCost ?? 0),
    customerName: data.name,
    phone: data.phone,
    email: data.email,
    deliveryService: data.deliveryService,
    deliveryMethod: data.deliveryMethod,
    city: data.city,
    cityCode: data.cityCode,
    pickupPoint: point?.code ?? null,
    tariffCode: delivery?.tariffCode ?? null,
    deliveryDays: delivery ? daysLabel(delivery.daysMin, delivery.daysMax) : null,
    // A point chosen on the site: its address from the carrier, not from the browser.
    address: point ? `${point.address} (пункт ${point.code})` : data.address,
    paymentMethod: data.paymentMethod,
    comment: data.comment,
    consentAt: new Date().toISOString(),
  }
}

/** Telegram text for a new order: everything the shop needs to act, as plain text. */
export function orderMessage(
  order: Pick<Order, 'number' | 'total' | 'items' | 'customerName' | 'phone' | 'email' | 'deliveryService' | 'deliveryMethod' | 'city' | 'address' | 'comment' | 'deliveryCost' | 'deliveryDays'>,
): string {
  const items = order.items.map((i) => `• ${i.title}, ${[i.color, i.size].filter(Boolean).join(', ')} — ${i.qty} × ${formatPrice(i.price)}`)
  return [
    `Новый заказ № ${order.number} — ${formatPrice(order.total)}`,
    ...items,
    '',
    `${order.customerName}, ${formatPhone(order.phone)}, ${order.email}`,
    `${labelOf(DELIVERY_SERVICES, order.deliveryService)}, ${labelOf(DELIVERY_METHODS, order.deliveryMethod).toLowerCase()}: ${order.city}, ${order.address}`,
    `Доставка: ${order.deliveryCost != null ? formatPrice(order.deliveryCost) : 'стоимость сообщить покупателю'}${order.deliveryDays ? `, ${order.deliveryDays}` : ''}`,
    ...(order.comment ? [`Комментарий: ${order.comment}`] : []),
    'Оплата: ожидается',
  ].join('\n')
}

/**
 * Checkout: validates the form, re-prices the cart, and — in one transaction under a lock —
 * creates the order and takes the items off stock. Then hands the order to MoySklad and
 * notifies the shop; those may fail without losing the order (the admin sees what's missing).
 */
export async function placeOrder(payload: Payload, input: PlaceOrderInput, deps: PlaceOrderDeps = {}): Promise<PlaceOrderResult> {
  const carrier = deps.carrier === undefined ? getCarrier() : deps.carrier
  const valid = validateCheckout(input.form, { withCarrier: carrier !== null })
  if (!valid.ok) return { ok: false, reason: 'invalid', errors: valid.errors }

  const lines = sanitizeLines(input.lines)
  if (lines.length === 0) return { ok: false, reason: 'empty' }

  // The carrier's tariff, fetched before the lock (a network call): the free-delivery rule
  // is applied again below to the cart as priced under the lock.
  let tariff: DeliveryQuote | null = null
  let freeFrom: number | null = null
  if (carrier && valid.data.cityCode) {
    const settings = await getDeliverySettings(payload)
    freeFrom = settings.freeFrom
    const quoted = await quoteDelivery(payload, carrier, await quoteCart(payload, lines), {
      method: valid.data.deliveryMethod,
      cityCode: valid.data.cityCode,
      pickupPoint: valid.data.pickupPoint,
      address: valid.data.address,
    }, { settings })
    if (!quoted.ok) return { ok: false, reason: 'delivery', message: quoted.error }
    tariff = quoted.delivery
  }

  // Items held by unpaid orders past their time go back on sale before this cart is priced.
  await expireUnpaidOrders(payload, deps).catch((error) => payload.logger.error({ err: error, msg: 'Order expiry failed' }))

  const req = await createLocalReq({}, payload)
  let order: Order
  try {
    await initTransaction(req)
    await advisoryLock(payload, req, CHECKOUT_LOCK)

    const cart = await quoteCart(payload, lines, req)
    const delivery: OrderDelivery | null = tariff
      ? { ...buyerPrice(tariff.tariff, cart.total, freeFrom), tariffCode: tariff.tariffCode, point: tariff.point }
      : null
    if (cartChanged(cart, input.expectedTotal, delivery?.price ?? 0)) {
      await killTransaction(req)
      return { ok: false, reason: 'changed', cart, delivery: delivery?.price ?? null }
    }

    const number = await nextOrderNumber(payload, req)
    const token = randomBytes(18).toString('base64url')
    order = await payload.create({ collection: 'orders', data: orderData(number, token, valid.data, cart, delivery), req })
    await changeStock(payload, cart.lines, -1, req)
    await commitTransaction(req)
  } catch (error) {
    await killTransaction(req)
    payload.logger.error({ err: error, msg: 'Checkout failed' })
    return { ok: false, reason: 'error', message: 'Не удалось оформить заказ. Попробуйте, пожалуйста, ещё раз через минуту.' }
  }

  await handOff(payload, order, deps)
  return { ok: true, number: order.number, token: order.token }
}

/** After the order is safe in the database: MoySklad and the shop's Telegram, failures logged only. */
async function handOff(payload: Payload, order: Order, deps: PlaceOrderDeps) {
  try {
    const sink = deps.sink ?? getOrderSink(payload, process.env)
    const moyskladId = await sink.createOrder({
      number: order.number,
      customerName: order.customerName,
      phone: order.phone,
      email: order.email,
      address: `${order.city}, ${order.address}`,
      comment: order.comment ?? '',
      items: order.items.map((i) => ({ variantId: i.variantId, qty: i.qty, price: i.price })),
    })
    await payload.update({ collection: 'orders', id: order.id, data: { moyskladId } })
  } catch (error) {
    payload.logger.error({ err: error, msg: `Order ${order.number} was not sent to MoySklad` })
  }

  try {
    await (deps.notify ?? sendTelegram)(orderMessage(order))
  } catch (error) {
    payload.logger.error({ err: error, msg: `Telegram notification for order ${order.number} failed` })
  }

  try {
    await (deps.mail ?? sendOrderMail)(payload, order, 'placed')
  } catch (error) {
    payload.logger.error({ err: error, msg: `Order ${order.number} confirmation email failed` })
  }
}
