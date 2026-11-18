// Usage: npm run seed:photos — LOCAL DEVELOPMENT ONLY.
// Imports the test photo pack (AI visualisations, not real samples) into media,
// attaches photos to the mock products and fills the home page settings.
// Photos stay on this computer: /media is git-ignored and the pack lives outside the repo.
import config from '@payload-config'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'

import { MOCK_COLORS } from '../lib/catalog/mock-data'
import { orderModelPhotos, parsePhotoIndex, photoAlt, type PhotoRow } from '../lib/catalog/photo-pack'

if (process.env.NODE_ENV === 'production') {
  console.error('seed:photos is for local development only.')
  process.exit(1)
}

const PACK_DIR = process.env.PHOTO_PACK_DIR?.trim()
if (!PACK_DIR || !existsSync(path.join(PACK_DIR, 'index.csv'))) {
  console.error('Set PHOTO_PACK_DIR in .env to the folder with index.csv (e.g. D:/CLoude/photo/POLUTONE_all_120_photos).')
  process.exit(1)
}
const HERO_FILE = process.env.PHOTO_HERO?.trim() || path.join(PACK_DIR, '..', 'POLUTONE_homepage_hero.png')

/** Short presentation texts for the test models (edited later in the admin). */
const DESCRIPTIONS: Record<string, string> = {
  H01: 'Свободный крой, спущенное плечо. Двойной капюшон без шнурков и карман-кенгуру.',
  H02: 'Свободный крой, молния в тон. Два косых прорезных кармана, капюшон без шнурков.',
  P01: 'Прямые свободные штанины со строчкой спереди. Пояс на резинке, косые карманы.',
  P02: 'Прямые свободные штанины без строчки. Пояс на резинке со скрытым шнуром.',
  T01: 'Свободный удлинённый силуэт, спущенное плечо, рукав до локтя.',
  T02: 'Свободный силуэт и небольшой накладной карман на груди.',
}

/** Which photo represents each category on the home page. */
const CATEGORY_PHOTOS: Record<string, string> = {
  Худи: 'H01_sage_01_front',
  Брюки: 'P01_graphite_01_front',
  Футболки: 'T02_milk_04_detail',
}
const ABOUT_PHOTO = 'T01_milk_04_detail'
const FEATURED = { article: 'H02', photo: 'H02_graphite_01_front' }

const baseName = (file: string) => path.basename(file, path.extname(file))

/** Creates the media doc once; re-runs reuse it (Payload stores it as <name>.webp). */
async function ensureMedia(payload: Payload, filePath: string, alt: string, color: string | null) {
  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: `${baseName(filePath)}.webp` } },
    limit: 1,
    depth: 0,
  })
  if (existing.docs[0]) return existing.docs[0].id
  const doc = await payload.create({ collection: 'media', data: { alt, color }, filePath })
  return doc.id
}

async function importModel(payload: Payload, article: string, rows: PhotoRow[], ids: Map<string, number>) {
  const product = (
    await payload.find({ collection: 'products', where: { article: { equals: article } }, limit: 1, depth: 0 })
  ).docs[0]
  if (!product) {
    payload.logger.warn(`No product with article ${article} — run "npm run seed:mock" first. Skipped.`)
    return
  }

  const ordered = orderModelPhotos(rows, MOCK_COLORS)
  const mediaIds: number[] = []
  for (const row of ordered) {
    const id = await ensureMedia(payload, path.join(PACK_DIR!, row.file), photoAlt(row), row.color)
    ids.set(baseName(row.file), id)
    mediaIds.push(id)
  }

  // Presentation belongs to the editor: fill it only where it's still empty.
  await payload.update({
    collection: 'products',
    id: product.id,
    data: {
      ...(product.images?.length ? {} : { images: mediaIds }),
      ...(product.description ? {} : { description: DESCRIPTIONS[article] ?? null }),
    },
  })
  payload.logger.info(`${article}: ${mediaIds.length} photos`)
}

async function fillHome(payload: Payload, ids: Map<string, number>) {
  const heroId = existsSync(HERO_FILE)
    ? await ensureMedia(payload, HERO_FILE, 'Три человека в худи, футболке и прямых брюках POLUTONE на светлом фоне', null)
    : null

  for (const [name, photo] of Object.entries(CATEGORY_PHOTOS)) {
    const id = ids.get(photo)
    if (!id) continue
    await payload.update({
      collection: 'categories',
      where: { and: [{ name: { equals: name } }, { image: { exists: false } }] },
      data: { image: id },
    })
  }

  const featured = (
    await payload.find({ collection: 'products', where: { article: { equals: FEATURED.article } }, limit: 1, depth: 0 })
  ).docs[0]
  const home = await payload.findGlobal({ slug: 'home', depth: 0 })

  await payload.updateGlobal({
    slug: 'home',
    data: {
      hero: { ...home.hero, image: home.hero?.image ?? heroId },
      about: { ...home.about, image: home.about?.image ?? ids.get(ABOUT_PHOTO) ?? null },
      featured: {
        ...home.featured,
        product: home.featured?.product ?? featured?.id ?? null,
        image: home.featured?.image ?? ids.get(FEATURED.photo) ?? null,
      },
    },
  })
}

const payload = await getPayload({ config })
try {
  const rows = parsePhotoIndex(readFileSync(path.join(PACK_DIR, 'index.csv'), 'utf8'))
  const byArticle = new Map<string, PhotoRow[]>()
  for (const row of rows) byArticle.set(row.article, [...(byArticle.get(row.article) ?? []), row])
  const ids = new Map<string, number>()

  for (const [article, modelRows] of byArticle) {
    await importModel(payload, article, modelRows, ids)
  }
  await fillHome(payload, ids)
  payload.logger.info({ msg: 'Photo pack imported', photos: ids.size })
  process.exit(0)
} catch (error) {
  payload.logger.error({ err: error, msg: 'Photo import failed' })
  process.exit(1)
}
