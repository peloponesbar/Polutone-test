'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { getPickupPoints, searchCities } from '@/app/(frontend)/checkout/delivery-actions'
import { buttonSecondary, focusRing, tab, tabOff, tabOn } from '@/components/site/ui'
import type { City, PickupPoint } from '@/lib/delivery/types'

import { PickupMap } from './PickupMap'

const note = 'font-sans text-caption tracking-body text-primary/80'
const input = `w-full min-h-[44px] border bg-background px-4 font-sans text-body-m tracking-body text-primary placeholder:text-primary/50 ${focusRing}`
const errorText = 'font-sans text-caption tracking-body text-primary'

export type DeliveryTarget = { city: City | null; point: PickupPoint | null }

type PointsLoad = { cityCode: number; points: PickupPoint[]; failed: boolean }

/** City search with suggestions (combobox), then — for pickup — the city's points as a list and a map. */
export function DeliveryPicker({
  method,
  mapsKey,
  cityError,
  pointError,
  onChange,
}: {
  method: 'pickup' | 'courier'
  mapsKey: string | null
  cityError?: string
  pointError?: string
  onChange: (target: DeliveryTarget) => void
}) {
  const [city, setCity] = useState<City | null>(null)
  const [point, setPoint] = useState<PickupPoint | null>(null)
  const [loaded, setLoaded] = useState<PointsLoad | null>(null)

  const wantPoints = method === 'pickup' && city !== null
  const current = wantPoints && loaded?.cityCode === city.code ? loaded : null
  const loadingPoints = wantPoints && !current

  useEffect(() => {
    if (!wantPoints || loaded?.cityCode === city.code) return
    let cancelled = false
    const code = city.code
    getPickupPoints(code)
      .then((result) => !cancelled && setLoaded({ cityCode: code, points: result.ok ? result.points : [], failed: !result.ok }))
      .catch(() => !cancelled && setLoaded({ cityCode: code, points: [], failed: true }))
    return () => {
      cancelled = true
    }
  }, [wantPoints, city, loaded])

  function chooseCity(next: City | null) {
    setCity(next)
    setPoint(null)
    onChange({ city: next, point: null })
  }

  function choosePoint(next: PickupPoint) {
    setPoint(next)
    onChange({ city, point: next })
  }

  return (
    <div className="flex flex-col gap-6">
      <CitySearch value={city} onSelect={chooseCity} error={cityError} />
      <input type="hidden" name="cityCode" value={city?.code ?? ''} />
      <input type="hidden" name="pickupPoint" value={method === 'pickup' ? (point?.code ?? '') : ''} />

      {!wantPoints ? null : loadingPoints ? (
        <p className={note} aria-live="polite">
          Загружаем пункты выдачи…
        </p>
      ) : current?.failed ? (
        <p role="alert" className={errorText}>
          Не удалось загрузить пункты выдачи. Попробуйте, пожалуйста, выбрать город ещё раз.
        </p>
      ) : current && current.points.length === 0 ? (
        <p className={note}>В этом городе нет пунктов выдачи СДЭК. Выберите, пожалуйста, доставку курьером.</p>
      ) : current ? (
        <PointChooser points={current.points} selected={point} onSelect={choosePoint} mapsKey={mapsKey} error={pointError} />
      ) : null}
    </div>
  )
}

