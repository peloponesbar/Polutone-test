import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_cancel_reason" AS ENUM('unpaid', 'shop');
  ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "payment_id" varchar;
  ALTER TABLE "orders" ADD COLUMN "payment_attempts" numeric DEFAULT 0;
  ALTER TABLE "orders" ADD COLUMN "cancel_reason" "enum_orders_cancel_reason";
  CREATE INDEX "orders_payment_id_idx" ON "orders" USING btree ("payment_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "orders_payment_id_idx";
  ALTER TABLE "orders" DROP COLUMN "paid_at";
  ALTER TABLE "orders" DROP COLUMN "payment_id";
  ALTER TABLE "orders" DROP COLUMN "payment_attempts";
  ALTER TABLE "orders" DROP COLUMN "cancel_reason";
  DROP TYPE "public"."enum_orders_cancel_reason";`)
}
