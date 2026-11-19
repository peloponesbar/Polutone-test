import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { getHome } from '@/lib/catalog/queries'
import { getInfoPage, listInfoLinks } from '@/lib/info'

let payload: Payload

describe('drafts of info pages and the home page', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  beforeEach(async () => {
    await payload.delete({ collection: 'info-pages', where: { id: { exists: true } } })
  })

  it('a never-published page stays off the site but opens in preview', async () => {
    await payload.create({
      collection: 'info-pages',
      draft: true,
      data: { title: 'Новая', slug: 'novaya', _status: 'draft' },
    })
    expect(await getInfoPage('novaya')).toBeNull()
    expect((await listInfoLinks()).map((l) => l.href)).not.toContain('/info/novaya')
    expect((await getInfoPage('novaya', { draft: true }))?.title).toBe('Новая')
  })

  it('a draft of a published page shows only in preview', async () => {
    const page = await payload.create({
      collection: 'info-pages',
      data: { title: 'Доставка', slug: 'dostavka', intro: 'Старый текст', _status: 'published' },
    })
    await payload.update({ collection: 'info-pages', id: page.id, draft: true, data: { intro: 'Новый текст' } })

    expect((await getInfoPage('dostavka'))?.intro).toBe('Старый текст')
    expect((await getInfoPage('dostavka', { draft: true }))?.intro).toBe('Новый текст')

    const asVisitor = await payload.find({
      collection: 'info-pages',
      draft: true,
      overrideAccess: false,
      depth: 0,
    })
    expect(asVisitor.docs.map((d) => d.intro)).not.toContain('Новый текст')
  })

  it('home page drafts show only in preview', async () => {
    await payload.updateGlobal({ slug: 'home', data: { _status: 'published', hero: { title: 'Опубликовано' } } })
    await payload.updateGlobal({ slug: 'home', draft: true, data: { hero: { title: 'Черновик' } } })

    expect((await getHome()).hero?.title).toBe('Опубликовано')
    expect((await getHome({ draft: true })).hero?.title).toBe('Черновик')

    const asVisitor = await payload.findGlobal({ slug: 'home', draft: true, overrideAccess: false, depth: 0 })
    expect(asVisitor.hero?.title).not.toBe('Черновик')
  })
})
