import { createHash, randomUUID } from 'node:crypto'
import { estimateArguments, normalizeCatalog, normalizeQuote, unwrapMcpResult } from './catalog.js'
import { imageSettings } from './preferences.js'
import { accountInfo } from './account.js'
import { websiteLogin } from './website-login.js'
import { registerSettingsTool } from './settings-tool.js'
import { cleanBatchId, cleanPrompt, normalizeTask, registerGenerationTools, resolveSettings } from './generation.js'

const MCP_SERVER_NAME = 'aiyting-ui'
const MCP_TOOL_PREFIX = `mcp__${MCP_SERVER_NAME}__`

export async function installRuntime(ctx, config, store, batches) {
  const endpoint = new URL(config.endpoint || 'https://aiyting.com/api/mcp')
  if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname))) {
    throw new Error('AIyting MCP 地址必须使用 HTTPS（本地测试除外）')
  }
  const ref = config.credentialRef || 'AIYTING_API_KEY'
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(ref)) throw new Error('AIyting 凭据引用无效')
  let fiber, credentialHash, connecting = Promise.resolve(), disposed = false
  let seenHash, accountRevision = randomUUID(), accountMutation = Promise.resolve(), loggingOut = null
  const controller = new AbortController(), receipts = new Map()
  const fingerprint = (value) => value ? createHash('sha256').update(value).digest('hex') : ''
  const identity = async () => {
    const key = (await ctx.credentials.resolve(ref))?.value?.trim() || ''
    const hash = fingerprint(key)
    if (hash !== seenHash) { seenHash = hash; accountRevision = randomUUID(); receipts.clear() }
    return { key, hash, revision: accountRevision }
  }
  const requireAccount = async (expected) => {
    const current = await identity()
    if (!current.key) throw new Error('尚未连接 AIyting：请从左侧 AIyting 页面连接账号。')
    if (expected !== undefined && expected !== current.revision) throw new Error('AIyting 账号已变化，请刷新后重新确认参数。')
    return current
  }
  const ensureConnection = () => {
    connecting = connecting.catch(() => {}).then(async () => {
      const current = await requireAccount()
      if (disposed) throw new Error('AIyting 连接已关闭')
      if (fiber && current.hash === credentialHash) return current
      if (fiber) { await fiber.dispose(); fiber = undefined }
      credentialHash = undefined
      const official = await ctx.loader.import('@deepseek-ai/dsh-mcp-client')
      if (disposed) throw new Error('AIyting 连接已关闭')
      // Resolved headers stay in a closure, outside inspectable Cordis config.
      const mcpConfig = official.Config({ serverName: MCP_SERVER_NAME, transport: 'streamable-http', url: endpoint.href,
        headers: { Authorization: 'Bearer ' + current.key }, toolCallTimeoutMs: 120000, failOnStartupError: true })
      fiber = ctx.plugin({ name: 'aiyting-mcp-connection', inject: official.inject,
        async apply(mcpCtx) { await official.apply(mcpCtx, mcpConfig) },
      }, {})
      await fiber.await()
      if ((await identity()).hash !== current.hash) throw new Error('AIyting 账号已变化，请刷新目录。')
      credentialHash = current.hash
      return current
    })
    return connecting
  }
  // A dead transport (proxy reset, cold handshake, upstream 502) is rebuilt once
  // instead of surfacing as a permanent "catalog unavailable".
  const reconnect = async () => {
    const pending = fiber
    fiber = undefined
    credentialHash = undefined
    if (pending) await pending.dispose().catch(() => {})
  }
  // Only this private connection's namespace may supply tools or capabilities.
  // Another MCP server can expose identical raw tool names under other credentials.
  const availableTools = () => (ctx.tools.schemas?.() || []).map((schema) => schema.name)
    .filter((name) => typeof name === 'string' && name.startsWith(MCP_TOOL_PREFIX))
    .map((name) => name.slice(MCP_TOOL_PREFIX.length).replace(/^aiyting_/, ''))
  const capabilities = () => {
    const names = availableTools()
    return { models: names.includes('list_models'), quote: names.includes('estimate_cost'),
      balance: names.includes('get_balance'), generate: names.includes('generate'),
      task: names.includes('get_task') || names.includes('wait_for_task') }
  }
  const query = async (name, args, signal, expectedRevision, timeoutMs = 35000) => {
    const current = await requireAccount(expectedRevision)
    // The first call after a cold start can lose its transport handshake while the
    // MCP client is still connecting; reads and idempotent submits get one retry.
    for (let attempt = 0; ; attempt += 1) {
      await ensureConnection()
      const resolved = MCP_TOOL_PREFIX + name
      if (!ctx.tools.get(resolved)) {
        const names = availableTools(), wanted = name.replace(/^aiyting_/, '')
        if (wanted === 'generate' && names.length) {
          throw new Error('AIyting 当前连接没有开放生图能力：需要带生图权限的接入密钥，并且当前 DSH 会话权限允许写操作（只读预设会隐藏生图工具）。')
        }
        throw new Error('AIyting MCP 暂未连接成功，请检查访问钥匙和网络后刷新目录。'
          + (names.length ? `当前可用：${names.join('、')}。` : ''))
      }
      const result = await ctx.tools.execute({ name: resolved, arguments: args, callId: 'aiyting-ui-' + randomUUID(),
        signal: AbortSignal.any([signal, controller.signal, AbortSignal.timeout(timeoutMs)]) })
      if ((await identity()).hash !== current.hash) throw new Error('AIyting 账号凭据已变化，请刷新目录。')
      if (result.isError) {
        // Only the two cheap discovery reads are safe to repeat blindly; quotes and
        // submits surface their error so nobody is charged twice.
        const retry = attempt === 0 && !signal.aborted && /list_models|get_balance/.test(name)
        if (retry) { await reconnect(); continue }
        throw new Error('AIyting 查询失败，请检查访问权限、线路和规格后重试。')
      }
      return { data: unwrapMcpResult(result), current }
    }
  }
  const sessionOf = (payload) => {
    const id = payload?.sessionId
    if (id == null) return null
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(id) || !ctx.sessions.get(id)) {
      throw new Error('AIyting 当前会话不可用，请返回对话后重试。')
    }
    return id
  }
  const selectionKey = (value) => JSON.stringify([value.catalogVersion, imageSettings(value)])
  const dispatch = async (operation, payload = {}, signal) => {
    if (operation === 'get_connection') {
      const current = await identity()
      return { configured: Boolean(current.key), accountRevision: current.revision }
    }
    if (operation === 'get_account') {
      const current = await identity()
      if (!current.key) return { configured: false, accountRevision: current.revision }
      try {
        const { data } = await query('aiyting_get_balance', {}, signal, current.revision)
        return { configured: true, accountRevision: current.revision, account: accountInfo(data), capabilities: capabilities() }
      } catch {
        await requireAccount(current.revision)
        return { configured: true, accountRevision: current.revision, account: null, capabilities: capabilities(),
          connectionError: '连接暂不可用，请刷新或重新连接；钥匙需要 catalog:read 和 account:read 权限。' }
      }
    }
    if (operation === 'list_models') {
      const { data, current } = await query('aiyting_list_models', { media_type: 'image' }, signal)
      return { ...normalizeCatalog(data), accountRevision: current.revision }
    }
    if (operation === 'estimate_cost') {
      const { data, current } = await query('aiyting_estimate_cost', estimateArguments(payload), signal, payload.accountRevision)
      const quote = normalizeQuote(data, payload), receipt = randomUUID()
      receipts.set(receipt, { account: current.hash, key: selectionKey(payload), expires: Date.now() + 120000 })
      for (const [id, record] of receipts) if (record.expires < Date.now() || receipts.size > 128) receipts.delete(id)
      return { ...quote, receipt, accountRevision: current.revision }
    }
    if (operation === 'submit_generation') {
      const current = await requireAccount(payload.accountRevision)
      const sessionId = sessionOf(payload), prompt = cleanPrompt(payload.prompt)
      // A retry after a crash must not pay twice: a finished request id answers from the ledger.
      const known = await batches.findByRequest(current.hash, payload.clientRequestId)
      if (known?.terminal && known.batchId) {
        const reuseSettings = known.settings || resolveSettings(payload, null,
          normalizeCatalog((await query('aiyting_list_models', { media_type: 'image' }, signal)).data))
        return { submitted: true, reused: true, clientRequestId: known.clientRequestId, prompt,
          settings: reuseSettings,
          quote: { chargedCredits: known.chargedCredits ?? 0, countPerRoute: reuseSettings.count || 1 },
          task: { batchId: known.batchId, status: known.status, terminal: true, media: (known.media || []).map((url) => ({ url })),
            chargedCredits: known.chargedCredits, refundedCredits: known.refundedCredits, remainingCredits: known.remainingCredits,
            children: [], totalChildren: (known.media || []).length, error: null } }
      }
      const catalog = normalizeCatalog((await query('aiyting_list_models', { media_type: 'image' }, signal)).data)
      const stored = sessionId ? (await store.load(current.hash, sessionId)).settings : null
      const settings = resolveSettings(payload, stored, catalog)
      const { data: quoted } = await query('aiyting_estimate_cost', estimateArguments(settings), signal)
      const quote = normalizeQuote(quoted, settings)
      const price = { chargedCredits: quote.chargedCredits, countPerRoute: quote.countPerRoute }
      if (payload.maxCredits == null) return { needsConfirmation: true, prompt, settings, quote: price }
      if (typeof payload.maxCredits !== 'number' || !Number.isFinite(payload.maxCredits) || quote.chargedCredits > payload.maxCredits) {
        throw new Error(`AIyting 本次报价 ${quote.chargedCredits} 点，超过允许的 ${payload.maxCredits} 点；确认后可重新提交。`)
      }
      const requestId = typeof payload.clientRequestId === 'string' && /^[A-Za-z0-9._:-]{8,120}$/.test(payload.clientRequestId)
        ? payload.clientRequestId : 'ui-' + randomUUID()
      const { data } = await query('aiyting_generate', {
        media_type: 'image', model_id: settings.modelId, route_ids: [settings.routeId], ratio: settings.aspectRatio,
        ...(settings.resolution === '标准' ? {} : { resolution: settings.resolution }),
        ...(settings.quality ? { quality: settings.quality } : {}),
        count_per_route: settings.count, prompt, client_request_id: requestId,
      }, signal, undefined, 90000)
      await requireAccount(current.revision)
      const task = normalizeTask(data)
      await batches.remember(current.hash, { batchId: task.batchId, clientRequestId: requestId, settings: imageSettings(settings), task })
      return { submitted: true, clientRequestId: requestId, prompt, settings, quote: price, task }
    }
    if (operation === 'get_generation') {
      const batchId = cleanBatchId(payload.batchId)
      const wait = Number.isInteger(payload.waitSeconds) ? Math.min(Math.max(payload.waitSeconds, 0), 50) : 0
      const name = wait ? 'aiyting_wait_for_task' : 'aiyting_get_task'
      const { data, current } = await query(name, { batch_id: batchId, include_images: true, max_images: 16,
        ...(wait ? { timeout_seconds: wait } : {}) }, signal, undefined, (wait + 30) * 1000)
      const task = normalizeTask(data)
      await batches.remember(current.hash, { batchId, task })
      return task
    }
    // Recovery path: after a crash, a dead tool call or a restarted plugin the
    // ledger still knows which batches were paid for, so they can be picked up.
    if (operation === 'list_generations') {
      const current = await requireAccount(payload.accountRevision)
      const items = await batches.list(current.hash)
      const refresh = payload.refresh !== false
      const open = items.filter((item) => !item.terminal).slice(0, 3)
      for (const item of refresh ? open : []) {
        try {
          const { data } = await query('aiyting_get_task', { batch_id: item.batchId, include_images: true, max_images: 16 },
            signal, undefined, 30000)
          await batches.remember(current.hash, { batchId: item.batchId, task: normalizeTask(data) })
        } catch { /* keep the stored snapshot when the network or account is unavailable */ }
      }
      const latest = await batches.list(current.hash)
      return { accountRevision: current.revision, batches: latest, pending: latest.filter((item) => !item.terminal).length }
    }
    if (operation === 'get_preferences') {
      const current = await requireAccount(payload.accountRevision)
      const value = await store.load(current.hash, sessionOf(payload))
      await requireAccount(current.revision)
      return { ...value, accountRevision: current.revision }
    }
    if (operation === 'save_preferences') {
      const current = await requireAccount(payload.accountRevision), sessionId = sessionOf(payload)
      const receipt = receipts.get(payload.receipt)
      if (!receipt || receipt.account !== current.hash || receipt.expires < Date.now() || receipt.key !== selectionKey(payload.settings)) {
        throw new Error('AIyting 报价已失效，请刷新报价后再保存。')
      }
      if (!Number.isSafeInteger(payload.revision) || payload.revision < 0 || typeof payload.makeDefault !== 'boolean') throw new Error('AIyting 设置请求无效。')
      const value = await store.save(current.hash, sessionId, payload.revision, payload.settings, payload.makeDefault)
      receipts.delete(payload.receipt)
      await requireAccount(current.revision)
      return { ...value, accountRevision: current.revision }
    }
    throw new Error('AIyting 此操作不可用。')
  }
  // Verify a candidate in an isolated SDK client; uncommitted credentials do
  // not register tools or enter inspectable configuration or agent context.
  const verifyKey = async (key, signal) => {
    const { Client, StreamableHTTPClientTransport } = await ctx.loader.import('@modelcontextprotocol/client')
    const client = new Client({ name: 'aiyting-account-connect', version: '0.1.0' }, { capabilities: {} })
    try {
      const transport = new StreamableHTTPClientTransport(endpoint, {
        requestInit: { headers: { Authorization: 'Bearer ' + key } },
        fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.any([signal, controller.signal, AbortSignal.timeout(30000)]) }),
      })
      await client.connect(transport)
      const available = await client.listTools()
      if (!['aiyting_list_models', 'aiyting_estimate_cost', 'aiyting_get_balance'].every((name) => available.tools.some((tool) => tool.name === name))) {
        throw new Error('AIyting 钥匙需要 catalog:read 和 account:read 权限，请到官网重新创建。')
      }
      return accountInfo(unwrapMcpResult(await client.callTool({ name: 'aiyting_get_balance', arguments: {} }, { signal })))
    } finally { await client.close().catch(() => {}) }
  }
  const accountAction = (operation, payload, signal, beforeCommit) => {
    if (operation === 'disconnect') {
      if (payload?.confirm !== true) throw new Error('AIyting 请确认退出本机共享连接。')
      return accountAction('logout', payload, signal)
    }
    if (operation === 'logout') {
      if (loggingOut) return loggingOut
      const action = (async () => {
        const before = await identity()
        const expected = payload?.accountRevision
        if (expected !== before.revision && !login.canResetFrom(expected)) throw new Error('AIyting 账号已变化，请刷新后重试。')
        const description = await ctx.credentials.describe(ref)
        if (description.source && description.source !== 'file') throw new Error('AIyting 连接来自环境配置，请在原配置处移除后退出。')
        const reset = await login.reset()
        const clear = accountMutation.catch(() => {}).then(async () => {
          const current = await identity()
          // Only this request's original account or its already committing
          // website login may be removed. An external account change still wins.
          if (current.revision !== expected && current.revision !== reset.accountRevision) {
            throw new Error('AIyting 账号已变化，请刷新后重试。')
          }
          await ctx.credentials.unset(ref)
          // Credential notifications are fire-and-forget in the installed Host.
          // Drain their teardown before reporting logout, including raw MCP tools.
          await connecting.catch(() => {})
          await reconnect()
          const after = await identity()
          if (after.key) throw new Error('AIyting 连接来自环境配置，请在原配置处移除后退出。')
          accountRevision = randomUUID(); receipts.clear()
          return { configured: false, accountRevision }
        })
        accountMutation = clear.catch(() => {})
        return clear
      })()
      loggingOut = action
      void action.finally(() => { if (loggingOut === action) loggingOut = null }).catch(() => {})
      return action
    }
    if (loggingOut) throw new Error('AIyting 正在退出登录，请稍后重试。')
    if (operation === 'login_begin') return login.begin(payload?.accountRevision)
    if (operation === 'login_status') return login.status(payload?.attemptId)
    if (operation === 'login_cancel') return login.cancel(payload?.attemptId)
    const action = accountMutation.catch(() => {}).then(async () => {
      const before = await identity()
      if (payload?.accountRevision !== before.revision) throw new Error('AIyting 账号已变化，请刷新后重试。')
      if (operation === 'connect') {
        const key = typeof payload.key === 'string' ? payload.key.trim() : ''
        if (key.length < 24 || key.length > 512 || /\s/.test(key)) throw new Error('AIyting 请粘贴完整的接入密钥。')
        await verifyKey(key, signal)
        if ((await identity()).revision !== before.revision) throw new Error('AIyting 账号已变化，请刷新后重试。')
        beforeCommit?.()
        await ctx.credentials.set(ref, key)
      } else throw new Error('AIyting 此账号操作不可用。')
      const after = await identity()
      return { configured: Boolean(after.key), accountRevision: after.revision }
    })
    accountMutation = action.catch(() => {})
    return action
  }
  const login = websiteLogin({ endpoint, identity, signal: controller.signal,
    commit: (key, revision, signal, guard) => accountAction('connect', { key, accountRevision: revision }, signal, guard),
  })
  const respond = async (job) => {
    try { return Response.json({ ok: true, value: await job() }, { headers: { 'Cache-Control': 'no-store' } }) } catch (error) {
      const message = error instanceof Error && /^(尚未连接 AIyting|AIyting |生图参数|MCP |报价与)/.test(error.message)
        ? error.message : 'AIyting 查询暂不可用，请检查连接后重试。'
      return Response.json({ ok: false, error: { code: 'AIYTING_OPERATION_FAILED', message } })
    }
  }
  await registerSettingsTool(ctx, dispatch)
  await registerGenerationTools(ctx, dispatch)
  // The native /api carrier owns browser auth, Host/Origin checks and owner gating.
  for (const [path, handler] of [['/api/aiyting', dispatch], ['/api/aiyting/account', accountAction]]) {
    ctx.effect(() => ctx.connection.fetch.register({ path, methods: ['POST'], requestBody: 'buffered',
      fetch: async (request) => {
        if (Number(request.headers.get('content-length')) > 8192) return new Response(null, { status: 413 })
        let body
        try { body = await request.json() } catch { return Response.json({ ok: false, error: { message: 'AIyting 请求格式无效' } }, { status: 400 }) }
        return respond(() => handler(body?.operation, body?.payload, request.signal))
      },
    }), 'aiyting-ui: ' + path)
  }
  ctx.on('credentials/reference-updated', (updated) => {
    if (updated !== ref) return
    connecting = connecting.catch(() => {}).then(async () => {
      await identity()
      if (fiber) { await fiber.dispose(); fiber = undefined }
      credentialHash = undefined
    })
    return connecting
  })
  ctx.effect(() => () => { disposed = true; controller.abort(); login.dispose(); receipts.clear() }, 'aiyting-ui: pending reads')
}
