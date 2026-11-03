import assert from 'node:assert/strict'
import test from 'node:test'
import { websiteLogin } from '../website-login.js'

const DEVICE = 'fixture-device-secret-12345678901234567890'
const KEY = 'fixture-issued-api-key-12345678901234567890'
const CODE = 'ABCD-EFGH'
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function fixture(options = {}) {
  let time = 100000, revision = 'account-before', saved = 'working-old-key'
  const controller = new AbortController(), calls = [], commits = [], responses = new Map()
  const device = {
    device_code: DEVICE, user_code: CODE, expires_in: 60, interval: 5,
    verification_uri_complete: 'https://aiyting.com/plugin-authorize?code=' + CODE,
    ...options.device,
  }
  const enqueue = (path, ...items) => responses.set(path, [...(responses.get(path) || []), ...items])
  enqueue('device', options.deviceResponse ?? device)
  const fetcher = async (url, request) => {
    const target = new URL(url), path = target.pathname.split('/').at(-1)
    assert.equal(target.origin, 'https://aiyting.com')
    assert.equal(request.method, 'POST')
    assert.equal(request.redirect, 'error')
    assert.equal(request.credentials, 'omit')
    assert.ok(request.signal instanceof AbortSignal)
    const body = JSON.parse(request.body)
    calls.push({ path, body, signal: request.signal })
    const next = responses.get(path)?.shift()
    if (next instanceof Error) throw next
    const value = typeof next === 'function' ? await next(body, request) : next
    if (value instanceof Response) return value
    return Response.json(value ?? (path === 'token' ? { error: 'authorization_pending' } : {}))
  }
  const identity = async () => ({ revision, key: saved })
  const commit = async (key, expected, signal, guard) => {
    commits.push({ key, expected, signal })
    if (options.beforeCommit) await options.beforeCommit({ signal, guard, setRevision: (next) => { revision = next } })
    signal.throwIfAborted()
    if (revision !== expected) throw new Error('account changed')
    guard()
    if (options.duringCommit) await options.duringCommit()
    saved = key; revision = 'account-after'
    return { configured: true, accountRevision: revision }
  }
  const login = websiteLogin({ endpoint: 'https://aiyting.com/api/mcp', identity, commit,
    signal: controller.signal, fetcher, now: () => time })
  return { login, calls, commits, controller, enqueue,
    begin: () => login.begin(revision), advance: (ms = 5000) => { time += ms },
    saved: () => saved, setRevision: (next) => { revision = next },
  }
}

const assertPublic = (value) => {
  const text = JSON.stringify(value)
  assert.ok(!text.includes(DEVICE), 'device secret must stay on Host')
  assert.ok(!text.includes(KEY), 'issued key must stay on Host')
  assert.ok(!text.includes('server-secret-error'), 'remote error details must not leak')
}

test('website login exposes only confirmation details and reuses a live attempt', async () => {
  const f = fixture(), first = await f.begin()
  assert.equal(first.phase, 'pending')
  assert.equal(first.userCode, CODE)
  assert.equal(first.verificationUri, 'https://aiyting.com/plugin-authorize?code=' + CODE)
  assert.equal((await f.begin()).attemptId, first.attemptId)
  assert.equal(f.calls.length, 1)
  assert.equal((await f.login.status(first.attemptId)).phase, 'pending')
  assert.equal(f.calls.length, 1, 'status respects the server polling interval')
  assertPublic(first)
})

test('stale account or attempt identifiers cannot start or replace login', async () => {
  const f = fixture()
  await assert.rejects(f.login.begin('stale-account'), /账号已变化/)
  assert.equal(f.calls.length, 0)
  const started = await f.begin()
  await assert.rejects(f.login.status('other-attempt'), /登录请求已变化/)
  await assert.rejects(f.login.cancel('other-attempt'), /登录请求已变化/)
  assert.equal((await f.login.status(started.attemptId)).phase, 'pending')
})

