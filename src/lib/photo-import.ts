import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import type { Payload } from 'payload'

import { MOCK_COLORS } from './catalog/mock-data'
import { orderModelPhotos, parsePhotoIndex, photoAlt, type PhotoRow } from './catalog/photo-pack'

/**
 * The test photo pack (AI visualisations, not real samples) for TEST sites only:
 * imports it into media, attaches photos to the mock products and fills the home page.
 * Used by `npm run seed:photos` locally and by the Vercel build (seed-build.ts).
 * Safe to repeat: existing media is reused, editor-filled fields are never overwritten.
 */

/** The pack committed with the code: compressed .webp files and index.csv. */
export const TEST_PHOTO_DIR = 'test-data/photos'
export const TEST_HERO_FILE = 'POLUTONE_homepage_hero.webp'

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
const HERO_ALT = 'Три человека в худи, футболке и прямых брюках POLUTONE на светлом фоне'

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

async function importModel(payload: Payload, dir: string, article: string, rows: PhotoRow[], ids: Map<string, number>) {
  const product = (
    await payload.find({ collection: 'products', where: { article: { equals: article } }, limit: 1, depth: 0 })
  ).docs[0]
  if (!product) {
    payload.logger.warn(`No product with article ${article} — seed the test catalog first. Skipped.`)
    return
  }

  const mediaIds: number[] = []
  for (const row of orderModelPhotos(rows, MOCK_COLORS)) {
    const id = await ensureMedia(payload, path.join(dir, row.file), photoAlt(row), row.color)
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

async function fillHome(payload: Payload, heroFile: string | null, ids: Map<string, number>) {
  const heroId = heroFile && existsSync(heroFile) ? await ensureMedia(payload, heroFile, HERO_ALT, null) : null

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
      _status: 'published',
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

/** Imports a photo pack folder (index.csv + files). Returns how many photos it covers. */
export async function importPhotoPack(payload: Payload, dir: string, heroFile: string | null): Promise<number> {
  const rows = parsePhotoIndex(readFileSync(path.join(dir, 'index.csv'), 'utf8'))
  const byArticle = new Map<string, PhotoRow[]>()
  for (const row of rows) byArticle.set(row.article, [...(byArticle.get(row.article) ?? []), row])

  const ids = new Map<string, number>()
  for (const [article, modelRows] of byArticle) await importModel(payload, dir, article, modelRows, ids)
  await fillHome(payload, heroFile, ids)
  return ids.size
}
