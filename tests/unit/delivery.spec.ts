import { describe, expect, it, vi } from 'vitest'

import { CdekCarrier, shipmentBody, toCity, toPickupPoint, toShipmentState } from '@/lib/delivery/cdek'
import { MockCarrier } from '@/lib/delivery/mock'
import { buyerPrice, daysLabel, DELIVERY_DEFAULTS, isForward, orderStatusFor, parcelFor, trackingUrl } from '@/lib/delivery/rules'
import { resolveDelivery } from '@/lib/delivery/settings'
import { shipmentInput } from '@/lib/delivery/ship'
import { noticeShipmentId } from '@/lib/payments/endpoints'
import { isPasswordFree } from '@/lib/site-password'

const settings = resolveDelivery({ originCity: 1, shipmentPoint: 'SOC1', freeFrom: 10000 })

describe('parcel and price', () => {
  it('weighs items by category plus packaging, in one default box', () => {
    expect(parcelFor([{ weight: 700, qty: 2 }, { weight: null, qty: 1 }], settings)).toEqual({
      weight: 700 * 2 + DELIVERY_DEFAULTS.itemWeight + DELIVERY_DEFAULTS.packagingWeight,
      length: 30,
      width: 25,
      height: 10,
    })
  })
  it('rounds the carrier price up and makes it free from the threshold', () => {
    const quote = { price: 389.4, daysMin: 3, daysMax: 5 }
    expect(buyerPrice(quote, 9999, 10000)).toMatchObject({ price: 390, free: false })
    expect(buyerPrice(quote, 10000, 10000)).toMatchObject({ price: 0, carrierPrice: 390, free: true })
    expect(buyerPrice(quote, 50000, null).price).toBe(390)
  })
  it('says the delivery time in Russian', () => {
    expect(daysLabel(2, 4)).toBe('2–4 дня')
    expect(daysLabel(1, 1)).toBe('1 день')
    expect(daysLabel(5, 7)).toBe('5–7 дней')
    expect(daysLabel(11, 11)).toBe('11 дней')
  })
})

describe('statuses', () => {
  it('maps СДЭК statuses to ours and only moves forward', () => {
    expect(orderStatusFor('ACCEPTED')).toBe('shipped')
    expect(orderStatusFor('DELIVERED')).toBe('delivered')
    expect(orderStatusFor('CREATED')).toBeNull()
    expect(isForward('paid', 'shipped')).toBe(true)
    expect(isForward('delivered', 'shipped')).toBe(false)
    expect(isForward('cancelled', 'shipped')).toBe(false)
  })
  it('links to СДЭК tracking', () => {
    expect(trackingUrl('1012345678')).toBe('https://www.cdek.ru/ru/tracking?order_id=1012345678')
  })
})

describe('settings', () => {
  it('fills empty fields with defaults and treats 0 as «no free delivery»', () => {
    expect(resolveDelivery({ freeFrom: 0, boxLength: 0 })).toMatchObject({ freeFrom: null, box: { length: 30 }, originCity: null })
  })
  it('the local stand-in ships from its Красная Поляна until codes are set', () => {
    expect(resolveDelivery(null, 'mock')).toMatchObject({ originCity: 90001, shipmentPoint: 'TEST90001-1' })
    expect(resolveDelivery({ originCity: 5 }, 'mock').originCity).toBe(5)
  })
})

