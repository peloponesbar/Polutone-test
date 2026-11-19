import config from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { productHref } from '@/components/site/cart/format'
import { buttonSecondary, container, label, textLink } from '@/components/site/ui'
import { formatPrice } from '@/lib/format'
import { formatPhone } from '@/lib/orders/checkout'
import { DELIVERY_METHODS, DELIVERY_SERVICES, labelOf, ORDER_STATUSES } from '@/lib/orders/options'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Заказ — POLUTONE', robots: { index: false } }

type Props = { params: Promise<{ token: string }> }

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

export default async function OrderPage({ params }: Props) {
  const order = await getOrder((await params).token)
  if (!order) notFound()

  const row = 'flex flex-col gap-1 border-b border-primary/10 py-4 md:flex-row md:gap-6'
  const term = `${label} text-primary/70 md:w-48 md:shrink-0`

  return (
    <div className={`${container} pb-16 md:pb-24`}>
      <div className="grid grid-cols-1 gap-10 pt-10 md:grid-cols-12 md:gap-x-6 md:pt-16">
        <div className="flex flex-col gap-6 md:col-span-7">
          <p className={`${label} text-primary/70`}>Заказ № {order.number}</p>
          <h1 className="font-display text-h1-m text-primary md:text-h1">Спасибо, заказ принят.</h1>
          <p className="max-w-[60ch] font-sans text-body-m tracking-body text-primary/80 md:text-body">
            {order.status === 'awaiting_payment'
              ? 'Мы сохранили заказ и отложили для вас вещи. Оплата на сайте подключается: мы свяжемся с вами, чтобы подтвердить заказ и стоимость доставки.'
              : `Статус заказа: ${labelOf(ORDER_STATUSES, order.status).toLowerCase()}.`}
          </p>
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
              </dd>
            </div>
            {order.comment ? (
              <div className={row}>
                <dt className={term}>Комментарий</dt>
                <dd className="whitespace-pre-line">{order.comment}</dd>
              </div>
            ) : null}
          </dl>

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
              <dd>{order.deliveryCost != null ? formatPrice(order.deliveryCost) : 'сообщим отдельно'}</dd>
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
