'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

import { getCartQuote, type QuoteResult } from '@/app/(frontend)/cart/actions'
import type { PricedCart } from '@/lib/cart/cart'
import { cart, useCart } from '@/lib/cart/store'

const noop = () => () => {}
/** False during server render and hydration, true after: the cart is only known in the browser. */
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false)

/**
 * The browser's cart priced by the server, re-quoted whenever it changes.
 * Brings the stored cart in line with the quote: drops products no longer on sale and
 * cuts quantities to stock, remembering both so the page can tell the buyer.
 */
export function useCartQuote() {
  const hydrated = useHydrated()
  const lines = useCart()
  const key = JSON.stringify(lines)
  const [quote, setQuote] = useState<{ key: string; result: QuoteResult } | null>(null)
  const [removedNote, setRemovedNote] = useState(false)
  /** Variant → stock it was cut to; the note stays after the stored quantity is fixed. */
  const [reduced, setReduced] = useState<Record<string, number>>({})

  /** Applies a fresh quote (from this hook or from a refused checkout) to the stored cart. */
  const reconcile = useCallback((priced: PricedCart) => {
    if (priced.missing.length > 0) {
      setRemovedNote(true)
      priced.missing.forEach((m) => cart.remove(m.variantId))
    }
    const cut = priced.lines.filter((l) => l.status === 'reduced')
    if (cut.length > 0) {
      setReduced((prev) => ({ ...prev, ...Object.fromEntries(cut.map((l) => [l.variantId, l.available])) }))
      cut.forEach((l) => cart.setQty(l.variantId, l.qty))
    }
  }, [])

  useEffect(() => {
    if (lines.length === 0) return
    let current = true
    getCartQuote(lines)
      .catch((): QuoteResult => ({ ok: false, error: 'Не удалось обновить корзину. Проверьте, пожалуйста, интернет.' }))
      .then((result) => {
        if (!current) return
        setQuote({ key, result })
        if (result.ok) reconcile(result.cart)
      })
    return () => {
      current = false
    }
    // `key` stands for `lines`: re-quote only when the contents really change.
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    hydrated,
    lines,
    result: quote?.result ?? null,
    /** The shown quote is for an older cart; a new one is on its way. */
    loading: quote?.key !== key,
    removedNote,
    reduced,
    reconcile,
  }
}