test('pending, slow_down, and transient network errors remain retryable without leaking errors', async () => {
  const f = fixture(), started = await f.begin()
  f.enqueue('token', { error: 'authorization_pending' }, { error: 'slow_down' }, new Error('server-secret-error'), { api_key: KEY })
  f.advance()
  assert.equal((await f.login.status(started.attemptId)).phase, 'pending')
  f.advance()
  const slowed = await f.login.status(started.attemptId)
  assert.equal(slowed.nextPollAt, 120000)
  f.advance()
  await f.login.status(started.attemptId)
  assert.equal(f.calls.filter((call) => call.path === 'token').length, 2)
  f.advance()
  const retry = await f.login.status(started.attemptId)
  assert.equal(retry.phase, 'pending')
  assert.match(retry.message, /网络/)
  assertPublic(retry)
  f.advance(10000)
  assert.equal((await f.login.status(started.attemptId)).phase, 'connected')
  assert.equal(f.saved(), KEY)
})

for (const [error, phase] of [['access_denied', 'denied'], ['expired_token', 'expired'], ['invalid_grant', 'error']]) {
  test(`website ${error} preserves the existing connection`, async () => {
    const f = fixture(), started = await f.begin()
    f.enqueue('token', { error, error_description: 'server-secret-error' })
    f.advance()
    const ended = await f.login.status(started.attemptId)
    assert.equal(ended.phase, phase)
    assert.equal(f.saved(), 'working-old-key')
    assert.equal(f.commits.length, 0)
    assert.equal(f.calls.at(-1).path, 'cancel')
    assertPublic(ended)
  })
}

test('local expiry cancels the remote grant without polling or changing the connection', async () => {
  const f = fixture(), started = await f.begin()
  f.advance(60000)
  const ended = await f.login.status(started.attemptId)
  assert.equal(ended.phase, 'expired')
  assert.deepEqual(f.calls.map((call) => call.path), ['device', 'cancel'])
  assert.equal(f.saved(), 'working-old-key')
})

test('account changes before polling cancel the grant rather than signing into another account', async () => {
  const f = fixture(), started = await f.begin()
  f.setRevision('another-account')
  f.advance()
  assert.equal((await f.login.status(started.attemptId)).phase, 'cancelled')
  assert.equal(f.commits.length, 0)
  assert.deepEqual(f.calls.map((call) => call.path), ['device', 'cancel'])
})

test('cancel during an in-flight token response prevents a late key from being saved', async () => {
  const token = deferred(), entered = deferred(), f = fixture(), started = await f.begin()
  f.enqueue('token', async () => { entered.resolve(); return token.promise })
  f.advance()
  const polling = f.login.status(started.attemptId)
  await entered.promise
  const cancelling = f.login.cancel(started.attemptId)
  assert.equal(f.calls.at(-1).signal.aborted, true)
  token.resolve({ api_key: KEY })
  assert.equal((await polling).phase, 'cancelled')
  assert.equal((await cancelling).phase, 'cancelled')
  assert.equal(f.commits.length, 0)
  assert.equal(f.saved(), 'working-old-key')
})

test('cancel while verifying wins before the credential commit', async () => {
  const verifying = deferred(), finish = deferred()
  const f = fixture({ beforeCommit: async () => { verifying.resolve(); await finish.promise } })
  const started = await f.begin()
  f.enqueue('token', { api_key: KEY }); f.advance()
  const polling = f.login.status(started.attemptId)
  await verifying.promise
  const cancelling = f.login.cancel(started.attemptId)
  finish.resolve()
  assert.equal((await polling).phase, 'cancelled')
  assert.equal((await cancelling).phase, 'cancelled')
  assert.equal(f.saved(), 'working-old-key')
  assert.equal(f.calls.at(-1).path, 'cancel')
})

test('an account CAS failure after the token arrives preserves the newer connection', async () => {
  const f = fixture({ beforeCommit: async ({ setRevision }) => setRevision('newer-account') })
  const started = await f.begin()
  f.enqueue('token', { api_key: KEY }); f.advance()
  assert.equal((await f.login.status(started.attemptId)).phase, 'error')
  assert.equal(f.saved(), 'working-old-key')
  assert.equal(f.calls.at(-1).path, 'cancel')
})

