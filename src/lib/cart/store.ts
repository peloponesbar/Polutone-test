'use client'

import { useSyncExternalStore } from 'react'

import { addLine, type CartLine, removeLine, sanitizeLines, setLineQty } from './cart'

/**
 * The cart lives in this browser's localStorage (no account needed until phase 3).
 * A tiny external store: every component reading it updates together, and other tabs
 * follow through the `storage` event. Storage can be missing or blocked (private mode),
 * so every access is guarded and the cart then lives in memory for this page only.
 */

const KEY = 'polutone-cart-v1'
const EMPTY: CartLine[] = []
const listeners = new Set<() => void>()

let cache: CartLine[] | null = null

function read(): CartLine[] {
  if (cache) return cache
  try {
    cache = sanitizeLines(JSON.parse(window.localStorage.getItem(KEY) ?? '[]'))
  } catch {
    cache = []
  }
  return cache
}

function write(lines: CartLine[]) {
  cache = lines
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines))
  } catch {
    // Storage full or blocked: keep the in-memory cart for this page.
  }
  listeners.forEach((notify) => notify())
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return
    cache = null
    notify()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(notify)
    window.removeEventListener('storage', onStorage)
  }
}

/** Current cart lines; empty during server render and hydration. */
export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}

export const cart = {
  /** Adds a variant; `limit` is the stock known on the page. Returns the new quantity. */
  add(variantId: string, limit: number): number {
    const next = addLine(read(), variantId, 1, limit)
    write(next)
    return next.find((l) => l.variantId === variantId)?.qty ?? 0
  },
  setQty(variantId: string, qty: number) {
    write(setLineQty(read(), variantId, qty))
  },
  remove(variantId: string) {
    write(removeLine(read(), variantId))
  },
  /** Empties the cart (after a placed order). */
  clear() {
    write([])
  },
  /** Quantity of one variant already in the cart. */
  qtyOf(variantId: string): number {
    return read().find((l) => l.variantId === variantId)?.qty ?? 0
  },
}
