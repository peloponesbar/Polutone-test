const rubles = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

/** 18900 → "18 900 ₽" (non-breaking spaces, so the price never wraps). */
export function formatPrice(value: number): string {
  return `${rubles.format(value)} ₽`.replace(/\s/g, ' ')
}
