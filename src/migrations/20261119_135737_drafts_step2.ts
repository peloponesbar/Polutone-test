import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { CATALOG_SYNC_CONTEXT } from '../lib/catalog/sync'

/**
 * Drafts, step 2: the old «published» checkboxes become the publication status,
 * then every existing document gets its first version, so admin preview and
 * version history work for content created before drafts existed.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "products" SET "_status" = CASE WHEN "published" THEN 'published' ELSE 'draft' END::"enum_products_status";
  UPDATE "info_pages" SET "_status" = CASE WHEN "published" THEN 'published' ELSE 'draft' END::"enum_info_pages_status";
  UPDATE "home" SET "_status" = 'published';`)

  await db.execute(sql`
   DROP INDEX "products_published_idx";
  DROP INDEX "_products_v_version_version_published_idx";
  ALTER TABLE "products" DROP COLUMN "published";
  ALTER TABLE "_products_v" DROP COLUMN "version_published";
  ALTER TABLE "info_pages" DROP COLUMN "published";
  ALTER TABLE "_info_pages_v" DROP COLUMN "version_published";`)

  // First version of each document = its current state, status unchanged.
  for (const collection of ['products', 'info-pages'] as const) {
    const docs = await payload.find({ collection, limit: 0, depth: 0, select: {}, req })
    for (const { id } of docs.docs) {
      await payload.update({ collection, id, data: {}, req, context: { [CATALOG_SYNC_CONTEXT]: true } })
    }
  }
  const home = await db.execute(sql`SELECT 1 FROM "home" LIMIT 1`)
  if (home.rows.length > 0) {
    await payload.updateGlobal({ slug: 'home', data: { _status: 'published' }, req })
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" ADD COLUMN "published" boolean DEFAULT false;
  ALTER TABLE "_products_v" ADD COLUMN "version_published" boolean DEFAULT false;
  ALTER TABLE "info_pages" ADD COLUMN "published" boolean DEFAULT true;
  ALTER TABLE "_info_pages_v" ADD COLUMN "version_published" boolean DEFAULT true;
  CREATE INDEX "products_published_idx" ON "products" USING btree ("published");
  CREATE INDEX "_products_v_version_version_published_idx" ON "_products_v" USING btree ("version_published");`)

  await db.execute(sql`
   UPDATE "products" SET "published" = ("_status" = 'published');
  UPDATE "info_pages" SET "published" = ("_status" = 'published');`)
}
