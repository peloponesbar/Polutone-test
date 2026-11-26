import { describe, expect, it, vi } from 'vitest'

import { sendTelegram } from '@/lib/notify/telegram'
import { formatPhone, maskPhone, normalizePhone, validateCheckout } from '@/lib/orders/checkout'
import { methodsOf } from '@/lib/orders/options'
import { orderMessage } from '@/lib/orders/place'

const valid = {
  name: '  Анна   Петрова ',
  phone: '+7 (900) 123-45-67',
  email: ' Anna@Example.RU ',
  deliveryService: 'cdek',
  deliveryMethod: 'courier',
  city: 'Казань',
  address: 'ул. Баумана, 1, кв. 5',
  paymentMethod: 'online',
  comment: '',
  consent: 'on',
}

describe('phones', () => {
  it('accepts the usual Russian ways of writing a mobile number', () => {
    for (const input of ['+7 900 123-45-67', '8 (900) 123 45 67', '79001234567', '9001234567']) {
      expect(normalizePhone(input)).toBe('+79001234567')
    }
  })

  it('rejects what is not a Russian number', () => {
    for (const input of ['123', '+1 202 555 0100', '', '8900123456789']) expect(normalizePhone(input)).toBeNull()
  })

  it('formats for reading', () => {
    expect(formatPhone('+79001234567')).toBe('+7 900 123-45-67')
    expect(formatPhone('other')).toBe('other')
  })

  it('masks the field to +7 with spaces whether typed with 8, 7, +7 or nothing', () => {
    for (const input of ['89001234567', '79001234567', '+79001234567', '9001234567', '8 (900) 123 45 67']) {
      expect(maskPhone(input)).toBe('+7 900 123-45-67')
    }
  })

  it('masks a number while it is being typed', () => {
    expect(maskPhone('')).toBe('')
    expect(maskPhone('8')).toBe('+7')
    expect(maskPhone('9')).toBe('+7 9')
    expect(maskPhone('8900')).toBe('+7 900')
    expect(maskPhone('+7 9001')).toBe('+7 900 1')
    expect(maskPhone('+7 900 12345')).toBe('+7 900 123-45')
    expect(maskPhone('8800 555 35 35')).toBe('+7 800 555-35-35')
  })

  it('keeps the masked value valid for the server and drops extra digits', () => {
    expect(normalizePhone(maskPhone('8 900 123 45 67'))).toBe('+79001234567')
    expect(maskPhone('8900123456789')).toBe('+7 900 123-45-67')
  })
})

describe('validateCheckout', () => {
  it('cleans a valid form', () => {
    const result = validateCheckout(valid)
    expect(result).toEqual({
      ok: true,
      data: {
        name: 'Анна Петрова',
        phone: '+79001234567',
        email: 'anna@example.ru',
        deliveryService: 'cdek',
        deliveryMethod: 'courier',
        city: 'Казань',
        cityCode: null,
        pickupPoint: null,
        address: 'ул. Баумана, 1, кв. 5',
        paymentMethod: 'online',
        comment: '',
      },
    })
  })

  it('requires consent', () => {
    const result = validateCheckout({ ...valid, consent: undefined })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors)).toEqual(['consent'])
  })

  it('Почта России delivers to the post office only', () => {
    expect(methodsOf('post')).toEqual(['pickup'])
  })

  it('offers only СДЭК at checkout until phase 4', () => {
    for (const service of ['post', 'yandex']) {
      const result = validateCheckout({ ...valid, deliveryService: service })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.deliveryService).toBeDefined()
    }
  })

  it('with delivery on the site: a city from the list and a pickup point are required', () => {
    const pickup = { ...valid, deliveryMethod: 'pickup', address: '' }
    const missing = validateCheckout(pickup, { withCarrier: true })
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(Object.keys(missing.errors).sort()).toEqual(['city', 'pickupPoint'])

    const chosen = validateCheckout({ ...pickup, cityCode: '90006', pickupPoint: 'TEST90006-1' }, { withCarrier: true })
    expect(chosen).toMatchObject({ ok: true, data: { cityCode: 90006, pickupPoint: 'TEST90006-1' } })

    const courier = validateCheckout({ ...valid, cityCode: '90006', pickupPoint: 'TEST90006-1' }, { withCarrier: true })
    expect(courier).toMatchObject({ ok: true, data: { cityCode: 90006, pickupPoint: null, address: 'ул. Баумана, 1, кв. 5' } })

    const badPoint = validateCheckout({ ...pickup, cityCode: '90006', pickupPoint: '"><script>' }, { withCarrier: true })
    expect(badPoint.ok).toBe(false)
  })

  it('rejects unknown choices and oversized input', () => {
    const result = validateCheckout({
      ...valid,
      deliveryService: 'dhl',
      paymentMethod: 'crypto',
      email: 'not-an-email',
      comment: 'x'.repeat(1001),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(['comment', 'deliveryService', 'email', 'paymentMethod'])
    }
  })
})

describe('order notification', () => {
  const order = {
    number: 1001,
    total: 10400,
    items: [
      { variantId: 'a', title: 'Футболка', color: 'Шалфей', size: 'M', price: 3900, qty: 1, lineTotal: 3900 },
      { variantId: 'b', title: 'Брюки', color: 'Графит', size: 'M', price: 6500, qty: 1, lineTotal: 6500 },
    ],
    customerName: 'Анна',
    phone: '+79001234567',
    email: 'anna@example.ru',
    deliveryService: 'cdek' as const,
    deliveryMethod: 'pickup' as const,
    city: 'Казань',
    address: 'ул. Баумана, 1',
    comment: 'Позвонить заранее',
  }

  it('has everything the shop needs to act', () => {
    // Prices use non-breaking spaces so they never wrap; compare with plain ones.
    const text = orderMessage(order).replace(/\u00a0/g, ' ')
    expect(text).toContain('Новый заказ № 1001 — 10 400 ₽')
    expect(text).toContain('• Футболка, Шалфей, M — 1 × 3 900 ₽')
    expect(text).toContain('Анна, +7 900 123-45-67, anna@example.ru')
    expect(text).toContain('СДЭК, в пункт выдачи: Казань, ул. Баумана, 1')
    expect(text).toContain('Комментарий: Позвонить заранее')
  })

  it('is skipped without a bot token and sent as plain text with one', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    expect(await sendTelegram('hi', {}, fetchImpl)).toBe('skipped')
    expect(fetchImpl).not.toHaveBeenCalled()

    expect(await sendTelegram('<b>hi</b>', { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '42' }, fetchImpl)).toBe('sent')
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.telegram.org/bott/sendMessage')
    expect(JSON.parse(init.body)).toEqual({ chat_id: '42', text: '<b>hi</b>', disable_web_page_preview: true })
  })

  it('reports a Telegram error so the caller can log it', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 403 }))
    await expect(sendTelegram('hi', { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '42' }, fetchImpl)).rejects.toThrow('403')
  })
})