test('once the credential write starts cancellation cannot revoke the saved connection', async () => {
  const committing = deferred(), finish = deferred()
  const f = fixture({ duringCommit: async () => { committing.resolve(); await finish.promise } })
  const started = await f.begin()
  f.enqueue('token', { api_key: KEY }); f.advance()
  const polling = f.login.status(started.attemptId)
  await committing.promise
  const cancelling = f.login.cancel(started.attemptId)
  finish.resolve()
  const result = await polling
  assert.equal(result.phase, 'connected')
  assert.equal((await cancelling).phase, 'connected')
  assert.equal(f.saved(), KEY)
  assert.equal(f.calls.some((call) => call.path === 'cancel'), false)
  assertPublic(result)
})

test('a lost completion acknowledgement retains the successfully saved key', async () => {
  const f = fixture(), started = await f.begin()
  f.enqueue('token', { api_key: KEY, private: DEVICE })
  f.enqueue('complete', new Error('server-secret-error'))
  f.advance()
  const ended = await f.login.status(started.attemptId)
  assert.equal(ended.phase, 'connected')
  assert.equal(ended.configured, true)
  assert.equal(ended.accountRevision, 'account-after')
  assert.equal(f.saved(), KEY)
  assert.equal(f.commits.length, 1)
  assert.equal(f.calls.some((call) => call.path === 'cancel'), false)
  assert.deepEqual(await f.login.status(started.attemptId), ended)
  assertPublic(ended)
})

test('expired verification cannot reach the credential commit', async () => {
  const f = fixture({ beforeCommit: async () => f.advance(60000) }), started = await f.begin()
  f.enqueue('token', { api_key: KEY }); f.advance()
  assert.equal((await f.login.status(started.attemptId)).phase, 'error')
  assert.equal(f.saved(), 'working-old-key')
})

test('malicious or ambiguous website confirmation addresses are rejected', async () => {
  for (const uri of [
    'https://evil.example/plugin-authorize?code=' + CODE,
    'javascript:alert(1)',
    'https://aiyting.com/other?code=' + CODE,
    'https://user:password@aiyting.com/plugin-authorize?code=' + CODE,
    'https://aiyting.com/plugin-authorize?code=' + CODE + '#secret',
    'https://aiyting.com/plugin-authorize?code=WRONG-CODE',
    'https://aiyting.com/plugin-authorize?code=' + CODE + '&code=OTHER-CODE',
    'https://aiyting.com/plugin-authorize?code=' + CODE + '&redirect_uri=https://evil.example/',
  ]) {
    const f = fixture({ device: { verification_uri_complete: uri } })
    await assert.rejects(f.begin(), /官网授权/)
    assert.equal(f.commits.length, 0)
  }
})

test('malformed token payloads are rejected without exposing server fields', async () => {
  const f = fixture(), started = await f.begin()
  f.enqueue('token', { api_key: 'bad key', error_description: 'server-secret-error', secret: DEVICE })
  f.advance()
  const ended = await f.login.status(started.attemptId)
  assert.equal(ended.phase, 'error')
  assert.equal(f.commits.length, 0)
  assertPublic(ended)
})

test('Host disposal prevents an in-flight authorization response from changing credentials', async () => {
  const token = deferred(), entered = deferred(), f = fixture(), started = await f.begin()
  f.enqueue('token', async () => { entered.resolve(); return token.promise })
  f.advance()
  const polling = f.login.status(started.attemptId)
  await entered.promise
  f.controller.abort(); f.login.dispose()
  token.resolve({ api_key: KEY })
  assert.equal((await polling).phase, 'cancelled')
  assert.equal(f.commits.length, 0)
  assert.equal(f.saved(), 'working-old-key')
  const cancelled = f.calls.filter((call) => call.path === 'cancel')
  assert.ok(cancelled.length >= 1, 'disposal must also cancel the uncommitted remote grant')
  assert.ok(cancelled.every((call) => !call.signal.aborted), 'cleanup must survive the disposed Host signal')
})

