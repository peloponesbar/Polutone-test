import * as migration_20261118_172517_initial from './20261118_172517_initial';
import * as migration_20261119_135729_drafts_step1 from './20261119_135729_drafts_step1';
import * as migration_20261119_135737_drafts_step2 from './20261119_135737_drafts_step2';
import * as migration_20261119_180720_orders from './20261119_180720_orders';
import * as migration_20261119_215107_media_storage_fields from './20261119_215107_media_storage_fields';
import * as migration_20261120_095303_site_settings from './20261120_095303_site_settings';
import * as migration_20261120_111206_order_payments from './20261120_111206_order_payments';
import * as migration_20261120_114444_delivery_cdek from './20261120_114444_delivery_cdek';

export const migrations = [
  {
    up: migration_20261118_172517_initial.up,
    down: migration_20261118_172517_initial.down,
    name: '20261118_172517_initial',
  },
  {
    up: migration_20261119_135729_drafts_step1.up,
    down: migration_20261119_135729_drafts_step1.down,
    name: '20261119_135729_drafts_step1',
  },
  {
    up: migration_20261119_135737_drafts_step2.up,
    down: migration_20261119_135737_drafts_step2.down,
    name: '20261119_135737_drafts_step2',
  },
  {
    up: migration_20261119_180720_orders.up,
    down: migration_20261119_180720_orders.down,
    name: '20261119_180720_orders',
  },
  {
    up: migration_20261119_215107_media_storage_fields.up,
    down: migration_20261119_215107_media_storage_fields.down,
    name: '20261119_215107_media_storage_fields',
  },
  {
    up: migration_20261120_095303_site_settings.up,
    down: migration_20261120_095303_site_settings.down,
    name: '20261120_095303_site_settings',
  },
  {
    up: migration_20261120_111206_order_payments.up,
    down: migration_20261120_111206_order_payments.down,
    name: '20261120_111206_order_payments',
  },
  {
    up: migration_20261120_114444_delivery_cdek.up,
    down: migration_20261120_114444_delivery_cdek.down,
    name: '20261120_114444_delivery_cdek'
  },
];
