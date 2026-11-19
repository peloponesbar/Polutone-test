'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { focusRing } from './ui'

/** Catalog sort; changes the `sort` query param and keeps the category. */
export function SortSelect({
  value,
  options,
}: {
  value: string
  options: readonly { value: string; label: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', next)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="relative inline-flex">
      <label htmlFor="sort" className="sr-only">
        Сортировка
      </label>
      <select
        id="sort"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`min-h-[44px] cursor-pointer appearance-none border border-primary/20 bg-transparent transition-colors duration-300 hover:border-primary py-0 pr-10 pl-4 font-sans text-caption tracking-body text-primary ${focusRing}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-[14px] -translate-y-1/2"
      >
        <path d="M2 4l4 4 4-4" />
      </svg>
    </div>
  )
}
