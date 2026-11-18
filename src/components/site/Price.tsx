import { formatPrice } from '@/lib/format'

/** Price with an optional strike-through old price. "от" when variants cost differently. */
export function Price({
  price,
  oldPrice,
  from = false,
  className = '',
}: {
  price: number
  oldPrice?: number | null
  from?: boolean
  className?: string
}) {
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span>
        {from ? 'от ' : ''}
        {formatPrice(price)}
      </span>
      {oldPrice ? (
        <s className="text-primary/70">
          <span className="sr-only">Старая цена: </span>
          {formatPrice(oldPrice)}
        </s>
      ) : null}
    </span>
  )
}
