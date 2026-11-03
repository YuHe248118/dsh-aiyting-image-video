import { createHash } from 'node:crypto'

/** Keep the last few task ids per account so a crash, restart or dead tool call never loses a paid batch. */
const LIMIT = 12
const idPattern = /^[A-Za-z0-9._:-]{4,120}$/
const mediaOf = (value) => (Array.isArray(value?.media) ? value.media : [])
  .map((item) => (typeof item === 'string' ? item : item?.url))
  .filter((url) => typeof url === 'string' && /^https?:\/\//.test(url)).slice(0, 16)
const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null)
/** Only the six stored panel fields: the resolved settings also carry names and a catalog version. */
const pick = (value) => value && typeof value === 'object'
  ? { modelId: String(value.modelId), routeId: String(value.routeId), aspectRatio: String(value.aspectRatio),
    resolution: String(value.resolution), quality: value.quality ?? null, count: value.count }
  : null

export const batchDomainName = (directory) => 'aiyting_ui_tasks_' + createHash('sha256').update(directory).digest('hex').slice(0, 20)

/**
 * Ledger of submitted batches. Written the moment a submit returns, so an
 * interrupted turn can still be finished with `aiyting_image_task` alone.
 */
export function batchStore(domain) {
  const table = domain.table('batches')
  let chain = Promise.resolve()
  const serialize = (action) => {
    const next = chain.catch(() => {}).then(action)
    chain = next.catch(() => {})
    return next
  }
  const read = (account) => {
    const record = table.get(account)
    return Array.isArray(record?.items) ? record.items : []
  }
  const write = (account, items) => table.put(account, { items: items.slice(0, LIMIT) })
  return {
    /** Remember a freshly submitted batch, or bump a known one with the latest upstream status. */
    remember: (account, entry) => serialize(async () => {
      if (typeof entry?.batchId !== 'string' || !idPattern.test(entry.batchId)) return null
      const items = read(account).filter((item) => item.batchId !== entry.batchId)
      const previous = read(account).find((item) => item.batchId === entry.batchId)
      const media = mediaOf(entry.task)
      const next = {
        batchId: entry.batchId,
        clientRequestId: typeof entry.clientRequestId === 'string' ? entry.clientRequestId : previous?.clientRequestId || null,
        createdAt: previous?.createdAt || new Date().toISOString(),
        settings: pick(entry.settings) || previous?.settings || null,
        status: typeof entry.task?.status === 'string' ? entry.task.status : previous?.status || 'submitted',
        terminal: entry.task?.terminal === true || previous?.terminal === true,
        chargedCredits: num(entry.task?.chargedCredits) ?? previous?.chargedCredits ?? null,
        refundedCredits: num(entry.task?.refundedCredits) ?? previous?.refundedCredits ?? null,
        remainingCredits: num(entry.task?.remainingCredits) ?? previous?.remainingCredits ?? null,
        media: media.length ? media : previous?.media || [],
      }
      await write(account, [next, ...items])
      return structuredClone(next)
    }),
    /** Newest first; `pending` keeps only unfinished batches worth re-reading. */
    list: (account, { pending = false } = {}) => serialize(async () => {
      const items = read(account)
      return structuredClone(pending ? items.filter((item) => !item.terminal) : items)
    }),
    /** Used to refuse a retry that would pay twice for an already finished request. */
    findByRequest: (account, clientRequestId) => serialize(async () => {
      if (typeof clientRequestId !== 'string') return null
      const item = read(account).find((entry) => entry.clientRequestId === clientRequestId)
      return item ? structuredClone(item) : null
    }),
    close: async () => { await chain; await domain.close() },
  }
}

export async function openBatches(ctx) {
  const [{ defineDomain, domainTable }, { z }] = await Promise.all([
    ctx.loader.import('@deepseek-ai/dsh-storage-domain'), ctx.loader.import('zod'),
  ])
  const settings = z.strictObject({ modelId: z.string(), routeId: z.string(), aspectRatio: z.string(),
    resolution: z.string(), quality: z.enum(['low', 'medium', 'high']).nullable(), count: z.number().int().min(1).max(4) })
  const spec = (suffix) => defineDomain({
    name: batchDomainName(ctx.profileContext.dir) + suffix, version: 1,
    tables: { batches: domainTable(z.strictObject({ items: z.array(z.strictObject({
      batchId: z.string(), clientRequestId: z.string().nullable(), createdAt: z.string(),
      settings: settings.nullable(), status: z.string(), terminal: z.boolean(),
      chargedCredits: z.number().nullable(), refundedCredits: z.number().nullable(),
      remainingCredits: z.number().nullable(), media: z.array(z.string()),
    })) })) },
  })
  // A record written by an older build must never stop the plugin from loading:
  // fall back to a fresh table instead of failing the whole runtime.
  let domain
  try { domain = await ctx.storageDomain.open(spec('')) } catch { domain = await ctx.storageDomain.open(spec('_r' + Date.now().toString(36))) }
  const store = batchStore(domain)
  ctx.effect(() => () => store.close(), 'aiyting-ui: generation ledger')
  return store
}
