import type { Payload } from 'payload'
import { vi } from 'vitest'

import { quoteCart } from '@/lib/cart/quote'
import { syncCatalog } from '@/lib/catalog/sync'
import type { CatalogSource, SourceProduct } from '@/lib/catalog/types'
import type { OrderSink } from '@/lib/orders/moysklad'
import type { PlaceOrderDeps } from '@/lib/orders/place'

// Shared fixtures for checkout and payment integration tests.

export const product = (id: string, variants: SourceProduct['variants']): SourceProduct => ({
  externalId: id,
  article: `ART-${id}`,
  name: `Изделие ${id}`,
  category: 'Футболки',
  price: Math.min(...variants.map((v) => v.price)),
  oldPrice: null,
  composition: '',
  care: '',
  measurements: '',
  updatedAt: '2026-11-10T09:00:00.000Z',
  variants,
})
export const variant = (id: string, available: number, price = 3900) => ({ externalId: id, size: 'M', color: 'Молочный', price, available })
export const sourceOf = (products: SourceProduct[]): CatalogSource => ({ name: 'test', listProducts: async () => products })

export const form = {
  name: 'Анна',
  phone: '8 900 123-45-67',
  email: 'Anna@Example.ru',
  deliveryService: 'cdek',
  deliveryMethod: 'pickup',
  city: 'Казань',
  address: 'ул. Баумана, 1, пункт СДЭК',
  paymentMethod: 'online',
  comment: '',
  consent: true,
}

/** Records MoySklad and Telegram calls instead of making them. */
export function fakes(): PlaceOrderDeps & { sent: string[]; sunk: number[]; sink: OrderSink } {
  const sent: string[] = []
  const sunk: number[] = []
  const sink: OrderSink = {
    name: 'fake',
    createOrder: async (o) => (sunk.push(o.number), `ms-${o.number}`),
    orderPaid: async () => {},
    cancelOrder: async () => {},
  }
  // No carrier: delivery agreed after the order (delivery tests pass their own).
  return { sent, sunk, sink, notify: async (text) => sent.push(text), mail: vi.fn().mockResolvedValue(undefined), carrier: null }
}

export async function stockOf(payload: Payload, variantId: string) {
  const cart = await quoteCart(payload, [{ variantId, qty: 1 }])
  return cart.lines[0]?.available ?? null
}


/** Empty shop with two published products: tee (M ×3, L ×1, 3 900 ₽) and pants (M ×2, 6 500 ₽). */
export async function resetShop(payload: Payload) {
  await payload.delete({ collection: 'orders', where: { id: { exists: true } } })
  await payload.delete({ collection: 'products', where: { id: { exists: true } } })
  await payload.delete({ collection: 'categories', where: { id: { exists: true } } })
  await syncCatalog(payload, sourceOf([product('tee', [variant('tee-m', 3), variant('tee-l', 1)]), product('pants', [variant('pants-m', 2, 6500)])]))
  const all = await payload.find({ collection: 'products', depth: 0, limit: 10 })
  for (const doc of all.docs) await payload.update({ collection: 'products', id: doc.id, data: { _status: 'published' } })
}
