import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "categories" ADD COLUMN "item_weight" numeric DEFAULT 500;
  ALTER TABLE "orders_items" ADD COLUMN "weight" numeric;
  ALTER TABLE "orders" ADD COLUMN "track_number" varchar;
  ALTER TABLE "orders" ADD COLUMN "shipment_status" varchar;
  ALTER TABLE "orders" ADD COLUMN "shipment_id" varchar;
  ALTER TABLE "orders" ADD COLUMN "city_code" numeric;
  ALTER TABLE "orders" ADD COLUMN "pickup_point" varchar;
  ALTER TABLE "orders" ADD COLUMN "delivery_days" varchar;
  ALTER TABLE "orders" ADD COLUMN "tariff_code" numeric;
  ALTER TABLE "site_settings" ADD COLUMN "delivery_origin_city" numeric;
  ALTER TABLE "site_settings" ADD COLUMN "delivery_shipment_point" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "delivery_origin_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "delivery_free_from" numeric;
  ALTER TABLE "site_settings" ADD COLUMN "delivery_box_length" numeric DEFAULT 30;
  ALTER TABLE "site_settings" ADD COLUMN "delivery_box_width" numeric DEFAULT 25;
  ALTER TABLE "site_settings" ADD COLUMN "delivery_box_height" numeric DEFAULT 10;
  ALTER TABLE "site_settings" ADD COLUMN "delivery_packaging_weight" numeric DEFAULT 150;
  CREATE INDEX "orders_shipment_id_idx" ON "orders" USING btree ("shipment_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "orders_shipment_id_idx";
  ALTER TABLE "categories" DROP COLUMN "item_weight";
  ALTER TABLE "orders_items" DROP COLUMN "weight";
  ALTER TABLE "orders" DROP COLUMN "track_number";
  ALTER TABLE "orders" DROP COLUMN "shipment_status";
  ALTER TABLE "orders" DROP COLUMN "shipment_id";
  ALTER TABLE "orders" DROP COLUMN "city_code";
  ALTER TABLE "orders" DROP COLUMN "pickup_point";
  ALTER TABLE "orders" DROP COLUMN "delivery_days";
  ALTER TABLE "orders" DROP COLUMN "tariff_code";
  ALTER TABLE "site_settings" DROP COLUMN "delivery_origin_city";
  ALTER TABLE "site_settings" DROP COLUMN "delivery_shipment_point";
  ALTER TABLE "site_settings" DROP COLUMN "delivery_origin_label";
  ALTER TABLE "site_settings" DROP COLUMN "delivery_free_from";
  ALTER TABLE "site_settings" DROP COLUMN "delivery_box_length";
  ALTER TABLE "site_settings" DROP COLUMN "delivery_box_width";
  ALTER TABLE "site_settings" DROP COLUMN "delivery_box_height";
  ALTER TABLE "site_settings" DROP COLUMN "delivery_packaging_weight";`)
}
