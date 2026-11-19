import Link from 'next/link'

import { SHOP_INFO } from '@/lib/shop-info'

import { SizeChartTable } from '../SizeChartTable'
import { focusRing, label, textLink } from '../ui'

function More({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`mt-2 inline-block ${textLink}`}>
      {children}
    </Link>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <details id={id} className="group scroll-mt-40 border-b border-primary/10">
      <summary
        className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 transition-colors duration-300 hover:text-primary/70 ${label} [&::-webkit-details-marker]:hidden ${focusRing}`}
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
        <More href="/info/dostavka">Подробнее о доставке</More>
      </Section>
      <Section id="oplata" title="Оплата">
        <p>{SHOP_INFO.payment}</p>
        <More href="/info/oplata">Подробнее об оплате</More>
      </Section>
      <Section id="vozvrat" title="Возврат">
        <p>{SHOP_INFO.returns}</p>
        <More href="/info/vozvrat">Подробнее о возврате</More>
      </Section>
    </div>
  )
}
