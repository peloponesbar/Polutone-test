import config from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { productHref } from '@/components/site/cart/format'
import { ContactRows } from '@/components/site/ContactList'
import { getSiteSettings } from '@/lib/settings'
import { buttonPrimary, buttonSecondary, container, label, textLink } from '@/components/site/ui'
import { formatPrice } from '@/lib/format'
import { formatPhone } from '@/lib/orders/checkout'
import { DELIVERY_METHODS, DELIVERY_SERVICES, labelOf, ORDER_STATUSES, paymentDeadline } from '@/lib/orders/options'
import { orderPageState } from '@/lib/orders/page-state'
import { getGateway } from '@/lib/payments'
import { expireUnpaidOrders, syncOrderPayment } from '@/lib/payments/flow'
import { trackingUrl } from '@/lib/delivery/rules'
import { syncShipment } from '@/lib/delivery/ship'

import { payOrder } from './actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Заказ', robots: { index: false } }

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ pay?: string }> }

/** The buyer's order page. Opened by its random code only: numbers are guessable, codes are not. */
async function getOrder(token: string) {
  if (!/^[\w-]{20,64}$/.test(token)) return null
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'orders',
    where: { token: { equals: token } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  return result.docs[0] ?? null
}

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' })

/**
 * The buyer coming back from ЮKassa lands here: read the payment's state from ЮKassa (the
 * webhook may be late or, locally, never arrive) and close the order if its time ran out.
 */
async function refreshPayment(token: string) {
  const order = await getOrder(token)
  if (!order) return
  const payload = await getPayload({ config })
  if (order.status === 'awaiting_payment') {
    const { order: synced } = await syncOrderPayment(payload, { ...order, items: order.items.map((i) => ({ ...i, product: typeof i.product === 'object' ? (i.product?.id ?? null) : i.product })) })
    if (synced.status === 'awaiting_payment' && new Date() >= paymentDeadline(synced.createdAt)) await expireUnpaidOrders(payload)
  } else if (order.shipmentId && order.status !== 'delivered' && order.status !== 'cancelled') {
    // Track number and the parcel's progress, in case a СДЭК notice was missed.
    await syncShipment(payload, order.id)
  }
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { token } = await params
  await refreshPayment(token).catch((error) => console.error('Order page payment check failed', error))
  const [order, settings] = await Promise.all([getOrder(token), getSiteSettings()])
  if (!order) notFound()
  const payError = (await searchParams).pay === 'error'
  const state = orderPageState(order, { paymentsOn: getGateway() !== null })

  const row = 'flex flex-col gap-1 border-b border-primary/10 py-4 md:flex-row md:gap-6'
  const term = `${label} text-primary/70 md:w-48 md:shrink-0`

  return (
    <div className={`${container} pb-16 md:pb-24`}>
      <div className="grid grid-cols-1 gap-10 pt-10 md:grid-cols-12 md:gap-x-6 md:pt-16">
        <div className="flex flex-col gap-6 md:col-span-7">
          <p className={`${label} text-primary/70`}>Заказ № {order.number}</p>
          <h1 className="font-display text-h1-m text-primary md:text-h1">{state.heading}</h1>
          <p className="max-w-[60ch] font-sans text-body-m tracking-body text-primary/80 md:text-body">{state.text}</p>
          {payError && state.canPay ? (
            <p role="alert" className="max-w-[60ch] border-l-2 border-accent pl-4 font-sans text-body-m tracking-body text-primary">
              Не удалось перейти к оплате. Попробуйте, пожалуйста, ещё раз через минуту — заказ сохранён.
            </p>
          ) : null}
          {state.canPay ? (
            <form action={payOrder}>
              <input type="hidden" name="token" value={order.token} />
              <button type="submit" className={`${buttonPrimary} w-full md:w-auto`}>
                Оплатить · {formatPrice(order.total)}
              </button>
            </form>
          ) : null}
          <p className="font-sans text-caption tracking-body text-primary/80">
            Сохраните ссылку на эту страницу — по ней можно вернуться к заказу.
          </p>

          <dl className="border-t border-primary/10 font-sans text-body-m tracking-body text-primary">
            <div className={row}>
              <dt className={term}>Статус</dt>
              <dd>{labelOf(ORDER_STATUSES, order.status)}</dd>
            </div>
            <div className={row}>
              <dt className={term}>Оформлен</dt>
              <dd>{dateFormat.format(new Date(order.createdAt))}</dd>
            </div>
            <div className={row}>
              <dt className={term}>Получатель</dt>
              <dd>
                {order.customerName}, {formatPhone(order.phone)}, {order.email}
              </dd>
            </div>
            <div className={row}>
              <dt className={term}>Доставка</dt>
              <dd>
                {labelOf(DELIVERY_SERVICES, order.deliveryService)}, {labelOf(DELIVERY_METHODS, order.deliveryMethod).toLowerCase()}
                <span className="block text-primary/80">
                  {order.city}, {order.address}
                </span>
                {order.deliveryDays ? <span className="block text-primary/80">Срок — {order.deliveryDays}</span> : null}
              </dd>
            </div>
            {order.trackNumber ? (
              <div className={row}>
                <dt className={term}>Трек-номер</dt>
                <dd>
                  <a href={trackingUrl(order.trackNumber)} target="_blank" rel="noopener noreferrer" className={textLink}>
                    {order.trackNumber}
                  </a>
                </dd>
              </div>
            ) : null}
            {order.comment ? (
              <div className={row}>
                <dt className={term}>Комментарий</dt>
                <dd className="whitespace-pre-line">{order.comment}</dd>
              </div>
            ) : null}
          </dl>

          {settings.contacts.length > 0 ? (
            <section aria-labelledby="order-help" className="flex flex-col gap-4">
              <h2 id="order-help" className={`${label} text-primary`}>
                Вопросы по заказу
              </h2>
              <p className="font-sans text-caption tracking-body text-primary/80">Назовите номер заказа — № {order.number}.</p>
              <ContactRows contacts={settings.contacts} hours={settings.hours} />
            </section>
          ) : null}

          <Link href="/catalog" className={`${buttonSecondary} self-start`}>
            Вернуться в каталог
          </Link>
        </div>

        <aside aria-label="Состав заказа" className="flex flex-col gap-4 bg-surface/40 p-6 md:col-span-4 md:col-start-9">
          <h2 className={`${label} text-primary`}>Состав заказа</h2>
          <ul className="flex flex-col gap-3 border-t border-primary/10 pt-4">
            {order.items.map((item) => {
              const slug = typeof item.product === 'object' ? item.product?.slug : null
              return (
                <li key={item.id ?? item.variantId} className="flex justify-between gap-4 font-sans text-caption tracking-body text-primary">
                  <span>
                    {slug ? (
                      <Link href={productHref({ slug, color: item.color ?? '' })} className={textLink}>
                        {item.title}
                      </Link>
                    ) : (
                      item.title
                    )}
                    <span className="block text-primary/70">
                      {[item.color, item.size].filter(Boolean).join(' · ')} · {item.qty} × {formatPrice(item.price)}
                    </span>
                  </span>
                  <span className="whitespace-nowrap">{formatPrice(item.lineTotal)}</span>
                </li>
              )
            })}
          </ul>
          <dl className="flex flex-col gap-2 border-t border-primary/10 pt-4 font-sans text-body-m tracking-body text-primary">
            <div className="flex justify-between gap-4">
              <dt>Товары</dt>
              <dd>{formatPrice(order.itemsTotal)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-primary/80">
              <dt>Доставка</dt>
              <dd>{order.deliveryCost == null ? 'сообщим отдельно' : order.deliveryCost === 0 ? 'бесплатно' : formatPrice(order.deliveryCost)}</dd>
            </div>
            <div className="flex justify-between gap-4 pt-2 md:text-body">
              <dt>Итого</dt>
              <dd>{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}
