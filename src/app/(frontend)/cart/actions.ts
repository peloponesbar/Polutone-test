'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { MAX_LINES, type PricedCart, sanitizeLines } from '@/lib/cart/cart'
import { quoteCart } from '@/lib/cart/quote'
import { expireUnpaidOrders } from '@/lib/payments/flow'

export type QuoteResult = { ok: true; cart: PricedCart } | { ok: false; error: string }

/** Current prices and stock for the browser's cart. Input is untrusted: it is cleaned first. */
export async function getCartQuote(lines: unknown): Promise<QuoteResult> {
  const payload = await getPayload({ config })
  // Unpaid orders past their hold give their items back before the cart is priced.
  await expireUnpaidOrders(payload).catch((error) => payload.logger.error({ err: error, msg: 'Order expiry failed' }))
  try {
    return { ok: true, cart: await quoteCart(payload, sanitizeLines(lines).slice(0, MAX_LINES)) }
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Cart quote failed' })
    return { ok: false, error: 'Не удалось обновить корзину. Попробуйте, пожалуйста, ещё раз.' }
  }
}
