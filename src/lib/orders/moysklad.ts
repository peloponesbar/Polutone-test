import type { Payload } from 'payload'

/** What MoySklad needs to create a reserved customer order with the «Сайт» sales channel. */
export type OrderForSource = {
  number: number
  customerName: string
  phone: string
  email: string
  address: string
  comment: string
  items: { variantId: string; qty: number; price: number }[]
}

export interface OrderSink {
  readonly name: string
  /** Creates the order in the source; returns its id there. */
  createOrder(order: OrderForSource): Promise<string>
}

/** Stand-in until the MoySklad adapter exists: logs the order and returns a fake id. */
export class MockOrderSink implements OrderSink {
  readonly name = 'mock'
  constructor(private readonly payload: Payload) {}

  async createOrder(order: OrderForSource): Promise<string> {
    this.payload.logger.info({
      msg: 'MoySklad (mock): customer order with reserve',
      number: order.number,
      items: order.items,
    })
    return `mock-${order.number}`
  }
}

/** Same switch as the catalog: CATALOG_SOURCE=mock now, moysklad once the adapter is written. */
export function getOrderSink(payload: Payload, env: Record<string, string | undefined>): OrderSink {
  const name = env.CATALOG_SOURCE?.trim() || 'mock'
  if (name === 'moysklad') {
    throw new Error('The MoySklad order adapter is not connected yet. Use CATALOG_SOURCE=mock.')
  }
  return new MockOrderSink(payload)
}