describe('СДЭК API mapping', () => {
  it('reads cities, points and orders', () => {
    expect(toCity({ code: 1, full_name: 'Красная Поляна, Сочи, Краснодарский край' })).toEqual({ code: 1, name: 'Красная Поляна', region: 'Сочи, Краснодарский край' })
    expect(toPickupPoint({ code: 'SOC1', work_time: 'Пн-Пт', location: { address: 'ул. Мира, 1', latitude: 43.6, longitude: 40.2, city_code: 1, city: 'Сочи' } })).toMatchObject({ code: 'SOC1', address: 'ул. Мира, 1' })
    expect(toPickupPoint({ code: 'NOGEO', location: {} })).toBeNull()
    const state = toShipmentState({
      entity: { uuid: 'u', number: '1001', cdek_number: '10123', statuses: [{ code: 'CREATED', date_time: '2026-11-20T10:00:00+0300' }, { code: 'ACCEPTED', date_time: '2026-11-20T12:00:00+0300' }] },
      requests: [{ state: 'SUCCESSFUL' }],
    })
    expect(state).toEqual({ uuid: 'u', trackNumber: '10123', status: 'ACCEPTED', orderNumber: '1001', invalid: false })
  })

  const order = {
    number: 1001,
    customerName: 'Анна',
    phone: '+79001234567',
    email: 'anna@example.ru',
    items: [{ title: 'Худи', color: 'Графит', size: 'M', qty: 2, price: 7900, lineTotal: 15800, variantId: 'h-m', weight: 700 }],
    tariffCode: 136,
    pickupPoint: 'MSK5',
    cityCode: 44,
    address: 'Москва, ул. Мира, 1 (пункт MSK5)',
    deliveryMethod: 'pickup' as const,
    deliveryCost: 390,
  }

  it('builds a prepaid order to a point, handed in at the shop\'s point', () => {
    const body = shipmentBody(shipmentInput(order, settings))
    expect(body).toMatchObject({
      type: 1,
      number: '1001',
      tariff_code: 136,
      shipment_point: 'SOC1',
      delivery_point: 'MSK5',
      recipient: { name: 'Анна', phones: [{ number: '+79001234567' }] },
      delivery_recipient_cost: { value: 0 },
    })
    expect(body.packages[0].items[0]).toEqual({ name: 'Худи, Графит, M', ware_key: 'h-m', payment: { value: 0 }, cost: 7900, weight: 700, amount: 2 })
    expect(body.packages[0].weight).toBe(1400 + DELIVERY_DEFAULTS.packagingWeight)
  })

  it('sends courier orders to the address and refuses incomplete ones', () => {
    const courier = shipmentBody(shipmentInput({ ...order, tariffCode: 137, deliveryMethod: 'courier', pickupPoint: null, address: 'ул. Мира, 1, кв. 2' }, settings))
    expect(courier).toMatchObject({ to_location: { code: 44, address: 'ул. Мира, 1, кв. 2' } })
    expect(courier).not.toHaveProperty('delivery_point')
    expect(() => shipmentInput(order, { ...settings, shipmentPoint: null })).toThrow('пункт сдачи')
    expect(() => shipmentInput({ ...order, tariffCode: null }, settings)).toThrow('тарифа')
  })

  it('gets a token once and sends it with each request', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: 'tok', expires_in: 3600 }))
      .mockResolvedValueOnce(Response.json({ total_sum: 389.4, period_min: 3, period_max: 5 }))
      .mockResolvedValueOnce(Response.json({ total_sum: 420, period_min: 4, period_max: 6 }))
    const cdek = new CdekCarrier('id', 'secret', 'https://api.edu.cdek.ru/v2', fetchImpl)
    const parcel = { weight: 900, length: 30, width: 25, height: 10 }
    expect(await cdek.quote({ tariffCode: 136, fromCity: 1, toCity: 44, parcel })).toEqual({ price: 389.4, daysMin: 3, daysMax: 5 })
    await cdek.quote({ tariffCode: 137, fromCity: 1, toCity: 44, toAddress: 'ул. Мира, 1', parcel })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.edu.cdek.ru/v2/oauth/token')
    expect(fetchImpl.mock.calls[1][1].headers.Authorization).toBe('Bearer tok')
    expect(JSON.parse(fetchImpl.mock.calls[2][1].body)).toMatchObject({ tariff_code: 137, to_location: { code: 44, address: 'ул. Мира, 1' }, packages: [parcel] })
    await expect(cdek.getShipment('../x')).rejects.toThrow('Invalid shipment id')
  })
})

describe('local stand-in', () => {
  it('finds Красная Поляна and its points, and prices farther cities higher', async () => {
    const mock = new MockCarrier()
    const [polyana] = await mock.searchCities('поляна')
    expect(polyana.name).toBe('Красная Поляна')
    expect((await mock.pickupPoints(polyana.code)).length).toBeGreaterThan(0)
    const parcel = { weight: 900, length: 30, width: 25, height: 10 }
    const near = await mock.quote({ tariffCode: 136, fromCity: polyana.code, toCity: 90002, parcel })
    const far = await mock.quote({ tariffCode: 136, fromCity: polyana.code, toCity: 90008, parcel })
    expect(far.price).toBeGreaterThan(near.price)
  })
})

describe('СДЭК notices', () => {
  it('accept only a shipment uuid, and skip the site password', () => {
    expect(noticeShipmentId({ type: 'ORDER_STATUS', uuid: '72753031-5f1b-4d3a-8a7c-1e2f3a4b5c6d' })).toBe('72753031-5f1b-4d3a-8a7c-1e2f3a4b5c6d')
    expect(noticeShipmentId({ uuid: '1 OR 1=1' })).toBeNull()
    expect(isPasswordFree('/api/delivery/cdek')).toBe(true)
  })
})
