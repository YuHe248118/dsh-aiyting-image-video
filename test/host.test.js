import assert from 'node:assert/strict'
import test from 'node:test'
import { harness } from './harness.js'
import { fixtureCatalog, fixtureQuote, settings } from './fixtures.js'

const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

test('UI calls only the official registered read tools through the policy pipeline', async () => {
  const h = await harness()
  const catalog = await h.run('list_models')
  const quote = await h.run('estimate_cost', settings)
  assert.equal(catalog.ok, true)
  assert.equal(catalog.value.models.length, 2)
  assert.equal(quote.ok, true)
  assert.equal(quote.value.chargedCredits, 3.75)
  assert.deepEqual(h.calls.map((call) => call.name), ['mcp__aiyting-ui__aiyting_list_models', 'mcp__aiyting-ui__aiyting_estimate_cost'])
  assert.ok(h.calls.every((call) => call.signal instanceof AbortSignal))
  assert.equal(h.connections.length, 1)
  assert.ok(!JSON.stringify([catalog, quote]).includes('test-only-not-a-real-key'))
})

test('unknown operations and paid generation never dispatch', async () => {
  const h = await harness()
  for (const op of ['generate', 'aiyting_generate', 'arbitrary']) assert.equal((await h.run(op)).ok, false)
  assert.equal(h.calls.length, 0)
})

test('inspectable child plugin config never contains a credential or request header', async () => {
  const h = await harness('private-test-credential')
  await h.run('list_models')
  assert.deepEqual(h.connections[0].config, {})
  assert.ok(!JSON.stringify(h.connections[0].config).includes('private-test-credential'))
})

test('missing credentials return an actionable failure and no sample catalog', async () => {
  const h = await harness('')
  const result = await h.run('list_models')
  assert.equal(result.ok, false)
  assert.match(result.error.message, /尚未连接 AIyting/)
  assert.equal(result.value, undefined)
  assert.equal(h.connections.length, 0)
  assert.equal(h.calls.length, 0)
})

test('rotation disposes the previous connection and revocation stops reads', async () => {
  const h = await harness()
  await h.run('list_models')
  await h.changeKey('second-test-key')
  assert.equal(h.connections.length, 1)
  assert.equal(h.connections[0].disposed, true)
  await h.run('list_models')
  assert.equal(h.connections.length, 2)
  await h.changeKey('')
  assert.equal(h.connections[1].disposed, true)
  assert.equal((await h.run('list_models')).ok, false)
})

test('account reads whitelist public fields and never return saved keys', async () => {
  const h = await harness()
  const result = await h.run('get_account')
  assert.equal(result.value.account.username, 'fixture-account')
  assert.deepEqual(Object.keys(result.value.account).sort(), ['balanceCredits', 'dailyLimitCredits', 'todaySpentCredits', 'username'])
  assert.ok(!JSON.stringify(result).includes('test-only-not-a-real-key'))
})

test('capabilities and reads use only the private connection namespace', async () => {
  const h = await harness()
  const own = ['mcp__aiyting-ui__aiyting_list_models', 'mcp__aiyting-ui__aiyting_get_balance']
  const foreign = ['mcp__aiyting__aiyting_estimate_cost', 'mcp__aiyting__aiyting_generate', 'mcp__another__aiyting_wait_for_task']
  const names = [...foreign, ...own]
  h.ctx.tools.schemas = () => names.map((name) => ({ name }))
  h.ctx.tools.get = (name) => names.includes(name) ? {} : undefined
  const catalog = await h.run('list_models')
  assert.equal(catalog.ok, true)
  const account = await h.run('get_account')
  assert.deepEqual(account.value.capabilities, { models: true, quote: false, balance: true, generate: false, task: false })
  assert.deepEqual(h.calls.map((call) => call.name), own)
  h.dispose()
})

test('foreign same-name tools cannot supply a missing private connection', async () => {
  const h = await harness()
  const names = ['mcp__aiyting__aiyting_list_models', 'mcp__another__aiyting_list_models',
    'mcp__aiyting__aiyting_get_balance', 'mcp__another__aiyting_generate', 'mcp__another__aiyting_wait_for_task']
  h.ctx.tools.schemas = () => names.map((name) => ({ name }))
  h.ctx.tools.get = (name) => names.includes(name) ? {} : undefined
  const catalog = await h.run('list_models')
  assert.equal(catalog.ok, false)
  assert.match(catalog.error.message, /MCP 暂未连接成功/)
  const account = await h.run('get_account')
  assert.equal(account.value.account, null)
  assert.deepEqual(account.value.capabilities, { models: false, quote: false, balance: false, generate: false, task: false })
  assert.equal(h.calls.length, 0)
  h.dispose()
})

