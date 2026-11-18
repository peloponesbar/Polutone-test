'use client'

import { Button } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Report = { created: number; updated: number; hidden: number; error?: string }

/** "Синхронизировать" above the products list: pulls the catalog from the source. */
export function SyncButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function sync() {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch('/api/products/sync', { method: 'POST', credentials: 'include' })
      const report = (await response.json()) as Report
      if (!response.ok) throw new Error(report.error ?? `Ошибка ${response.status}`)
      setMessage(
        `Готово: новых — ${report.created}, обновлено — ${report.updated}, скрыто — ${report.hidden}.`,
      )
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Синхронизация не удалась.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
      <Button buttonStyle="secondary" disabled={busy} onClick={sync} margin={false}>
        {busy ? 'Синхронизация…' : 'Синхронизировать с МойСкладом'}
      </Button>
      <span role="status">{message}</span>
    </div>
  )
}
