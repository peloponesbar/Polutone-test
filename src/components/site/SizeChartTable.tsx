import { parseMeasurements } from '@/lib/catalog/sizes'

/** Size chart from the MoySklad "Обмеры" text; shown as plain text if it isn't a table. */
export function SizeChartTable({ text }: { text: string }) {
  const chart = parseMeasurements(text)
  if (!chart) return <p className="whitespace-pre-line">{text}</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Таблица размеров, сантиметры</caption>
        <thead>
          <tr className="border-b border-primary/20">
            {chart.headers.map((h) => (
              <th key={h} scope="col" className="py-2 pr-4 font-medium text-primary">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((row) => (
            <tr key={row[0]} className="border-b border-primary/10">
              {row.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="py-2 pr-4 font-medium text-primary">
                    {cell}
                  </th>
                ) : (
                  <td key={i} className="py-2 pr-4">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
