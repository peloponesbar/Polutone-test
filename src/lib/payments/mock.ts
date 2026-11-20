import { randomUUID } from 'node:crypto'

import type { CreatePaymentInput, GatewayPayment, PaymentGateway } from './types'

/** Path of the local stand-in for ЮKassa's payment page. */
export const MOCK_PAY_PATH = '/payment/mock'

type Stored = GatewayPayment & { returnUrl: string }

// One process in local development: payments live in memory until the dev server restarts.
const store: Map<string, Stored> = ((globalThis as { __polutoneMockPayments?: Map<string, Stored> }).__polutoneMockPayments ??=
  new Map())
const byKey = new Map<string, string>()

/**
 * Local stand-in for ЮKassa (no keys in .env, never in production): the «payment page»
 * is /payment/mock/<id> with «Оплатить» and «Отказаться».
 */
export class MockGateway implements PaymentGateway {
  readonly name = 'mock'

  async createPayment(input: CreatePaymentInput): Promise<GatewayPayment> {
    const existing = byKey.get(input.idempotenceKey)
    if (existing && store.has(existing)) return this.view(store.get(existing)!)
    const id = `mock-${randomUUID()}`
    const origin = new URL(input.returnUrl).origin
    store.set(id, {
      id,
      status: 'pending',
      amount: input.amount,
      confirmationUrl: `${origin}${MOCK_PAY_PATH}/${id}`,
      orderToken: input.orderToken,
      returnUrl: input.returnUrl,
    })
    byKey.set(input.idempotenceKey, id)
    return this.view(store.get(id)!)
  }

  async getPayment(id: string): Promise<GatewayPayment> {
    const payment = store.get(id)
    if (!payment) throw new Error('Mock payment not found (the dev server was restarted?)')
    return this.view(payment)
  }

  /** What the mock payment page does: the buyer pays or gives up. Returns where to go back. */
  finish(id: string, outcome: 'succeeded' | 'canceled'): string | null {
    const payment = store.get(id)
    if (!payment || payment.status !== 'pending') return payment?.returnUrl ?? null
    payment.status = outcome
    return payment.returnUrl
  }

  private view({ returnUrl: _returnUrl, ...payment }: Stored): GatewayPayment {
    return { ...payment, confirmationUrl: payment.status === 'pending' ? payment.confirmationUrl : null }
  }
}
