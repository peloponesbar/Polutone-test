import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { seedInfoPages, seedTestCatalog } from '@/lib/seed'

let payload: Payload

describe('build-time test data', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  beforeEach(async () => {
    await payload.delete({ collection: 'products', where: { id: { exists: true } } })
    await payload.delete({ collection: 'categories', where: { id: { exists: true } } })
    await payload.delete({ collection: 'info-pages', where: { id: { exists: true } } })
  })

  it('first run creates and publishes the catalog and info pages', async () => {
    expect(await seedInfoPages(payload)).toEqual({ created: 7 })
    const report = await seedTestCatalog(payload)

    expect(report).toMatchObject({ created: 6, firstRun: true })
    const published = await payload.count({ collection: 'products', where: { _status: { equals: 'published' } } })
    expect(published.totalDocs).toBe(6)
  })

  it('later runs duplicate nothing and keep admin changes', async () => {
    await seedInfoPages(payload)
    await seedTestCatalog(payload)
    await payload.update({
      collection: 'products',
      where: { article: { equals: 'T01' } },
      data: { _status: 'draft', description: 'Изменено в админке' },
    })
    await payload.update({ collection: 'info-pages', where: { slug: { equals: 'uhod' } }, data: { intro: 'Свой текст' } })

    expect(await seedInfoPages(payload)).toEqual({ created: 0 })
    expect(await seedTestCatalog(payload)).toMatchObject({ created: 0, updated: 6, firstRun: false })

    const t01 = (await payload.find({ collection: 'products', where: { article: { equals: 'T01' } } })).docs[0]
    expect(t01._status).toBe('draft')
    expect(t01.description).toBe('Изменено в админке')
    const care = (await payload.find({ collection: 'info-pages', where: { slug: { equals: 'uhod' } } })).docs[0]
    expect(care.intro).toBe('Свой текст')
    expect((await payload.count({ collection: 'products' })).totalDocs).toBe(6)
  })
})
