'use client'

import Link from 'next/link'

import { Price } from '@/components/site/Price'
import { buttonPrimary, buttonSecondary, focusRing, label, textLink } from '@/components/site/ui'
import { MAX_QTY, type PricedLine } from '@/lib/cart/cart'
import { cart } from '@/lib/cart/store'
import { formatPrice } from '@/lib/format'

import { itemsLabel, productHref } from './format'
import { LineThumb } from './LineThumb'
import { useCartQuote } from './useCartQuote'


/** Cart contents priced by the server; quantities are edited in the browser store. */
export function CartView() {
  const { hydrated, lines, result, loading, removedNote, reduced } = useCartQuote()

  if (!hydrated) return <p className="py-16 font-sans text-body-m tracking-body text-primary/70">Загружаем корзину…</p>

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-6 border-t border-primary/10 py-16">
        {removedNote ? <RemovedNote /> : null}
        <p className="font-sans text-body-m tracking-body text-primary/80 md:text-body">В корзине пока ничего нет.</p>
        <Link href="/catalog" className={buttonSecondary}>
          Перейти в каталог
        </Link>
      </div>
    )
  }

  if (!result) return <p className="py-16 font-sans text-body-m tracking-body text-primary/70">Загружаем корзину…</p>
  if (!result.ok) return <p role="alert" className="py-16 font-sans text-body-m tracking-body text-primary">{result.error}</p>

  const { lines: priced, count, total } = result.cart

  return (
    <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-12 md:gap-x-6" aria-busy={loading}>
      <div className="flex flex-col gap-4 md:col-span-8">
        {removedNote ? <RemovedNote /> : null}
        <ul className="flex flex-col gap-4">
          {priced.map((line) => (
            <CartItem key={line.variantId} line={line} reducedTo={reduced[line.variantId]} />
          ))}
        </ul>
      </div>

      <aside aria-label="Итог заказа" className="flex flex-col gap-6 bg-surface/40 p-6 md:sticky md:top-[132px] md:col-span-4">
        <dl className="flex flex-col gap-4 font-sans text-body-m tracking-body text-primary">
          <div className="flex justify-between gap-4">
            <dt>{itemsLabel(count)}</dt>
            <dd>{formatPrice(total)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-primary/80">
            <dt>Доставка</dt>
            <dd>при оформлении</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-primary/10 pt-4 md:text-body">
            <dt>Итого</dt>
            <dd role="status" aria-live="polite">{formatPrice(total)}</dd>
          </div>
        </dl>
        {count > 0 ? (
          <Link href="/checkout" className={`${buttonPrimary} w-full`}>
            Оформить заказ
          </Link>
        ) : (
          <p className="font-sans text-caption tracking-body text-primary">Сейчас в корзине нет товаров в наличии.</p>
        )}
      </aside>
    </div>
  )
}

export function RemovedNote() {
  return (
    <p role="status" className="border-l-2 border-accent pl-4 font-sans text-caption tracking-body text-primary">
      Часть товаров больше не продаётся, мы убрали их из корзины.
    </p>
  )
}

function CartItem({ line, reducedTo }: { line: PricedLine; reducedTo?: number }) {
  const sold = line.status === 'unavailable'
  const canAdd = !sold && line.qty < Math.min(line.available, MAX_QTY)
  const stepper = `inline-flex h-11 w-11 items-center justify-center text-primary transition-colors duration-300 hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-transparent disabled:text-primary/30 ${focusRing}`

  return (
    // Each item is its own card: a framed plane, so neighbouring items never run together.
    <li className="grid grid-cols-[96px_1fr] gap-4 border border-primary/15 bg-background p-4 md:grid-cols-[120px_1fr_auto] md:gap-6 md:p-6">
      <LineThumb line={line} sizes="(min-width: 768px) 120px, 96px" />

      <div className="flex min-w-0 flex-col gap-2">
        <Link
          href={productHref(line)}
          className={`self-start font-sans text-body-m tracking-body text-primary underline decoration-transparent underline-offset-4 transition-colors duration-300 hover:decoration-accent md:text-body ${focusRing}`}
        >
          {line.title}
        </Link>
        <p className="font-sans text-caption tracking-body text-primary/70">
          {[line.color, line.size].filter(Boolean).join(' · ')}
        </p>
        <Price
          price={line.price}
          oldPrice={line.oldPrice && line.oldPrice > line.price ? line.oldPrice : null}
          className="font-sans text-caption tracking-body text-primary"
        />

        {sold ? (
          <p className={`${label} text-primary`}>Нет в наличии</p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div role="group" aria-label={`Количество: ${line.title}`} className="inline-flex items-center border border-primary/20">
              <button
                type="button"
                aria-label="Уменьшить количество"
                disabled={line.qty <= 1}
                onClick={() => cart.setQty(line.variantId, line.qty - 1)}
                className={stepper}
              >
                −
              </button>
              <span className="min-w-8 text-center font-sans text-body-m tracking-body text-primary" aria-live="polite">
                {line.qty}
              </span>
              <button
                type="button"
                aria-label="Увеличить количество"
                disabled={!canAdd}
                onClick={() => cart.setQty(line.variantId, line.qty + 1)}
                className={stepper}
              >
                +
              </button>
            </div>
            <span className="font-sans text-body-m tracking-body text-primary md:hidden">{formatPrice(line.lineTotal)}</span>
          </div>
        )}
        {line.status === 'reduced' || (reducedTo !== undefined && line.qty >= reducedTo) ? (
          <p className="font-sans text-caption tracking-body text-primary">
            Осталось {line.available} шт. — количество уменьшено.
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => cart.remove(line.variantId)}
          className={`self-start font-sans text-caption tracking-body ${textLink} min-h-[44px]`}
        >
          Удалить<span className="sr-only">: {line.title}</span>
        </button>
      </div>

      <p className="hidden font-sans text-body-m tracking-body text-primary md:col-start-3 md:block md:text-right">
        {sold ? '—' : formatPrice(line.lineTotal)}
      </p>
    </li>
  )
}
