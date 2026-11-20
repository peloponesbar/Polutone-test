'use client'

import { Button, toast, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const MESSAGES: Record<string, string> = {
  created: 'Заказ передан в СДЭК. Трек-номер появится через минуту.',
  skipped: 'Заказ уже передан в СДЭК или ещё не оплачен.',
  failed: 'СДЭК не принял заказ. Причина — в сообщении в Telegram и в журнале сервера.',
}

/** «Передать в СДЭК» for a paid order that has no shipment yet (e.g. СДЭК was down at payment). */
export function ShipButton() {
  const { id } = useDocumentInfo()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const status = useFormFields(([fields]) => fields.status?.value)
  const shipmentId = useFormFields(([fields]) => fields.shipmentId?.value)
  const service = useFormFields(([fields]) => fields.deliveryService?.value)
  const tariff = useFormFields(([fields]) => fields.tariffCode?.value)

  if (!id || shipmentId || service !== 'cdek' || !tariff || (status !== 'paid' && status !== 'assembling')) return null

  async function ship() {
    setBusy(true)
    try {
      const response = await fetch(`/api/orders/${id}/ship`, { method: 'POST', credentials: 'include' })
      const body = (await response.json().catch(() => ({}))) as { result?: string }
      const message = MESSAGES[body.result ?? ''] ?? 'Не удалось связаться с сервером. Попробуйте ещё раз.'
      if (body.result === 'created') toast.success(message)
      else toast.error(message)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <Button buttonStyle="secondary" size="medium" onClick={ship} disabled={busy}>
        {busy ? 'Передаём…' : 'Передать в СДЭК'}
      </Button>
    </div>
  )
}
