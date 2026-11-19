'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { placeOrder, type PlaceOrderResult } from '@/lib/orders/place'

/** Checkout from the browser. Everything in `input` is untrusted; placeOrder validates it. */
export async function submitOrder(input: unknown): Promise<PlaceOrderResult> {
  const { lines, expectedTotal, form } = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const payload = await getPayload({ config })
  return placeOrder(payload, {
    lines,
    expectedTotal,
    form: form && typeof form === 'object' ? (form as Record<string, unknown>) : {},
  })
}