test('failed account verification preserves the working credential; connect and disconnect are user-only', async () => {
  const h = await harness()
  let status = (await h.run('get_account')).value
  const bad = await h.account('connect', { accountRevision: status.accountRevision, key: 'invalid-candidate-key-123456789' })
  assert.equal(bad.ok, false)
  assert.ok(!JSON.stringify(bad).includes('candidate-secret'))
  assert.equal((await h.ctx.credentials.resolve('AIYTING_API_KEY')).value, 'test-only-not-a-real-key')
  const connected = await h.account('connect', { accountRevision: status.accountRevision, key: 'valid-candidate-key-123456789' })
  assert.equal(connected.ok, true)
  assert.notEqual(connected.value.accountRevision, status.accountRevision)
  status = connected.value
  assert.equal((await h.account('disconnect', { accountRevision: status.accountRevision })).ok, false)
  assert.equal((await h.account('disconnect', { accountRevision: status.accountRevision, confirm: true })).ok, true)
  assert.equal((await h.run('get_account')).value.configured, false)
  assert.deepEqual([...h.definitions.keys()], ['aiyting_image_settings', 'aiyting_image_catalog', 'aiyting_image_generate', 'aiyting_image_task'])
  assert.equal((await h.run('connect', { key: 'valid-candidate-key-123456789' })).ok, false)
})

test('save requires a matching quote receipt, persists only whitelisted settings, and rejects stale accounts', async () => {
  const h = await harness()
  const accountRevision = (await h.run('list_models')).value.accountRevision
  const prefs = (await h.run('get_preferences', { sessionId: 'session-a', accountRevision })).value
  const save = { sessionId: 'session-a', accountRevision, revision: prefs.revision, settings, makeDefault: false }
  assert.equal((await h.run('save_preferences', save)).ok, false)
  const quote = (await h.run('estimate_cost', { ...settings, accountRevision })).value
  assert.equal((await h.run('save_preferences', { ...save, receipt: quote.receipt, settings: { ...settings, count: 3 } })).ok, false)
  assert.equal((await h.run('save_preferences', { ...save, receipt: quote.receipt })).ok, true)
  assert.equal((await h.run('save_preferences', { ...save, receipt: quote.receipt })).ok, false)
  const loaded = (await h.run('get_preferences', { sessionId: 'session-a', accountRevision })).value
  assert.equal(loaded.settings.count, 2)
  assert.equal(loaded.settings.catalogVersion, undefined)
  assert.equal((await h.run('get_preferences', { sessionId: 'missing', accountRevision })).ok, false)
  await h.changeKey('different-account-key')
  assert.equal((await h.run('get_preferences', { sessionId: 'session-a', accountRevision })).ok, false)
})

test('agent tool and UI operations use the same settings state and receipt validation', async () => {
  const h = await harness()
  const prefs = await h.tool({ action: 'get' })
  const quote = await h.tool({ action: 'quote', settings, accountRevision: prefs.accountRevision })
  const saved = await h.tool({ action: 'save', settings, receipt: quote.receipt, revision: prefs.revision, accountRevision: prefs.accountRevision })
  const ui = (await h.run('get_preferences', { sessionId: 'session-a', accountRevision: prefs.accountRevision })).value
  assert.deepEqual(saved, ui)
  assert.equal((await h.tool({ action: 'get' }, 'session-b')).settings, null)
  await assert.rejects(h.tool({ action: 'save', settings, receipt: quote.receipt, revision: prefs.revision, accountRevision: prefs.accountRevision }), /报价已失效/)
})

test('an in-flight reply from a revoked account is discarded', async () => {
  const h = await harness()
  h.ctx.tools.execute = async () => { await h.changeKey('changed-during-read'); return { value: { structuredContent: fixtureCatalog() } } }
  const result = await h.run('list_models')
  assert.equal(result.ok, false)
  assert.match(result.error.message, /凭据已变化/)
})

test('transport failures do not expose request headers or raw secrets', async () => {
  const h = await harness()
  h.ctx.tools.execute = async () => { throw new Error('Authorization: Bearer secret-in-transport-error') }
  const result = await h.run('list_models')
  assert.equal(result.ok, false)
  assert.ok(!JSON.stringify(result).includes('secret-in-transport-error'))
})

