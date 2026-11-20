import type { Payload, PayloadRequest } from 'payload'

import { updateSourceData } from '@/lib/catalog/sync'

export type StockLine = { productId: number | null | undefined; variantId: string; qty: number }

/**
 * Changes the site's stock: -1 takes the quantities off (checkout), +1 puts them back
 * (cancelled order). The source (MoySklad) catches up on its next sync. Products that
 * no longer exist are skipped.
 */
export async function changeStock(payload: Payload, lines: StockLine[], direction: -1 | 1, req: PayloadRequest) {
  const byProduct = new Map<number, Map<string, number>>()
  for (const line of lines) {
    if (typeof line.productId !== 'number') continue
    const qtys = byProduct.get(line.productId) ?? new Map<string, number>()
    qtys.set(line.variantId, (qtys.get(line.variantId) ?? 0) + line.qty)
    byProduct.set(line.productId, qtys)
  }
  for (const [productId, qtys] of byProduct) {
    const found = await payload.find({ collection: 'products', where: { id: { equals: productId } }, limit: 1, depth: 0, draft: false, req })
    const product = found.docs[0]
    if (!product) continue
    const variants = (product.variants ?? []).map((v) => ({
      ...v,
      available: Math.max(0, v.available + direction * (qtys.get(v.externalId) ?? 0)),
    }))
    await updateSourceData(payload, productId, { variants, inStock: variants.some((v) => v.available > 0) }, req)
  }
}