function CitySearch({ value, onSelect, error }: { value: City | null; onSelect: (city: City | null) => void; error?: string }) {
  const id = useId()
  const [query, setQuery] = useState(value?.name ?? '')
  const [found, setFound] = useState<{ query: string; cities: City[] } | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const q = query.trim()
  const wanted = q.length >= 2 && !(value && q === value.name)
  const options = wanted && found?.query === q ? found.cities : []
  const searching = wanted && found?.query !== q

  useEffect(() => {
    if (!wanted) return
    let cancelled = false
    const timer = setTimeout(() => {
      searchCities(q)
        .then((cities) => !cancelled && setFound({ query: q, cities }))
        .catch(() => !cancelled && setFound({ query: q, cities: [] }))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [q, wanted])

  function choose(city: City) {
    onSelect(city)
    setQuery(city.name)
    setOpen(false)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || options.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (i + 1) % options.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (i - 1 + options.length) % options.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(options[Math.min(active, options.length - 1)])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const listId = `${id}-list`
  const showList = open && options.length > 0
  const activeIndex = Math.min(active, options.length - 1)
  const nothing = wanted && !searching && options.length === 0

  return (
    <div className="relative flex flex-col gap-2">
      <label htmlFor={id} className="font-sans text-caption tracking-body text-primary">
        Город
      </label>
      <input
        id={id}
        name="city"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList ? `${id}-opt-${activeIndex}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : `${id}-hint`}
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
          if (value) onSelect(null)
        }}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={`${input} ${error ? 'border-primary' : 'border-primary/20'}`}
        placeholder="Начните вводить название"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Найденные города"
        hidden={!showList}
        className="absolute top-[76px] right-0 left-0 z-10 max-h-72 overflow-auto border border-primary/20 bg-background shadow-sm"
      >
        {options.map((city, i) => (
          <li
            key={city.code}
            id={`${id}-opt-${i}`}
            role="option"
            aria-selected={i === activeIndex}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(city)}
            onMouseEnter={() => setActive(i)}
            className={`cursor-pointer px-4 py-3 font-sans text-body-m tracking-body text-primary ${i === activeIndex ? 'bg-surface/50' : ''}`}
          >
            {city.name}
            {city.region ? <span className="block font-sans text-caption text-primary/70">{city.region}</span> : null}
          </li>
        ))}
      </ul>
      {error ? (
        <p id={`${id}-error`} className={errorText}>
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className={note} aria-live="polite">
          {nothing ? 'Такого города нет в базе СДЭК. Проверьте написание или выберите ближайший город.' : 'Выберите город из подсказок — от него зависят пункты и цена.'}
        </p>
      )}
    </div>
  )
}

function PointChooser({
  points,
  selected,
  onSelect,
  mapsKey,
  error,
}: {
  points: PickupPoint[]
  selected: PickupPoint | null
  onSelect: (point: PickupPoint) => void
  mapsKey: string | null
  error?: string
}) {
  const id = useId()
  const [filter, setFilter] = useState('')
  const [view, setView] = useState<'list' | 'map'>('list')
  // Free Yandex Maps terms: load the map (and send Yandex the visitor's browser data) only
  // when the buyer asks for it. The list works without it.
  const [mapOn, setMapOn] = useState(false)
  const showMap = Boolean(mapsKey) && mapOn
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? points.filter((p) => `${p.name} ${p.address}`.toLowerCase().includes(q)) : points
  }, [points, filter])
  const listRef = useRef<HTMLDivElement>(null)

  function pickByCode(code: string) {
    const point = points.find((p) => p.code === code)
    if (!point) return
    onSelect(point)
    setFilter('')
    // From the map: bring the chosen card into view in the list.
    requestAnimationFrame(() => listRef.current?.querySelector(`[data-code="${CSS.escape(code)}"]`)?.scrollIntoView({ block: 'nearest' }))
  }

  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-2 font-sans text-caption tracking-body text-primary">
        Пункт выдачи <span className="text-primary/70">· {points.length}</span>
      </legend>

      {mapsKey && !mapOn ? (
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => {
              setMapOn(true)
              setView('map')
            }}
            className={buttonSecondary}
          >
            Показать на карте
          </button>
          <p className={note}>Карта загружается с сервиса Яндекс Карт — только по этой кнопке.</p>
        </div>
      ) : null}

      {showMap ? (
        <div className="flex gap-2 md:hidden" role="group" aria-label="Как показать пункты">
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')} className={`${tab} flex-1 ${view === 'list' ? tabOn : tabOff}`}>
            Списком
          </button>
          <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')} className={`${tab} flex-1 ${view === 'map' ? tabOn : tabOff}`}>
            На карте
          </button>
        </div>
      ) : null}

      <div className={`grid grid-cols-1 gap-3 ${showMap ? 'md:grid-cols-2' : ''}`}>
        <div className={`flex flex-col gap-3 ${showMap && view === 'map' ? 'hidden md:flex' : ''}`}>
          <input
            type="search"
            aria-label="Найти пункт по улице"
            placeholder="Улица или название"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={`${input} border-primary/20`}
          />
          <div ref={listRef} className="flex max-h-[360px] flex-col gap-2 overflow-auto pr-1">
            {shown.length === 0 ? <p className={note}>Ничего не нашлось. Попробуйте другую улицу.</p> : null}
            {shown.map((p) => {
              const on = selected?.code === p.code
              return (
                <label
                  key={p.code}
                  data-code={p.code}
                  className={`flex cursor-pointer gap-3 border p-3 font-sans tracking-body text-primary transition-colors duration-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background ${
                    on ? 'border-primary bg-surface/30' : 'border-primary/20 hover:border-primary'
                  }`}
                >
                  <input type="radio" name={`${id}-point`} value={p.code} checked={on} onChange={() => onSelect(p)} className="mt-1 accent-primary" />
                  <span className="min-w-0">
                    <span className="block text-body-m">{p.address}</span>
                    <span className="block text-caption text-primary/70">{p.hours}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </div>
        {showMap && mapsKey ? (
          <div className={`h-[360px] md:h-auto ${view === 'list' ? 'hidden md:block' : ''}`}>
            <PickupMap apiKey={mapsKey} points={points} selected={selected?.code ?? null} onSelect={pickByCode} />
          </div>
        ) : null}
      </div>

      {selected ? (
        <p className={note} aria-live="polite">
          Выбран пункт: {selected.address}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className={errorText}>
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
