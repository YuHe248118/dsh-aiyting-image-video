import { createHash } from 'node:crypto'

const fields = ['modelId', 'routeId', 'aspectRatio', 'resolution', 'quality', 'count']
export function imageSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ['modelId', 'routeId', 'aspectRatio', 'resolution'].some((key) => typeof value[key] !== 'string' || !value[key] || value[key].length > 160)
    || !Number.isInteger(value.count) || value.count < 1 || value.count > 4
    || (value.quality != null && !['low', 'medium', 'high'].includes(value.quality))) {
    throw new Error('生图参数不完整，请重新选择模型、线路和规格')
  }
  return Object.fromEntries(fields.map((key) => [key, key === 'quality' ? value[key] || null : value[key]]))
}

export const profileDomainName = (directory) => 'aiyting_ui_' + createHash('sha256').update(directory).digest('hex').slice(0, 20)

/** One native atomic record contains this account's defaults and session choices. */
export function preferenceStore(domain) {
  const table = domain.table('accounts')
  let chain = Promise.resolve()
  const serialize = (action) => {
    const next = chain.catch(() => {}).then(action)
    chain = next.catch(() => {})
    return next
  }
  const empty = () => ({ revision: 0, defaults: null, sessions: {} })
  const view = (record, sessionId) => ({
    revision: record.revision,
    settings: sessionId ? record.sessions[sessionId] || record.defaults : record.defaults,
    defaults: record.defaults,
    source: sessionId && record.sessions[sessionId] ? 'session' : 'default',
  })
  return {
    load: (account, sessionId) => serialize(async () => {
      let record = table.get(account) || empty()
      // A session inherits once; later changes to defaults affect new sessions.
      if (sessionId && !record.sessions[sessionId] && record.defaults) {
        record = { ...record, revision: record.revision + 1, sessions: { ...record.sessions, [sessionId]: record.defaults } }
        await table.put(account, record)
      }
      return structuredClone(view(record, sessionId))
    }),
    save: (account, sessionId, expectedRevision, value, makeDefault) => serialize(async () => {
      const settings = imageSettings(value)
      const record = table.get(account) || empty()
      if (record.revision !== expectedRevision) throw new Error('AIyting 设置已在其他页面变化，请刷新后重试。')
      const next = {
        revision: record.revision + 1,
        defaults: !sessionId || makeDefault ? settings : record.defaults,
        sessions: sessionId ? { ...record.sessions, [sessionId]: settings } : record.sessions,
      }
      await table.put(account, next)
      return structuredClone(view(next, sessionId))
    }),
    close: async () => { await chain; await domain.close() },
  }
}

export async function openPreferences(ctx) {
  const [{ defineDomain, domainTable }, { z }] = await Promise.all([
    ctx.loader.import('@deepseek-ai/dsh-storage-domain'), ctx.loader.import('zod'),
  ])
  const settings = z.strictObject({ modelId: z.string(), routeId: z.string(), aspectRatio: z.string(),
    resolution: z.string(), quality: z.enum(['low', 'medium', 'high']).nullable(), count: z.number().int().min(1).max(4) })
  const spec = defineDomain({
    name: profileDomainName(ctx.profileContext.dir), version: 1,
    tables: { accounts: domainTable(z.strictObject({ revision: z.number().int().nonnegative(),
      defaults: settings.nullable(), sessions: z.record(z.string(), settings) })) },
  })
  const domain = await ctx.storageDomain.open(spec)
  const store = preferenceStore(domain)
  ctx.effect(() => () => store.close(), 'aiyting-ui: persistent preferences')
  return store
}
