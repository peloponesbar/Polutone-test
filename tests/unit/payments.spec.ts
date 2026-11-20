import { describe, expect, it, vi } from 'vitest'

import { readSmtpSettings } from '@/lib/mail/adapter'
import { escapeHtml, type MailOrder, orderMail } from '@/lib/mail/orders'
import { orderPageState } from '@/lib/orders/page-state'
import { getGateway, receiptItems, receiptTotal } from '@/lib/payments'
import { cronAuthorized, noticePaymentId } from '@/lib/payments/endpoints'
import { MockGateway } from '@/lib/payments/mock'
import type { CreatePaymentInput } from '@/lib/payments/types'
import { paymentBody, toGatewayPayment, YooKassaGateway } from '@/lib/payments/yookassa'
import { isPasswordFree } from '@/lib/site-password'
import { siteUrl } from '@/lib/site-url'

const items = [
  { title: 'Худи H01', color: 'Графит', size: 'M', qty: 2, price: 7900, lineTotal: 15800, variantId: 'h01-m' },
  { title: 'Футболка T01', color: null, size: 'L', qty: 1, price: 3900, lineTotal: 3900, variantId: 't01-l' },
]

const input: CreatePaymentInput = {
  orderNumber: 1001,
  orderToken: 'tok_abcdefghijklmnopqrstuv',
  amount: 19700,
  description: 'Заказ № 1001 в POLUTONE',
  returnUrl: 'https://polutone.ru/order/tok_abcdefghijklmnopqrstuv',
  email: 'anna@example.ru',
  items: receiptItems({ items, deliveryCost: null }),
  idempotenceKey: 'tok_abcdefghijklmnopqrstuv-1',
}

describe('receipt', () => {
  it('has one line per item and sums to the order total', () => {
    expect(input.items.map((i) => i.description)).toEqual(['Худи H01, Графит, M', 'Футболка T01, L'])
    expect(receiptTotal(input.items)).toBe(19700)
  })
  it('adds delivery as a service when it is charged', () => {
    const withDelivery = receiptItems({ items, deliveryCost: 450 })
    expect(withDelivery.at(-1)).toEqual({ description: 'Доставка', quantity: 1, price: 450, subject: 'service' })
    expect(receiptTotal(withDelivery)).toBe(20150)
  })
})

