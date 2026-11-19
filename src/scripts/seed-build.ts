// Runs during the Vercel build (see `vercel-build`), after migrations.
// Fills a TEST deployment with draft «Информация» pages, the fictional catalog and — when
// cloud storage for uploads is set (Vercel Blob or S3) — the test photos from test-data/photos.
// Only when SEED_TEST_DATA=true. Safe to repeat: nothing is duplicated or overwritten.
import config from '@payload-config'
import path from 'node:path'
import { getPayload } from 'payload'

import { importPhotoPack, TEST_HERO_FILE, TEST_PHOTO_DIR } from '../lib/photo-import'
import { seedInfoPages, seedTestCatalog } from '../lib/seed'
import { hasCloudStorage } from '../lib/storage'

if (process.env.SEED_TEST_DATA !== 'true') {
  console.log('SEED_TEST_DATA is not "true" — skipping test data.')
  process.exit(0)
}

const payload = await getPayload({ config })
try {
  const info = await seedInfoPages(payload)
  const catalog = await seedTestCatalog(payload)
  payload.logger.info({ msg: 'Test data ready', infoPagesCreated: info.created, ...catalog })

  if (hasCloudStorage(process.env)) {
    const photos = await importPhotoPack(payload, TEST_PHOTO_DIR, path.join(TEST_PHOTO_DIR, TEST_HERO_FILE))
    payload.logger.info({ msg: 'Test photos ready', photos })
  } else {
    payload.logger.warn('No cloud storage (BLOB_READ_WRITE_TOKEN or S3) — test photos skipped.')
  }
  process.exit(0)
} catch (error) {
  payload.logger.error({ err: error, msg: 'Test data seed failed' })
  process.exit(1)
}
