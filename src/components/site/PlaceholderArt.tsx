/**
 * Abstract plane used instead of product photos until real ones are uploaded
 * (brandbook: no stock or AI images in place of POLUTONE products).
 */
const TONES = [
  { box: 'bg-surface', inner: 'bg-accent' },
  { box: 'bg-surface', inner: 'bg-primary' },
  { box: 'bg-surface', inner: 'bg-background' },
  { box: 'bg-accent', inner: 'bg-surface' },
] as const

export function PlaceholderArt({ seed }: { seed: number }) {
  const tone = TONES[Math.abs(seed) % TONES.length]
  return (
    <div aria-hidden="true" className={`absolute inset-0 ${tone.box}`}>
      <div className={`absolute top-[18%] left-[28%] h-[66%] w-[44%] ${tone.inner}`} />
    </div>
  )
}
