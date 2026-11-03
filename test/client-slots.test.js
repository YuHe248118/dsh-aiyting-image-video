/**
 * Offline regression for the installed DSH slot contract and AIyting/Voice coexistence.
 * Run: node --test test/client-slots.test.js
 * Set DSH_RUNTIME_DIR for another DSH installation; AIYTING_PLUGIN_DIR can point
 * to a staged plugin root. Otherwise client.js is read from this test's parent.
 * This extracts the real SlotCore implementation from the installed frontend; it does
 * not reproduce its registration rules. React hooks are an observational harness only.
 * No credentials, profile data, GUI, network, transcription, or generation are accessed.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import test from 'node:test'

const runtime = process.env.DSH_RUNTIME_DIR || (process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'DeepSeek Harness', 'resources', 'app', 'dsh'))
const plugin = process.env.AIYTING_PLUGIN_DIR || fileURLToPath(new URL('../', import.meta.url))
const required = [
  'package.json',
  'node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js',
  'node_modules/@deepseek-ai/dsh-experimental-client-ui-voice-input/lib/client.js',
  'node_modules/@deepseek-ai/dsh-web-frontend/dist/assets',
]
const installed = runtime && required.every((file) => existsSync(path.join(runtime, file)))

if (!installed) {
  test('installed DSH client slot integration', {
    skip: 'Set DSH_RUNTIME_DIR to an installed DSH runtime with the conversation, voice and web frontend packages to run these integration checks',
  }, () => {})
} else {
const packagePath = (name, suffix) => path.join(runtime, 'node_modules/@deepseek-ai', name, suffix)
const conversationPath = packagePath('dsh-client-ui-conversation', 'lib/client.js')
const voicePath = packagePath('dsh-experimental-client-ui-voice-input', 'lib/client.js')
const assetsPath = packagePath('dsh-web-frontend', 'dist/assets')
const [conversation, voice, pluginSource, assetNames] = await Promise.all([
  readFile(conversationPath, 'utf8'), readFile(voicePath, 'utf8'),
  readFile(path.join(plugin, 'client.js'), 'utf8'), readdir(assetsPath),
])
let installedCore
for (const name of assetNames.filter((name) => /^index-.*\.js$/.test(name))) {
  const file = path.join(assetsPath, name)
  const source = await readFile(file, 'utf8')
  const conflict = source.indexOf('already has a registration')
  if (conflict < 0) continue
  const starts = [...source.slice(0, conflict).matchAll(/var ([\w$]+)=class\{/g)]
  const start = starts.at(-1)
  assert.ok(start, 'locate installed SlotCore class')
  const className = start[1]
  const exportMarker = new RegExp(`;const [\\w$]+=Object\\.freeze\\(Object\\.defineProperty\\(\\{__proto__:null,SlotCore:${className},`)
  const tail = source.slice(conflict).match(exportMarker)
  assert.ok(tail, 'locate installed SlotCore export boundary')
  const end = conflict + tail.index
  const prefix = source.slice(Math.max(0, start.index - 100), start.index)
  const empty = prefix.match(/const ([\w$]+)=Object\.freeze\(\[\]\);$/)
  assert.ok(empty, 'locate installed core empty-array constant')
  const extracted = `const ${empty[1]}=Object.freeze([]);${source.slice(start.index, end)};globalThis.SlotCore=${className}`
  const sandbox = { queueMicrotask }
  vm.runInNewContext(extracted, sandbox, { filename: `${file}#SlotCore`, timeout: 2000 })
  installedCore = { Class: sandbox.SlotCore, file, sha256: createHash('sha256').update(extracted).digest('hex') }
  break
}
assert.ok(installedCore, 'installed frontend containing SlotCore must be present')

function contract(name) {
  const escaped = name.replaceAll('.', '\\.')
  const found = conversation.match(new RegExp(`"${escaped}": \\{\\s*kind: "([^"]+)",\\s*scope: "([^"]+)"`))
  assert.ok(found, `installed declaration of ${name}`)
  return { kind: found[1], scope: found[2] }
}

const voiceRegistration = voice.match(/ctx\.slots\.inject\("conversation\.input\.activity",[\s\S]*?\}, VoiceInput\)\);/)?.[0]
assert.ok(voiceRegistration, 'extract official installed voice registration without evaluating its speech code')

function registry() {
  const core = new installedCore.Class()
  core.register({ name: 'root', children: {
    main: { kind: 'keyed', scope: 'root' },
    'sidebar.panellist': { kind: 'list', scope: 'root' },
    'conversation.input.activity': contract('conversation.input.activity'),
    'conversation.input.right': contract('conversation.input.right'),
  } }, function InstalledOwnerFixture() {})
  return core
}

function slotService(core, registrant, disposers = []) {
  return {
    register(options, component) {
      const dispose = core.register({ ...options, registrant }, component)
      disposers.push(dispose)
      return dispose
    },
    inject(name, callback) {
      assert.ok(core.spec(name), `${name} must already be declared`)
      return callback()
    },
  }
}

function installVoice(core) {
  function VoiceInput() {}
  vm.runInNewContext(voiceRegistration, {
    ctx: { slots: slotService(core, 'official-voice') },
    NS: 'voice', actions: Object.freeze({}), VoiceInput,
  }, { filename: `${voicePath}#registration` })
  return VoiceInput
}

function installAIyting(core, slotName) {
  // Changing only the registration target permits both the former and corrected
  // composition to be checked against the same real client implementation.
  const source = slotName === undefined ? pluginSource : pluginSource.replace(/(['"])conversation\.input\.(?:activity|right)\1/g, `'${slotName}'`)
  const effects = []
  const disposers = []
  const requests = []
  const React = {
    Fragment: Symbol('Fragment'),
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: (effect) => { effects.push(effect) },
  }
  let definition
  const browser = {
    __ModuleLoader__: { load: (entry) => { definition = entry.factory((name) => {
      assert.equal(name, 'react')
      return React
    }) } },
    addEventListener() {}, removeEventListener() {},
    setTimeout, clearTimeout,
  }
  vm.runInNewContext(source, {
    window: browser, AbortController, setTimeout, clearTimeout,
    fetch: async (_url, options) => {
      const body = JSON.parse(options.body)
      requests.push(body)
      let value
      if (body.operation === 'list_models') value = { accountRevision: 17, catalogVersion: 1, models: [], routes: [] }
      else if (body.operation === 'get_preferences') value = { revision: 1, settings: null }
      else assert.fail(`unexpected operation: ${body.operation}; test never permits paid calls`)
      return { ok: true, json: async () => ({ ok: true, value }) }
    },
  }, { filename: path.join(plugin, 'client.js'), timeout: 2000 })
  assert.ok(definition?.apply)
  definition.apply({
    slots: slotService(core, 'aiyting', disposers),
    connection: {}, locale: { register: () => () => {} },
    effect: (callback) => { const dispose = callback(); if (typeof dispose === 'function') disposers.push(dispose) },
  })
  return { effects, requests, dispose: () => { for (const dispose of disposers.reverse()) dispose() } }
}

test('installed owner declares activity single/session and right list/session', (t) => {
  assert.deepEqual(contract('conversation.input.activity'), { kind: 'single', scope: 'session' })
  assert.deepEqual(contract('conversation.input.right'), { kind: 'list', scope: 'session' })
  t.diagnostic(`Real installed SlotCore: ${installedCore.file}; extracted sha256=${installedCore.sha256}`)
})

test('current complete client registers the named sidebar and additive composer control with voice', () => {
  const core = registry()
  const voiceComponent = installVoice(core)
  const aiyting = installAIyting(core)
  assert.equal(core.entriesOfSlot('conversation.input.activity').length, 1)
  assert.equal(core.entriesOfSlot('conversation.input.activity')[0].component, voiceComponent)
  assert.deepEqual(Array.from(core.entriesOfSlot('conversation.input.right'), (entry) => entry.options.id), ['aiyting-image-settings'])
  assert.equal(core.entriesOfSlot('main').length, 1)
  assert.equal(core.entriesOfSlot('sidebar.panellist').length, 1)
  assert.equal(core.entriesOfSlot('sidebar.panellist')[0].options.label, 'aiyting生图/生视频')
  aiyting.dispose()
  assert.equal(core.entriesOfSlot('conversation.input.activity')[0].component, voiceComponent)
})

for (const order of ['voice-first', 'aiyting-first']) {
  test(`former activity registration reproduces installed collision (${order})`, () => {
    const core = registry()
    if (order === 'voice-first') {
      installVoice(core)
      assert.throws(() => installAIyting(core, 'conversation.input.activity'), /single slot "conversation\.input\.activity" already has a registration/)
    } else {
      installAIyting(core, 'conversation.input.activity')
      assert.throws(() => installVoice(core), /single slot "conversation\.input\.activity" already has a registration/)
    }
  })

  test(`right list permits voice, AIyting and an existing toolbar accessory (${order})`, () => {
    const core = registry()
    core.register({ name: 'conversation.input.right', id: 'existing-accessory', order: 10 }, function Accessory() {})
    let aiyting
    let voiceComponent
    if (order === 'voice-first') {
      voiceComponent = installVoice(core)
      aiyting = installAIyting(core, 'conversation.input.right')
    } else {
      aiyting = installAIyting(core, 'conversation.input.right')
      voiceComponent = installVoice(core)
    }
    assert.equal(core.entriesOfSlot('conversation.input.activity').length, 1)
    assert.equal(core.entriesOfSlot('conversation.input.activity')[0].component, voiceComponent)
    assert.deepEqual(Array.from(core.entriesOfSlot('conversation.input.right'), (entry) => entry.options.id), ['existing-accessory', 'aiyting-image-settings'])
    assert.equal(core.entriesOfSlot('main').length, 1)
    assert.equal(core.entriesOfSlot('sidebar.panellist').length, 1)
    aiyting.dispose()
    assert.equal(core.entriesOfSlot('conversation.input.activity')[0].component, voiceComponent)
    assert.deepEqual(Array.from(core.entriesOfSlot('conversation.input.right'), (entry) => entry.options.id), ['existing-accessory'])
  })
}

test('right-slot parameter panel retains session identity in real preference requests', async () => {
  const core = registry()
  installVoice(core)
  const aiyting = installAIyting(core, 'conversation.input.right')
  const connected = core.entriesOfSlot('conversation.input.right')[0].component
  const sessionId = 'session-slot-regression'
  const activity = connected({ sessionId, useInput: (select) => select({ phase: 'idle', draft: '' }) })
  assert.equal(activity.props.sessionId, sessionId)
  assert.equal(activity.props.key, sessionId)
  const element = activity.type(activity.props)
  assert.ok(element, 'parameter activity creates its toolbar control')
  const cleanups = aiyting.effects.map((effect) => effect()).filter((cleanup) => typeof cleanup === 'function')
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(aiyting.requests.map((entry) => entry.operation), ['list_models', 'get_preferences'])
  assert.equal(aiyting.requests[1].payload.sessionId, sessionId)
  assert.equal(aiyting.requests[1].payload.accountRevision, 17)
  for (const cleanup of cleanups.reverse()) cleanup()
  aiyting.dispose()
})

}
