// Usage: npm run seed:info — creates missing «Информация» pages with draft texts.
// Existing pages are never changed: after the first run, texts live in the admin.
import config from '@payload-config'
import { getPayload } from 'payload'

import { seedInfoPages } from '../lib/seed'

const payload = await getPayload({ config })
try {
  payload.logger.info({ msg: 'Info pages ready', ...(await seedInfoPages(payload)) })
  process.exit(0)
} catch (error) {
  payload.logger.error({ err: error, msg: 'Info pages seed failed' })
  process.exit(1)
}
