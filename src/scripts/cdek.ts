// СДЭК helpers for setting up the shop (needs CDEK_CLIENT_ID / CDEK_CLIENT_SECRET in .env):
//   npm run cdek -- find "Красная Поляна"     — city codes and their pickup points (for «Настройки сайта» → «Доставка»)
//   npm run cdek -- webhook https://<site>/api/delivery/cdek   — subscribe the site to order status notices
import { getCarrier } from '../lib/delivery'
import { CdekCarrier } from '../lib/delivery/cdek'

const [command, ...rest] = process.argv.slice(2).filter((a) => a !== '--')
const arg = rest.join(' ').trim()
const carrier = getCarrier()

if (!carrier) {
  console.error('СДЭК is not configured: set CDEK_CLIENT_ID and CDEK_CLIENT_SECRET in .env.')
  process.exit(1)
}

try {
  if (command === 'find' && arg) {
    const cities = await carrier.searchCities(arg)
    if (cities.length === 0) console.log('Nothing found.')
    for (const city of cities) {
      console.log(`\n${city.name} (${city.region}) — код города: ${city.code}`)
      const points = await carrier.pickupPoints(city.code)
      for (const p of points.slice(0, 20)) console.log(`  ${p.code.padEnd(12)} ${p.address}  [${p.hours}]`)
      if (points.length > 20) console.log(`  … ещё ${points.length - 20}`)
    }
  } else if (command === 'webhook' && /^https:\/\//.test(arg)) {
    if (!(carrier instanceof CdekCarrier)) throw new Error('The local stand-in has no webhooks.')
    console.log('Subscribed, id:', await carrier.subscribeStatuses(arg))
  } else {
    console.log('Usage:\n  npm run cdek -- find "<город>"\n  npm run cdek -- webhook https://<сайт>/api/delivery/cdek')
    process.exit(1)
  }
  process.exit(0)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
