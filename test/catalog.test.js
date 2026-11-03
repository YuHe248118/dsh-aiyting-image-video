import assert from 'node:assert/strict'
import test from 'node:test'
import { estimateArguments, normalizeCatalog, normalizeQuote, unwrapMcpResult } from '../catalog.js'
import { fixtureCatalog, fixtureQuote, settings } from './fixtures.js'

test('accepts structured content and older text-only MCP replies', () => {
  const data = fixtureCatalog()
  assert.deepEqual(unwrapMcpResult({ value: { content: [], structuredContent: data } }), data)
  assert.deepEqual(unwrapMcpResult({ content: [{ type: 'text', text: JSON.stringify(data) }] }), data)
})

test('rejects MCP errors and malformed replies without forwarding sensitive upstream text', () => {
  for (const result of [{ isError: true }, { structuredContent: { error: { message: 'secret-token' } } }, { content: [{ type: 'text', text: 'not JSON' }] }]) {
    assert.throws(() => unwrapMcpResult(result), (error) => !error.message.includes('secret-token'))
  }
})

test('uses numeric catalog version, live models and per-model route prices', () => {
  const data = normalizeCatalog(fixtureCatalog())
  assert.equal(data.catalogVersion, 17)
  assert.deepEqual(data.models.map((model) => model.name), ['测试香蕉二代', '测试香蕉 2.1'])
  assert.equal(data.routes[0].pricing.variants[0].unitPriceCredits, 1.25)
  assert.equal(data.routes[1].pricing.variants[0].unitPriceCredits, 9.5)
  assert.notEqual(data.routes[0].modelId, data.routes[1].modelId)
  assert.ok(data.models[0].aliases.includes('香蕉2'))
  assert.ok(!data.models[1].aliases.includes('香蕉2'))
})

test('accepts the online multi-catalog envelope and model descriptions', () => {
  const fixture = fixtureCatalog()
  const { catalogVersion, limits, models } = fixture
  models[0].note = '来自线上模型的说明'
  const data = normalizeCatalog({ catalogs: [{ mediaType: 'video', catalogVersion: 99 }, { mediaType: 'image', catalogVersion, limits }], models })
  assert.equal(data.catalogVersion, catalogVersion)
  assert.equal(data.models[0].note, '来自线上模型的说明')
  assert.equal(data.models.length, 2)
})

test('preserves unknown and zero telemetry and route maintenance', () => {
  const { routes } = normalizeCatalog(fixtureCatalog())
  assert.equal(routes[0].successRate, null)
  assert.equal(routes[0].avgSeconds, null)
  assert.equal(routes[1].successRate, 0)
  assert.equal(routes[1].avgSeconds, 3)
  assert.equal(routes[1].available, false)
  assert.equal(routes[1].status, 'down')
})

test('an empty or malformed catalog never falls back to demo entries', () => {
  assert.deepEqual(normalizeCatalog({ catalogVersion: 18, models: [] }).models, [])
  assert.throws(() => normalizeCatalog({ models: [] }))
})

test('quote arguments whitelist the image read contract without conversation content', () => {
  const args = estimateArguments({ ...settings, prompt: 'private conversation', client_request_id: 'ignored', endpoint: 'ignored' })
  assert.deepEqual(args, { media_type: 'image', model_id: settings.modelId, route_ids: [settings.routeId], ratio: '1:1',
    resolution: '2K', count_per_route: 2, prompt: 'AIyting 生图参数报价' })
  assert.ok(!JSON.stringify(args).includes('private conversation'))
  assert.equal(estimateArguments({ ...settings, resolution: '标准' }).resolution, undefined)
  assert.equal(estimateArguments({ ...settings, quality: 'high' }).quality, 'high')
  for (const count of [0, 5, 1.5]) assert.throws(() => estimateArguments({ ...settings, count }))
})

test('uses the server batch quote rather than multiplying catalog unit prices', () => {
  assert.equal(normalizeQuote(fixtureQuote(), settings).chargedCredits, 3.75)
  assert.equal(normalizeQuote({ ...fixtureQuote(), chargedCredits: 0 }, settings).chargedCredits, 0)
})

test('rejects quotes for stale catalogs, other models/routes/counts and invalid prices', () => {
  for (const change of [{ catalogVersion: 18 }, { modelId: 'nano-banana-2.1' }, { routes: [{ routeId: 'other' }] },
    { countPerRoute: 1 }, { chargedCredits: -1 }, { chargedCredits: '3.75' },
    { normalizedParams: { ratio: '16:9', resolution: '2K' } }, { normalizedParams: { ratio: '1:1', resolution: '4K' } }]) {
    assert.throws(() => normalizeQuote({ ...fixtureQuote(), ...change }, settings))
  }
})
