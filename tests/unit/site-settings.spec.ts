import { describe, expect, it } from 'vitest'

import {
  announcementOf,
  avitoLink,
  contactLinks,
  emailLink,
  legalLine,
  phoneLink,
  safeHref,
  SETTINGS_DEFAULTS,
  telegramLink,
  validators,
  vkLink,
} from '@/lib/settings/format'

// resolveSettings lives next to the Payload query; import it without loading the config.
const { resolveSettings } = await import('@/lib/settings')

describe('telegramLink', () => {
  it.each(['@polutone', 'polutone', 't.me/polutone', 'https://t.me/polutone/', 'telegram.me/polutone'])('%s', (v) => {
    expect(telegramLink(v)).toEqual({ href: 'https://t.me/polutone', text: '@polutone' })
  })
  it('keeps invite links', () => {
    expect(telegramLink('https://t.me/+AbC_12')).toEqual({ href: 'https://t.me/+AbC_12', text: 'Telegram' })
  })
  it.each(['', '  ', '@ab', 'javascript:alert(1)', 'https://evil.ru/polutone', 'поло тон'])('rejects %j', (v) => {
    expect(telegramLink(v)).toBeNull()
  })
})

describe('vkLink', () => {
  it.each(['polutone', 'vk.com/polutone', 'https://vk.com/polutone', 'https://m.vk.com/polutone/', 'vk.ru/polutone'])('%s', (v) => {
    expect(vkLink(v)).toEqual({ href: 'https://vk.com/polutone', text: 'vk.com/polutone' })
  })
  it('rejects other sites', () => {
    expect(vkLink('https://evil.com/polutone')).toBeNull()
  })
})

describe('avito, email and phone', () => {
  it('accepts only https Avito links', () => {
    expect(avitoLink('https://www.avito.ru/brands/polutone')?.href).toBe('https://www.avito.ru/brands/polutone')
    expect(avitoLink('http://avito.ru/x')).toBeNull()
    expect(avitoLink('https://avito.ru.evil.com/x')).toBeNull()
  })
  it('builds mailto links', () => {
    expect(emailLink(' hello@polutone.ru ')).toEqual({ href: 'mailto:hello@polutone.ru', text: 'hello@polutone.ru' })
    expect(emailLink('hello@')).toBeNull()
  })
  it('accepts mobile, landline and 8-800 numbers', () => {
    expect(phoneLink('8 (900) 123-45-67')).toEqual({ href: 'tel:+79001234567', text: '+7 900 123-45-67' })
    expect(phoneLink('+7 495 123 45 67')?.href).toBe('tel:+74951234567')
    expect(phoneLink('8 800 555-35-35')?.href).toBe('tel:+78005553535')
    expect(phoneLink('12345')).toBeNull()
  })
})

describe('safeHref', () => {
  it('allows site paths and http(s) links only', () => {
    expect(safeHref('/info/dostavka')).toBe('/info/dostavka')
    expect(safeHref('https://polutone.ru/catalog')).toBe('https://polutone.ru/catalog')
    expect(safeHref('//evil.com')).toBeNull()
    expect(safeHref('javascript:alert(1)')).toBeNull()
    expect(safeHref('')).toBeNull()
  })
})

describe('contactLinks', () => {
  it('lists filled contacts in a fixed order and skips empty or invalid ones', () => {
    const links = contactLinks({ phone: '89001234567', telegram: '@polutone', vk: '', avito: 'nope', email: 'hi@polutone.ru' })
    expect(links.map((l) => l.kind)).toEqual(['telegram', 'email', 'phone'])
    expect(links[0]).toMatchObject({ label: 'Telegram', external: true })
    expect(links[2]).toMatchObject({ label: 'Телефон', external: false, text: '+7 900 123-45-67' })
  })
  it('is empty when nothing is filled in', () => {
    expect(contactLinks(null)).toEqual([])
  })
})

describe('legalLine', () => {
  it('is hidden until the seller is filled in', () => {
    expect(legalLine({ inn: '123456789012' })).toBeNull()
  })
  it('names ОГРНИП for 15 digits and ОГРН for 13', () => {
    expect(legalLine({ seller: 'ИП Иванов И. И.', inn: '123456789012', ogrn: '123456789012345' })).toBe(
      'ИП Иванов И. И. · ИНН 123456789012 · ОГРНИП 123456789012345',
    )
    expect(legalLine({ seller: 'ООО «Полутон»', ogrn: '1234567890123', address: 'Москва' })).toBe(
      'ООО «Полутон» · ОГРН 1234567890123 · Москва',
    )
  })
})

describe('announcementOf', () => {
  it('needs the switch and a text', () => {
    expect(announcementOf({ enabled: false, text: 'Скидки' })).toBeNull()
    expect(announcementOf({ enabled: true, text: ' ' })).toBeNull()
    expect(announcementOf({ enabled: true, text: 'Скидки', link: 'javascript:x' })).toEqual({ text: 'Скидки', href: null })
    expect(announcementOf({ enabled: true, text: 'Скидки', link: '/catalog' })).toEqual({ text: 'Скидки', href: '/catalog' })
  })
})

describe('validators', () => {
  it('allow empty optional fields', () => {
    for (const check of Object.values(validators)) expect(check('')).toBe(true)
  })
  it('explain wrong values', () => {
    expect(validators.telegram('https://evil.ru')).toMatch(/t\.me/)
    expect(validators.inn('12345')).toMatch(/12 цифр/)
    expect(validators.ogrn('123')).toMatch(/15 цифр/)
    expect(validators.inn('123456789012')).toBe(true)
  })
})

describe('resolveSettings', () => {
  it('uses the defaults before the first save', () => {
    const view = resolveSettings(null)
    expect(view.announcement).toEqual({ text: SETTINGS_DEFAULTS.announcement.text, href: null })
    expect(view.tagline).toBe(SETTINGS_DEFAULTS.footer.tagline)
    expect(view.seo.title).toBe(SETTINGS_DEFAULTS.seo.title)
    expect(view.contacts).toEqual([])
    expect(view.legal).toBeNull()
  })
  it('respects cleared fields after a save, but never blanks the SEO texts', () => {
    const view = resolveSettings({
      updatedAt: '2026-11-20T10:00:00.000Z',
      announcement: { enabled: false, text: 'x' },
      footer: { tagline: '' },
      seo: { title: '', description: null },
      contacts: { telegram: '@polutone', hours: ' Ежедневно ' },
    })
    expect(view.announcement).toBeNull()
    expect(view.tagline).toBeNull()
    expect(view.seo.title).toBe(SETTINGS_DEFAULTS.seo.title)
    expect(view.seo.description).toBe(SETTINGS_DEFAULTS.seo.description)
    expect(view.hours).toBe('Ежедневно')
    expect(view.contacts.map((c) => c.kind)).toEqual(['telegram'])
  })
})
