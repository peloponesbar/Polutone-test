import { sql } from '@payloadcms/db-postgres'
import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload, type PayloadRequest } from 'payload'

/** Lock ids (any constants). Checkout uses one lock for all orders; payments lock one order. */
export const CHECKOUT_LOCK = 7_206_011
const ORDER_LOCK_SPACE = 7_206_012

type Sessions = Record<string, { db: { execute: (q: unknown) => Promise<unknown> } }>

/** Postgres advisory lock on the transaction's own connection: released on commit or rollback. */
export async function advisoryLock(payload: Payload, req: PayloadRequest, key: number, sub?: number) {
  const sessions = (payload.db as unknown as { sessions: Sessions }).sessions
  const session = req.transactionID ? sessions[String(req.transactionID)] : undefined
  if (!session) throw new Error('An advisory lock needs a database transaction')
  await session.db.execute(sub === undefined ? sql`select pg_advisory_xact_lock(${key})` : sql`select pg_advisory_xact_lock(${key}, ${sub})`)
}

/** Runs `fn` in one transaction: committed when it returns, rolled back when it throws. */
export async function inTransaction<T>(payload: Payload, fn: (req: PayloadRequest) => Promise<T>): Promise<T> {
  const req = await createLocalReq({}, payload)
  await initTransaction(req)
  try {
    const result = await fn(req)
    await commitTransaction(req)
    return result
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}

/** Serializes everything that changes one order's status (webhook, return check, expiry). */
export const lockOrder = (payload: Payload, req: PayloadRequest, orderId: number) =>
  advisoryLock(payload, req, ORDER_LOCK_SPACE, orderId)
