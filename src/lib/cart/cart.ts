/**
 * Cart rules, shared by the browser (stored lines) and the server (prices and stock).
 * The browser keeps only variant ids and quantities; prices and availability always
 * come from the server, so a stale or edited copy in the browser cannot change a price.
 */

/** One cart position: a product variant (size × color) and how many. */
export type CartLine = { variantId: string; qty: number }

/** A sane cap per line and per cart; real limits come from stock. */
export const MAX_QTY = 10
export const MAX_LINES = 30

/** What the server knows about a variant that is on sale right now. */
export type VariantInfo = {
  variantId: string
  productId: number
  title: string
  slug: string
  color: string
  size: string
  price: number
  oldPrice: number | null
  available: number
  image: { url: string; alt: string } | null
  /** Weight of one item, grams (from its category), for the delivery price. */
  weight?: number | null
}

export type PricedLine = VariantInfo & {
  /** Quantity the buyer asked for. */
  requested: number
  /** Quantity that can actually be bought (0 when sold out or no longer on sale). */
  qty: number
  status: 'ok' | 'reduced' | 'unavailable'
  lineTotal: number
}

/** A stored line whose product is gone from the site (unpublished, hidden, deleted). */
export type MissingLine = { variantId: string; requested: number }

export type PricedCart = {
  lines: PricedLine[]
  missing: MissingLine[]
  /** Items that can be bought now. */
  count: number
  total: number
}

const isQty = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0

/** Adds `qty` of a variant, merging with an existing line; never above `limit` or MAX_QTY. */
export function addLine(lines: CartLine[], variantId: string, qty = 1, limit = MAX_QTY): CartLine[] {
  const cap = Math.min(limit, MAX_QTY)
  const existing = lines.find((l) => l.variantId === variantId)
  if (existing) {
    return lines.map((l) => (l === existing ? { ...l, qty: Math.min(l.qty + qty, cap) } : l))
  }
  if (cap < 1 || lines.length >= MAX_LINES) return lines
  return [...lines, { variantId, qty: Math.min(qty, cap) }]
}

/** Sets a line's quantity; 0 or less removes it. */
export function setLineQty(lines: CartLine[], variantId: string, qty: number): CartLine[] {
  if (qty < 1) return removeLine(lines, variantId)
  return lines.map((l) => (l.variantId === variantId ? { ...l, qty: Math.min(qty, MAX_QTY) } : l))
}

export function removeLine(lines: CartLine[], variantId: string): CartLine[] {
  return lines.filter((l) => l.variantId !== variantId)
}

/** Total quantity, for the header counter. */
export function countItems(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty, 0)
}

/**
 * Cleans untrusted input (browser storage, a request body) into valid lines:
 * drops malformed entries, merges duplicates, caps quantities and the number of lines.
 */
export function sanitizeLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return []
  let lines: CartLine[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const { variantId, qty } = item as Record<string, unknown>
    if (typeof variantId !== 'string' || !variantId || variantId.length > 100 || !isQty(qty)) continue
    lines = addLine(lines, variantId, qty)
  }
  return lines
}

/** Prices the cart against what is on sale now: clamps to stock, flags what can't be bought. */
export function priceCart(lines: CartLine[], variants: Map<string, VariantInfo>): PricedCart {
  const priced: PricedLine[] = []
  const missing: MissingLine[] = []

  for (const line of lines) {
    const info = variants.get(line.variantId)
    if (!info) {
      missing.push({ variantId: line.variantId, requested: line.qty })
      continue
    }
    const qty = Math.max(0, Math.min(line.qty, info.available, MAX_QTY))
    const status = qty === 0 ? 'unavailable' : qty < line.qty ? 'reduced' : 'ok'
    priced.push({ ...info, requested: line.qty, qty, status, lineTotal: qty * info.price })
  }

  return {
    lines: priced,
    missing,
    count: priced.reduce((sum, l) => sum + l.qty, 0),
    total: priced.reduce((sum, l) => sum + l.lineTotal, 0),
  }
}
