import assert from 'node:assert/strict'
import { installRuntime } from '../index.js'
import { preferenceStore } from '../preferences.js'
import { batchStore } from '../batches.js'
import { fixtureCatalog, fixtureQuote } from './fixtures.js'

export function memoryDomain(records = new Map()) {
  return { records, table: () => ({ get: (id) => records.get(id), put: async (id, value) => { records.set(id, structuredClone(value)) } }), close: async () => {} }
}

export async function harness(initialKey = 'test-only-not-a-real-key') {
  let key = initialKey, onUpdated
  const calls = [], connections = [], cleanup = [], handlers = new Map(), definitions = new Map(), verified = []
  const domain = memoryDomain(), taskDomain = memoryDomain()
  const ctx = {
    loader: { import: async (name) => {
      if (name === '@deepseek-ai/dsh-mcp-client') return { Config: (config) => config, inject: ['tools'], apply: async () => {} }
      if (name === '@deepseek-ai/dsh-tools') return { defineTool: (value) => value }
      assert.equal(name, '@modelcontextprotocol/client')
      return {
        Client: class {
          async connect(transport) {
            verified.push(transport.options.requestInit.headers.Authorization)
            if (transport.options.requestInit.headers.Authorization.includes('invalid')) throw new Error('transport rejected candidate-secret')
          }
          async listTools() { return { tools: ['aiyting_list_models', 'aiyting_estimate_cost', 'aiyting_get_balance'].map((name) => ({ name })) } }
          async callTool() { return { structuredContent: { username: 'fixture-account', balanceCredits: 100, dailyLimitCredits: null, todaySpentCredits: 2, privateData: 'never-send' } } }
          async close() {}
        },
        StreamableHTTPClientTransport: class { constructor(url, options) { this.url = url; this.options = options } },
      }
    } },
    credentials: {
      resolve: async (ref) => { assert.equal(ref, 'AIYTING_API_KEY'); return key ? { value: key } : undefined },
      describe: async () => ({ configured: Boolean(key), source: key ? 'file' : undefined }),
      set: async (ref, next) => { assert.equal(ref, 'AIYTING_API_KEY'); key = next; await onUpdated(ref) },
      unset: async (ref) => { key = ''; await onUpdated(ref) },
    },
    sessions: { get: (id) => ['session-a', 'session-b'].includes(id) ? { id } : undefined },
    plugin: (_plugin, config) => {
      const connection = { config, disposed: false, await: async () => {}, dispose: async () => { connection.disposed = true } }
      connections.push(connection)
      return connection
    },
    tools: {
      get: () => ({}), register: (value) => definitions.set(value.name, value),
      execute: async (exec) => {
        calls.push(exec)
        const value = exec.name.endsWith('list_models') ? fixtureCatalog() : exec.name.endsWith('get_balance')
          ? { username: 'fixture-account', balanceCredits: 100, dailyLimitCredits: null, todaySpentCredits: 2, privateData: 'never-send' } : fixtureQuote()
        return { value: { content: [], structuredContent: value } }
      },
    },
    connection: { fetch: { register: (route) => { handlers.set(route.path, route.fetch); return () => handlers.delete(route.path) } } },
    on: (event, callback) => { assert.equal(event, 'credentials/reference-updated'); onUpdated = callback },
    effect: (callback) => cleanup.push(callback()),
  }
  await installRuntime(ctx, {}, preferenceStore(domain), batchStore(taskDomain))
  const run = async (operation, payload = {}, path = '/api/aiyting') => (await handlers.get(path)(new Request('http://localhost' + path, {
    method: 'POST', body: JSON.stringify({ operation, payload }), headers: { 'content-type': 'application/json' },
  }))).json()
  return { ctx, calls, connections, domain, taskDomain, definitions, verified, run,
    account: (op, payload) => run(op, payload, '/api/aiyting/account'),
    tool: (args, session = 'session-a') => definitions.get('aiyting_image_settings').execute(args, { agent: { session: { id: session } }, signal: new AbortController().signal }),
    changeKey: async (next) => { key = next; await onUpdated('AIYTING_API_KEY') },
    dispose: () => cleanup.forEach((fn) => fn()),
  }
}
