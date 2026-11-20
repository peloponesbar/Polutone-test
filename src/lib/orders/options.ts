/**
 * Order choices shared by the checkout form, the server and the admin.
 * One source of truth for values and their Russian labels.
 */

export const ORDER_STATUSES = [
  { value: 'awaiting_payment', label: 'Ожидает оплаты' },
  { value: 'paid', label: 'Оплачен' },
  { value: 'assembling', label: 'Собирается' },
  { value: 'shipped', label: 'Передан в доставку' },
  { value: 'delivered', label: 'Доставлен' },
  { value: 'cancelled', label: 'Отменён' },
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]['value']

/** How long an unpaid order keeps its items; then it is cancelled and they go back on sale. */
export const PAYMENT_HOLD_MINUTES = 60

export const CANCEL_REASONS = [
  { value: 'unpaid', label: 'Не оплачен вовремя' },
  { value: 'shop', label: 'Отменён магазином' },
] as const

/** Until when an unpaid order keeps its items. */
export const paymentDeadline = (createdAt: string | Date) => new Date(new Date(createdAt).getTime() + PAYMENT_HOLD_MINUTES * 60_000)

/** «14:35» in Moscow time — the shop's time zone. */
export const moscowTime = (date: Date) =>
  new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }).format(date)

export type CancelReason =(typeof CANCEL_REASONS)[number]['value']

/** Statuses that still need the shop's attention. */
export const OPEN_STATUSES: OrderStatus[] = ['awaiting_payment', 'paid', 'assembling']

export const DELIVERY_SERVICES = [
  { value: 'cdek', label: 'СДЭК', methods: ['pickup', 'courier'] },
  { value: 'yandex', label: 'Яндекс Доставка', methods: ['pickup', 'courier'] },
  { value: 'post', label: 'Почта России', methods: ['pickup'] },
] as const

export type DeliveryService = (typeof DELIVERY_SERVICES)[number]['value']

/** Services offered at checkout now. Яндекс Доставка and Почта России come in phase 4. */
export const CHECKOUT_SERVICES: readonly DeliveryService[] = ['cdek']

export const DELIVERY_METHODS = [
  { value: 'pickup', label: 'В пункт выдачи' },
  { value: 'courier', label: 'Курьером' },
] as const

export type DeliveryMethod = (typeof DELIVERY_METHODS)[number]['value']

export const PAYMENT_METHODS = [{ value: 'online', label: 'Картой или СБП на сайте' }] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']

export const labelOf = <T extends { value: string; label: string }>(options: readonly T[], value: string | null | undefined) =>
  options.find((o) => o.value === value)?.label ?? value ?? ''

/** Delivery methods a service offers (Почта России: to the post office only). */
export function methodsOf(service: DeliveryService): readonly DeliveryMethod[] {
  return DELIVERY_SERVICES.find((s) => s.value === service)?.methods ?? []
}
