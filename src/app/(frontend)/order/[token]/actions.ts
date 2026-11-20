'use server'

import config from '@payload-config'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { startPayment } from '@/lib/payments/flow'

/** «Оплатить» on the order page: to ЮKassa, or back to the page with the reason. */
export async function payOrder(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  if (!/^[\w-]{20,64}$/.test(token)) redirect('/')
  const payload = await getPayload({ config })
  const result = await startPayment(payload, token)
  if (result.kind === 'redirect') redirect(result.url)
  redirect(`/order/${token}${result.kind === 'error' ? '?pay=error' : ''}`)
}