describe('ЮKassa request', () => {
  it('builds a captured redirect payment with a 54-FZ receipt', () => {
    const body = paymentBody(input)
    expect(body).toMatchObject({
      amount: { value: '19700.00', currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: input.returnUrl },
      metadata: { orderToken: input.orderToken, orderNumber: '1001' },
      receipt: { customer: { email: 'anna@example.ru' } },
    })
    expect(body.receipt.items[0]).toEqual({
      description: 'Худи H01, Графит, M',
      quantity: '2.00',
      amount: { value: '7900.00', currency: 'RUB' },
      vat_code: 1,
      payment_mode: 'full_payment',
      payment_subject: 'commodity',
    })
  })

  it('reads payments back, with the payment link only while pending', () => {
    const api = { id: 'pay-1234567890', status: 'pending' as const, amount: { value: '19700.00', currency: 'RUB' }, confirmation: { confirmation_url: 'https://yoomoney.ru/x' }, metadata: { orderToken: 't' } }
    expect(toGatewayPayment(api)).toEqual({ id: 'pay-1234567890', status: 'pending', amount: 19700, confirmationUrl: 'https://yoomoney.ru/x', orderToken: 't' })
    expect(toGatewayPayment({ ...api, status: 'succeeded' }).confirmationUrl).toBeNull()
  })

  it('sends basic auth and the idempotence key, and reports API errors', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: 'pay-1234567890', status: 'pending', amount: { value: '19700.00', currency: 'RUB' }, confirmation: { confirmation_url: 'https://yoomoney.ru/x' } }))
      .mockResolvedValueOnce(Response.json({ description: 'Invalid credentials' }, { status: 401 }))
    const gateway = new YooKassaGateway('123456', 'test_secret', 1, fetchImpl)

    await gateway.createPayment(input)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.yookassa.ru/v3/payments')
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('123456:test_secret').toString('base64')}`)
    expect(init.headers['Idempotence-Key']).toBe('tok_abcdefghijklmnopqrstuv-1')

    await expect(gateway.getPayment('pay-1234567890')).rejects.toThrow('ЮKassa responded 401: Invalid credentials')
    await expect(gateway.getPayment('../../refunds')).rejects.toThrow('Invalid payment id')
  })
})

describe('choosing the payment service', () => {
  it('uses ЮKassa with keys, the stand-in in development, nothing in production', () => {
    expect(getGateway({ YOOKASSA_SHOP_ID: '1', YOOKASSA_SECRET_KEY: 's', NODE_ENV: 'production' })?.name).toBe('yookassa')
    expect(getGateway({ NODE_ENV: 'development' })?.name).toBe('mock')
    expect(getGateway({ NODE_ENV: 'production' })).toBeNull()
  })

  it('the stand-in never creates two payments for one key', async () => {
    const mock = new MockGateway()
    const a = await mock.createPayment({ ...input, idempotenceKey: 'same-key-for-mock' })
    const b = await mock.createPayment({ ...input, idempotenceKey: 'same-key-for-mock' })
    expect(a.id).toBe(b.id)
    expect(mock.finish(a.id, 'succeeded')).toBe(input.returnUrl)
    expect((await mock.getPayment(a.id)).status).toBe('succeeded')
  })
})

describe('webhook and scheduler', () => {
  it('takes only a well-formed payment id from the notice', () => {
    expect(noticePaymentId({ event: 'payment.succeeded', object: { id: '2e8f-abcd-1234', status: 'succeeded' } })).toBe('2e8f-abcd-1234')
    expect(noticePaymentId({ object: { id: '../../x' } })).toBeNull()
    expect(noticePaymentId(null)).toBeNull()
  })
  it('the expiry job needs the exact secret', () => {
    expect(cronAuthorized('Bearer s3cret', 's3cret')).toBe(true)
    expect(cronAuthorized('Bearer wrong', 's3cret')).toBe(false)
    expect(cronAuthorized('Bearer ', '')).toBe(false)
    expect(cronAuthorized(null, 's3cret')).toBe(false)
  })
  it('only the two machine paths skip the site password', () => {
    expect(isPasswordFree('/api/payments/yookassa')).toBe(true)
    expect(isPasswordFree('/api/cron/expire-orders/')).toBe(true)
    expect(isPasswordFree('/api/orders')).toBe(false)
    expect(isPasswordFree('/')).toBe(false)
  })
})

describe('order page text', () => {
  const placed = { status: 'awaiting_payment' as const, createdAt: '2026-11-20T09:00:00.000Z', paidAt: null, cancelReason: null }
  it('offers to pay until the deadline, in Moscow time', () => {
    const state = orderPageState(placed, { paymentsOn: true, now: new Date('2026-11-20T09:30:00.000Z') })
    expect(state).toMatchObject({ heading: 'Заказ ждёт оплаты.', canPay: true })
    expect(state.text).toContain('до 13:00 по Москве')
  })
  it('stops offering after the deadline or without payments', () => {
    expect(orderPageState(placed, { paymentsOn: true, now: new Date('2026-11-20T10:00:00.000Z') }).canPay).toBe(false)
    expect(orderPageState(placed, { paymentsOn: false }).canPay).toBe(false)
  })
  it('explains paid and cancelled orders', () => {
    expect(orderPageState({ ...placed, status: 'paid' }, { paymentsOn: true }).heading).toBe('Спасибо, заказ оплачен.')
    expect(orderPageState({ ...placed, status: 'cancelled', cancelReason: 'unpaid' }, { paymentsOn: true }).text).toContain('Оплата не поступила')
    expect(orderPageState({ ...placed, status: 'cancelled', cancelReason: 'unpaid', paidAt: '2026-11-20T10:10:00.000Z' }, { paymentsOn: true }).text).toContain('вернём деньги')
  })
})

describe('order letters', () => {
  const order: MailOrder = {
    number: 1001,
    token: 'tok_abcdefghijklmnopqrstuv',
    createdAt: '2026-11-20T09:00:00.000Z',
    customerName: 'Анна <b>',
    email: 'anna@example.ru',
    items,
    itemsTotal: 19700,
    deliveryCost: null,
    total: 19700,
    deliveryService: 'cdek',
    deliveryMethod: 'pickup',
    city: 'Казань',
    address: 'ул. Баумана, 1',
  }
  it('says what happened, with the order link and the payment deadline', () => {
    const mail = orderMail(order, 'placed', { link: 'https://polutone.ru/order/x' })
    expect(mail.subject).toBe('Заказ № 1001 принят — POLUTONE')
    expect(mail.text).toContain('до 13:00 по Москве')
    expect(mail.text).toContain('Перейти к оплате: https://polutone.ru/order/x')
    expect(mail.html).toContain('href="https://polutone.ru/order/x"')
    expect(orderMail(order, 'paid').subject).toBe('Заказ № 1001 оплачен — POLUTONE')
  })
  it('escapes what the buyer typed and has no exclamation marks', () => {
    const { html, text } = orderMail(order, 'placed')
    expect(html).toContain('Анна &lt;b&gt;')
    expect(html).not.toContain('Анна <b>')
    expect(text + html.replace('<!doctype html>', '')).not.toContain('!')
    expect(escapeHtml(`"'&`)).toBe('&quot;&#39;&amp;')
  })
})

describe('settings from the environment', () => {
  it('turns on SMTP only when host, user, password and sender are all set', () => {
    expect(readSmtpSettings({ SMTP_HOST: 'smtp.example.ru', SMTP_USER: 'u', SMTP_PASS: 'p' })).toBeNull()
    expect(readSmtpSettings({ SMTP_HOST: 'smtp.example.ru', SMTP_USER: 'u', SMTP_PASS: 'p', MAIL_FROM: 'shop@polutone.ru', SMTP_PORT: '587' })).toMatchObject({
      port: 587,
      fromName: 'POLUTONE',
    })
  })
  it('builds the site address for links in letters and ЮKassa', () => {
    expect(siteUrl({ SITE_URL: 'https://polutone.ru/' })).toBe('https://polutone.ru')
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'polutone-test.vercel.app' })).toBe('https://polutone-test.vercel.app')
    expect(siteUrl({})).toBe('http://localhost:3000')
  })
})
