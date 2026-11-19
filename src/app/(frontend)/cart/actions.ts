'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { MAX_LINES, type PricedCart, sanitizeLines } from '@/lib/cart/cart'
import { quoteCart } from '@/lib/cart/quote'

export type QuoteResult = { ok: true; cart: PricedCart } | { ok: false; error: string }

/** Current prices and stock for the browser's cart. Input is untrusted: it is cleaned first. */
export async function getCartQuote(lines: unknown): Promise<QuoteResult> {
  const payload = await getPayload({ config })
  try {
    return { ok: true, cart: await quoteCart(payload, sanitizeLines(lines).slice(0, MAX_LINES)) }
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Cart quote failed' })
    return { ok: false, error: 'Не удалось обновить корзину. Попробуйте, пожалуйста, ещё раз.' }
  }
}
