/**
 * Swatch colors for product color names as they come from MoySklad.
 * Brand palette tones (DESIGN_SYSTEM.md §2); an unknown name gets no swatch color
 * and is shown as a neutral outlined square with its name for screen readers.
 */
const COLOR_HEX: Record<string, string> = {
  молочный: '#F2EFE9',
  графит: '#282A29',
  камень: '#C8C2B9',
  шалфей: '#9EA99B',
  'пыльная роза': '#B4A1AA',
  'припылённая роза': '#B4A1AA',
  'дымчатый синий': '#9FAEB8',
}

export function colorHex(name: string): string | null {
  return COLOR_HEX[name.trim().toLowerCase()] ?? null
}

/**
 * Text color readable on a swatch: milk on dark fills (graphite), graphite on the light ones.
 * Brand pairs: graphite on milk ≈ 14:1, on sage/rose/blue ≈ 5–6:1, milk on graphite ≈ 14:1.
 */
export function textOnSwatch(hex: string): 'dark' | 'light' {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance < 0.4 ? 'light' : 'dark'
}

export type CardColor<TImage> = {
  name: string
  hex: string | null
  inStock: boolean
  image: TImage | null
}

/**
 * Color options for a catalog card: every color of the product in source order,
 * with its first photo and whether any size is in stock.
 */
export function cardColors<TImage extends { color?: string | null }>(
  variants: { color?: string | null; available: number }[],
  images: TImage[],
): CardColor<TImage>[] {
  const names = [...new Set(variants.map((v) => v.color ?? '').filter(Boolean))]
  return names.map((name) => ({
    name,
    hex: colorHex(name),
    inStock: variants.some((v) => v.color === name && v.available > 0),
    image: images.find((image) => image.color === name) ?? images.find((image) => !image.color) ?? null,
  }))
}
