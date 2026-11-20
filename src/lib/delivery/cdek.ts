// СДЭК API v2 without an SDK. Docs: https://api-docs.cdek.ru — keys never leave the server.
// Test environment (api.edu.cdek.ru) with CDEK_TEST=true.
import type { Carrier, City, Parcel, PickupPoint, ShipmentInput, ShipmentState, TariffQuote } from './types'

export const CDEK_API = { live: 'https://api.cdek.ru/v2', test: 'https://api.edu.cdek.ru/v2' } as const

type Json = Record<string, unknown>

type ApiPoint = {
  code: string
  name?: string
  work_time?: string
  location?: { address?: string; address_full?: string; latitude?: number; longitude?: number; city_code?: number; city?: string }
}

export function toPickupPoint(p: ApiPoint): PickupPoint | null {
  const loc = p.location
  if (!p.code || !loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return null
  return {
    code: p.code,
    name: p.name ?? `Пункт ${p.code}`,
    address: loc.address ?? loc.address_full ?? '',
    hours: p.work_time ?? '',
    latitude: loc.latitude,
    longitude: loc.longitude,
    cityCode: loc.city_code ?? 0,
    city: loc.city ?? '',
  }
}

/** «Красная Поляна, Сочи, Краснодарский край» → name + the rest as region. */
export function toCity(c: { code?: number; full_name?: string }): City | null {
  if (typeof c.code !== 'number' || !c.full_name) return null
  const [name, ...rest] = c.full_name.split(',').map((s) => s.trim())
  return { code: c.code, name, region: rest.join(', ') }
}

type ApiOrder = {
  entity?: { uuid?: string; number?: string; cdek_number?: string; statuses?: { code: string; date_time: string }[] }
  requests?: { type?: string; state?: string; errors?: { message?: string }[] }[]
}

export function toShipmentState(body: ApiOrder): ShipmentState {
  const statuses = [...(body.entity?.statuses ?? [])].sort((a, b) => b.date_time.localeCompare(a.date_time))
  return {
    uuid: body.entity?.uuid ?? '',
    trackNumber: body.entity?.cdek_number ?? null,
    status: statuses[0]?.code ?? null,
    orderNumber: body.entity?.number ?? null,
    invalid: (body.requests ?? []).some((r) => r.state === 'INVALID'),
  }
}

/** Body of «create order» for an online shop, prepaid: the buyer pays nothing on delivery. */
export function shipmentBody(input: ShipmentInput) {
  return {
    type: 1,
    number: String(input.orderNumber),
    tariff_code: input.tariffCode,
    shipment_point: input.shipmentPoint,
    ...(input.deliveryPoint ? { delivery_point: input.deliveryPoint } : {}),
    ...(input.toAddress ? { to_location: { code: input.toAddress.cityCode, address: input.toAddress.address } } : {}),
    recipient: { name: input.recipient.name, email: input.recipient.email, phones: [{ number: input.recipient.phone }] },
    delivery_recipient_cost: { value: 0 },
    packages: [
      {
        number: '1',
        weight: input.parcel.weight,
        length: input.parcel.length,
        width: input.parcel.width,
        height: input.parcel.height,
        items: input.items.map((i) => ({
          name: i.name.slice(0, 255),
          ware_key: i.sku.slice(0, 50),
          payment: { value: 0 },
          cost: i.cost,
          weight: i.weight,
          amount: i.qty,
        })),
      },
    ],
  }
}

export class CdekCarrier implements Carrier {
  readonly name = 'cdek'
  private token: { value: string; until: number } | null = null

  constructor(
    private readonly clientId: string,
    private readonly secret: string,
    private readonly base: string = CDEK_API.live,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async accessToken(): Promise<string> {
    if (this.token && this.token.until > Date.now()) return this.token.value
    const response = await this.fetchImpl(`${this.base}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: this.clientId, client_secret: this.secret }),
      signal: AbortSignal.timeout(10_000),
    })
    const body = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null
    if (!response.ok || !body?.access_token) throw new Error(`СДЭК: authorization failed (${response.status})`)
    this.token = { value: body.access_token, until: Date.now() + Math.max(60, (body.expires_in ?? 3600) - 60) * 1000 }
    return body.access_token
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchImpl(`${this.base}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${await this.accessToken()}`, 'Content-Type': 'application/json', ...init.headers },
      signal: AbortSignal.timeout(15_000),
    })
    const body = (await response.json().catch(() => null)) as (Json & { errors?: { message?: string }[]; requests?: ApiOrder['requests'] }) | null
    if (!response.ok || body === null) {
      const message = body?.errors?.[0]?.message ?? body?.requests?.[0]?.errors?.[0]?.message
      throw new Error(`СДЭК responded ${response.status}${message ? `: ${message}` : ''}`)
    }
    return body as T
  }

  async searchCities(query: string): Promise<City[]> {
    const q = query.trim()
    if (q.length < 2) return []
    const list = await this.call<{ code?: number; full_name?: string }[]>(
      `/location/suggest/cities?${new URLSearchParams({ name: q, country_code: 'RU' })}`,
    )
    return list.map(toCity).filter((c): c is City => c !== null).slice(0, 10)
  }

  async pickupPoints(cityCode: number): Promise<PickupPoint[]> {
    const list = await this.call<ApiPoint[]>(`/deliverypoints?${new URLSearchParams({ city_code: String(cityCode), type: 'PVZ', country_code: 'RU' })}`)
    return list.map(toPickupPoint).filter((p): p is PickupPoint => p !== null)
  }

  async quote({ tariffCode, fromCity, toCity, toAddress, parcel }: { tariffCode: number; fromCity: number; toCity: number; toAddress?: string; parcel: Parcel }): Promise<TariffQuote> {
    const body = await this.call<{ total_sum?: number; period_min?: number; period_max?: number }>('/calculator/tariff', {
      method: 'POST',
      body: JSON.stringify({
        tariff_code: tariffCode,
        from_location: { code: fromCity },
        to_location: { code: toCity, ...(toAddress ? { address: toAddress } : {}) },
        packages: [parcel],
      }),
    })
    if (typeof body.total_sum !== 'number') throw new Error('СДЭК: no price for this route')
    return { price: body.total_sum, daysMin: body.period_min ?? 0, daysMax: body.period_max ?? body.period_min ?? 0 }
  }

  async createShipment(input: ShipmentInput): Promise<{ uuid: string }> {
    const body = await this.call<ApiOrder>('/orders', { method: 'POST', body: JSON.stringify(shipmentBody(input)) })
    const state = toShipmentState(body)
    if (state.invalid || !state.uuid) {
      throw new Error(`СДЭК refused the order: ${body.requests?.[0]?.errors?.map((e) => e.message).join('; ') ?? 'no details'}`)
    }
    return { uuid: state.uuid }
  }

  async getShipment(uuid: string): Promise<ShipmentState> {
    if (!/^[0-9a-f-]{36}$/i.test(uuid)) throw new Error('Invalid shipment id')
    return toShipmentState(await this.call<ApiOrder>(`/orders/${uuid}`))
  }

  /** Subscribes the site to order status notices (run once per site address). */
  async subscribeStatuses(url: string): Promise<string> {
    const body = await this.call<{ entity?: { uuid?: string } }>('/webhooks', { method: 'POST', body: JSON.stringify({ type: 'ORDER_STATUS', url }) })
    return body.entity?.uuid ?? ''
  }
}
