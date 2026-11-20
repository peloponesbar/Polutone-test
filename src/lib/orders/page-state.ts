import type { Order } from '@/payload-types'

import { labelOf, moscowTime, ORDER_STATUSES, PAYMENT_HOLD_MINUTES, paymentDeadline } from './options'

export type OrderPageState = {
  heading: string
  text: string
  /** Show «Оплатить». */
  canPay: boolean
}

/** What the buyer's order page says, by status. Pure, so every case is unit-tested. */
export function orderPageState(
  order: Pick<Order, 'status' | 'createdAt' | 'paidAt' | 'cancelReason'>,
  { paymentsOn, now = new Date() }: { paymentsOn: boolean; now?: Date },
): OrderPageState {
  if (order.status === 'awaiting_payment') {
    const deadline = paymentDeadline(order.createdAt)
    if (!paymentsOn) {
      return {
        heading: 'Спасибо, заказ принят.',
        text: 'Мы сохранили заказ и отложили для вас вещи. Оплата на сайте подключается: мы свяжемся с вами, чтобы подтвердить заказ и стоимость доставки.',
        canPay: false,
      }
    }
    if (now < deadline) {
      return {
        heading: 'Заказ ждёт оплаты.',
        text: `Вещи отложены за вами до ${moscowTime(deadline)} по Москве. Если не оплатить заказ за ${PAYMENT_HOLD_MINUTES} минут, он отменится, а вещи вернутся в продажу.`,
        canPay: true,
      }
    }
    return { heading: 'Время на оплату вышло.', text: 'Заказ отменяется, вещи возвращаются в продажу.', canPay: false }
  }
  if (order.status === 'cancelled') {
    return {
      heading: 'Заказ отменён.',
      text:
        order.cancelReason === 'unpaid'
          ? order.paidAt
            ? 'Оплата пришла после отмены заказа. Мы вернём деньги — или свяжемся с вами, если вещи ещё есть в наличии.'
            : `Оплата не поступила за ${PAYMENT_HOLD_MINUTES} минут, и вещи вернулись в продажу. Если они ещё нужны, оформите заказ заново.`
          : 'Если это ошибка, напишите нам — контакты ниже.',
      canPay: false,
    }
  }
  if (order.status === 'paid') {
    return {
      heading: 'Спасибо, заказ оплачен.',
      text: 'Мы соберём заказ и напишем, когда передадим его в доставку. Чек об оплате пришёл на почту.',
      canPay: false,
    }
  }
  if (order.status === 'shipped') {
    return {
      heading: 'Заказ в пути.',
      text: 'Посылка передана в доставку. Отследить её можно по трек-номеру ниже; когда она придёт, служба доставки пришлёт уведомление.',
      canPay: false,
    }
  }
  if (order.status === 'delivered') {
    return { heading: 'Заказ доставлен.', text: 'Спасибо, что выбрали POLUTONE. Если вещь не подошла, её можно вернуть в течение 7 дней.', canPay: false }
  }
  return { heading: 'Спасибо за заказ.', text: `Статус заказа: ${labelOf(ORDER_STATUSES, order.status).toLowerCase()}.`, canPay: false }
}
