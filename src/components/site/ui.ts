/**
 * Shared class strings for site controls (DESIGN_SYSTEM.md §9–10).
 * One source of truth, so buttons, tabs and links look the same everywhere.
 */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export const container = 'mx-auto w-full max-w-[1440px] px-6 md:px-20'

export const label = 'font-sans text-label font-medium tracking-body uppercase'

const buttonBase = `inline-flex min-h-[44px] items-center justify-center px-6 font-sans text-label font-medium tracking-body transition-colors duration-300 disabled:cursor-not-allowed ${focusRing}`

export const buttonPrimary = `${buttonBase} bg-primary text-background hover:bg-primary/90 disabled:bg-primary/60`

export const buttonSecondary = `${buttonBase} border border-primary/20 text-primary hover:bg-primary hover:text-background`

/** Toggle chip: category tabs, color and size choices. */
export const tab = `inline-flex min-h-[44px] items-center justify-center border px-4 font-sans text-label font-medium tracking-body transition-colors duration-300 ${focusRing}`
export const tabOn = 'border-primary bg-primary text-background'
export const tabOff = 'border-primary/20 text-primary/70 hover:border-primary hover:text-primary'
export const tabDisabled = 'cursor-not-allowed border-primary/10 text-primary/70 line-through'

export const navLink = `group relative inline-flex min-h-[44px] items-center ${label} transition-colors duration-300 ${focusRing}`

export const textLink = `text-primary underline decoration-accent underline-offset-4 transition-colors duration-300 hover:decoration-primary ${focusRing}`
