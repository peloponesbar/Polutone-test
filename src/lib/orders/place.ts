import { randomBytes } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload, type PayloadRequest } from 'payload'

import { type PricedCart, sanitizeLines } from '@/lib/cart/cart'
import { quoteCart } from '@/lib/cart/quote'
import { updateSourceData } from '@/lib/catalog/sync'
import { formatPrice } from '@/lib/format'
import { sendTelegram } from '@/lib/notify/telegram'
import type { Order } from '@/payload-types'

import { type CheckoutData, type CheckoutErrors, formatPhone, validateCheckout } from './checkout'
import { getOrderSink, type OrderSink } from './moysklad'
import { DELIVERY_METHODS, DELIVERY_SERVICES, labelOf } from './options'

export const FIRST_ORDER_NUMBER = 1001

/** Any constant: one lock id serializes checkouts, so two buyers can't take the last item. */
const ORDER_LOCK = 7_206_011

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
  | { ok: false; reason: 'changed'; cart: PricedCart }
  | { ok: false; reason: 'error'; message: string }

export type PlaceOrderDeps = {
  sink?: OrderSink
  notify?: (text: string) => Promise<unknown>
}

/** True when prices or stock moved since the buyer looked: never charge for something else. */
function cartChanged(cart: PricedCart, expectedTotal: unknown): boolean {
  return (
    cart.lines.length === 0 ||
    cart.missing.length > 0 ||
    cart.lines.some((l) => l.status !== 'ok') ||
    cart.total !== expectedTotal
  )
}

async function lockOrders(payload: Payload, req: PayloadRequest) {
  // The transaction's own connection: the lock is released on commit or rollback.
  const sessions = (payload.db as unknown as { sessions: Record<string, { db: { execute: (q: unknown) => Promise<unknown> } }> })
    .sessions
  const session = req.transactionID ? sessions[String(req.transactionID)] : undefined
  if (!session) throw new Error('Checkout needs a database transaction')
  await session.db.execute(sql`select pg_advisory_xact_lock(${ORDER_LOCK})`)
}

async function nextOrderNumber(payload: Payload, req: PayloadRequest): Promise<number> {
  const last = await payload.find({ collection: 'orders', sort: '-number', limit: 1, depth: 0, req, select: { number: true } })
  return Math.max(FIRST_ORDER_NUMBER, (last.docs[0]?.number ?? 0) + 1)
}

/** Takes the ordered quantities off the site's stock (the source catches up on its next sync). */
async function reserveStock(payload: Payload, cart: PricedCart, req: PayloadRequest) {
  const byProduct = new Map<number, Map<string, number>>()
  for (const line of cart.lines) {
    const qtys = byProduct.get(line.productId) ?? new Map<string, number>()
    qtys.set(line.variantId, line.qty)
    byProduct.set(line.productId, qtys)
  }
  for (const [productId, qtys] of byProduct) {
    const product = await payload.findByID({ collection: 'products', id: productId, depth: 0, draft: false, req })
    const variants = (product.variants ?? []).map((v) => ({
      ...v,
      available: Math.max(0, v.available - (qtys.get(v.externalId) ?? 0)),
    }))
    await updateSourceData(payload, productId, { variants, inStock: variants.some((v) => v.available > 0) }, req)
  }
}

function orderData(number: number, token: string, data: CheckoutData, cart: PricedCart) {
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
    })),
    itemsTotal: cart.total,
    deliveryCost: null,
    total: cart.total,
    customerName: data.name,
    phone: data.phone,
    email: data.email,
    deliveryService: data.deliveryService,
    deliveryMethod: data.deliveryMethod,
    city: data.city,
    address: data.address,
    paymentMethod: data.paymentMethod,
    comment: data.comment,
    consentAt: new Date().toISOString(),
  }
}

/** Telegram text for a new order: everything the shop needs to act, as plain text. */
export function orderMessage(order: Pick<Order, 'number' | 'total' | 'items' | 'customerName' | 'phone' | 'email' | 'deliveryService' | 'deliveryMethod' | 'city' | 'address' | 'comment'>): string {
  const items = order.items.map((i) => `• ${i.title}, ${[i.color, i.size].filter(Boolean).join(', ')} — ${i.qty} × ${formatPrice(i.price)}`)
  return [
    `Новый заказ № ${order.number} — ${formatPrice(order.total)}`,
    ...items,
    '',
    `${order.customerName}, ${formatPhone(order.phone)}, ${order.email}`,
    `${labelOf(DELIVERY_SERVICES, order.deliveryService)}, ${labelOf(DELIVERY_METHODS, order.deliveryMethod).toLowerCase()}: ${order.city}, ${order.address}`,
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
  const valid = validateCheckout(input.form)
  if (!valid.ok) return { ok: false, reason: 'invalid', errors: valid.errors }

  const lines = sanitizeLines(input.lines)
  if (lines.length === 0) return { ok: false, reason: 'empty' }

  const req = await createLocalReq({}, payload)
  let order: Order
  try {
    await initTransaction(req)
    await lockOrders(payload, req)

    const cart = await quoteCart(payload, lines, req)
    if (cartChanged(cart, input.expectedTotal)) {
      await killTransaction(req)
      return { ok: false, reason: 'changed', cart }
    }

    const number = await nextOrderNumber(payload, req)
    const token = randomBytes(18).toString('base64url')
    order = await payload.create({ collection: 'orders', data: orderData(number, token, valid.data, cart), req })
    await reserveStock(payload, cart, req)
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
}
