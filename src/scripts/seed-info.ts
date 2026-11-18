// Usage: npm run seed:info — creates missing «Информация» pages with draft texts.
// Existing pages are never changed: after the first run, texts live in the admin.
import config from '@payload-config'
import { getPayload } from 'payload'

import { INFO_PAGE_DEFAULTS } from '../lib/info-defaults'

const payload = await getPayload({ config })
try {
  let created = 0
  for (const page of INFO_PAGE_DEFAULTS) {
    const exists = await payload.count({ collection: 'info-pages', where: { slug: { equals: page.slug } } })
    if (exists.totalDocs > 0) continue
    await payload.create({ collection: 'info-pages', data: { ...page, published: true } })
    created += 1
  }
  payload.logger.info({ msg: 'Info pages ready', created, total: INFO_PAGE_DEFAULTS.length })
  process.exit(0)
} catch (error) {
  payload.logger.error({ err: error, msg: 'Info pages seed failed' })
  process.exit(1)
}
