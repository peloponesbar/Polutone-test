'use client'

import { useState } from 'react'

import { Price } from '@/components/site/Price'
import { buttonPrimary, label, tab, tabDisabled, tabOff, tabOn, textLink } from '@/components/site/ui'
import {
  colorsOf,
  defaultColor,
  defaultSize,
  findVariant,
  isInStock,
  sizeOptions,
  type PickerVariant,
} from '@/lib/catalog/variants'

import { openDetails } from './openDetails'

type Props = {
  variants: PickerVariant[]
  price: number
  oldPrice: number | null
  hasSizeChart: boolean
  modelNote?: string | null
}

/** Color → size selection with live availability and price; add-to-cart arrives in phase 2. */
export function VariantPicker({ variants, price, oldPrice, hasSizeChart, modelNote }: Props) {
  const colors = colorsOf(variants)
  const [color, setColor] = useState<string | null>(() => defaultColor(variants))
  const [size, setSize] = useState<string | null>(() => defaultSize(variants, color))
  const [notice, setNotice] = useState<string | null>(null)

  const sizes = sizeOptions(variants, color)
  const selected = findVariant(variants, color, size)
  const inStock = isInStock(variants)
  const prices = new Set(variants.map((v) => v.price))

  function chooseColor(next: string) {
    setColor(next)
    setNotice(null)
    // Keep the size if it's still available in the new color.
    if (size && !sizeOptions(variants, next).some((o) => o.size === size && o.available)) setSize(null)
  }

  function addToCart() {
    if (!selected) {
      setNotice('Выберите, пожалуйста, размер.')
      return
    }
    setNotice('Корзина появится на следующем этапе работы над сайтом.')
  }

  return (
    <div className="flex flex-col gap-6">
      <Price
        price={selected?.price ?? price}
        oldPrice={oldPrice}
        from={!selected && prices.size > 1}
        className="font-sans text-body-m tracking-body md:text-body"
      />

      {colors.length > 1 ? (
        <fieldset className="flex flex-col gap-4">
          <legend className={`${label} mb-4`}>
            Цвет<span className="sr-only">: {color}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={c === color}
                onClick={() => chooseColor(c)}
                className={`${tab} ${c === color ? tabOn : tabOff}`}
              >
                {c}
              </button>
            ))}
          </div>
        </fieldset>
      ) : colors[0] ? (
        <p className="font-sans text-caption tracking-body text-primary/70">Цвет: {colors[0]}</p>
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <span id="size-label" className={label}>
            Размер
          </span>
          {hasSizeChart ? (
            <a
              href="#razmery"
              onClick={(event) => {
                event.preventDefault()
                openDetails('razmery')
              }}
              className={`font-sans text-caption tracking-body ${textLink}`}
            >
              Таблица размеров
            </a>
          ) : null}
        </div>
        <div role="radiogroup" aria-labelledby="size-label" className="flex flex-wrap gap-2">
          {sizes.map((option) => {
            const checked = option.size === size
            return (
              <button
                key={option.size}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-disabled={!option.available}
                aria-label={option.available ? option.size : `${option.size}, нет в наличии`}
                onClick={() => {
                  if (!option.available) return
                  setSize(option.size)
                  setNotice(null)
                }}
                className={`${tab} min-w-14 ${!option.available ? tabDisabled : checked ? tabOn : tabOff}`}
              >
                {option.size}
              </button>
            )
          })}
        </div>
        {modelNote ? (
          <p className="font-sans text-caption tracking-body text-primary/70">{modelNote}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={addToCart}
          disabled={!inStock}
          className={`${buttonPrimary} w-full`}
        >
          {inStock ? 'В корзину' : 'Нет в наличии'}
        </button>
        <p role="status" className="min-h-[22px] font-sans text-caption tracking-body text-primary/80">
          {notice}
        </p>
      </div>
    </div>
  )
}
