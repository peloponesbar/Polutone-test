import { mockAssortment } from './mock-data'
import { normalizeAssortment } from './moysklad-format'
import type { CatalogSource } from './types'

/** Fictional assortment in MoySklad format, mapped by the same code as real data. */
export class MockCatalogSource implements CatalogSource {
  readonly name = 'mock'

  async listProducts() {
    return normalizeAssortment(mockAssortment()).products
  }
}

const SOURCES = ['mock', 'moysklad'] as const
export type CatalogSourceName = (typeof SOURCES)[number]

/** Picks the catalog source from CATALOG_SOURCE (default: mock). */
export function getCatalogSource(env: Record<string, string | undefined>): CatalogSource {
  const name = (env.CATALOG_SOURCE?.trim() || 'mock') as CatalogSourceName
  if (!SOURCES.includes(name)) {
    throw new Error(`Unknown CATALOG_SOURCE "${name}". Use one of: ${SOURCES.join(', ')}`)
  }
  if (name === 'moysklad') {
    throw new Error('The MoySklad source is not connected yet. Use CATALOG_SOURCE=mock.')
  }
  return new MockCatalogSource()
}