test('Host disposal during grant creation cancels a late grant without publishing it', async () => {
  const response = deferred(), entered = deferred()
  const f = fixture({ deviceResponse: async () => { entered.resolve(); return response.promise } })
  const beginning = f.begin()
  await entered.promise
  f.controller.abort(); f.login.dispose()
  response.resolve({ device_code: DEVICE })
  await assert.rejects(beginning, /连接已关闭/)
  assert.deepEqual(f.calls.map((call) => call.path), ['device', 'cancel'])
  assert.equal(f.calls.at(-1).signal.aborted, false)
  assert.equal(await f.login.status(), null)
  assert.equal(f.commits.length, 0)
})

test('logout reset erases a pending attempt and permits a fresh explicit login', async () => {
  const f = fixture(), started = await f.begin()
  assert.deepEqual(await f.login.reset(), { accountRevision: undefined })
  assert.equal(await f.login.status(), null)
  assert.equal(f.saved(), 'working-old-key')
  assert.equal(f.calls.at(-1).path, 'cancel')
  f.enqueue('device', { device_code: DEVICE, user_code: CODE, expires_in: 60, interval: 5,
    verification_uri_complete: 'https://aiyting.com/plugin-authorize?code=' + CODE })
  const next = await f.begin()
  assert.notEqual(next.attemptId, started.attemptId)
  assert.equal(next.phase, 'pending')
})

test('logout reset fences both a late grant and a begin already queued behind it', async () => {
  const response = deferred(), entered = deferred()
  const f = fixture({ deviceResponse: async () => { entered.resolve(); return response.promise } })
  const beginning = f.begin()
  await entered.promise
  const queued = f.begin()
  const rejected = [assert.rejects(beginning, /取消/), assert.rejects(queued, /取消/)]
  const resetting = f.login.reset()
  response.resolve({ device_code: DEVICE })
  await Promise.all(rejected)
  await resetting
  assert.deepEqual(f.calls.map(call => call.path), ['device', 'cancel'])
  assert.equal(await f.login.status(), null)
  assert.equal(f.commits.length, 0)
})

test('logout reset wins over a token arriving after sign-out', async () => {
  const token = deferred(), entered = deferred(), f = fixture(), started = await f.begin()
  f.enqueue('token', async () => { entered.resolve(); return token.promise })
  f.advance()
  const polling = f.login.status(started.attemptId)
  await entered.promise
  const resetting = f.login.reset()
  token.resolve({ api_key: KEY })
  await polling; await resetting
  assert.equal(await f.login.status(), null)
  assert.equal(f.commits.length, 0)
  assert.equal(f.saved(), 'working-old-key')
})

test('logout reset aborts verification before credential persistence', async () => {
  const entered = deferred(), finish = deferred()
  const f = fixture({ beforeCommit: async () => { entered.resolve(); await finish.promise } })
  const started = await f.begin()
  f.enqueue('token', { api_key: KEY }); f.advance()
  const polling = f.login.status(started.attemptId)
  await entered.promise
  const resetting = f.login.reset()
  finish.resolve()
  await polling; await resetting
  assert.equal(f.saved(), 'working-old-key')
  assert.equal(await f.login.status(), null)
  assert.equal(f.calls.at(-1).path, 'cancel')
})

test('logout reset waits for an irreversible commit then reports only that committed revision', async () => {
  const entered = deferred(), finish = deferred()
  const f = fixture({ duringCommit: async () => { entered.resolve(); await finish.promise } })
  const started = await f.begin()
  f.enqueue('token', { api_key: KEY }); f.advance()
  const polling = f.login.status(started.attemptId)
  await entered.promise
  assert.equal(f.login.canResetFrom('account-before'), true)
  assert.equal(f.login.canResetFrom('unrelated-account'), false)
  const resetting = f.login.reset()
  finish.resolve()
  assert.equal(await polling, null, 'a stale UI response cannot announce connected after reset')
  assert.deepEqual(await resetting, { accountRevision: 'account-after' })
  assert.equal(f.saved(), KEY, 'Host clears the completed credential after helper reset returns')
  assert.equal(await f.login.status(), null)
  assert.equal(f.calls.some(call => call.path === 'cancel'), false, 'a committed credential must not be remotely revoked by reset')
  assert.equal(f.login.canResetFrom('account-before'), false)
})
