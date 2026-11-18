import { parseMeasurements } from '@/lib/catalog/sizes'
import { SHOP_INFO } from '@/lib/shop-info'

import { focusRing, label } from '../ui'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <details id={id} className="group scroll-mt-40 border-b border-primary/10">
      <summary
        className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 ${label} [&::-webkit-details-marker]:hidden ${focusRing}`}
      >
        {title}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
          className="transition-transform duration-300 ease-out group-open:rotate-45"
        >
          <path d="M8 2v12M2 8h12" />
        </svg>
      </summary>
      <div className="pb-6 font-sans text-caption tracking-body text-primary/80">{children}</div>
    </details>
  )
}

function SizeChartTable({ text }: { text: string }) {
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

/** Accordion under the buy panel: composition, sizes, delivery, payment, returns. */
export function ProductInfo({
  composition,
  care,
  measurements,
}: {
  composition?: string | null
  care?: string | null
  measurements?: string | null
}) {
  return (
    <div className="border-t border-primary/10">
      {composition || care ? (
        <Section id="sostav" title="Состав и уход">
          <div className="flex flex-col gap-2">
            {composition ? <p>{composition}</p> : null}
            {care ? <p>{care}</p> : null}
          </div>
        </Section>
      ) : null}
      {measurements ? (
        <Section id="razmery" title="Размеры и посадка">
          <SizeChartTable text={measurements} />
        </Section>
      ) : null}
      <Section id="dostavka" title="Доставка">
        <p>{SHOP_INFO.delivery}</p>
      </Section>
      <Section id="oplata" title="Оплата">
        <p>{SHOP_INFO.payment}</p>
      </Section>
      <Section id="vozvrat" title="Возврат">
        <p>{SHOP_INFO.returns}</p>
      </Section>
    </div>
  )
}
