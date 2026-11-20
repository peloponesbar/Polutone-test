import { timingSafeEqual } from 'node:crypto'

import type { Endpoint } from 'payload'

import { handleShipmentNotice } from '@/lib/delivery/ship'

import { expireUnpaidOrders, handlePaymentNotice } from './flow'

const json = (body: unknown, status = 200) => Response.json(body, { status })

/** Payment id from ЮKassa's notice body, or null. Nothing else in the body is trusted. */
export function noticePaymentId(body: unknown): string | null {
  const object = (body as { object?: { id?: unknown } } | null)?.object
  const id = object?.id
  return typeof id === 'string' && /^[\w-]{10,64}$/.test(id) ? id : null
}

/** Shipment id from СДЭК's ORDER_STATUS notice, or null. */
export function noticeShipmentId(body: unknown): string | null {
  const uuid = (body as { uuid?: unknown } | null)?.uuid
  return typeof uuid === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid) ? uuid : null
}

export function cronAuthorized(header: string | null, secret: string | undefined): boolean {
  const expected = secret?.trim()
  if (!expected || !header) return false
  const a = Buffer.from(header)
  const b = Buffer.from(`Bearer ${expected}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const paymentEndpoints: Endpoint[] = [
  {
    // ЮKassa → «HTTP-уведомления»: payment.succeeded, payment.canceled.
    path: '/payments/yookassa',
    method: 'post',
    handler: async (req) => {
      const body = await req.json?.().catch(() => null)
      const paymentId = noticePaymentId(body)
      if (!paymentId) return json({ ok: false }, 400)
      try {
        const outcome = await handlePaymentNotice(req.payload, paymentId)
        return json({ ok: true, outcome })
      } catch (error) {
        // Non-200 → ЮKassa repeats the notice later.
        req.payload.logger.error({ err: error, msg: 'Payment notice failed', paymentId })
        return json({ ok: false }, 500)
      }
    },
  },
  {
    // СДЭК → webhook ORDER_STATUS (subscribed with `npm run cdek -- webhook <url>`).
    path: '/delivery/cdek',
    method: 'post',
    handler: async (req) => {
      const body = await req.json?.().catch(() => null)
      const uuid = noticeShipmentId(body)
      if (!uuid) return json({ ok: false }, 400)
      try {
        return json({ ok: true, result: await handleShipmentNotice(req.payload, uuid) })
      } catch (error) {
        req.payload.logger.error({ err: error, msg: 'Shipment notice failed', uuid })
        return json({ ok: false }, 500)
      }
    },
  },
  {
    // Vercel Cron (or cron on the server) with «Authorization: Bearer CRON_SECRET».
    path: '/cron/expire-orders',
    method: 'get',
    handler: async (req) => {
      if (!cronAuthorized(req.headers.get('authorization'), process.env.CRON_SECRET)) return json({ ok: false }, 401)
      const result = await expireUnpaidOrders(req.payload)
      return json({ ok: true, ...result })
    },
  },
]
