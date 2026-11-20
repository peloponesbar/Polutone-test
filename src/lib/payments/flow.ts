// Order ↔ payment: start a payment, record its outcome, cancel orders nobody paid for.
// Every status change runs in a transaction under a per-order lock, so the webhook, the
// buyer's return to the site and the expiry job can run at the same time without double work.
// Messages and letters go out after the commit; their failures are logged only.
import type { Payload } from 'payload'

import type { Carrier } from '@/lib/delivery/types'
import { shipOrder } from '@/lib/delivery/ship'
import { formatPrice } from '@/lib/format'
import { sendOrderMail } from '@/lib/mail/orders'
import { sendTelegram } from '@/lib/notify/telegram'
import { getOrderSink, type OrderSink } from '@/lib/orders/moysklad'
import { PAYMENT_HOLD_MINUTES, paymentDeadline } from '@/lib/orders/options'
import { changeStock } from '@/lib/orders/stock'
import { inTransaction, lockOrder } from '@/lib/orders/tx'
import { orderUrl } from '@/lib/site-url'
import type { Order } from '@/payload-types'

import { getGateway, receiptItems } from './index'
import type { GatewayPayment, PaymentGateway } from './types'

export type PaymentDeps = {
  /** null — payments are off; undefined — from the environment. */
  gateway?: PaymentGateway | null
  sink?: OrderSink
  notify?: (text: string) => Promise<unknown>
  mail?: typeof sendOrderMail
  now?: () => Date
  /** For the СДЭК shipment after payment; undefined — from the environment. */
  carrier?: Carrier | null
}

const gatewayOf = (deps: PaymentDeps) => (deps.gateway === undefined ? getGateway() : deps.gateway)
const nowOf = (deps: PaymentDeps) => (deps.now ?? (() => new Date()))()

export type PaymentOutcome = 'paid' | 'paid-after-cancel' | 'duplicate' | 'payment-canceled' | 'mismatch' | 'none'

async function findByToken(payload: Payload, token: string): Promise<Order | null> {
  if (!/^[\w-]{20,64}$/.test(token)) return null
  const found = await payload.find({ collection: 'orders', where: { token: { equals: token } }, limit: 1, depth: 0, overrideAccess: true })
  return found.docs[0] ?? null
}

const withNote = (order: Order, line: string) => [line, order.note].filter(Boolean).join('\n\n')

/** Side effects after a status change; each may fail on its own without touching the order. */
async function announce(payload: Payload, order: Order, outcome: PaymentOutcome | 'expired', payment: GatewayPayment | null, deps: PaymentDeps) {
  const notify = deps.notify ?? sendTelegram
  const safely = async (what: string, fn: () => Promise<unknown>) => {
    try {
      await fn()
    } catch (error) {
      payload.logger.error({ err: error, msg: `Order ${order.number}: ${what} failed` })
    }
  }
  const sink = () => deps.sink ?? getOrderSink(payload, process.env)
  const amount = formatPrice(payment?.amount ?? order.total)

  if (outcome === 'paid') {
    await safely('Telegram', () => notify(`Заказ № ${order.number} оплачен — ${amount}. Можно собирать.`))
    if (order.moyskladId) await safely('MoySklad payment', () => sink().orderPaid(order.moyskladId!, order.total))
    await safely('paid email', () => (deps.mail ?? sendOrderMail)(payload, order, 'paid'))
    // Paid → the shipment in СДЭК (its own failures go to Telegram with a retry button in the admin).
    await safely('СДЭК shipment', () => shipOrder(payload, order.id, deps))
  } else if (outcome === 'paid-after-cancel') {
    await safely('Telegram', () =>
      notify(
        `Оплата по отменённому заказу № ${order.number} — ${amount} (платёж ${payment?.id}). Заказ уже отменён, вещи вернулись в продажу. Верните деньги в личном кабинете ЮKassa или свяжитесь с покупателем: ${order.customerName}, ${order.phone}.`,
      ),
    )
  } else if (outcome === 'duplicate') {
    await safely('Telegram', () =>
      notify(`Повторная оплата заказа № ${order.number} — ${amount} (платёж ${payment?.id}). Верните лишнее в личном кабинете ЮKassa.`),
    )
  } else if (outcome === 'expired') {
    await safely('Telegram', () =>
      notify(`Заказ № ${order.number} отменён: не оплачен за ${PAYMENT_HOLD_MINUTES} минут. Вещи вернулись в продажу.`),
    )
    if (order.moyskladId) await safely('MoySklad cancel', () => sink().cancelOrder(order.moyskladId!))
  }
}

