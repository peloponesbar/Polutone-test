import type { UIFieldServerProps } from 'payload'

import { formatPrice } from '@/lib/format'
import { formatPhone } from '@/lib/orders/checkout'
import { DELIVERY_METHODS, DELIVERY_SERVICES, labelOf } from '@/lib/orders/options'
import type { Order } from '@/payload-types'

/** The order at a glance on its admin page: who, where, what, how much. Read-only. */
export function OrderSummary({ data }: UIFieldServerProps) {
  const order = data as Partial<Order>
  if (!order.items?.length) return null

  return (
    <section className="polutone-order" aria-label="Заказ кратко">
      <dl className="polutone-order__facts">
        <div>
          <dt>Покупатель</dt>
          <dd>
            {order.customerName}
            <br />
            <a href={`tel:${order.phone}`}>{formatPhone(order.phone ?? '')}</a> ·{' '}
            <a href={`mailto:${order.email}`}>{order.email}</a>
          </dd>
        </div>
        <div>
          <dt>Доставка</dt>
          <dd>
            {labelOf(DELIVERY_SERVICES, order.deliveryService)},{' '}
            {labelOf(DELIVERY_METHODS, order.deliveryMethod).toLowerCase()}
            <br />
            {order.city}, {order.address}
          </dd>
        </div>
        {order.comment ? (
          <div>
            <dt>Комментарий покупателя</dt>
            <dd>{order.comment}</dd>
          </div>
        ) : null}
      </dl>

      <div className="polutone-order__scroll">
        <table className="polutone-order__items">
          <thead>
            <tr>
              <th scope="col">Товар</th>
              <th scope="col">Цена</th>
              <th scope="col">Кол-во</th>
              <th scope="col">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={item.id ?? i}>
                <td>
                  {item.title}
                  <span className="polutone-order__muted">{[item.color, item.size].filter(Boolean).join(' · ')}</span>
                </td>
                <td>{formatPrice(item.price)}</td>
                <td>{item.qty}</td>
                <td>{formatPrice(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>
                Доставка
              </th>
              <td>{order.deliveryCost != null ? formatPrice(order.deliveryCost) : 'отдельно'}</td>
            </tr>
            <tr>
              <th scope="row" colSpan={3}>
                Итого
              </th>
              <td>{formatPrice(order.total ?? 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