test('disposing the panel Host cancels pending tool reads', async () => {
  const h = await harness()
  let pendingSignal
  h.ctx.tools.execute = async (exec) => { pendingSignal = exec.signal; h.dispose(); return { isError: true } }
  await h.run('list_models')
  assert.equal(pendingSignal.aborted, true)
})

test('owner logout removes the shared credential and blocks all further reads', async () => {
  const h = await harness()
  try {
    const status = (await h.run('get_account')).value
    assert.equal(h.connections.length, 1)
    const result = await h.account('logout', { accountRevision: status.accountRevision })
    assert.equal(result.ok, true)
    assert.equal(result.value.configured, false)
    assert.notEqual(result.value.accountRevision, status.accountRevision)
    assert.equal((await h.ctx.credentials.resolve('AIYTING_API_KEY')), undefined)
    assert.equal(h.connections[0].disposed, true)
    assert.equal((await h.run('get_account')).value.configured, false)
    const callsBefore = h.calls.length
    assert.equal((await h.run('list_models')).ok, false)
    assert.equal(h.calls.length, callsBefore)
    assert.equal((await h.account('login_status')).value, null)
  } finally { h.dispose() }
})

test('logout rejects stale accounts and environment credentials without clearing them', async () => {
  const h = await harness()
  try {
    const status = (await h.run('get_connection')).value
    await h.changeKey('new-account-credential')
    assert.equal((await h.account('logout', { accountRevision: status.accountRevision })).ok, false)
    assert.equal((await h.ctx.credentials.resolve('AIYTING_API_KEY')).value, 'new-account-credential')
    const current = (await h.run('get_connection')).value
    h.ctx.credentials.describe = async () => ({ configured: true, source: 'environment' })
    const blocked = await h.account('logout', { accountRevision: current.accountRevision })
    assert.equal(blocked.ok, false)
    assert.match(blocked.error.message, /环境配置/)
    assert.equal((await h.ctx.credentials.resolve('AIYTING_API_KEY')).value, 'new-account-credential')
  } finally { h.dispose() }
})

test('logout waits for asynchronous credential notification to dispose the old MCP connection', async () => {
  const h = await harness(), entered = deferred(), release = deferred()
  try {
    const status = (await h.run('get_account')).value
    const connection = h.connections[0]
    connection.dispose = async () => { entered.resolve(); await release.promise; connection.disposed = true }
    h.ctx.credentials.unset = async () => { void h.changeKey('') }
    let completed = false
    const loggingOut = h.account('logout', { accountRevision: status.accountRevision }).then(value => { completed = true; return value })
    await entered.promise
    await Promise.resolve()
    assert.equal(completed, false, 'logout must not report success while the old raw MCP connection still exists')
    release.resolve()
    assert.equal((await loggingOut).ok, true)
    assert.equal(connection.disposed, true)
    assert.equal((await h.ctx.credentials.resolve('AIYTING_API_KEY')), undefined)
  } finally { release.resolve(); h.dispose() }
})

test('logging out while already empty still invalidates old login requests', async () => {
  const h = await harness('')
  try {
    const before = (await h.run('get_connection')).value
    const out = await h.account('logout', { accountRevision: before.accountRevision })
    assert.equal(out.ok, true)
    assert.notEqual(out.value.accountRevision, before.accountRevision)
    const late = await h.account('login_begin', { accountRevision: before.accountRevision })
    assert.equal(late.ok, false)
    assert.match(late.error.message, /账号已变化/)
    assert.equal((await h.account('login_status')).value, null)
  } finally { h.dispose() }
})

test('failed credential removal preserves the existing account and reports failure', async () => {
  const h = await harness()
  try {
    const before = (await h.run('get_connection')).value
    h.ctx.credentials.unset = async () => { throw new Error('storage secret must never reach browser') }
    const out = await h.account('logout', { accountRevision: before.accountRevision })
    assert.equal(out.ok, false)
    assert.ok(!JSON.stringify(out).includes('storage secret'))
    assert.equal((await h.run('get_connection')).value.configured, true)
    assert.equal((await h.ctx.credentials.resolve('AIYTING_API_KEY')).value, 'test-only-not-a-real-key')
  } finally { h.dispose() }
})