/**
 * Records what ЮKassa says about a payment. Trusts nothing but the payment object read from
 * ЮKassa itself; checks it belongs to this order and the amount matches.
 */
export async function applyPayment(payload: Payload, orderId: number, payment: GatewayPayment, deps: PaymentDeps = {}): Promise<PaymentOutcome> {
  if (payment.status !== 'succeeded' && payment.status !== 'canceled') return 'none'
  const now = nowOf(deps)

  const { outcome, order } = await inTransaction(payload, async (req) => {
    await lockOrder(payload, req, orderId)
    const order = await payload.findByID({ collection: 'orders', id: orderId, depth: 0, req, overrideAccess: true })
    const update = (data: Partial<Order>) =>
      payload.update({ collection: 'orders', id: orderId, data, depth: 0, req, overrideAccess: true })

    if (payment.orderToken !== order.token) return { outcome: 'mismatch' as const, order }

    if (payment.status === 'canceled') {
      // The buyer gave up on this attempt; the order still waits and «Оплатить» makes a new one.
      if (order.status === 'awaiting_payment' && order.paymentId === payment.id) {
        return { outcome: 'payment-canceled' as const, order: await update({ paymentId: null }) }
      }
      return { outcome: 'none' as const, order }
    }

    if (Math.abs(payment.amount - order.total) > 0.005) return { outcome: 'mismatch' as const, order }
    if (order.paidAt) {
      if (order.paymentId === payment.id) return { outcome: 'none' as const, order }
      const line = `Повторная оплата: платёж ${payment.id} на ${formatPrice(payment.amount)} — верните лишнее.`
      if (order.note?.includes(payment.id)) return { outcome: 'none' as const, order }
      return { outcome: 'duplicate' as const, order: await update({ note: withNote(order, line) }) }
    }
    if (order.status === 'cancelled') {
      const line = `Оплата пришла после отмены: платёж ${payment.id} на ${formatPrice(payment.amount)} — нужен возврат.`
      return {
        outcome: 'paid-after-cancel' as const,
        order: await update({ paidAt: now.toISOString(), paymentId: payment.id, note: withNote(order, line) }),
      }
    }
    if (order.status === 'awaiting_payment') {
      return { outcome: 'paid' as const, order: await update({ status: 'paid', paidAt: now.toISOString(), paymentId: payment.id }) }
    }
    // Status moved on by hand (e.g. marked paid by the shop): just remember the payment.
    return { outcome: 'none' as const, order: await update({ paidAt: now.toISOString(), paymentId: payment.id }) }
  })

  if (outcome === 'mismatch') {
    payload.logger.error({ msg: 'Payment does not match the order — ignored', orderId, paymentId: payment.id, amount: payment.amount })
  }
  await announce(payload, order, outcome, payment, deps)
  return outcome
}

/** Reads the order's latest payment from ЮKassa and records it (the buyer came back to the site). */
export async function syncOrderPayment(payload: Payload, order: Order, deps: PaymentDeps = {}): Promise<{ order: Order; payment: GatewayPayment | null }> {
  const gateway = gatewayOf(deps)
  if (!gateway || !order.paymentId || order.paidAt) return { order, payment: null }
  let payment: GatewayPayment
  try {
    payment = await gateway.getPayment(order.paymentId)
  } catch (error) {
    payload.logger.error({ err: error, msg: `Order ${order.number}: could not read payment ${order.paymentId}` })
    return { order, payment: null }
  }
  await applyPayment(payload, order.id, payment, deps)
  const fresh = await payload.findByID({ collection: 'orders', id: order.id, depth: 0, overrideAccess: true })
  return { order: fresh, payment }
}

/** Webhook: ЮKassa tells us a payment changed. Only its id is used; the rest is read back from ЮKassa. */
export async function handlePaymentNotice(payload: Payload, paymentId: string, deps: PaymentDeps = {}): Promise<PaymentOutcome> {
  const gateway = gatewayOf(deps)
  if (!gateway) return 'none'
  const payment = await gateway.getPayment(paymentId)
  const order = payment.orderToken ? await findByToken(payload, payment.orderToken) : null
  if (!order) {
    payload.logger.warn({ msg: 'Payment notice for an unknown order', paymentId })
    return 'mismatch'
  }
  return applyPayment(payload, order.id, payment, deps)
}

