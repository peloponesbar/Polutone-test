import type { Metadata } from 'next'

import { Breadcrumbs } from '@/components/site/Breadcrumbs'
import { CartView } from '@/components/site/cart/CartView'
import { container } from '@/components/site/ui'

export const metadata: Metadata = { title: 'Корзина', robots: { index: false } }

export default function CartPage() {
  return (
    <div className={`${container} pb-16 md:pb-24`}>
      <Breadcrumbs items={[{ href: '/', label: 'Главная' }, { label: 'Корзина' }]} />
      <h1 className="pt-6 pb-10 font-display text-h1-m text-primary md:text-h1">Корзина</h1>
      <CartView />
    </div>
  )
}
