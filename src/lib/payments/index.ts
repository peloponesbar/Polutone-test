import type { Order } from '@/payload-types'

import { MockGateway } from './mock'
import type { PaymentGateway, ReceiptItem } from './types'
import { DEFAULT_VAT_CODE, YooKassaGateway } from './yookassa'

export type { GatewayPayment, PaymentGateway } from './types'

type Env = Record<string, string | undefined>

let mock: MockGateway | null = null

/**
 * ЮKassa when YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY are set; the local stand-in in
 * development without keys; otherwise none (orders are kept, paid later by arrangement).
 */
export function getGateway(env: Env = process.env): PaymentGateway | null {
  const shopId = env.YOOKASSA_SHOP_ID?.trim()
  const secret = env.YOOKASSA_SECRET_KEY?.trim()
  if (shopId && secret) {
    const vat = Number(env.YOOKASSA_VAT_CODE?.trim() || DEFAULT_VAT_CODE)
    return new YooKassaGateway(shopId, secret, Number.isInteger(vat) && vat >= 1 && vat <= 12 ? vat : DEFAULT_VAT_CODE)
  }
  if (env.NODE_ENV !== 'production') return (mock ??= new MockGateway())
  return null
}

/** The local stand-in, only when it is the active gateway (for its «payment page»). */
export function getMockGateway(env: Env = process.env): MockGateway | null {
  const gateway = getGateway(env)
  return gateway instanceof MockGateway ? gateway : null
}

type ReceiptSource = Pick<Order, 'items' | 'deliveryCost'>

/** Receipt lines: one per item, plus delivery when it is charged. Sums to the order total. */
export function receiptItems(order: ReceiptSource): ReceiptItem[] {
  const items: ReceiptItem[] = order.items.map((i) => ({
    description: [i.title, i.color, i.size].filter(Boolean).join(', '),
    quantity: i.qty,
    price: i.price,
    subject: 'commodity',
  }))
  if (order.deliveryCost && order.deliveryCost > 0) {
    items.push({ description: 'Доставка', quantity: 1, price: order.deliveryCost, subject: 'service' })
  }
  return items
}

export const receiptTotal = (items: ReceiptItem[]) => items.reduce((sum, i) => sum + i.price * i.quantity, 0)
