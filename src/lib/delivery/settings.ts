import { APIError, type GlobalBeforeChangeHook, type Payload, type PayloadRequest } from 'payload'

import type { SiteSetting } from '@/payload-types'

import { getCarrier } from './index'
import { MockCarrier } from './mock'
import { DELIVERY_DEFAULTS, type DeliverySettings } from './rules'

type DeliveryFields = NonNullable<SiteSetting['delivery']>

/** Stored settings → what the delivery code needs, with defaults for empty fields. */
export function resolveDelivery(d: DeliveryFields | null | undefined, carrierName?: string): DeliverySettings {
  const positive = (v: number | null | undefined, fallback: number) => (typeof v === 'number' && v > 0 ? v : fallback)
  const settings: DeliverySettings = {
    originCity: d?.originCity ?? null,
    shipmentPoint: d?.shipmentPoint?.trim() || null,
    freeFrom: typeof d?.freeFrom === 'number' && d.freeFrom > 0 ? d.freeFrom : null,
    box: {
      length: positive(d?.boxLength, DELIVERY_DEFAULTS.box.length),
      width: positive(d?.boxWidth, DELIVERY_DEFAULTS.box.width),
      height: positive(d?.boxHeight, DELIVERY_DEFAULTS.box.height),
    },
    packagingWeight: typeof d?.packagingWeight === 'number' && d.packagingWeight >= 0 ? d.packagingWeight : DELIVERY_DEFAULTS.packagingWeight,
  }
  // Local stand-in: ship from its Красная Поляна until real codes are set.
  if (carrierName === 'mock' && !settings.originCity) return { ...settings, originCity: 90001, shipmentPoint: 'TEST90001-1' }
  return settings
}

export async function getDeliverySettings(payload: Payload, req?: PayloadRequest): Promise<DeliverySettings> {
  const doc = await payload.findGlobal({ slug: 'site-settings', depth: 0, req })
  return resolveDelivery(doc.delivery, getCarrier()?.name)
}

/**
 * Admin saves «Доставка»: checks the city and the hand-in point against СДЭК and writes a
 * readable label, so a typo in a code is caught now and not on the first real order.
 */
export const checkOrigin: GlobalBeforeChangeHook = async ({ data, originalDoc }) => {
  const next = data.delivery as DeliveryFields | undefined
  const prev = originalDoc?.delivery as DeliveryFields | undefined
  if (!next) return data
  const changed = next.originCity !== prev?.originCity || (next.shipmentPoint ?? '') !== (prev?.shipmentPoint ?? '')
  if (!changed) return data
  if (!next.originCity) {
    next.originLabel = null
    return data
  }
  const carrier = getCarrier()
  if (!carrier || carrier instanceof MockCarrier) {
    next.originLabel = 'Не проверено: СДЭК не подключён (нет ключей в .env)'
    return data
  }
  const points = await carrier.pickupPoints(next.originCity).catch(() => null)
  if (points === null) throw new APIError('Не удалось связаться со СДЭК, чтобы проверить коды. Попробуйте сохранить ещё раз.', 400, null, true)
  if (points.length === 0) throw new APIError(`В СДЭК нет пунктов в городе с кодом ${next.originCity}. Проверьте код города.`, 400, null, true)
  const code = next.shipmentPoint?.trim()
  const point = code ? points.find((p) => p.code === code) : undefined
  if (code && !point) throw new APIError(`Пункт «${code}» не найден в этом городе. Проверьте код пункта сдачи.`, 400, null, true)
  next.originLabel = point ? `${point.city}: ${point.address} (${point.code})` : `${points[0].city} — пункт сдачи не указан`
  return data
}
