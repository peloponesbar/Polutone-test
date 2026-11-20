import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"contacts_telegram" varchar,
  	"contacts_vk" varchar,
  	"contacts_avito" varchar,
  	"contacts_email" varchar,
  	"contacts_phone" varchar,
  	"contacts_hours" varchar,
  	"legal_seller" varchar,
  	"legal_inn" varchar,
  	"legal_ogrn" varchar,
  	"legal_address" varchar,
  	"announcement_enabled" boolean DEFAULT true,
  	"announcement_text" varchar DEFAULT 'Первая коллекция в разработке',
  	"announcement_link" varchar,
  	"footer_tagline" varchar DEFAULT 'Выразительность в полутоне.',
  	"seo_title" varchar DEFAULT 'POLUTONE — Выразительность в полутоне',
  	"seo_description" varchar DEFAULT 'POLUTONE. Одежда без лишнего шума, которая подчёркивает вас.',
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "info_pages" ADD COLUMN "show_contacts" boolean DEFAULT false;
  ALTER TABLE "_info_pages_v" ADD COLUMN "version_show_contacts" boolean DEFAULT false;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_settings_seo_seo_image_idx" ON "site_settings" USING btree ("seo_image_id");`)

  // The contacts page now shows the «Связь» block from the settings. Turn it on there and
  // remove the two starting placeholders it replaces — only if their text was never edited.
  await db.execute(sql`
  UPDATE "info_pages" SET "show_contacts" = true WHERE "slug" = 'kontakty';
  UPDATE "_info_pages_v" SET "version_show_contacts" = true WHERE "version_slug" = 'kontakty';
  DELETE FROM "info_pages_sections" WHERE "text" IN (
    'Telegram, почта и телефон появятся здесь перед запуском магазина.',
    'Данные продавца будут указаны перед запуском магазина.');
  DELETE FROM "_info_pages_v_version_sections" WHERE "text" IN (
    'Telegram, почта и телефон появятся здесь перед запуском магазина.',
    'Данные продавца будут указаны перед запуском магазина.');`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings" CASCADE;
  ALTER TABLE "info_pages" DROP COLUMN "show_contacts";
  ALTER TABLE "_info_pages_v" DROP COLUMN "version_show_contacts";`)
}
