import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { resolveSettings } from '@/lib/settings'

let payload: Payload

const reset = () =>
  payload.updateGlobal({
    slug: 'site-settings',
    data: {
      contacts: { telegram: null, vk: null, avito: null, email: null, phone: null, hours: null },
      legal: { seller: null, inn: null, ogrn: null, address: null },
      announcement: { enabled: true, text: 'Первая коллекция в разработке', link: null },
    },
  })

describe('site settings global', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    await reset()
  })

  it('saves contacts and the site shows them as links', async () => {
    await payload.updateGlobal({
      slug: 'site-settings',
      data: {
        contacts: { telegram: '@polutone', phone: '8 900 123-45-67', email: 'hi@polutone.ru' },
        legal: { seller: 'ИП Иванов Иван Иванович', inn: '123456789012', ogrn: '123456789012345' },
        announcement: { enabled: true, text: 'Доставка по России', link: '/info/dostavka' },
      },
    })

    // Visitors (no user, access checked) can read it.
    const doc = await payload.findGlobal({ slug: 'site-settings', overrideAccess: false })
    const view = resolveSettings(doc)
    expect(view.contacts.map((c) => c.href)).toEqual(['https://t.me/polutone', 'mailto:hi@polutone.ru', 'tel:+79001234567'])
    expect(view.legal).toBe('ИП Иванов Иван Иванович · ИНН 123456789012 · ОГРНИП 123456789012345')
    expect(view.announcement).toEqual({ text: 'Доставка по России', href: '/info/dostavka' })
  })

  it('rejects contacts that would make a broken or unsafe link', async () => {
    await expect(
      payload.updateGlobal({ slug: 'site-settings', data: { contacts: { telegram: 'javascript:alert(1)' } } }),
    ).rejects.toThrow()
    await expect(
      payload.updateGlobal({ slug: 'site-settings', data: { announcement: { link: 'javascript:alert(1)' } } }),
    ).rejects.toThrow()
    await expect(payload.updateGlobal({ slug: 'site-settings', data: { legal: { inn: '12345' } } })).rejects.toThrow()
  })

  it('visitors cannot change the settings', async () => {
    await expect(
      payload.updateGlobal({ slug: 'site-settings', data: { footer: { tagline: 'взлом' } }, overrideAccess: false }),
    ).rejects.toThrow()
  })
})
