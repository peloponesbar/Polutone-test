// Letters to the buyer about their order. Plain HTML with inline styles (mail clients ignore
// stylesheets and often block images, so the logo is text). Brand colors from DESIGN_SYSTEM.md.
import type { Payload } from 'payload'

import { trackingUrl } from '@/lib/delivery/rules'
import { formatPrice } from '@/lib/format'
import { DELIVERY_METHODS, DELIVERY_SERVICES, labelOf, moscowTime, paymentDeadline } from '@/lib/orders/options'
import { getGateway } from '@/lib/payments'
import { orderUrl } from '@/lib/site-url'
import type { Order } from '@/payload-types'

export type OrderMailKind = 'placed' | 'paid' | 'shipped'

export type MailOrder = Pick<
  Order,
  | 'number'
  | 'token'
  | 'createdAt'
  | 'customerName'
  | 'email'
  | 'items'
  | 'itemsTotal'
  | 'deliveryCost'
  | 'total'
  | 'deliveryService'
  | 'deliveryMethod'
  | 'city'
  | 'address'
  | 'trackNumber'
  | 'deliveryDays'
>

const C = { milk: '#f2efe9', graphite: '#282a29', stone: '#c8c2b9', muted: '#5f605d' }
const FONT = "'Onest', 'Helvetica Neue', Arial, sans-serif"

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function intro(order: MailOrder, kind: OrderMailKind, payOnline: boolean): string[] {
  if (kind === 'shipped') {
    return [
      `Заказ передан в СДЭК${order.deliveryDays ? `, ориентировочный срок — ${order.deliveryDays}` : ''}.`,
      order.trackNumber
        ? `Трек-номер: ${order.trackNumber}. По нему посылку можно отследить на сайте СДЭК; когда она придёт, СДЭК пришлёт уведомление.`
        : 'Трек-номер появится на странице заказа, как только СДЭК его присвоит.',
    ]
  }
  if (kind === 'paid') {
    return [
      'Оплата получена. Мы соберём заказ и напишем, когда передадим его в доставку.',
      'Чек об оплате придёт отдельным письмом от ЮKassa.',
    ]
  }
  if (payOnline) {
    return [
      'Мы получили заказ и отложили для вас вещи.',
      `Оплатить его можно на странице заказа до ${moscowTime(paymentDeadline(order.createdAt))} по Москве. Потом заказ отменится, а вещи вернутся в продажу.`,
    ]
  }
  return ['Мы получили заказ и отложили для вас вещи. Свяжемся с вами, чтобы подтвердить заказ и оплату.']
}

