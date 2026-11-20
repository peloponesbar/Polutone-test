import { describe, expect, it } from 'vitest'

import { catalogCanonical, isIndexable } from '@/lib/seo'

describe('isIndexable', () => {
  it('allows indexing on a plain production setup', () => {
    expect(isIndexable({})).toBe(true)
    expect(isIndexable({ VERCEL_ENV: 'production' })).toBe(true)
  })

  it('blocks a password-protected test site', () => {
    expect(isIndexable({ SITE_PASSWORD: 'secret' })).toBe(false)
  })

  it('blocks Vercel previews and development', () => {
    expect(isIndexable({ VERCEL_ENV: 'preview' })).toBe(false)
    expect(isIndexable({ VERCEL_ENV: 'development' })).toBe(false)
  })

  it('ignores an empty password', () => {
    expect(isIndexable({ SITE_PASSWORD: '  ' })).toBe(true)
  })
})

describe('catalogCanonical', () => {
  it('drops everything but the category', () => {
    expect(catalogCanonical()).toBe('/catalog')
    expect(catalogCanonical('hoodies')).toBe('/catalog?category=hoodies')
  })
})

describe('robots.txt', () => {
  it('opens public pages, closes private ones and points at the sitemap', async () => {
    const { default: robots } = await import('@/app/(frontend)/robots')
    const result = robots()
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules
    expect(rule.allow).toBe('/')
    expect(rule.disallow).toEqual(expect.arrayContaining(['/admin', '/cart', '/checkout']))
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/)
  })

  it('closes the whole site while a test password is set', async () => {
    process.env.SITE_PASSWORD = 'secret'
    try {
      const { default: robots } = await import('@/app/(frontend)/robots')
      expect(robots().rules).toEqual({ userAgent: '*', disallow: '/' })
    } finally {
      delete process.env.SITE_PASSWORD
    }
  })
})

describe('metaDescription', () => {
  it('returns undefined for empty text', async () => {
    const { metaDescription } = await import('@/lib/seo')
    expect(metaDescription(null)).toBeUndefined()
    expect(metaDescription('  \n ')).toBeUndefined()
  })

  it('flattens whitespace and keeps short text as it is', async () => {
    const { metaDescription } = await import('@/lib/seo')
    expect(metaDescription('Свободный   крой.\n\nУнисекс.')).toBe('Свободный крой. Унисекс.')
  })

  it('cuts long text on a word boundary within the limit', async () => {
    const { metaDescription } = await import('@/lib/seo')
    const out = metaDescription('слово '.repeat(60))!
    expect(out.length).toBeLessThanOrEqual(160)
    expect(out.endsWith('…')).toBe(true)
    expect(out).not.toMatch(/сло…$/)
  })
})

describe('pageOpenGraph', () => {
  it('is complete on its own and uses the page photo', async () => {
    const { pageOpenGraph } = await import('@/lib/seo')
    const og = pageOpenGraph({ title: 'Худи — POLUTONE', description: 'd', path: '/catalog/hudi', image: { url: '/a.webp', alt: null, width: 800, height: 1000 } })
    expect(og).toMatchObject({ siteName: 'POLUTONE', locale: 'ru_RU', url: '/catalog/hudi' })
    expect(og.images).toEqual([{ url: '/a.webp', alt: 'Худи — POLUTONE', width: 800, height: 1000 }])
  })

  it('has no images when the page has no photo', async () => {
    const { pageOpenGraph } = await import('@/lib/seo')
    expect('images' in pageOpenGraph({ title: 't', path: '/' })).toBe(false)
  })
})
