'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { MAX_LINES, sanitizeLines } from '@/lib/cart/cart'
import { quoteCart } from '@/lib/cart/quote'
import { getCarrier } from '@/lib/delivery'
import { cachedPickupPoints, quoteDelivery } from '@/lib/delivery/quote'
import { daysLabel } from '@/lib/delivery/rules'
import type { City, PickupPoint } from '@/lib/delivery/types'

// Delivery helpers for the checkout form. All input is untrusted and checked here.

export async function searchCities(query: unknown): Promise<City[]> {
  const carrier = getCarrier()
  const q = typeof query === 'string' ? query.trim().slice(0, 60) : ''
  if (!carrier || q.length < 2) return []
  try {
    return await carrier.searchCities(q)
  } catch (error) {
    ;(await getPayload({ config })).logger.error({ err: error, msg: 'City search failed' })
    return []
  }
}

export type PointsResult = { ok: true; points: PickupPoint[] } | { ok: false; error: string }

export async function getPickupPoints(cityCode: unknown): Promise<PointsResult> {
  const carrier = getCarrier()
  const code = Number(cityCode)
  if (!carrier || !Number.isInteger(code) || code <= 0) return { ok: true, points: [] }
  try {
    return { ok: true, points: await cachedPickupPoints(carrier, code) }
  } catch (error) {
    ;(await getPayload({ config })).logger.error({ err: error, msg: 'Pickup points failed', cityCode: code })
    return { ok: false, error: 'Не удалось загрузить пункты выдачи. Попробуйте, пожалуйста, ещё раз через минуту.' }
  }
}

export type DeliveryQuoteView =
  | { ok: true; price: number; free: boolean; days: string; total: number }
  | { ok: false; error: string }

/** Price and time for the chosen city and point (or courier), computed on the server. */
export async function getDeliveryQuote(input: unknown): Promise<DeliveryQuoteView> {
  const carrier = getCarrier()
  if (!carrier) return { ok: false, error: 'Доставка рассчитывается после заказа.' }
  const { lines, method, cityCode, pickupPoint, address } = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const code = Number(cityCode)
  if (!Number.isInteger(code) || code <= 0 || (method !== 'pickup' && method !== 'courier')) {
    return { ok: false, error: 'Выберите, пожалуйста, город и способ доставки.' }
  }
  const payload = await getPayload({ config })
  const cart = await quoteCart(payload, sanitizeLines(lines).slice(0, MAX_LINES))
  const result = await quoteDelivery(payload, carrier, cart, {
    method,
    cityCode: code,
    pickupPoint: typeof pickupPoint === 'string' ? pickupPoint.slice(0, 40) : null,
    address: typeof address === 'string' ? address.slice(0, 300) : null,
  })
  if (!result.ok) return result
  const { price, free, daysMin, daysMax } = result.delivery
  return { ok: true, price, free, days: daysLabel(daysMin, daysMax), total: cart.total + price }
}
