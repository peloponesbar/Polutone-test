// Design-check screenshots (CLAUDE.md: Puppeteer, 1440 + 390 px).
// Usage: npm run screenshot -- [url] [label] [css-selector] [hover-selector]
//   npm run screenshot                                  -> http://localhost:3000, full page
//   npm run screenshot -- http://localhost:3000/catalog catalog
//   npm run screenshot -- http://localhost:3000 header header
import puppeteer from 'puppeteer'
import { mkdir } from 'node:fs/promises'

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
]
const OUT_DIR = 'screenshots'

const url = process.argv[2] ?? 'http://localhost:3000'
const label = process.argv[3] ?? 'home'
const selector = process.argv[4]
const hoverSelector = process.argv[5]

await mkdir(OUT_DIR, { recursive: true })
const browser = await puppeteer.launch({ headless: 'shell' })
try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage()
    page.on('pageerror', (err) => console.error(`[${vp.name}] page error:`, err.message))
    page.on('requestfailed', (req) => console.error(`[${vp.name}] failed:`, req.url()))
    await page.setViewport(vp)
    // Static checks: freeze motion (animations are checked in the browser, not by screenshot)
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 })
    await page.evaluate(() => document.fonts.ready)
    // Scroll through the page so lazy images load, then wait for them before capturing.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 100))
      }
      window.scrollTo(0, 0)
      await Promise.all(
        [...document.images].map((img) =>
          img.complete ? null : new Promise((r) => img.addEventListener('load', r, { once: true }) || img.addEventListener('error', r, { once: true })),
        ),
      )
    })
    if (hoverSelector) await page.hover(hoverSelector)
    const file = `${OUT_DIR}/${label}-${vp.name}-${vp.width}.png`
    if (selector) {
      const el = await page.$(selector)
      if (!el) throw new Error(`Selector not found: ${selector}`)
      await el.screenshot({ path: file })
    } else {
      await page.screenshot({ path: file, fullPage: true })
    }
    console.log('saved', file)
    await page.close()
  }
} catch (err) {
  console.error('Screenshot failed:', err)
  process.exitCode = 1
} finally {
  await browser.close()
}
