'use client'

import { useEffect, useRef, useState } from 'react'

import type { PickupPoint } from '@/lib/delivery/types'

// Yandex Maps JS API 2.1 (free licence), loaded only after «Показать на карте». Coordinates
// come from СДЭК, so no geocoder requests. Yandex's logo, copyrights and «Открыть в Картах»
// stay as Yandex draws them. Without a key, or if the script fails, the list is enough.

type Placemark = {
  events: { add(type: string, handler: () => void): void }
  options: { set(options: Record<string, unknown>): void }
}
type YMap = {
  geoObjects: { add(o: unknown): void; removeAll(): void; getBounds(): number[][] | null }
  setBounds(bounds: number[][], options?: Record<string, unknown>): void
  setCenter(center: number[], zoom?: number, options?: Record<string, unknown>): void
  destroy(): void
}
type YMaps = {
  ready(cb: () => void, errback?: (e: unknown) => void): void
  Map: new (el: HTMLElement, state: Record<string, unknown>, options?: Record<string, unknown>) => YMap
  Placemark: new (coords: number[], properties: Record<string, unknown>, options: Record<string, unknown>) => Placemark
}

let loading: Promise<YMaps> | null = null

function loadYandexMaps(apiKey: string): Promise<YMaps> {
  const w = window as unknown as { ymaps?: YMaps }
  loading ??= new Promise<YMaps>((resolve, reject) => {
    const done = () => w.ymaps!.ready(() => resolve(w.ymaps!), reject)
    if (w.ymaps) return done()
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`
    script.async = true
    script.onload = () => (w.ymaps ? done() : reject(new Error('ymaps missing')))
    script.onerror = () => reject(new Error('Yandex Maps did not load'))
    document.head.appendChild(script)
  }).catch((error) => {
    loading = null
    throw error
  })
  return loading
}

// Brand colors (DESIGN_SYSTEM.md): graphite marks, sage for the chosen point.
const MARK = { preset: 'islands#circleDotIcon', iconColor: '#282a29' }
const MARK_ON = { preset: 'islands#circleDotIcon', iconColor: '#9ea99b' }

/** Marker look by state; placemarks belong to the map, outside React. */
function paintMarkers(marks: Map<string, Placemark>, selected: string | null) {
  for (const [code, mark] of marks) mark.options.set(code === selected ? MARK_ON : MARK)
}

export function PickupMap({
  apiKey,
  points,
  selected,
  onSelect,
}: {
  apiKey: string
  points: PickupPoint[]
  selected: string | null
  onSelect: (code: string) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const state = useRef<{ ymaps: YMaps; map: YMap; marks: Map<string, Placemark> } | null>(null)
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  // Create the map once.
  useEffect(() => {
    let cancelled = false
    loadYandexMaps(apiKey)
      .then((ymaps) => {
        if (cancelled || !container.current) return
        const map = new ymaps.Map(container.current, { center: [55.7558, 37.6173], zoom: 10, controls: ['zoomControl'] }, { suppressMapOpenBlock: false })
        state.current = { ymaps, map, marks: new Map() }
        setReady(true)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
      state.current?.map.destroy()
      state.current = null
    }
  }, [apiKey])

  // Markers follow the city's points.
  useEffect(() => {
    const s = state.current
    if (!ready || !s) return
    s.map.geoObjects.removeAll()
    s.marks.clear()
    for (const point of points) {
      const mark = new s.ymaps.Placemark(
        [point.latitude, point.longitude],
        { hintContent: point.address, balloonContent: '' },
        { ...MARK, hasBalloon: false },
      )
      mark.events.add('click', () => onSelectRef.current(point.code))
      s.map.geoObjects.add(mark)
      s.marks.set(point.code, mark)
    }
    const bounds = s.map.geoObjects.getBounds()
    if (bounds) s.map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 30 })
  }, [ready, points])

  // The chosen point stands out and the map moves to it.
  useEffect(() => {
    const s = state.current
    if (!ready || !s) return
    paintMarkers(s.marks, selected)
    const point = points.find((p) => p.code === selected)
    if (point) s.map.setCenter([point.latitude, point.longitude], 15, { duration: 300 })
  }, [ready, selected, points])

  if (failed) {
    return (
      <p className="flex h-full min-h-[120px] items-center justify-center bg-surface/40 p-6 text-center font-sans text-caption tracking-body text-primary/80">
        Карта сейчас не загрузилась. Выберите пункт из списка.
      </p>
    )
  }
  return <div ref={container} className="h-full min-h-[320px] w-full bg-surface/40" role="region" aria-label="Карта пунктов выдачи" />
}
