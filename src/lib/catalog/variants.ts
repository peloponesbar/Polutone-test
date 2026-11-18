import { sortSizes } from './sizes'

export type PickerVariant = {
  externalId: string
  size: string
  color: string
  price: number
  available: number
}

/** Colors in source order, without duplicates. */
export function colorsOf(variants: PickerVariant[]): string[] {
  return [...new Set(variants.map((v) => v.color).filter(Boolean))]
}

export type SizeOption = { size: string; available: boolean }

/** All sizes of the product, marked available for the given color. */
export function sizeOptions(variants: PickerVariant[], color: string | null): SizeOption[] {
  const sizes = sortSizes([...new Set(variants.map((v) => v.size))])
  return sizes.map((size) => ({
    size,
    available: variants.some(
      (v) => v.size === size && (color === null || v.color === color) && v.available > 0,
    ),
  }))
}

export function findVariant(
  variants: PickerVariant[],
  color: string | null,
  size: string | null,
): PickerVariant | null {
  if (size === null) return null
  return variants.find((v) => v.size === size && (color === null || v.color === color)) ?? null
}

/** First color that has anything in stock, otherwise the first color. */
export function defaultColor(variants: PickerVariant[]): string | null {
  const colors = colorsOf(variants)
  return colors.find((c) => variants.some((v) => v.color === c && v.available > 0)) ?? colors[0] ?? null
}

/** The only size, when the product has exactly one (e.g. "ONE SIZE"), is preselected. */
export function defaultSize(variants: PickerVariant[], color: string | null): string | null {
  const options = sizeOptions(variants, color)
  return options.length === 1 && options[0].available ? options[0].size : null
}

export function isInStock(variants: PickerVariant[]): boolean {
  return variants.some((v) => v.available > 0)
}
