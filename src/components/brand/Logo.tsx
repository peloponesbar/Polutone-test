import { mark, wordmark } from './logo-data'

/**
 * POLUTONE logo as inline SVG, geometry generated from the brandbook files.
 * The sage halves of the O slowly shimmer through the brand accents (sage → rose → blue →
 * stone → sage) animating opacity only: the other colors are layers over the sage shape,
 * shown in turn. They fade out when the logo (or the link around it) is hovered, focused from
 * the keyboard or tapped, and come back on leaving. With prefers-reduced-motion: plain sage,
 * no motion. Works on the site and in the admin: styles live in the SVG, no Tailwind needed.
 */

type Shape = { kind: 'path'; d: string; transform: string | null; sage: boolean }
type Rect = { x: number; y: number; width: number; height: number }
type OGroup = {
  kind: 'o'
  transform: string
  clips: { L: Rect; R: Rect }
  halves: { d: string; sage: boolean; side: 'L' | 'R' }[]
}
export type LogoData = { viewBox: string; parts: (Shape | OGroup)[] }

const GRAPHITE = '#282A29'
const MILK = '#F2EFE9'
const SAGE = '#9EA99B'
/** Accents shown after sage, in order: dusty rose, smoky blue, stone. */
export const LOGO_TONES = ['#B4A1AA', '#9FAEB8', '#C8C2B9'] as const
/** Seconds each color holds; one full round is four steps. */
const STEP_S = 4

const STYLE = `
.polutone-logo__sage{transition:opacity .6s ease-out}
.polutone-logo__tone{opacity:0;animation:polutone-logo-tone ${STEP_S * 4}s ease-in-out infinite}
@keyframes polutone-logo-tone{0%{opacity:0}5%{opacity:1}25%{opacity:1}30%{opacity:0}100%{opacity:0}}
.polutone-logo:hover .polutone-logo__sage,
a:hover .polutone-logo .polutone-logo__sage,
a:focus-visible .polutone-logo .polutone-logo__sage,
a:active .polutone-logo .polutone-logo__sage{opacity:0}
@media (prefers-reduced-motion:reduce){.polutone-logo__sage{transition:none}.polutone-logo__tone{animation:none}}
`

type Props = {
  /** `wordmark` — the full POLUTONE logo; `mark` — the single half-tone O (small sizes). */
  variant?: 'wordmark' | 'mark'
  /** `light` — graphite letters for light backgrounds; `dark` — milk letters for dark ones. */
  tone?: 'light' | 'dark'
  width: number
  /** Accessible name; leave empty when the surrounding link already names it. */
  title?: string
  className?: string
}

/** A sage half of an O: the sage shape plus one layer per accent, faded in one after another. */
function SageHalf({ d, transform, clipPath }: { d: string; transform?: string; clipPath?: string }) {
  return (
    <g className="polutone-logo__sage" transform={transform} clipPath={clipPath}>
      <path d={d} fill={SAGE} />
      {LOGO_TONES.map((color, n) => (
        <path
          key={color}
          d={d}
          fill={color}
          className="polutone-logo__tone"
          style={{ animationDelay: `${STEP_S * (n + 1)}s` }}
        />
      ))}
    </g>
  )
}

export function Logo({ variant = 'wordmark', tone = 'light', width, title, className = '' }: Props) {
  const data = variant === 'mark' ? mark : wordmark
  const [, , w, h] = data.viewBox.split(' ').map(Number)
  const ink = tone === 'dark' ? MILK : GRAPHITE
  // Clip ids per variant and tone: identical copies on one page are harmless.
  const id = `polutone-${variant}-${tone}`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={data.viewBox}
      width={width}
      height={Math.round((width * h) / w)}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      className={`polutone-logo ${className}`}
      style={{ display: 'block' }}
    >
      <style>{STYLE}</style>
      {data.parts.map((part, i) => {
        if (part.kind === 'path') {
          const transform = part.transform ?? undefined
          return part.sage ? (
            <SageHalf key={i} d={part.d} transform={transform} />
          ) : (
            <path key={i} d={part.d} fill={ink} transform={transform} />
          )
        }
        return (
          <g key={i} transform={part.transform}>
            <defs>
              {(['L', 'R'] as const).map((side) => (
                <clipPath key={side} id={`${id}-${i}${side}`}>
                  <rect {...part.clips[side]} />
                </clipPath>
              ))}
            </defs>
            {part.halves.map((half) => {
              const clipPath = `url(#${id}-${i}${half.side})`
              return half.sage ? (
                <SageHalf key={half.side} d={half.d} clipPath={clipPath} />
              ) : (
                <path key={half.side} d={half.d} fill={ink} clipPath={clipPath} />
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}
