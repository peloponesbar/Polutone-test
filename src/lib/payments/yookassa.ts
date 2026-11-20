// ЮKassa API v3 without an SDK: create a payment (redirect to ЮKassa's page) and read it back.
// Docs: https://yookassa.ru/developers/api — the secret key never leaves the server.
import type { CreatePaymentInput, GatewayPayment, PaymentGateway } from './types'

const API = 'https://api.yookassa.ru/v3'

/** «Без НДС» — for ИП on УСН. Check with the accountant before launch (YOOKASSA_VAT_CODE). */
export const DEFAULT_VAT_CODE = 1

const rub = (value: number) => ({ value: value.toFixed(2), currency: 'RUB' })

type ApiPayment = {
  id: string
  status: GatewayPayment['status']
  amount: { value: string; currency: string }
  confirmation?: { confirmation_url?: string }
  metadata?: Record<string, string>
}

export function toGatewayPayment(p: ApiPayment): GatewayPayment {
  return {
    id: p.id,
    status: p.status,
    amount: Number(p.amount.value),
    confirmationUrl: p.status === 'pending' ? (p.confirmation?.confirmation_url ?? null) : null,
    orderToken: p.metadata?.orderToken ?? null,
  }
}

/** Request body for «create payment» with a 54-FZ receipt («Чеки от ЮKassa»). */
export function paymentBody(input: CreatePaymentInput, vatCode = DEFAULT_VAT_CODE) {
  return {
    amount: rub(input.amount),
    capture: true,
    confirmation: { type: 'redirect', return_url: input.returnUrl, locale: 'ru_RU' },
    description: input.description.slice(0, 128),
    metadata: { orderToken: input.orderToken, orderNumber: String(input.orderNumber) },
    receipt: {
      customer: { email: input.email },
      items: input.items.map((item) => ({
        description: item.description.slice(0, 128),
        quantity: item.quantity.toFixed(2),
        amount: rub(item.price),
        vat_code: vatCode,
        payment_mode: 'full_payment',
        payment_subject: item.subject,
      })),
    },
  }
}

export class YooKassaGateway implements PaymentGateway {
  readonly name = 'yookassa'

  constructor(
    private readonly shopId: string,
    private readonly secretKey: string,
    private readonly vatCode = DEFAULT_VAT_CODE,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async call(path: string, init: RequestInit = {}): Promise<ApiPayment> {
    const auth = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')
    const response = await this.fetchImpl(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', ...init.headers },
      signal: AbortSignal.timeout(15_000),
    })
    const body = (await response.json().catch(() => null)) as (ApiPayment & { description?: string }) | null
    if (!response.ok || !body) {
      throw new Error(`ЮKassa responded ${response.status}${body?.description ? `: ${body.description}` : ''}`)
    }
    return body
  }

  async createPayment(input: CreatePaymentInput): Promise<GatewayPayment> {
    const body = paymentBody(input, this.vatCode)
    return toGatewayPayment(
      await this.call('/payments', { method: 'POST', body: JSON.stringify(body), headers: { 'Idempotence-Key': input.idempotenceKey } }),
    )
  }

  async getPayment(id: string): Promise<GatewayPayment> {
    if (!/^[\w-]{10,64}$/.test(id)) throw new Error('Invalid payment id')
    return toGatewayPayment(await this.call(`/payments/${id}`))
  }
}
