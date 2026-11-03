import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { join, dirname, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtemp, rm } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
import { installRuntime } from '../index.js'
import { openPreferences } from '../preferences.js'
import { fixtureCatalog, fixtureQuote, settings } from './fixtures.js'

const runtime = process.env.DSH_RUNTIME_DIR || (process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs', 'DeepSeek Harness', 'resources', 'app', 'dsh'))
const installed = runtime && existsSync(join(runtime, 'package.json'))
const localKey = 'local-integration-test-key'

test('installed official MCP client discovers and calls reads through real Cordis Tools', {
  skip: installed ? false : 'Set DSH_RUNTIME_DIR to an installed DSH runtime to run this integration test', timeout: 20000,
}, async () => {
  const req = createRequire(join(runtime, 'package.json'))
  const load = async (name) => import(pathToFileURL(req.resolve(name)).href)
  const [{ Context }, systemPrompt, tools, official, storage, storageJson, storageDomain, { HostConnectionService }] = await Promise.all([
    load('@deepseek-ai/cordis'), load('@deepseek-ai/dsh-system-prompt'),
    load('@deepseek-ai/dsh-tools'), load('@deepseek-ai/dsh-mcp-client'), load('@deepseek-ai/dsh-storage'),
    load('@deepseek-ai/dsh-storage-json'), load('@deepseek-ai/dsh-storage-domain'), load('@deepseek-ai/dsh-client-connection'),
  ])
  const calls = [], authorizations = []
  let failQuote = false
  const server = createServer(async (request, response) => {
    authorizations.push(request.headers.authorization)
    if (request.headers.authorization !== 'Bearer ' + localKey) { response.writeHead(401).end(); return }
    if (request.method !== 'POST') { response.writeHead(405).end(); return }
    const parts = []
    for await (const part of request) parts.push(part)
    const message = JSON.parse(Buffer.concat(parts).toString())
    calls.push(message)
    if (message.id === undefined) { response.writeHead(202).end(); return }
    let result
    if (message.method === 'initialize') {
      result = { protocolVersion: '2025-11-25', capabilities: { tools: {} }, serverInfo: { name: 'aiyting-test', version: '1.0.0' } }
    } else if (message.method === 'tools/list') {
      result = { tools: ['aiyting_list_models', 'aiyting_estimate_cost', 'aiyting_get_balance', 'aiyting_generate'].map((name) => ({
        name, description: 'Local test only', inputSchema: { type: 'object', additionalProperties: true },
      })) }
    } else if (message.method === 'tools/call') {
      const name = message.params.name
      assert.ok(['aiyting_list_models', 'aiyting_estimate_cost', 'aiyting_get_balance'].includes(name), 'No generation is permitted in this test')
      const data = name === 'aiyting_list_models' ? fixtureCatalog() : name === 'aiyting_get_balance'
        ? { username: 'fixture-account', balanceCredits: 100, dailyLimitCredits: null, todaySpentCredits: 2 } : fixtureQuote()
      result = failQuote && name === 'aiyting_estimate_cost'
        ? { isError: true, content: [{ type: 'text', text: 'Local fixture quote error' }] }
        : { content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data }
    } else {
      response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Method not found' } }))
      return
    }
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const ctx = new Context()
  const storageRoot = await mkdtemp(join(tmpdir(), 'dsh-aiyting-test-'))
  let bridgeFiber
  let credentialWrites = 0
  let foreignCalls = 0
  try {
    await ctx.plugin(systemPrompt.default)
    await ctx.plugin(tools.default, { mode: 'native' })
    await ctx.plugin(storage.default)
    await ctx.plugin(storageJson, { root: storageRoot })
    await ctx.plugin(storageDomain, { backend: 'json' })
    // Real registry distractors represent another configured MCP connection.
    // Their matching suffixes must never supply this plugin's private tools.
    for (const name of ['mcp__aiyting__aiyting_list_models', 'mcp__another__aiyting_list_models',
      'mcp__aiyting__aiyting_get_balance', 'mcp__another__aiyting_generate', 'mcp__another__aiyting_wait_for_task']) {
      ctx.tools.register(tools.defineTool({
        name, description: 'Foreign connection fixture; must never execute', parameters: {},
        output: { schema: { type: 'json' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
        execute: async () => { foreignCalls += 1; return fixtureCatalog() },
      }))
    }
    // Real Connection registry and owner gate, plus official MCP transport,
    // policy pipeline and lifetimes. No user credentials or profile writes.
    new HostConnectionService(ctx, [], {})
    const facade = {
      tools: ctx.tools, plugin: (plugin, config) => (bridgeFiber = ctx.plugin(plugin, config)), on: ctx.on.bind(ctx), effect: ctx.effect.bind(ctx),
      loader: { import: load }, storageDomain: ctx.storageDomain, profileContext: { dir: join(storageRoot, 'profile-a') },
      sessions: { get: (id) => id === 'session-a' ? { id } : undefined },
      credentials: { resolve: async () => ({ value: localKey }), set: async (_ref, value) => { assert.equal(value, localKey); credentialWrites++ } },
      connection: ctx.connection,
    }
    const store = await openPreferences(facade)
    await installRuntime(facade, { endpoint: `http://127.0.0.1:${server.address().port}/mcp` }, store)
    const carrier = ctx.connection.createSharedFetchHandler('/api')
    const request = (operation, payload = {}) => new Request('http://localhost/api/aiyting', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operation, payload }),
    })
    const run = async (operation, payload = {}) => (await carrier.fetch(request(operation, payload), { principal: { kind: 'owner' } })).json()
    assert.equal((await carrier.fetch(request('list_models'), { principal: { kind: 'guest' } })).status, 403)
    const accountRequest = new Request('http://localhost/api/aiyting/account', { method: 'POST', body: JSON.stringify({ operation: 'connect' }) })
    assert.equal((await carrier.fetch(accountRequest, { principal: { kind: 'guest' } })).status, 403)
    const catalog = await run('list_models')
    assert.equal(catalog.ok, true, JSON.stringify(catalog))
    assert.equal(catalog.value.models.length, 2)
    assert.deepEqual(bridgeFiber.config, {})
    assert.ok(!JSON.stringify(bridgeFiber.config).includes(localKey))
    assert.ok(ctx.tools.schemas().some((tool) => tool.name === 'mcp__aiyting-ui__aiyting_list_models'))
    const quote = await run('estimate_cost', settings)
    assert.equal(quote.ok, true, JSON.stringify(quote))
    assert.equal(quote.value.chargedCredits, 3.75)
    const prefs = (await run('get_preferences', { sessionId: 'session-a', accountRevision: catalog.value.accountRevision })).value
    const saved = await run('save_preferences', { sessionId: 'session-a', accountRevision: catalog.value.accountRevision,
      revision: prefs.revision, settings, receipt: quote.value.receipt, makeDefault: true })
    assert.equal(saved.ok, true, JSON.stringify(saved))
    assert.equal(saved.value.settings.count, 2)
    assert.ok(ctx.tools.schemas().some((tool) => tool.name === 'aiyting_image_settings'))
    failQuote = true
    const error = await run('estimate_cost', settings)
    assert.equal(error.ok, false)
    assert.ok(!JSON.stringify(error).includes(localKey))
    const toolCalls = calls.filter((message) => message.method === 'tools/call')
    assert.deepEqual(toolCalls.map((message) => message.params.name), ['aiyting_list_models', 'aiyting_estimate_cost', 'aiyting_estimate_cost'])
    assert.equal(toolCalls[1].params.arguments.count_per_route, 2)
    assert.ok(authorizations.every((value) => value === 'Bearer ' + localKey))
    const accountStatus = await run('get_account')
    assert.equal(accountStatus.ok, true, JSON.stringify(accountStatus))
    assert.equal(accountStatus.value.account.username, 'fixture-account')
    assert.deepEqual(accountStatus.value.capabilities, { models: true, quote: true, balance: true, generate: true, task: false })
    assert.equal(foreignCalls, 0)
    const connect = await (await carrier.fetch(new Request('http://localhost/api/aiyting/account', {
      method: 'POST', body: JSON.stringify({ operation: 'connect', payload: { accountRevision: catalog.value.accountRevision, key: localKey } }),
    }), { principal: { kind: 'owner' } })).json()
    assert.equal(connect.ok, true, JSON.stringify(connect))
    assert.equal(credentialWrites, 1)
    // Reopen the real JSON-backed domain: persistence and profile partitioning
    // are checked through the exact APIs used by the installed plugin.
    const { createHash } = await import('node:crypto')
    const account = createHash('sha256').update(localKey).digest('hex')
    await store.close()
    const reopened = await openPreferences(facade)
    assert.equal((await reopened.load(account, 'session-a')).settings.count, 2)
    assert.equal((await reopened.load(account, null)).settings.count, 2)
    await reopened.close()
    const other = await openPreferences({ ...facade, profileContext: { dir: join(storageRoot, 'profile-b') } })
    assert.equal((await other.load(account, null)).settings, null)
    await other.close()
    // Withdraw only our real MCP fiber. Foreign same-name tools remain live,
    // but missing private tools must fail rather than cross to that connection.
    await bridgeFiber.dispose()
    assert.equal(ctx.tools.get('mcp__aiyting-ui__aiyting_list_models'), undefined)
    assert.ok(ctx.tools.get('mcp__aiyting__aiyting_list_models'))
    const unavailable = await run('list_models')
    assert.equal(unavailable.ok, false)
    assert.match(unavailable.error.message, /MCP 暂未连接成功/)
    const disconnected = await run('get_account')
    assert.equal(disconnected.value.account, null)
    assert.deepEqual(disconnected.value.capabilities, { models: false, quote: false, balance: false, generate: false, task: false })
    assert.equal(foreignCalls, 0)
  } finally {
    await ctx.fiber.dispose()
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
    assert.equal(dirname(storageRoot), tmpdir())
    assert.ok(basename(storageRoot).startsWith('dsh-aiyting-test-'))
    await rm(storageRoot, { recursive: true, force: true })
  }
})
