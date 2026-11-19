import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { isSafePath, previewPathFor, previewUrl } from '@/lib/preview'

const req = (headers: Record<string, string>) => ({ headers: new Headers(headers) }) as unknown as PayloadRequest

describe('preview paths', () => {
  it('maps documents to their site pages', () => {
    expect(previewPathFor('home')).toBe('/')
    expect(previewPathFor('products', 'hudi')).toBe('/catalog/hudi')
    expect(previewPathFor('info-pages', 'dostavka')).toBe('/info/dostavka')
  })

  it('has no page without a slug', () => {
    expect(previewPathFor('products', '')).toBeNull()
    expect(previewPathFor('info-pages', undefined)).toBeNull()
  })

  it('accepts only same-site paths', () => {
    expect(isSafePath('/catalog/hudi')).toBe(true)
    expect(isSafePath('//evil.example')).toBe(false)
    expect(isSafePath('/\\evil.example')).toBe(false)
    expect(isSafePath('https://evil.example')).toBe(false)
    expect(isSafePath(null)).toBe(false)
  })

  it('builds the preview address on the origin the admin was opened on', () => {
    expect(previewUrl(req({ host: 'localhost:3000' }), '/')).toBe('http://localhost:3000/preview?path=%2F')
    expect(
      previewUrl(req({ host: 'internal', 'x-forwarded-host': 'test.polutone.ru', 'x-forwarded-proto': 'https' }), '/info/a'),
    ).toBe('https://test.polutone.ru/preview?path=%2Finfo%2Fa')
    expect(previewUrl(req({ host: 'localhost:3000' }), null)).toBeNull()
  })
})
