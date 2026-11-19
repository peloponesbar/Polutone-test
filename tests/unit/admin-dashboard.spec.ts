import { describe, expect, it } from 'vitest'

import { PUBLIC_PRODUCTS } from '@/collections/Products'
import { filterUrl, HIDDEN, NOT_PUBLISHED } from '@/components/admin/Dashboard'

const params = (url: string) => Object.fromEntries(new URL(url, 'http://x').searchParams)

describe('admin dashboard filter links', () => {
  it('opens the products list filtered by the tile', () => {
    expect(filterUrl(HIDDEN).startsWith('/admin/collections/products?')).toBe(true)
    expect(params(filterUrl(HIDDEN))).toEqual({ 'where[inSource][equals]': 'false' })
  })

  it('opens other collections too', () => {
    expect(filterUrl({ status: { equals: 'paid' } }, 'orders')).toBe('/admin/collections/orders?where%5Bstatus%5D%5Bequals%5D=paid')
  })

  it('keeps every condition of a combined filter', () => {
    expect(params(filterUrl(NOT_PUBLISHED))).toEqual({
      'where[_status][equals]': 'draft',
      'where[inSource][equals]': 'true',
    })
  })

  it('supports the and-filter visitors see', () => {
    expect(params(filterUrl(PUBLIC_PRODUCTS))).toEqual({
      'where[and][0][_status][equals]': 'published',
      'where[and][1][inSource][equals]': 'true',
    })
  })
})
