// Pure delivery rules: tariffs, the parcel, free delivery, statuses. No network, no Payload.
import type { Parcel, TariffQuote } from './types'

/** СДЭК tariffs. The shop hands parcels in at a point («склад»). */
export const CDEK_TARIFFS = { pickup: 136, courier: 137 } as const // «Посылка склад-склад», «склад-дверь»

export type DeliverySettings = {
  originCity: number | null
  shipmentPoint: string | null
  /** Items total from which delivery is free for the buyer; null — never. */
  freeFrom: number | null
  box: { length: number; width: number; height: number }
  /** Box and filler, grams. */
  packagingWeight: number
}

export const DELIVERY_DEFAULTS = {
  box: { length: 30, width: 25, height: 10 },
  packagingWeight: 150,
  itemWeight: 500,
} as const

/** One box for the whole order: items' weight plus packaging. */
export function parcelFor(lines: { weight?: number | null; qty: number }[], settings: Pick<DeliverySettings, 'box' | 'packagingWeight'>): Parcel {
  const items = lines.reduce((sum, l) => sum + (l.weight && l.weight > 0 ? l.weight : DELIVERY_DEFAULTS.itemWeight) * l.qty, 0)
  return { weight: Math.max(1, Math.round(items + settings.packagingWeight)), ...settings.box }
}

export type DeliveryPrice = {
  /** What the buyer pays, whole rubles. */
  price: number
  /** What the carrier charges the shop (shown nowhere to buyers). */
  carrierPrice: number
  free: boolean
  daysMin: number
  daysMax: number
}

/** The buyer's price: carrier's price rounded up to a ruble, or 0 from the free threshold. */
export function buyerPrice(quote: TariffQuote, itemsTotal: number, freeFrom: number | null): DeliveryPrice {
  const carrierPrice = Math.ceil(quote.price)
  const free = freeFrom != null && freeFrom > 0 && itemsTotal >= freeFrom
  return { price: free ? 0 : carrierPrice, carrierPrice, free, daysMin: quote.daysMin, daysMax: quote.daysMax }
}

/** «2–4 дня», «1 день», «5 дней». */
export function daysLabel(min: number, max: number): string {
  const word = (n: number) => {
    const t = n % 100
    const u = n % 10
    if (t >= 11 && t <= 14) return 'дней'
    if (u === 1) return 'день'
    if (u >= 2 && u <= 4) return 'дня'
    return 'дней'
  }
  return min === max || !max ? `${min} ${word(min)}` : `${min}–${max} ${word(max)}`
}

/** How a carrier status moves our order. Only forward: never back from «Доставлен». */
export function orderStatusFor(carrierStatus: string | null): 'shipped' | 'delivered' | null {
  switch (carrierStatus) {
    case 'DELIVERED':
      return 'delivered'
    case 'ACCEPTED':
    case 'RECEIVED_AT_SHIPMENT_WAREHOUSE':
    case 'READY_FOR_SHIPMENT_IN_SENDER_CITY':
    case 'TAKEN_BY_TRANSPORTER_FROM_SENDER_CITY':
    case 'SENT_TO_TRANSIT_CITY':
    case 'ACCEPTED_IN_TRANSIT_CITY':
    case 'SENT_TO_RECIPIENT_CITY':
    case 'ACCEPTED_IN_RECIPIENT_CITY':
    case 'ACCEPTED_AT_PICK_UP_POINT':
    case 'TAKEN_BY_COURIER':
      return 'shipped'
    default:
      return null
  }
}

const STATUS_ORDER = ['awaiting_payment', 'paid', 'assembling', 'shipped', 'delivered'] as const

/** True when `next` is further along than `current` (cancelled orders never move). */
export function isForward(current: string, next: string): boolean {
  const a = STATUS_ORDER.indexOf(current as (typeof STATUS_ORDER)[number])
  const b = STATUS_ORDER.indexOf(next as (typeof STATUS_ORDER)[number])
  return a >= 0 && b > a
}

/** Public tracking page for a СДЭК number. */
export const trackingUrl = (trackNumber: string) => `https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(trackNumber)}`
