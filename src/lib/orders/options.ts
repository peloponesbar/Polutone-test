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

/** Statuses that still need the shop's attention. */
export const OPEN_STATUSES: OrderStatus[] = ['awaiting_payment', 'paid', 'assembling']

export const DELIVERY_SERVICES = [
  { value: 'cdek', label: 'СДЭК', methods: ['pickup', 'courier'] },
  { value: 'yandex', label: 'Яндекс Доставка', methods: ['pickup', 'courier'] },
  { value: 'post', label: 'Почта России', methods: ['pickup'] },
] as const

export type DeliveryService = (typeof DELIVERY_SERVICES)[number]['value']

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
