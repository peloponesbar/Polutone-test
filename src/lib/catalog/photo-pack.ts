/**
 * Reads the local photo pack index (D:\CLoude\photo\POLUTONE_all_120_photos\index.csv):
 *   Артикул;Модель;Цвет;HEX;Ракурс;Файл;Ширина;Высота
 */
export type PhotoRow = {
  article: string
  model: string
  color: string
  view: string
  /** Path relative to the pack folder, with forward slashes. */
  file: string
}

const REQUIRED_COLUMNS = ['Артикул', 'Модель', 'Цвет', 'Ракурс', 'Файл'] as const

export function parsePhotoIndex(text: string): PhotoRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  const header = lines[0].split(';').map((h) => h.trim())
  const index = Object.fromEntries(REQUIRED_COLUMNS.map((name) => [name, header.indexOf(name)]))
  const missing = REQUIRED_COLUMNS.filter((name) => index[name] === -1)
  if (missing.length > 0) throw new Error(`Photo index is missing columns: ${missing.join(', ')}`)

  return lines.slice(1).map((line, i) => {
    const cells = line.split(';').map((c) => c.trim())
    const row = {
      article: cells[index['Артикул']],
      model: cells[index['Модель']],
      color: cells[index['Цвет']],
      view: cells[index['Ракурс']],
      file: cells[index['Файл']]?.replace(/\\/g, '/'),
    }
    if (Object.values(row).some((value) => !value)) {
      throw new Error(`Photo index line ${i + 2} is incomplete: ${line}`)
    }
    return row
  })
}

/** Alt text: the garment, its color and the view — no evaluative words. */
export function photoAlt(row: PhotoRow): string {
  return `${row.model}, цвет «${row.color.toLowerCase()}», ${row.view.toLowerCase()}`
}

/** Photos of one model ordered by the given color order, keeping the index order of views. */
export function orderModelPhotos(rows: PhotoRow[], colorOrder: readonly string[]): PhotoRow[] {
  const rank = (color: string) => {
    const i = colorOrder.indexOf(color)
    return i === -1 ? colorOrder.length : i
  }
  return rows
    .map((row, position) => ({ row, position }))
    .sort((a, b) => rank(a.row.color) - rank(b.row.color) || a.position - b.position)
    .map(({ row }) => row)
}
