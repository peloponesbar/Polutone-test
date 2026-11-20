'use client'

import { useEffect, useRef, useState } from 'react'

import type { PickupPoint } from '@/lib/delivery/types'

// Yandex Maps JS API v3, loaded only when the buyer chooses delivery to a pickup point.
// Without a key, or if the script fails, the list next to the map is enough to choose.

type YMaps = {
  ready: Promise<void>
  YMap: new (el: HTMLElement, props: Record<string, unknown>) => YMapInstance
  YMapDefaultSchemeLayer: new (props: Record<string, unknown>) => unknown
  YMapDefaultFeaturesLayer: new (props: Record<string, unknown>) => unknown
  YMapMarker: new (props: Record<string, unknown>, el: HTMLElement) => unknown
}
type YMapInstance = { addChild(child: unknown): void; removeChild(child: unknown): void; update(props: Record<string, unknown>): void; destroy(): void }

let loading: Promise<YMaps> | null = null

function loadYandexMaps(apiKey: string): Promise<YMaps> {
  const w = window as unknown as { ymaps3?: YMaps }
  if (w.ymaps3) return w.ymaps3.ready.then(() => w.ymaps3!)
  loading ??= new Promise<YMaps>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`
    script.async = true
    script.onload = () => (w.ymaps3 ? w.ymaps3.ready.then(() => resolve(w.ymaps3!), reject) : reject(new Error('ymaps3 missing')))
    script.onerror = () => reject(new Error('Yandex Maps did not load'))
    document.head.appendChild(script)
  }).catch((error) => {
    loading = null
    throw error
  })
  return loading
}

// Brand colors (DESIGN_SYSTEM.md): graphite marks on the map, sage for the chosen point.
const MARK = 'display:block;width:18px;height:18px;border-radius:50%;border:2px solid #f2efe9;background:#282a29;cursor:pointer;transform:translate(-50%,-50%);box-shadow:0 1px 4px rgba(40,42,41,.35);padding:0'
const MARK_ON = 'display:block;width:26px;height:26px;border-radius:50%;border:3px solid #282a29;background:#9ea99b;cursor:pointer;transform:translate(-50%,-50%);box-shadow:0 1px 6px rgba(40,42,41,.45);padding:0'

/** Marker look by state; DOM elements owned by the map, outside React. */
function paintMarkers(elements: Map<string, HTMLButtonElement>, selected: string | null) {
  for (const [code, el] of elements) el.setAttribute('style', code === selected ? MARK_ON : MARK)
}

function boundsOf(points: PickupPoint[]): [[number, number], [number, number]] {
  const lons = points.map((p) => p.longitude)
  const lats = points.map((p) => p.latitude)
  const pad = 0.005
  return [
    [Math.min(...lons) - pad, Math.min(...lats) - pad],
    [Math.max(...lons) + pad, Math.max(...lats) + pad],
  ]
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
  const map = useRef<{ ymaps: YMaps; map: YMapInstance; markers: unknown[]; elements: Map<string, HTMLButtonElement> } | null>(null)
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])
  const [failed, setFailed] = useState(false)

  // Create the map once.
  useEffect(() => {
    let cancelled = false
    loadYandexMaps(apiKey)
      .then((ymaps) => {
        if (cancelled || !container.current) return
        const instance = new ymaps.YMap(container.current, { location: { center: [37.6173, 55.7558], zoom: 10 } })
        instance.addChild(new ymaps.YMapDefaultSchemeLayer({}))
        instance.addChild(new ymaps.YMapDefaultFeaturesLayer({}))
        map.current = { ymaps, map: instance, markers: [], elements: new Map() }
        setFailed(false)
        container.current.dispatchEvent(new Event('polutone-map-ready'))
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
      map.current?.map.destroy()
      map.current = null
    }
  }, [apiKey])

  // Markers follow the city's points.
  useEffect(() => {
    const draw = () => {
      const m = map.current
      if (!m) return
      for (const marker of m.markers) m.map.removeChild(marker)
      m.markers = []
      m.elements.clear()
      for (const point of points) {
        const el = document.createElement('button')
        el.type = 'button'
        el.setAttribute('aria-label', `Пункт выдачи: ${point.address}`)
        el.style.cssText = MARK
        el.addEventListener('click', () => onSelectRef.current(point.code))
        const marker = new m.ymaps.YMapMarker({ coordinates: [point.longitude, point.latitude] }, el)
        m.map.addChild(marker)
        m.markers.push(marker)
        m.elements.set(point.code, el)
      }
      if (points.length > 0) m.map.update({ location: { bounds: boundsOf(points), duration: 300 } })
    }
    draw()
    const el = container.current
    el?.addEventListener('polutone-map-ready', draw)
    return () => el?.removeEventListener('polutone-map-ready', draw)
  }, [points])

  // The chosen point stands out and the map moves to it.
  useEffect(() => {
    const m = map.current
    if (!m) return
    paintMarkers(m.elements, selected)
    const point = points.find((p) => p.code === selected)
    if (point) m.map.update({ location: { center: [point.longitude, point.latitude], zoom: 15, duration: 300 } })
  }, [selected, points])

  if (failed) {
    return (
      <p className="flex h-full min-h-[120px] items-center justify-center bg-surface/40 p-6 text-center font-sans text-caption tracking-body text-primary/80">
        Карта сейчас не загрузилась. Выберите пункт из списка.
      </p>
    )
  }
  return <div ref={container} className="h-full min-h-[320px] w-full bg-surface/40" role="region" aria-label="Карта пунктов выдачи" />
}
