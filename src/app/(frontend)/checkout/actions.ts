'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { placeOrder, type PlaceOrderResult } from '@/lib/orders/place'
import { startPayment } from '@/lib/payments/flow'

export type SubmitOrderResult = PlaceOrderResult | { ok: true; number: number; token: string; paymentUrl: string | null }

/**
 * Checkout from the browser. Everything in `input` is untrusted; placeOrder validates it.
 * When payments are on, the answer carries ЮKassa's link; if that step fails the order is
 * still saved and its page offers «Оплатить».
 */
export async function submitOrder(input: unknown): Promise<SubmitOrderResult> {
  const { lines, expectedTotal, form } = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const payload = await getPayload({ config })
  const placed = await placeOrder(payload, {
    lines,
    expectedTotal,
    form: form && typeof form === 'object' ? (form as Record<string, unknown>) : {},
  })
  if (!placed.ok) return placed
  const payment = await startPayment(payload, placed.token)
  return { ...placed, paymentUrl: payment.kind === 'redirect' ? payment.url : null }
}
