import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import type { LogoData } from '@/components/brand/Logo'
import { mark, wordmark } from '@/components/brand/logo-data'

const pathsOf = (file: string) => [...readFileSync(file, 'utf8').matchAll(/\sd="([^"]*)"/g)].map((m) => m[1])

const shapesOf = (data: LogoData) =>
  data.parts.flatMap((p) => (p.kind === 'path' ? [{ d: p.d, sage: p.sage }] : p.halves.map((h) => ({ d: h.d, sage: h.sage }))))

describe('logo data', () => {
  it('copies the brandbook geometry exactly (re-run scripts/build-logo.mjs if this fails)', () => {
    expect(shapesOf(wordmark).map((s) => s.d)).toEqual(pathsOf('public/logos/POLUTONE_sage_light.svg'))
    expect(shapesOf(mark).map((s) => s.d)).toEqual(pathsOf('public/brand/polutone-o.svg'))
  })

  it('marks exactly the sage halves for the effect: one per O', () => {
    expect(shapesOf(wordmark).filter((s) => s.sage)).toHaveLength(2)
    expect(shapesOf(mark).filter((s) => s.sage)).toHaveLength(1)
  })

  it('has the same geometry as the dark version, so one data set serves both tones', () => {
    expect(pathsOf('public/logos/POLUTONE_sage_dark.svg')).toEqual(pathsOf('public/logos/POLUTONE_sage_light.svg'))
  })
})
