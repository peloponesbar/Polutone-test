import type { Payload, PayloadRequest } from 'payload'

import type { PricedCart } from '@/lib/cart/cart'

import { buyerPrice, CDEK_TARIFFS, type DeliveryPrice, type DeliverySettings, parcelFor } from './rules'
import { getDeliverySettings } from './settings'
import type { Carrier, PickupPoint, TariffQuote } from './types'

export type DeliveryChoice = {
  method: 'pickup' | 'courier'
  cityCode: number
  pickupPoint?: string | null
  /** Courier: street, house, flat. */
  address?: string | null
}

export type DeliveryQuote = DeliveryPrice & {
  tariffCode: number
  /** The carrier's own price for the route, before free-delivery rules (re-applied at checkout). */
  tariff: TariffQuote
  point: PickupPoint | null
}

export type DeliveryQuoteResult = { ok: true; delivery: DeliveryQuote } | { ok: false; error: string }

const POINTS_TTL = 60 * 60_000
const pointsCache = new Map<string, { until: number; points: PickupPoint[] }>()

/** Pickup points of a city; cached for an hour (they rarely change, the list is large). */
export async function cachedPickupPoints(carrier: Carrier, cityCode: number): Promise<PickupPoint[]> {
  const key = `${carrier.name}:${cityCode}`
  const hit = pointsCache.get(key)
  if (hit && hit.until > Date.now()) return hit.points
  const points = await carrier.pickupPoints(cityCode)
  pointsCache.set(key, { until: Date.now() + POINTS_TTL, points })
  return points
}

const UNAVAILABLE = 'Не удалось рассчитать доставку. Попробуйте, пожалуйста, ещё раз через минуту.'

/**
 * The delivery price for this cart and choice, computed on the server from the carrier's
 * tariff: the browser's figure is never trusted. Free from the threshold in the settings.
 */
export async function quoteDelivery(
  payload: Payload,
  carrier: Carrier,
  cart: PricedCart,
  choice: DeliveryChoice,
  { settings, req }: { settings?: DeliverySettings; req?: PayloadRequest } = {},
): Promise<DeliveryQuoteResult> {
  const config = settings ?? (await getDeliverySettings(payload, req))
  if (!config.originCity) {
    payload.logger.error('Delivery: the origin city is not set in «Настройки сайта» → «Доставка»')
    return { ok: false, error: UNAVAILABLE }
  }
  const buyable = cart.lines.filter((l) => l.qty > 0)
  if (buyable.length === 0) return { ok: false, error: 'В корзине нет товаров для доставки.' }

  try {
    let point: PickupPoint | null = null
    if (choice.method === 'pickup') {
      const points = await cachedPickupPoints(carrier, choice.cityCode)
      point = points.find((p) => p.code === choice.pickupPoint) ?? null
      if (!point) return { ok: false, error: 'Этого пункта выдачи больше нет. Выберите, пожалуйста, другой.' }
    }
    const tariffCode = CDEK_TARIFFS[choice.method]
    const tariff = await carrier.quote({
      tariffCode,
      fromCity: config.originCity,
      toCity: choice.cityCode,
      toAddress: choice.method === 'courier' ? (choice.address ?? undefined) : undefined,
      parcel: parcelFor(buyable, config),
    })
    return { ok: true, delivery: { ...buyerPrice(tariff, cart.total, config.freeFrom), tariffCode, tariff, point } }
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Delivery quote failed', cityCode: choice.cityCode, method: choice.method })
    return { ok: false, error: UNAVAILABLE }
  }
}