/** Subject, HTML and plain text of a letter. Pure: no sending, easy to test and preview. */
export function orderMail(order: MailOrder, kind: OrderMailKind, { payOnline = true, link = orderUrl(order.token) } = {}) {
  const subject = {
    placed: `Заказ № ${order.number} принят — POLUTONE`,
    paid: `Заказ № ${order.number} оплачен — POLUTONE`,
    shipped: `Заказ № ${order.number} передан в доставку — POLUTONE`,
  }[kind]
  const heading = { placed: 'Спасибо, заказ принят.', paid: 'Заказ оплачен.', shipped: 'Заказ в пути.' }[kind]
  const paragraphs = intro(order, kind, payOnline)
  const button = kind === 'placed' && payOnline ? 'Перейти к оплате' : kind === 'shipped' && order.trackNumber ? 'Отследить посылку' : 'Открыть заказ'
  const href = kind === 'shipped' && order.trackNumber ? trackingUrl(order.trackNumber) : link
  const delivery = `${labelOf(DELIVERY_SERVICES, order.deliveryService)}, ${labelOf(DELIVERY_METHODS, order.deliveryMethod).toLowerCase()}: ${order.city}, ${order.address}`
  const deliveryCost = order.deliveryCost != null ? formatPrice(order.deliveryCost) : 'сообщим отдельно'
  const itemLine = (i: MailOrder['items'][number]) => `${[i.title, i.color, i.size].filter(Boolean).join(', ')} — ${i.qty} × ${formatPrice(i.price)}`

  const text = [
    `${order.customerName}, здравствуйте.`,
    '',
    `${heading} Заказ № ${order.number}.`,
    ...paragraphs,
    '',
    ...order.items.map((i) => `• ${itemLine(i)}`),
    `Товары: ${formatPrice(order.itemsTotal)}`,
    `Доставка: ${deliveryCost}`,
    `Итого: ${formatPrice(order.total)}`,
    '',
    `Доставка: ${delivery}`,
    '',
    `${button}: ${href}`,
    '',
    'POLUTONE',
  ].join('\n')

  const e = escapeHtml
  const p = (s: string) => `<p style="margin:0 0 12px;font:16px/1.6 ${FONT};color:${C.graphite}">${e(s)}</p>`
  const row = (left: string, right: string, strong = false) =>
    `<tr><td style="padding:8px 0;font:${strong ? 600 : 400} 15px/1.5 ${FONT};color:${C.graphite}">${e(left)}</td><td align="right" style="padding:8px 0;font:${strong ? 600 : 400} 15px/1.5 ${FONT};color:${C.graphite};white-space:nowrap">${e(right)}</td></tr>`
  const items = order.items
    .map(
      (i) =>
        `<tr><td style="padding:10px 0;border-top:1px solid ${C.stone};font:15px/1.5 ${FONT};color:${C.graphite}">${e(i.title)}<br><span style="color:${C.muted}">${e([i.color, i.size].filter(Boolean).join(' · '))} · ${i.qty} × ${e(formatPrice(i.price))}</span></td><td align="right" valign="top" style="padding:10px 0;border-top:1px solid ${C.stone};font:15px/1.5 ${FONT};color:${C.graphite};white-space:nowrap">${e(formatPrice(i.lineTotal))}</td></tr>`,
    )
    .join('')

  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${e(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.milk}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.milk}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding-bottom:32px;font:400 22px/1 ${FONT};letter-spacing:0.18em;color:${C.graphite}">POLUTONE</td></tr>
<tr><td style="padding-bottom:8px;font:500 12px/1.4 ${FONT};letter-spacing:0.08em;text-transform:uppercase;color:${C.muted}">Заказ № ${order.number}</td></tr>
<tr><td style="padding-bottom:20px;font:400 28px/1.25 ${FONT};color:${C.graphite}">${e(heading)}</td></tr>
<tr><td>${p(`${order.customerName}, здравствуйте.`)}${paragraphs.map(p).join('')}</td></tr>
<tr><td style="padding:12px 0 28px"><a href="${e(href)}" style="display:inline-block;padding:14px 24px;background:${C.graphite};color:${C.milk};font:500 14px/1 ${FONT};letter-spacing:0.04em;text-decoration:none">${e(button)}</a></td></tr>
<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table></td></tr>
<tr><td style="border-top:1px solid ${C.stone};padding-top:8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${row('Товары', formatPrice(order.itemsTotal))}${row('Доставка', deliveryCost)}${row('Итого', formatPrice(order.total), true)}</table></td></tr>
<tr><td style="padding-top:24px;font:15px/1.6 ${FONT};color:${C.graphite}"><span style="font:500 12px/1.4 ${FONT};letter-spacing:0.08em;text-transform:uppercase;color:${C.muted}">Доставка</span><br>${e(delivery)}</td></tr>
<tr><td style="padding-top:40px;font:13px/1.6 ${FONT};color:${C.muted}">Письмо отправлено, потому что вы оформили заказ на сайте POLUTONE. Отвечать на него не нужно — контакты для связи есть на странице заказа.</td></tr>
</table></td></tr></table></body></html>`

  return { subject, html, text }
}

/**
 * Sends a letter about the order. Without a mail service (no SMTP in .env) Payload writes it
 * to the server log instead — orders never depend on mail.
 */
export async function sendOrderMail(payload: Payload, order: MailOrder, kind: OrderMailKind) {
  const { subject, html, text } = orderMail(order, kind, { payOnline: getGateway() !== null })
  await payload.sendEmail({ to: order.email, subject, html, text })
}
