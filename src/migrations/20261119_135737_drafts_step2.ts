import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Drafts, step 2: the old «published» checkboxes become the publication status.
 *
 * Plain SQL only. Payload's document API must not be used in migrations: it expects the
 * schema of the latest code (e.g. tables added by later migrations) and fails on a
 * database that is still in the middle of migrating. Documents created before drafts
 * get their first version on their next save; until then Payload shows the current state.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
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
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
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
