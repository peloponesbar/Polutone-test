import { randomUUID } from 'node:crypto'

import type { Carrier, City, Parcel, PickupPoint, ShipmentInput, ShipmentState, TariffQuote } from './types'

/** Fictional cities and points for local development without СДЭК keys. Codes are made up. */
export const MOCK_CITIES: (City & { lat: number; lon: number; zone: number })[] = [
  { code: 90001, name: 'Красная Поляна', region: 'Сочи, Краснодарский край', lat: 43.6797, lon: 40.2058, zone: 0 },
  { code: 90002, name: 'Сочи', region: 'Краснодарский край', lat: 43.5855, lon: 39.7231, zone: 0 },
  { code: 90003, name: 'Краснодар', region: 'Краснодарский край', lat: 45.0355, lon: 38.9753, zone: 1 },
  { code: 90004, name: 'Москва', region: 'Россия', lat: 55.7558, lon: 37.6173, zone: 2 },
  { code: 90005, name: 'Санкт-Петербург', region: 'Россия', lat: 59.9386, lon: 30.3141, zone: 3 },
  { code: 90006, name: 'Казань', region: 'Республика Татарстан', lat: 55.7963, lon: 49.1088, zone: 3 },
  { code: 90007, name: 'Екатеринбург', region: 'Свердловская область', lat: 56.8389, lon: 60.6057, zone: 4 },
  { code: 90008, name: 'Новосибирск', region: 'Новосибирская область', lat: 55.0302, lon: 82.9204, zone: 5 },
]

const STREETS = ['ул. Ленина', 'ул. Мира', 'пр. Победы', 'ул. Садовая', 'ул. Советская', 'ул. Гагарина', 'ул. Лесная', 'наб. Речная']

type Stored = ShipmentState & { input: ShipmentInput }
const shipments: Map<string, Stored> = ((globalThis as { __polutoneMockShipments?: Map<string, Stored> }).__polutoneMockShipments ??= new Map())

/** Local stand-in for СДЭК: same interface, made-up data, prices by a simple formula. */
export class MockCarrier implements Carrier {
  readonly name = 'mock'

  async searchCities(query: string): Promise<City[]> {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return MOCK_CITIES.filter((c) => c.name.toLowerCase().includes(q)).map(({ code, name, region }) => ({ code, name, region }))
  }

  async pickupPoints(cityCode: number): Promise<PickupPoint[]> {
    const city = MOCK_CITIES.find((c) => c.code === cityCode)
    if (!city) return []
    const count = city.zone === 0 ? 3 : 8
    return Array.from({ length: count }, (_, i) => ({
      code: `TEST${city.code}-${i + 1}`,
      name: `${city.name}, ${STREETS[i % STREETS.length].replace(/^(ул\.|пр\.|наб\.) /, '')}`,
      address: `${STREETS[i % STREETS.length]}, ${10 + i * 7}`,
      hours: i % 3 === 0 ? 'Пн-Вс 09:00-21:00' : 'Пн-Пт 10:00-20:00, Сб 10:00-16:00',
      latitude: city.lat + Math.sin(i * 1.7) * 0.02,
      longitude: city.lon + Math.cos(i * 1.7) * 0.03,
      cityCode: city.code,
      city: city.name,
    }))
  }

  async quote({ tariffCode, toCity, parcel }: { tariffCode: number; fromCity: number; toCity: number; parcel: Parcel }): Promise<TariffQuote> {
    const zone = MOCK_CITIES.find((c) => c.code === toCity)?.zone
    if (zone === undefined) throw new Error('Mock СДЭК: no route to this city')
    const courier = tariffCode === 137 ? 180 : 0
    return { price: 290 + zone * 60 + Math.ceil(parcel.weight / 1000) * 35 + courier + 0.4, daysMin: 1 + zone, daysMax: 2 + zone + (courier ? 1 : 0) }
  }

  async createShipment(input: ShipmentInput): Promise<{ uuid: string }> {
    const uuid = randomUUID()
    shipments.set(uuid, { uuid, trackNumber: `10${String(input.orderNumber).padStart(8, '0')}`, status: 'CREATED', orderNumber: String(input.orderNumber), invalid: false, input })
    return { uuid }
  }

  async getShipment(uuid: string): Promise<ShipmentState> {
    const stored = shipments.get(uuid)
    if (!stored) throw new Error('Mock shipment not found (the dev server was restarted?)')
    const { input: _input, ...state } = stored
    return state
  }

  /** Moves a test shipment along, as СДЭК would (tests and local checks). */
  advance(uuid: string, status: string) {
    const stored = shipments.get(uuid)
    if (stored) stored.status = status
  }

  lastInput(uuid: string): ShipmentInput | null {
    return shipments.get(uuid)?.input ?? null
  }
}
