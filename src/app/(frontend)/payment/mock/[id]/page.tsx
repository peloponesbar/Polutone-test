import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { buttonPrimary, buttonSecondary, container, label } from '@/components/site/ui'
import { formatPrice } from '@/lib/format'
import { getMockGateway } from '@/lib/payments'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Тестовая оплата', robots: { index: false } }

type Props = { params: Promise<{ id: string }> }

/** Local stand-in for ЮKassa's payment page: exists only in development without ЮKassa keys. */
export default async function MockPaymentPage({ params }: Props) {
  const gateway = getMockGateway()
  if (!gateway) notFound()
  const { id } = await params
  const payment = await gateway.getPayment(id).catch(() => null)
  if (!payment) notFound()

  async function finish(formData: FormData) {
    'use server'
    const outcome = formData.get('outcome') === 'succeeded' ? 'succeeded' : 'canceled'
    const back = getMockGateway()?.finish(id, outcome)
    redirect(back ?? '/')
  }

  return (
    <div className={`${container} flex flex-col gap-6 py-16 md:max-w-[640px]`}>
      <p className={`${label} text-primary/70`}>Тестовая оплата · без ЮKassa</p>
      <h1 className="font-display text-h1-m text-primary md:text-h1">{formatPrice(payment.amount)}</h1>
      <p className="font-sans text-body-m tracking-body text-primary/80 md:text-body">
        Эта страница заменяет ЮKassa на компьютере разработчика, пока в .env нет ключей магазина. Деньги не списываются.
      </p>
      {payment.status === 'pending' ? (
        <form action={finish} className="flex flex-col gap-3 md:flex-row">
          <button type="submit" name="outcome" value="succeeded" className={buttonPrimary}>
            Оплатить
          </button>
          <button type="submit" name="outcome" value="canceled" className={buttonSecondary}>
            Отказаться от оплаты
          </button>
        </form>
      ) : (
        <p className="font-sans text-body-m tracking-body text-primary">Платёж уже завершён: {payment.status}.</p>
      )}
    </div>
  )
}
