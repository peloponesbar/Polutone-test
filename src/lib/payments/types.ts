/** A payment as the site needs it, whatever the provider. Amounts in rubles. */
export type GatewayPayment = {
  id: string
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
  amount: number
  /** Where to send the buyer to pay; only while the payment is pending. */
  confirmationUrl: string | null
  /** Order page code the payment was created for. */
  orderToken: string | null
}

export type ReceiptItem = {
  description: string
  quantity: number
  /** Price of one unit, rubles. */
  price: number
  subject: 'commodity' | 'service'
}

export type CreatePaymentInput = {
  orderNumber: number
  orderToken: string
  amount: number
  description: string
  returnUrl: string
  email: string
  items: ReceiptItem[]
  /** Same key → same payment: a double click never creates two. */
  idempotenceKey: string
}

export interface PaymentGateway {
  readonly name: 'yookassa' | 'mock'
  createPayment(input: CreatePaymentInput): Promise<GatewayPayment>
  getPayment(id: string): Promise<GatewayPayment>
}