test('logout and legacy disconnect cannot be invoked by conversation tools', async () => {
  const h = await harness()
  try {
    const before = (await h.run('get_connection')).value
    assert.equal((await h.run('logout', { accountRevision: before.accountRevision })).ok, false)
    assert.equal((await h.run('disconnect', { accountRevision: before.accountRevision, confirm: true })).ok, false)
    assert.ok(!h.definitions.has('logout'))
    assert.equal((await h.ctx.credentials.resolve('AIYTING_API_KEY')).value, 'test-only-not-a-real-key')
  } finally { h.dispose() }
})

test('logout waits for its website credential commit without deadlock or resurrection', async () => {
  const originalFetch = globalThis.fetch, originalNow = Date.now
  let clock = 100000
  Date.now = () => clock
  const entered = deferred(), finish = deferred(), calls = []
  const key = 'valid-website-issued-fixture-key-123456789'
  globalThis.fetch = async (url, request) => {
    const operation = new URL(url).pathname.split('/').at(-1)
    calls.push(operation)
    return Response.json(operation === 'device' ? {
      device_code: 'fixture-device-code-12345678901234567890', user_code: 'ABCD-EFGH', expires_in: 60, interval: 5,
      verification_uri_complete: 'https://aiyting.com/plugin-authorize?code=ABCD-EFGH',
    } : operation === 'token' ? { api_key: key } : {})
  }
  const h = await harness()
  try {
    const before = (await h.run('get_connection')).value
    assert.equal((await h.account('login_begin', { accountRevision: before.accountRevision })).ok, true)
    const set = h.ctx.credentials.set
    h.ctx.credentials.set = async (...args) => { await set(...args); entered.resolve(); await finish.promise }
    clock += 5000
    const polling = h.account('login_status')
    await entered.promise
    const loggingOut = h.account('logout', { accountRevision: before.accountRevision })
    finish.resolve()
    const timeout = new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('logout deadlock')), 2000); timer.unref() })
    const result = await Promise.race([loggingOut, timeout])
    assert.equal(result.ok, true)
    assert.equal(result.value.configured, false)
    await polling
    assert.equal((await h.ctx.credentials.resolve('AIYTING_API_KEY')), undefined)
    assert.equal((await h.account('login_status')).value, null)
    assert.ok(!calls.includes('cancel'), 'already committed key is cleared locally, never revoked through pending-grant cleanup')
  } finally { h.dispose(); globalThis.fetch = originalFetch; Date.now = originalNow }
})

test('a stale completed website attempt never authorizes clearing a later external account', async () => {
  const originalFetch = globalThis.fetch, originalNow = Date.now
  let clock = 100000
  Date.now = () => clock
  globalThis.fetch = async url => {
    const operation = new URL(url).pathname.split('/').at(-1)
    return Response.json(operation === 'device' ? {
      device_code: 'fixture-device-code-12345678901234567890', user_code: 'ABCD-EFGH', expires_in: 60, interval: 5,
      verification_uri_complete: 'https://aiyting.com/plugin-authorize?code=ABCD-EFGH',
    } : operation === 'token' ? { api_key: 'valid-website-fixture-key-123456789012345' } : {})
  }
  const h = await harness()
  try {
    const before = (await h.run('get_connection')).value
    await h.account('login_begin', { accountRevision: before.accountRevision })
    clock += 5000
    assert.equal((await h.account('login_status')).value.phase, 'connected')
    await h.changeKey('new-external-fixture-credential')
    const result = await h.account('logout', { accountRevision: before.accountRevision })
    assert.equal(result.ok, false)
    assert.equal((await h.ctx.credentials.resolve('AIYTING_API_KEY')).value, 'new-external-fixture-credential')
  } finally { h.dispose(); globalThis.fetch = originalFetch; Date.now = originalNow }
})

test('website authorization is unavailable to general dispatch and agent tools', async () => {
  const h = await harness()
  for (const operation of ['login_begin', 'login_status', 'login_cancel']) {
    const result = await h.run(operation, { accountRevision: 'stale-account', attemptId: 'arbitrary' })
    assert.equal(result.ok, false)
  }
  const begin = await h.account('login_begin', { accountRevision: 'stale-account' })
  assert.equal(begin.ok, false)
  assert.match(begin.error.message, /账号已变化/)
  assert.equal((await h.account('login_status')).value, null)
  assert.deepEqual([...h.definitions.keys()], ['aiyting_image_settings', 'aiyting_image_catalog', 'aiyting_image_generate', 'aiyting_image_task'])
  assert.equal(h.calls.length, 0)
  assert.equal(h.verified.length, 0)
  h.dispose()
})
