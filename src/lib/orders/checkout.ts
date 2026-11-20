import {
  CHECKOUT_SERVICES,
  DELIVERY_SERVICES,
  type DeliveryMethod,
  type DeliveryService,
  methodsOf,
  PAYMENT_METHODS,
  type PaymentMethod,
} from './options'

/** Checkout form after validation: trimmed, normalized, safe to store. */
export type CheckoutData = {
  name: string
  phone: string
  email: string
  deliveryService: DeliveryService
  deliveryMethod: DeliveryMethod
  city: string
  /** Carrier's city code (СДЭК), when delivery is calculated on the site. */
  cityCode: number | null
  /** Pickup point code (СДЭК), for delivery to a point. */
  pickupPoint: string | null
  address: string
  paymentMethod: PaymentMethod
  comment: string
}

export type CheckoutField = Exclude<keyof CheckoutData, 'cityCode'> | 'consent'
export type CheckoutErrors = Partial<Record<CheckoutField, string>>

export type CheckoutValidation = { ok: true; data: CheckoutData } | { ok: false; errors: CheckoutErrors }

const text = (value: unknown) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '')
const multiline = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

/** Russian phone to +7XXXXXXXXXX; null if it isn't one. Accepts 8…, 7…, +7… and 10 bare digits. */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('9')) return `+7${digits}`
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) return `+7${digits.slice(1)}`
  return null
}

/** +79001234567 → "+7 900 123-45-67" for reading; other values unchanged. */
export function formatPhone(phone: string): string {
  const m = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(phone)
  return m ? `+7 ${m[1]} ${m[2]}-${m[3]}-${m[4]}` : phone
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Validates untrusted checkout input. Messages follow the brand voice: calm, specific.
 * `withCarrier`: delivery is calculated on the site — the city comes from the carrier's list
 * and a pickup point is chosen from it (its address is then filled in by the server).
 */
export function validateCheckout(input: Record<string, unknown>, { withCarrier = false } = {}): CheckoutValidation {
  const errors: CheckoutErrors = {}

  const name = text(input.name)
  if (name.length < 2 || name.length > 100) errors.name = 'Укажите, пожалуйста, имя.'

  const phone = normalizePhone(text(input.phone))
  if (!phone) errors.phone = 'Проверьте, пожалуйста, номер телефона: например, +7 900 123-45-67.'

  const email = text(input.email).toLowerCase()
  if (!EMAIL_PATTERN.test(email) || email.length > 200) errors.email = 'Проверьте, пожалуйста, адрес почты.'

  const deliveryService = DELIVERY_SERVICES.find((s) => s.value === input.deliveryService && CHECKOUT_SERVICES.includes(s.value))?.value
  if (!deliveryService) errors.deliveryService = 'Выберите, пожалуйста, службу доставки.'

  const deliveryMethod = deliveryService
    ? methodsOf(deliveryService).find((m) => m === input.deliveryMethod)
    : undefined
  if (deliveryService && !deliveryMethod) errors.deliveryMethod = 'Выберите, пожалуйста, способ доставки.'

  const city = text(input.city)
  if (city.length < 2 || city.length > 100) errors.city = 'Укажите, пожалуйста, город.'

  const cityCode = Number(input.cityCode)
  const validCityCode = Number.isInteger(cityCode) && cityCode > 0 ? cityCode : null
  if (withCarrier && !validCityCode && !errors.city) errors.city = 'Выберите, пожалуйста, город из подсказок.'

  const point = text(input.pickupPoint)
  const pickupPoint = /^[\w-]{1,40}$/.test(point) ? point : null
  const pointChosenOnSite = withCarrier && deliveryMethod === 'pickup'
  if (pointChosenOnSite && !pickupPoint) errors.pickupPoint = 'Выберите, пожалуйста, пункт выдачи.'

  const address = multiline(input.address)
  if (!pointChosenOnSite && (address.length < 5 || address.length > 300)) {
    errors.address =
      deliveryMethod === 'courier'
        ? 'Укажите, пожалуйста, улицу, дом и квартиру.'
        : 'Укажите, пожалуйста, адрес пункта выдачи или отделения.'
  }

  const paymentMethod = PAYMENT_METHODS.find((p) => p.value === input.paymentMethod)?.value
  if (!paymentMethod) errors.paymentMethod = 'Выберите, пожалуйста, способ оплаты.'

  const comment = multiline(input.comment)
  if (comment.length > 1000) errors.comment = 'Комментарий — не длиннее 1000 знаков.'

  if (input.consent !== true && input.consent !== 'on') {
    errors.consent = 'Без согласия на обработку данных мы не сможем доставить заказ.'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    data: {
      name,
      phone: phone!,
      email,
      deliveryService: deliveryService!,
      deliveryMethod: deliveryMethod!,
      city,
      cityCode: withCarrier ? validCityCode : null,
      pickupPoint: pointChosenOnSite ? pickupPoint : null,
      address,
      paymentMethod: paymentMethod!,
      comment,
    },
  }
}
