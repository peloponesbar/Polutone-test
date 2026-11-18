/** Opens a <details> section by id and scrolls it into view (anchors alone don't open it). */
export function openDetails(id: string) {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLDetailsElement)) return
  element.open = true
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  element.querySelector('summary')?.focus({ preventScroll: true })
}
