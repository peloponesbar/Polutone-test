// Usage: npm run seed:photos — LOCAL DEVELOPMENT.
// Imports the test photo pack (AI visualisations, not real samples) into media, attaches
// photos to the mock products and fills the home page. Defaults to the pack committed in
// test-data/photos; PHOTO_PACK_DIR may point to another pack folder (with index.csv).
import config from '@payload-config'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { getPayload } from 'payload'

import { importPhotoPack, TEST_HERO_FILE, TEST_PHOTO_DIR } from '../lib/photo-import'

if (process.env.NODE_ENV === 'production') {
  console.error('seed:photos is for local development only.')
  process.exit(1)
}

const PACK_DIR = process.env.PHOTO_PACK_DIR?.trim() || TEST_PHOTO_DIR
if (!existsSync(path.join(PACK_DIR, 'index.csv'))) {
  console.error(`No index.csv in ${PACK_DIR}. Set PHOTO_PACK_DIR in .env or keep ${TEST_PHOTO_DIR}.`)
  process.exit(1)
}
// The committed pack has the hero inside; the original pack keeps it one level up as .png.
const HERO_FILE =
  process.env.PHOTO_HERO?.trim() ||
  [path.join(PACK_DIR, TEST_HERO_FILE), path.join(PACK_DIR, '..', 'POLUTONE_homepage_hero.png')].find(existsSync) ||
  null

const payload = await getPayload({ config })
try {
  const photos = await importPhotoPack(payload, PACK_DIR, HERO_FILE)
  payload.logger.info({ msg: 'Photo pack imported', photos })
  process.exit(0)
} catch (error) {
  payload.logger.error({ err: error, msg: 'Photo import failed' })
  process.exit(1)
}
