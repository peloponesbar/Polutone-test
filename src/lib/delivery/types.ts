/** A city as the carrier knows it. */
export type City = { code: number; name: string; region: string }

export type PickupPoint = {
  code: string
  name: string
  address: string
  /** «Пн-Пт 10:00-20:00, Сб 10:00-16:00» */
  hours: string
  latitude: number
  longitude: number
  cityCode: number
  city: string
}

/** One box: weight in grams, sides in centimetres. */
export type Parcel = { weight: number; length: number; width: number; height: number }

/** The carrier's price and time for one route, before free-delivery rules. */
export type TariffQuote = { price: number; daysMin: number; daysMax: number }

export type ShipmentItem = { name: string; sku: string; cost: number; weight: number; qty: number }

export type ShipmentInput = {
  orderNumber: number
  tariffCode: number
  /** Point where the shop hands the parcel in. */
  shipmentPoint: string
  recipient: { name: string; phone: string; email: string }
  /** Pickup point for «склад-склад», or the address for «склад-дверь». */
  deliveryPoint?: string
  toAddress?: { cityCode: number; address: string }
  parcel: Parcel
  items: ShipmentItem[]
  /** What the buyer paid for delivery (for the carrier's documents). */
  deliveryPaid: number
}

export type ShipmentState = {
  uuid: string
  /** Number the buyer tracks; appears a little after creation. */
  trackNumber: string | null
  /** Carrier's latest status code, e.g. ACCEPTED, DELIVERED. */
  status: string | null
  /** Our order number the shipment was created for. */
  orderNumber: string | null
  /** The carrier refused the request (bad data). */
  invalid: boolean
}

export interface Carrier {
  readonly name: 'cdek' | 'mock'
  searchCities(query: string): Promise<City[]>
  pickupPoints(cityCode: number): Promise<PickupPoint[]>
  quote(input: { tariffCode: number; fromCity: number; toCity: number; toAddress?: string; parcel: Parcel }): Promise<TariffQuote>
  createShipment(input: ShipmentInput): Promise<{ uuid: string }>
  getShipment(uuid: string): Promise<ShipmentState>
}
