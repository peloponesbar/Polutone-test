import Image from 'next/image'
import type { DefaultServerCellComponentProps } from 'payload'

import { formatPrice } from '@/lib/format'
import { labelOf, ORDER_STATUSES } from '@/lib/orders/options'
import type { Media } from '@/payload-types'

// List-view cells for the admin. Server components: Payload renders cells on the server.

type Upload = number | Media | null | undefined

/** First photo of an upload field (single or hasMany) as a small 4:5 thumbnail. */
export async function ThumbCell({ cellData, payload }: DefaultServerCellComponentProps) {
  const first: Upload = Array.isArray(cellData) ? cellData[0] : cellData
  let media: Media | null = null
  try {
    media =
      typeof first === 'number'
        ? await payload.findByID({ collection: 'media', id: first, depth: 0 })
        : (first ?? null)
  } catch (error) {
    payload.logger.warn({ err: error, msg: 'Admin thumbnail: media not found' })
  }

  const box = { width: 40, height: 50, position: 'relative', overflow: 'hidden' } as const
  if (!media?.url || !media.mimeType?.startsWith('image/')) {
    return <span aria-label="Нет фото" style={{ ...box, display: 'block', background: 'var(--theme-elevation-100)' }} />
  }
  return (
    <span style={{ ...box, display: 'block' }}>
      <Image src={media.url} alt={media.alt} fill sizes="40px" style={{ objectFit: 'cover' }} />
    </span>
  )
}

/** Price with the old (strike-through) price, as on the site. */
export function PriceCell({ cellData, rowData }: DefaultServerCellComponentProps) {
  if (typeof cellData !== 'number') return null
  const old = typeof rowData.oldPrice === 'number' && rowData.oldPrice > cellData ? rowData.oldPrice : null
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      {formatPrice(cellData)}
      {old && (
        <s style={{ marginLeft: 8, color: 'var(--theme-elevation-500)' }}>{formatPrice(old)}</s>
      )}
    </span>
  )
}

type FlagProps = DefaultServerCellComponentProps & { yes: string; no: string }

/** Yes/no field as a word pill instead of Payload's «правда / ложь». */
export function FlagCell({ cellData, yes, no }: FlagProps) {
  const on = cellData === true
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        fontSize: 12,
        lineHeight: '18px',
        whiteSpace: 'nowrap',
        border: '1px solid',
        borderColor: on ? 'var(--color-success-550)' : 'var(--theme-elevation-250)',
        background: on ? 'var(--color-success-250)' : 'transparent',
        color: on ? 'var(--theme-elevation-1000)' : 'var(--theme-elevation-600)',
      }}
    >
      {on ? yes : no}
    </span>
  )
}

/** Order status as a pill: waiting ones stand out in sage, closed ones recede. */
export function StatusCell({ cellData }: DefaultServerCellComponentProps) {
  const status = typeof cellData === 'string' ? cellData : ''
  const waiting = status === 'awaiting_payment' || status === 'paid' || status === 'assembling'
  const closed = status === 'cancelled' || status === 'delivered'
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        fontSize: 12,
        lineHeight: '18px',
        whiteSpace: 'nowrap',
        border: '1px solid',
        borderColor: waiting ? 'var(--color-success-550)' : 'var(--theme-elevation-250)',
        background: waiting ? 'var(--color-success-250)' : 'transparent',
        color: closed ? 'var(--theme-elevation-600)' : 'var(--theme-elevation-1000)',
      }}
    >
      {labelOf(ORDER_STATUSES, status)}
    </span>
  )
}
