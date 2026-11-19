import type { Metadata } from 'next'

import { Breadcrumbs } from '@/components/site/Breadcrumbs'
import { CheckoutView } from '@/components/site/checkout/CheckoutView'
import { container } from '@/components/site/ui'

export const metadata: Metadata = { title: 'Оформление заказа — POLUTONE', robots: { index: false } }

export default function CheckoutPage() {
  return (
    <div className={`${container} pb-16 md:pb-24`}>
      <Breadcrumbs items={[{ href: '/', label: 'Главная' }, { href: '/cart', label: 'Корзина' }, { label: 'Оформление' }]} />
      <h1 className="pt-6 pb-10 font-display text-h1-m text-primary md:text-h1">Оформление заказа</h1>
      <CheckoutView />
    </div>
  )
}
