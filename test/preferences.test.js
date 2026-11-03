import assert from 'node:assert/strict'
import test from 'node:test'
import { imageSettings, preferenceStore, profileDomainName } from '../preferences.js'
import { memoryDomain } from './harness.js'
import { settings } from './fixtures.js'

test('defaults survive reopening; existing conversations retain inherited parameters', async () => {
  const records = new Map()
  const store = preferenceStore(memoryDomain(records))
  const first = await store.save('account-a', null, 0, settings, true)
  const oldSession = await store.load('account-a', 'session-old')
  assert.equal(oldSession.settings.count, 2)
  assert.equal(oldSession.revision, first.revision + 1)
  await store.save('account-a', null, oldSession.revision, { ...settings, count: 4 }, true)
  await store.close()
  const reopened = preferenceStore(memoryDomain(records))
  assert.equal((await reopened.load('account-a', 'session-old')).settings.count, 2)
  assert.equal((await reopened.load('account-a', 'session-new')).settings.count, 4)
  assert.equal((await reopened.load('account-b', 'session-new')).settings, null)
  assert.notEqual(profileDomainName('profile-a'), profileDomainName('profile-b'))
  const isolated = preferenceStore(memoryDomain())
  assert.equal((await isolated.load('account-a', null)).settings, null)
})

test('concurrent saves fail explicitly instead of silently overwriting newer settings', async () => {
  const store = preferenceStore(memoryDomain())
  const results = await Promise.allSettled([
    store.save('a', 'session-a', 0, settings, false),
    store.save('a', 'session-b', 0, { ...settings, count: 3 }, false),
  ])
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  assert.match(results.find((result) => result.status === 'rejected').reason.message, /其他页面变化/)
})

test('failed storage leaves previous defaults intact and validation strips arbitrary fields', async () => {
  const domain = memoryDomain(), store = preferenceStore(domain)
  await store.save('a', null, 0, settings, true)
  const good = domain.table
  domain.table = () => ({ ...good(), put: async () => { throw new Error('disk full') } })
  const failed = preferenceStore(domain)
  await assert.rejects(failed.save('a', null, 1, { ...settings, count: 3 }, true), /disk full/)
  assert.equal((await store.load('a', null)).settings.count, 2)
  const read = await store.load('a', null)
  read.settings.count = 4
  assert.equal((await store.load('a', null)).settings.count, 2)
  assert.equal(imageSettings({ ...settings, key: 'private' }).key, undefined)
  assert.throws(() => imageSettings({ ...settings, count: 0 }), /生图参数/)
})
