import localFont from 'next/font/local'

// Brand fonts from POLUTONE_Brandbook_v3/fonts (SIL OFL 1.1, licenses in src/fonts).
export const jura = localFont({
  src: [
    { path: '../../fonts/Jura-300.ttf', weight: '300', style: 'normal' },
    { path: '../../fonts/Jura-400.ttf', weight: '400', style: 'normal' },
  ],
  variable: '--font-jura',
  display: 'swap',
})

export const onest = localFont({
  src: [
    { path: '../../fonts/Onest-400.ttf', weight: '400', style: 'normal' },
    { path: '../../fonts/Onest-500.ttf', weight: '500', style: 'normal' },
  ],
  variable: '--font-onest',
  display: 'swap',
})
