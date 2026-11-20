import config from '@payload-config'
import type { Metadata } from 'next'
import { getPayload } from 'payload'

import { Breadcrumbs } from '@/components/site/Breadcrumbs'
import { CheckoutView } from '@/components/site/checkout/CheckoutView'
import { container } from '@/components/site/ui'
import { getCarrier } from '@/lib/delivery'
import { getDeliverySettings } from '@/lib/delivery/settings'
import { getGateway } from '@/lib/payments'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Оформление заказа', robots: { index: false } }

export default async function CheckoutPage() {
  const deliveryOn = getCarrier() !== null
  const { freeFrom } = deliveryOn ? await getDeliverySettings(await getPayload({ config })) : { freeFrom: null }
  return (
    <div className={`${container} pb-16 md:pb-24`}>
      <Breadcrumbs items={[{ href: '/', label: 'Главная' }, { href: '/cart', label: 'Корзина' }, { label: 'Оформление' }]} />
      <h1 className="pt-6 pb-10 font-display text-h1-m text-primary md:text-h1">Оформление заказа</h1>
      <CheckoutView
        paymentsOn={getGateway() !== null}
        deliveryOn={deliveryOn}
        // Public by design (it is sent to Yandex from the browser); limit it to the site's domains in Yandex's cabinet.
        mapsKey={process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY?.trim() || null}
        freeFrom={freeFrom}
      />
    </div>
  )
}