export type StartPaymentResult =
  | { kind: 'redirect'; url: string }
  | { kind: 'paid' }
  | { kind: 'closed' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }

const START_ERROR = 'Не удалось перейти к оплате. Попробуйте, пожалуйста, ещё раз через минуту — заказ сохранён.'

/**
 * «Оплатить»: sends the buyer to ЮKassa. Reuses the current payment while it is open, makes a
 * new one when the last was abandoned, and refuses once the order is paid, closed or expired.
 */
export async function startPayment(payload: Payload, token: string, deps: PaymentDeps = {}): Promise<StartPaymentResult> {
  const gateway = gatewayOf(deps)
  if (!gateway) return { kind: 'unavailable' }
  let order = await findByToken(payload, token)
  if (!order) return { kind: 'closed' }

  try {
    const synced = await syncOrderPayment(payload, order, deps)
    order = synced.order
    if (order.status === 'paid' || order.paidAt) return { kind: 'paid' }
    if (order.status !== 'awaiting_payment') return { kind: 'closed' }
    if (synced.payment?.status === 'pending' && synced.payment.confirmationUrl) {
      return { kind: 'redirect', url: synced.payment.confirmationUrl }
    }
    if (nowOf(deps) >= paymentDeadline(order.createdAt)) {
      await expireUnpaidOrders(payload, deps)
      return { kind: 'closed' }
    }

    const attempt = (order.paymentAttempts ?? 0) + 1
    const payment = await gateway.createPayment({
      orderNumber: order.number,
      orderToken: order.token,
      amount: order.total,
      description: `Заказ № ${order.number} в POLUTONE`,
      returnUrl: orderUrl(order.token),
      email: order.email,
      items: receiptItems(order),
      idempotenceKey: `${order.token}-${attempt}`,
    })
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { paymentId: payment.id, paymentAttempts: attempt },
      depth: 0,
      overrideAccess: true,
    })
    if (!payment.confirmationUrl) throw new Error(`Payment ${payment.id} has no confirmation link (status ${payment.status})`)
    return { kind: 'redirect', url: payment.confirmationUrl }
  } catch (error) {
    payload.logger.error({ err: error, msg: `Order ${order.number}: could not start payment` })
    return { kind: 'error', message: START_ERROR }
  }
}

/**
 * Cancels orders that stayed unpaid past the hold time and puts their items back on sale.
 * Checks ЮKassa first: an order paid at the last minute is marked paid, not cancelled.
 */
export async function expireUnpaidOrders(payload: Payload, deps: PaymentDeps = {}): Promise<{ cancelled: number[] }> {
  const now = nowOf(deps)
  const cutoff = new Date(now.getTime() - PAYMENT_HOLD_MINUTES * 60_000)
  const due = await payload.find({
    collection: 'orders',
    where: { and: [{ status: { equals: 'awaiting_payment' } }, { createdAt: { less_than_equal: cutoff.toISOString() } }] },
    sort: 'createdAt',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  const cancelled: number[] = []
  for (const stale of due.docs) {
    const { order: checked } = await syncOrderPayment(payload, stale, deps)
    if (checked.status !== 'awaiting_payment') continue

    const order = await inTransaction(payload, async (req) => {
      await lockOrder(payload, req, stale.id)
      const current = await payload.findByID({ collection: 'orders', id: stale.id, depth: 0, req, overrideAccess: true })
      if (current.status !== 'awaiting_payment') return null
      const updated = await payload.update({
        collection: 'orders',
        id: stale.id,
        data: { status: 'cancelled', cancelReason: 'unpaid' },
        depth: 0,
        req,
        overrideAccess: true,
      })
      await changeStock(
        payload,
        current.items.map((i) => ({ productId: typeof i.product === 'object' ? i.product?.id : i.product, variantId: i.variantId, qty: i.qty })),
        1,
        req,
      )
      return updated
    })
    if (!order) continue
    cancelled.push(order.number)
    await announce(payload, order, 'expired', null, deps)
  }
  return { cancelled }
}
