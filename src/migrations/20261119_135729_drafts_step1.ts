import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_info_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__info_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_home_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "_products_v_blocks_full_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_image_pair" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"left_id" integer,
  	"right_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_quote" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"body" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_measurements_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"video_id" integer,
  	"poster_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_style_with" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'С чем носить',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_version_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"external_id" varchar,
  	"color" varchar,
  	"size" varchar,
  	"price" numeric,
  	"available" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_published" boolean DEFAULT false,
  	"version_slug" varchar,
  	"version_in_source" boolean DEFAULT true,
  	"version_synced_at" timestamp(3) with time zone,
  	"version_description" varchar,
  	"version_model_note" varchar,
  	"version_title" varchar,
  	"version_article" varchar,
  	"version_category_id" integer,
  	"version_price" numeric,
  	"version_old_price" numeric,
  	"version_in_stock" boolean,
  	"version_composition" varchar,
  	"version_care" varchar,
  	"version_measurements" varchar,
  	"version_source_updated_at" timestamp(3) with time zone,
  	"version_external_id" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__products_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"products_id" integer
  );
  
  CREATE TABLE "_info_pages_v_version_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_info_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_published" boolean DEFAULT true,
  	"version_menu_order" numeric DEFAULT 100,
  	"version_slug" varchar,
  	"version_title" varchar,
  	"version_intro" varchar,
  	"version_show_size_charts" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__info_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_home_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_hero_image_id" integer,
  	"version_hero_title" varchar DEFAULT 'Выразительность в полутоне.',
  	"version_hero_text" varchar DEFAULT 'Коллекция 01. Свободный крой, унисекс, спокойные цвета.',
  	"version_about_title" varchar DEFAULT 'Не громче. Точнее.',
  	"version_about_text" varchar DEFAULT 'POLUTONE — минималистичная одежда универсального кроя. Мы убираем всё, что спорит с человеком, и оставляем одну точную деталь.
  
  Свободная посадка, унисекс, спокойные цвета. Одежда, которая подчёркивает вас и не говорит вместо вас.',
  	"version_about_image_id" integer,
  	"version_featured_label" varchar DEFAULT 'Вещь сезона',
  	"version_featured_product_id" integer,
  	"version_featured_image_id" integer,
  	"version__status" "enum__home_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  ALTER TABLE "products_blocks_full_image" ALTER COLUMN "image_id" DROP NOT NULL;
  ALTER TABLE "products_blocks_image_pair" ALTER COLUMN "left_id" DROP NOT NULL;
  ALTER TABLE "products_blocks_image_pair" ALTER COLUMN "right_id" DROP NOT NULL;
  ALTER TABLE "products_blocks_quote" ALTER COLUMN "text" DROP NOT NULL;
  ALTER TABLE "products_blocks_text" ALTER COLUMN "body" DROP NOT NULL;
  ALTER TABLE "products_blocks_measurements_image" ALTER COLUMN "image_id" DROP NOT NULL;
  ALTER TABLE "products_blocks_video" ALTER COLUMN "video_id" DROP NOT NULL;
  ALTER TABLE "products_blocks_video" ALTER COLUMN "poster_id" DROP NOT NULL;
  ALTER TABLE "products_variants" ALTER COLUMN "external_id" DROP NOT NULL;
  ALTER TABLE "products_variants" ALTER COLUMN "size" DROP NOT NULL;
  ALTER TABLE "products_variants" ALTER COLUMN "price" DROP NOT NULL;
  ALTER TABLE "products_variants" ALTER COLUMN "available" DROP NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "slug" DROP NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "price" DROP NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "external_id" DROP NOT NULL;
  ALTER TABLE "info_pages_sections" ALTER COLUMN "text" DROP NOT NULL;
  ALTER TABLE "info_pages" ALTER COLUMN "slug" DROP NOT NULL;
  ALTER TABLE "info_pages" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "products" ADD COLUMN "_status" "enum_products_status" DEFAULT 'draft';
  ALTER TABLE "info_pages" ADD COLUMN "_status" "enum_info_pages_status" DEFAULT 'draft';
  ALTER TABLE "home" ADD COLUMN "_status" "enum_home_status" DEFAULT 'draft';
  ALTER TABLE "_products_v_blocks_full_image" ADD CONSTRAINT "_products_v_blocks_full_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_full_image" ADD CONSTRAINT "_products_v_blocks_full_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_image_pair" ADD CONSTRAINT "_products_v_blocks_image_pair_left_id_media_id_fk" FOREIGN KEY ("left_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_image_pair" ADD CONSTRAINT "_products_v_blocks_image_pair_right_id_media_id_fk" FOREIGN KEY ("right_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_image_pair" ADD CONSTRAINT "_products_v_blocks_image_pair_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_quote" ADD CONSTRAINT "_products_v_blocks_quote_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_text" ADD CONSTRAINT "_products_v_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_measurements_image" ADD CONSTRAINT "_products_v_blocks_measurements_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_measurements_image" ADD CONSTRAINT "_products_v_blocks_measurements_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_video" ADD CONSTRAINT "_products_v_blocks_video_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_video" ADD CONSTRAINT "_products_v_blocks_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_video" ADD CONSTRAINT "_products_v_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_style_with" ADD CONSTRAINT "_products_v_blocks_style_with_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_variants" ADD CONSTRAINT "_products_v_version_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_info_pages_v_version_sections" ADD CONSTRAINT "_info_pages_v_version_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_info_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_info_pages_v" ADD CONSTRAINT "_info_pages_v_parent_id_info_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."info_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_about_image_id_media_id_fk" FOREIGN KEY ("version_about_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_featured_product_id_products_id_fk" FOREIGN KEY ("version_featured_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_featured_image_id_media_id_fk" FOREIGN KEY ("version_featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "_products_v_blocks_full_image_order_idx" ON "_products_v_blocks_full_image" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_full_image_parent_id_idx" ON "_products_v_blocks_full_image" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_full_image_path_idx" ON "_products_v_blocks_full_image" USING btree ("_path");
  CREATE INDEX "_products_v_blocks_full_image_image_idx" ON "_products_v_blocks_full_image" USING btree ("image_id");
  CREATE INDEX "_products_v_blocks_image_pair_order_idx" ON "_products_v_blocks_image_pair" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_image_pair_parent_id_idx" ON "_products_v_blocks_image_pair" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_image_pair_path_idx" ON "_products_v_blocks_image_pair" USING btree ("_path");
  CREATE INDEX "_products_v_blocks_image_pair_left_idx" ON "_products_v_blocks_image_pair" USING btree ("left_id");
  CREATE INDEX "_products_v_blocks_image_pair_right_idx" ON "_products_v_blocks_image_pair" USING btree ("right_id");
  CREATE INDEX "_products_v_blocks_quote_order_idx" ON "_products_v_blocks_quote" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_quote_parent_id_idx" ON "_products_v_blocks_quote" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_quote_path_idx" ON "_products_v_blocks_quote" USING btree ("_path");
  CREATE INDEX "_products_v_blocks_text_order_idx" ON "_products_v_blocks_text" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_text_parent_id_idx" ON "_products_v_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_text_path_idx" ON "_products_v_blocks_text" USING btree ("_path");
  CREATE INDEX "_products_v_blocks_measurements_image_order_idx" ON "_products_v_blocks_measurements_image" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_measurements_image_parent_id_idx" ON "_products_v_blocks_measurements_image" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_measurements_image_path_idx" ON "_products_v_blocks_measurements_image" USING btree ("_path");
  CREATE INDEX "_products_v_blocks_measurements_image_image_idx" ON "_products_v_blocks_measurements_image" USING btree ("image_id");
  CREATE INDEX "_products_v_blocks_video_order_idx" ON "_products_v_blocks_video" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_video_parent_id_idx" ON "_products_v_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_video_path_idx" ON "_products_v_blocks_video" USING btree ("_path");
  CREATE INDEX "_products_v_blocks_video_video_idx" ON "_products_v_blocks_video" USING btree ("video_id");
  CREATE INDEX "_products_v_blocks_video_poster_idx" ON "_products_v_blocks_video" USING btree ("poster_id");
  CREATE INDEX "_products_v_blocks_style_with_order_idx" ON "_products_v_blocks_style_with" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_style_with_parent_id_idx" ON "_products_v_blocks_style_with" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_style_with_path_idx" ON "_products_v_blocks_style_with" USING btree ("_path");
  CREATE INDEX "_products_v_version_variants_order_idx" ON "_products_v_version_variants" USING btree ("_order");
  CREATE INDEX "_products_v_version_variants_parent_id_idx" ON "_products_v_version_variants" USING btree ("_parent_id");
  CREATE INDEX "_products_v_parent_idx" ON "_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_published_idx" ON "_products_v" USING btree ("version_published");
  CREATE INDEX "_products_v_version_version_slug_idx" ON "_products_v" USING btree ("version_slug");
  CREATE INDEX "_products_v_version_version_in_source_idx" ON "_products_v" USING btree ("version_in_source");
  CREATE INDEX "_products_v_version_version_category_idx" ON "_products_v" USING btree ("version_category_id");
  CREATE INDEX "_products_v_version_version_in_stock_idx" ON "_products_v" USING btree ("version_in_stock");
  CREATE INDEX "_products_v_version_version_source_updated_at_idx" ON "_products_v" USING btree ("version_source_updated_at");
  CREATE INDEX "_products_v_version_version_external_id_idx" ON "_products_v" USING btree ("version_external_id");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version__status_idx" ON "_products_v" USING btree ("version__status");
  CREATE INDEX "_products_v_created_at_idx" ON "_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_latest_idx" ON "_products_v" USING btree ("latest");
  CREATE INDEX "_products_v_autosave_idx" ON "_products_v" USING btree ("autosave");
  CREATE INDEX "_products_v_rels_order_idx" ON "_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_media_id_idx" ON "_products_v_rels" USING btree ("media_id");
  CREATE INDEX "_products_v_rels_products_id_idx" ON "_products_v_rels" USING btree ("products_id");
  CREATE INDEX "_info_pages_v_version_sections_order_idx" ON "_info_pages_v_version_sections" USING btree ("_order");
  CREATE INDEX "_info_pages_v_version_sections_parent_id_idx" ON "_info_pages_v_version_sections" USING btree ("_parent_id");
  CREATE INDEX "_info_pages_v_parent_idx" ON "_info_pages_v" USING btree ("parent_id");
  CREATE INDEX "_info_pages_v_version_version_slug_idx" ON "_info_pages_v" USING btree ("version_slug");
  CREATE INDEX "_info_pages_v_version_version_updated_at_idx" ON "_info_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_info_pages_v_version_version_created_at_idx" ON "_info_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_info_pages_v_version_version__status_idx" ON "_info_pages_v" USING btree ("version__status");
  CREATE INDEX "_info_pages_v_created_at_idx" ON "_info_pages_v" USING btree ("created_at");
  CREATE INDEX "_info_pages_v_updated_at_idx" ON "_info_pages_v" USING btree ("updated_at");
  CREATE INDEX "_info_pages_v_latest_idx" ON "_info_pages_v" USING btree ("latest");
  CREATE INDEX "_info_pages_v_autosave_idx" ON "_info_pages_v" USING btree ("autosave");
  CREATE INDEX "_home_v_version_hero_version_hero_image_idx" ON "_home_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_home_v_version_about_version_about_image_idx" ON "_home_v" USING btree ("version_about_image_id");
  CREATE INDEX "_home_v_version_featured_version_featured_product_idx" ON "_home_v" USING btree ("version_featured_product_id");
  CREATE INDEX "_home_v_version_featured_version_featured_image_idx" ON "_home_v" USING btree ("version_featured_image_id");
  CREATE INDEX "_home_v_version_version__status_idx" ON "_home_v" USING btree ("version__status");
  CREATE INDEX "_home_v_created_at_idx" ON "_home_v" USING btree ("created_at");
  CREATE INDEX "_home_v_updated_at_idx" ON "_home_v" USING btree ("updated_at");
  CREATE INDEX "_home_v_latest_idx" ON "_home_v" USING btree ("latest");
  CREATE INDEX "_home_v_autosave_idx" ON "_home_v" USING btree ("autosave");
  CREATE INDEX "products__status_idx" ON "products" USING btree ("_status");
  CREATE INDEX "info_pages__status_idx" ON "info_pages" USING btree ("_status");
  CREATE INDEX "home__status_idx" ON "home" USING btree ("_status");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_products_v_blocks_full_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_blocks_image_pair" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_blocks_quote" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_blocks_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_blocks_measurements_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_blocks_style_with" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_variants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_info_pages_v_version_sections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_info_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_home_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "_products_v_blocks_full_image" CASCADE;
  DROP TABLE "_products_v_blocks_image_pair" CASCADE;
  DROP TABLE "_products_v_blocks_quote" CASCADE;
  DROP TABLE "_products_v_blocks_text" CASCADE;
  DROP TABLE "_products_v_blocks_measurements_image" CASCADE;
  DROP TABLE "_products_v_blocks_video" CASCADE;
  DROP TABLE "_products_v_blocks_style_with" CASCADE;
  DROP TABLE "_products_v_version_variants" CASCADE;
  DROP TABLE "_products_v" CASCADE;
  DROP TABLE "_products_v_rels" CASCADE;
  DROP TABLE "_info_pages_v_version_sections" CASCADE;
  DROP TABLE "_info_pages_v" CASCADE;
  DROP TABLE "_home_v" CASCADE;
  DROP INDEX "products__status_idx";
  DROP INDEX "info_pages__status_idx";
  DROP INDEX "home__status_idx";
  ALTER TABLE "products_blocks_full_image" ALTER COLUMN "image_id" SET NOT NULL;
  ALTER TABLE "products_blocks_image_pair" ALTER COLUMN "left_id" SET NOT NULL;
  ALTER TABLE "products_blocks_image_pair" ALTER COLUMN "right_id" SET NOT NULL;
  ALTER TABLE "products_blocks_quote" ALTER COLUMN "text" SET NOT NULL;
  ALTER TABLE "products_blocks_text" ALTER COLUMN "body" SET NOT NULL;
  ALTER TABLE "products_blocks_measurements_image" ALTER COLUMN "image_id" SET NOT NULL;
  ALTER TABLE "products_blocks_video" ALTER COLUMN "video_id" SET NOT NULL;
  ALTER TABLE "products_blocks_video" ALTER COLUMN "poster_id" SET NOT NULL;
  ALTER TABLE "products_variants" ALTER COLUMN "external_id" SET NOT NULL;
  ALTER TABLE "products_variants" ALTER COLUMN "size" SET NOT NULL;
  ALTER TABLE "products_variants" ALTER COLUMN "price" SET NOT NULL;
  ALTER TABLE "products_variants" ALTER COLUMN "available" SET NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "slug" SET NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "price" SET NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "external_id" SET NOT NULL;
  ALTER TABLE "info_pages_sections" ALTER COLUMN "text" SET NOT NULL;
  ALTER TABLE "info_pages" ALTER COLUMN "slug" SET NOT NULL;
  ALTER TABLE "info_pages" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "products" DROP COLUMN "_status";
  ALTER TABLE "info_pages" DROP COLUMN "_status";
  ALTER TABLE "home" DROP COLUMN "_status";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum__products_v_version_status";
  DROP TYPE "public"."enum_info_pages_status";
  DROP TYPE "public"."enum__info_pages_v_version_status";
  DROP TYPE "public"."enum_home_status";
  DROP TYPE "public"."enum__home_v_version_status";`)
}
