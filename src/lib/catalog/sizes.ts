/** Letter sizes in display order; anything else keeps its original order after these. */
const LETTER_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'ONE SIZE']

function rank(size: string): number {
  const index = LETTER_ORDER.indexOf(size.trim().toUpperCase())
  if (index !== -1) return index
  const numeric = Number.parseFloat(size.replace(',', '.'))
  return Number.isFinite(numeric) ? 1000 + numeric : Number.POSITIVE_INFINITY
}

/** Sorts sizes XS → XL, numeric sizes ascending; unknown labels keep their order at the end. */
export function sortSizes(sizes: string[]): string[] {
  return sizes
    .map((size, index) => ({ size, index, rank: rank(size) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((item) => item.size)
}

export type SizeChart = { headers: string[]; rows: string[][] }

/**
 * Parses the "Обмеры" text table:
 *   Размер | Длина, см | Ширина, см
 *   XS | 70 | 56
 * Returns null when the text isn't a consistent table (it's then shown as plain text).
 */
export function parseMeasurements(text: string): SizeChart | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length < 2) return null

  const [headers, ...rows] = lines.map((line) => line.split('|').map((cell) => cell.trim()))
  if (headers.length < 2 || headers.some((h) => !h)) return null
  if (rows.some((row) => row.length !== headers.length)) return null

  return { headers, rows }
}
