import { describe, expect, it } from 'vitest'

import { INFO_PAGE_DEFAULTS } from '@/lib/info-defaults'

// paragraphs() lives next to Payload queries; import it without loading the Payload config.
const { paragraphs } = await import('@/lib/info')

describe('paragraphs', () => {
  it('splits on blank lines and trims', () => {
    expect(paragraphs('Первый.\n\n  Второй.\n \nТретий.')).toEqual(['Первый.', 'Второй.', 'Третий.'])
  })

  it('keeps single line breaks inside a paragraph', () => {
    expect(paragraphs('Строка 1\nСтрока 2')).toEqual(['Строка 1\nСтрока 2'])
  })

  it('handles empty input', () => {
    expect(paragraphs(null)).toEqual([])
    expect(paragraphs('\n\n')).toEqual([])
  })
})

describe('info page defaults', () => {
  it('has the seven agreed pages with unique slugs and menu order', () => {
    expect(INFO_PAGE_DEFAULTS.map((p) => p.title)).toEqual([
      'Доставка',
      'Оплата',
      'Возврат',
      'Таблица размеров',
      'Уход за вещами',
      'Контакты и о бренде',
      'Политика конфиденциальности',
    ])
    expect(new Set(INFO_PAGE_DEFAULTS.map((p) => p.slug)).size).toBe(7)
    expect(new Set(INFO_PAGE_DEFAULTS.map((p) => p.menuOrder)).size).toBe(7)
  })

  it('uses latin slugs and only the size page shows charts', () => {
    expect(INFO_PAGE_DEFAULTS.every((p) => /^[a-z0-9-]+$/.test(p.slug))).toBe(true)
    expect(INFO_PAGE_DEFAULTS.filter((p) => p.showSizeCharts).map((p) => p.slug)).toEqual(['razmery'])
  })

  it('only the contacts page shows the contacts block, with no placeholder sections left', () => {
    expect(INFO_PAGE_DEFAULTS.filter((p) => p.showContacts).map((p) => p.slug)).toEqual(['kontakty'])
    const contacts = INFO_PAGE_DEFAULTS.find((p) => p.slug === 'kontakty')
    expect(JSON.stringify(contacts)).not.toContain('появятся здесь')
  })

  it('follows the brand voice: no exclamation marks or forbidden words', () => {
    const text = JSON.stringify(INFO_PAGE_DEFAULTS).toLowerCase()
    expect(text).not.toContain('!')
    for (const word of ['уникальн', 'эксклюзивн', 'идеальн', 'лучш', 'безупречн', 'стильный образ']) {
      expect(text).not.toContain(word)
    }
  })
})
