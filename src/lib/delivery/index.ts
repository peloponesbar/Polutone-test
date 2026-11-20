import { CDEK_API, CdekCarrier } from './cdek'
import { MockCarrier } from './mock'
import type { Carrier } from './types'

export type { Carrier, City, PickupPoint } from './types'

type Env = Record<string, string | undefined>

let mock: MockCarrier | null = null
let live: { key: string; carrier: CdekCarrier } | null = null

/**
 * СДЭК when CDEK_CLIENT_ID and CDEK_CLIENT_SECRET are set (CDEK_TEST=true — their test
 * environment); the local stand-in in development; otherwise none — then delivery is
 * agreed with the buyer after the order, as before.
 */
export function getCarrier(env: Env = process.env): Carrier | null {
  const id = env.CDEK_CLIENT_ID?.trim()
  const secret = env.CDEK_CLIENT_SECRET?.trim()
  if (id && secret) {
    const base = env.CDEK_TEST?.trim() === 'true' ? CDEK_API.test : CDEK_API.live
    const key = `${id}@${base}`
    // One instance per process keeps the access token between requests.
    if (live?.key !== key) live = { key, carrier: new CdekCarrier(id, secret, base) }
    return live.carrier
  }
  if (env.NODE_ENV !== 'production') return (mock ??= new MockCarrier())
  return null
}

export function getMockCarrier(env: Env = process.env): MockCarrier | null {
  const carrier = getCarrier(env)
  return carrier instanceof MockCarrier ? carrier : null
}
