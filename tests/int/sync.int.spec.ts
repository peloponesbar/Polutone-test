import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { syncCatalog } from '@/lib/catalog/sync'
import type { CatalogSource, SourceProduct } from '@/lib/catalog/types'

let payload: Payload

const product = (id: string, overrides: Partial<SourceProduct> = {}): SourceProduct => ({
  externalId: id,
  article: `ART-${id}`,
  name: 'Жакет прямой',
  category: 'Жакеты',
  price: 10000,
  oldPrice: null,
  composition: 'Шерсть',
  care: 'Химчистка',
  measurements: '',
  updatedAt: '2026-11-10T09:00:00.000Z',
  variants: [{ externalId: `${id}-v1`, size: 'M', color: 'Графит', price: 10000, available: 2 }],
  ...overrides,
})

const sourceOf = (products: SourceProduct[]): CatalogSource => ({
  name: 'test',
  listProducts: async () => products,
})

async function findByExternalId(externalId: string) {
  const result = await payload.find({
    collection: 'products',
    where: { externalId: { equals: externalId } },
    depth: 1,
  })
  return result.docs[0]
}

describe('syncCatalog', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  beforeEach(async () => {
    await payload.delete({ collection: 'products', where: { id: { exists: true } } })
    await payload.delete({ collection: 'categories', where: { id: { exists: true } } })
  })

  it('creates new products as unpublished drafts with categories and slugs', async () => {
    const report = await syncCatalog(payload, sourceOf([product('a'), product('b', { category: 'Брюки' })]))

    expect(report).toEqual({ source: 'test', created: 2, updated: 0, hidden: 0, categoriesCreated: 2 })
    const a = await findByExternalId('a')
    expect(a._status).toBe('draft')
    expect(a.inSource).toBe(true)
    expect(a.inStock).toBe(true)
    expect(a.slug).toBe('zhaket-pryamoy')
    expect(typeof a.category === 'object' && a.category?.slug).toBe('zhakety')
  })

  it('gives same-named products distinct slugs', async () => {
    await syncCatalog(payload, sourceOf([product('a'), product('b')]))
    const slugs = [(await findByExternalId('a')).slug, (await findByExternalId('b')).slug]
    expect(slugs).toEqual(['zhaket-pryamoy', 'zhaket-pryamoy-art-b'])
  })

  it('is idempotent and updates commerce data without touching presentation or publishing', async () => {
    await syncCatalog(payload, sourceOf([product('a')]))
    const created = await findByExternalId('a')
    await payload.update({
      collection: 'products',
      id: created.id,
      data: { _status: 'published', description: 'Свободная посадка.' },
    })

    const report = await syncCatalog(
      payload,
      sourceOf([
        product('a', {
          name: 'Жакет прямой (новое название)',
          price: 9000,
          variants: [{ externalId: 'a-v1', size: 'M', color: 'Графит', price: 9000, available: 0 }],
        }),
      ]),
    )

    expect(report).toMatchObject({ created: 0, updated: 1, categoriesCreated: 0 })
    const updated = await findByExternalId('a')
    expect(updated.id).toBe(created.id)
    expect(updated.title).toBe('Жакет прямой (новое название)')
    expect(updated.price).toBe(9000)
    expect(updated.inStock).toBe(false)
    expect(updated.slug).toBe('zhaket-pryamoy') // URL stays stable after a rename
    expect(updated._status).toBe('published')
    expect(updated.description).toBe('Свободная посадка.')
  })

  it('hides products that disappear from the source and restores them when they return', async () => {
    await syncCatalog(payload, sourceOf([product('a'), product('b')]))

    const report = await syncCatalog(payload, sourceOf([product('a')]))
    expect(report.hidden).toBe(1)
    expect((await findByExternalId('b')).inSource).toBe(false)

    await syncCatalog(payload, sourceOf([product('a'), product('b')]))
    expect((await findByExternalId('b')).inSource).toBe(true)
  })
})

describe('drafts and catalog sync', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  beforeEach(async () => {
    await payload.delete({ collection: 'products', where: { id: { exists: true } } })
    await payload.delete({ collection: 'categories', where: { id: { exists: true } } })
  })

  async function publishedWithPendingDraft() {
    await syncCatalog(payload, sourceOf([product('a')]))
    const { id } = await findByExternalId('a')
    await payload.update({ collection: 'products', id, data: { _status: 'published', description: 'На сайте' } })
    await payload.update({ collection: 'products', id, draft: true, data: { description: 'Черновик' } })
    return id
  }

  const live = (id: number) => payload.findByID({ collection: 'products', id, depth: 0 })
  const latest = (id: number) => payload.findByID({ collection: 'products', id, depth: 0, draft: true })

  it('a draft save leaves the published product unchanged', async () => {
    const id = await publishedWithPendingDraft()
    expect((await live(id)).description).toBe('На сайте')
    expect((await latest(id)).description).toBe('Черновик')
  })

  it('sync refreshes MoySklad data in both versions without publishing the pending draft', async () => {
    const id = await publishedWithPendingDraft()
    await syncCatalog(payload, sourceOf([product('a', { price: 7000 })]))

    const site = await live(id)
    expect(site._status).toBe('published')
    expect(site.description).toBe('На сайте')
    expect(site.price).toBe(7000)

    const draft = await latest(id)
    expect(draft._status).toBe('draft')
    expect(draft.description).toBe('Черновик')
    expect(draft.price).toBe(7000)

    // Publishing the draft later carries the fresh price, not the one from before the sync.
    await payload.update({ collection: 'products', id, data: { _status: 'published' } })
    expect(await live(id)).toMatchObject({ description: 'Черновик', price: 7000, _status: 'published' })
  })

  it('hiding a product removed from MoySklad keeps its pending draft unpublished', async () => {
    const id = await publishedWithPendingDraft()
    await syncCatalog(payload, sourceOf([]))
    expect(await live(id)).toMatchObject({ inSource: false, description: 'На сайте', _status: 'published' })
    expect(await latest(id)).toMatchObject({ inSource: false, description: 'Черновик', _status: 'draft' })
  })

  it('admin saves cannot change MoySklad fields', async () => {
    const id = await publishedWithPendingDraft()
    await payload.update({ collection: 'products', id, draft: true, data: { price: 1, title: 'Подмена' } })
    await payload.update({ collection: 'products', id, data: { _status: 'published', price: 2 } })
    expect(await live(id)).toMatchObject({ price: 10000, title: 'Жакет прямой' })
  })

  it('visitors never see a draft', async () => {
    const id = await publishedWithPendingDraft()
    const asVisitor = await payload.find({
      collection: 'products',
      where: { id: { equals: id } },
      draft: true,
      overrideAccess: false,
      depth: 0,
    })
    expect(asVisitor.docs.map((d) => d.description)).not.toContain('Черновик')
  })
})

describe('product access', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  it('shows visitors only published products that are still in the source', async () => {
    await payload.delete({ collection: 'products', where: { id: { exists: true } } })
    await syncCatalog(payload, sourceOf([product('draft'), product('live'), product('gone')]))
    await payload.update({
      collection: 'products',
      where: { externalId: { in: ['live', 'gone'] } },
      data: { _status: 'published' },
    })
    await syncCatalog(payload, sourceOf([product('draft'), product('live')]))

    const visible = await payload.find({ collection: 'products', overrideAccess: false, depth: 0 })
    expect(visible.docs.map((d) => d.externalId)).toEqual(['live'])
  })
})
