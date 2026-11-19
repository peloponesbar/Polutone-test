// Local databases only (dev and test use schema push, not migrations).
// Applies the listed migrations by hand in one transaction — needed when a migration
// moves data, which push cannot do. Usage:
//   PAYLOAD_MIGRATING=true payload run src/scripts/apply-dev-migrations.ts -- <name> [<name> ...]
import config from '@payload-config'
import { getPayload, type PayloadRequest } from 'payload'

import { migrations } from '../migrations'

if (process.env.PAYLOAD_MIGRATING !== 'true') {
  console.error('Run with PAYLOAD_MIGRATING=true, otherwise schema push runs first.')
  process.exit(1)
}

const names = process.argv.slice(2).filter((a) => a !== '--')
const selected = migrations.filter((m) => names.includes(m.name))
if (selected.length !== names.length || names.length === 0) {
  console.error(`Unknown migrations. Available: ${migrations.map((m) => m.name).join(', ')}`)
  process.exit(1)
}

const payload = await getPayload({ config })
const req = { payload } as PayloadRequest
const transactionID = await payload.db.beginTransaction()
if (transactionID) req.transactionID = transactionID
try {
  for (const migration of selected) {
    payload.logger.info(`Applying ${migration.name}`)
    const db = transactionID ? (payload.db as any).sessions[transactionID].db : payload.db.drizzle // eslint-disable-line @typescript-eslint/no-explicit-any
    await migration.up({ db, payload, req } as never)
  }
  if (transactionID) await payload.db.commitTransaction(transactionID)
  payload.logger.info('Done')
  process.exit(0)
} catch (error) {
  if (transactionID) await payload.db.rollbackTransaction(transactionID)
  payload.logger.error({ err: error, msg: 'Migration failed, rolled back' })
  process.exit(1)
}
