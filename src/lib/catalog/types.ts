/**
 * Catalog data as the site sees it, independent of where it comes from
 * (mock fixtures now, MoySklad later). Prices are in whole rubles.
 */
export type SourceVariant = {
  externalId: string
  size: string
  color: string
  price: number
  /** Units available to sell (stock minus reserve). */
  available: number
}

export type SourceProduct = {
  externalId: string
  article: string
  name: string
  /** Category name (MoySklad product folder). */
  category: string
  /** Lowest variant price. */
  price: number
  /** Strike-through price, if the product is discounted. */
  oldPrice: number | null
  composition: string
  care: string
  /** Size chart as a text table, see parseMeasurements. */
  measurements: string
  /** ISO date of the last change in the source, used for "newest first". */
  updatedAt: string
  variants: SourceVariant[]
}

export interface CatalogSource {
  readonly name: string
  listProducts(): Promise<SourceProduct[]>
}
