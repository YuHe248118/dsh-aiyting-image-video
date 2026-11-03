import test from 'node:test'
import assert from 'node:assert/strict'
import { harness } from './harness.js'
import { fixtureCatalog, fixtureQuote } from './fixtures.js'

const exec = { agent: { session: { id: 'session-a' } }, signal: new AbortController().signal }
const quote = () => ({ ...fixtureQuote(), countPerRoute: 1, normalizedParams: { ratio: '1:1', resolution: '1K' } })
const task = (over = {}) => ({ batchId: 'generation_batch_test-0001', status: 'submitted', terminal: false,
  totalChildren: 1, chargedCredits: 3.75, refundedCredits: 0, remainingCredits: 96.25,
  children: [{ taskId: 't1', status: 'pending', routeName: 'C线路', media: [] }], ...over })

async function scenario(reply) {
  const h = await harness()
  const names = []
  h.ctx.tools.execute = async (call) => {
    names.push(call.name)
    const body = call.name.endsWith('list_models') ? fixtureCatalog() : call.name.endsWith('estimate_cost') ? quote() : reply(call)
    return { value: { content: [], structuredContent: body } }
  }
  return { h, names, generate: h.definitions.get('aiyting_image_generate'), ledger: h.definitions.get('aiyting_image_task') }
}

test('a submit is recorded locally and the same request id never pays twice', async () => {
  const done = task({ status: 'succeeded', terminal: true, children: [{ taskId: 't1', status: 'succeeded', routeName: 'C线路', media: [] }] })
  const { names, generate, ledger } = await scenario((call) => call.name.endsWith('aiyting_generate') ? task() : done)
  const quoted = await generate.execute({ prompt: '海边灯塔', clientRequestId: 'ui-test-request-1' }, exec)
  assert.equal(quoted.needsConfirmation, true)
  assert.equal(quoted.quote.chargedCredits, 3.75)

  const submitted = await generate.execute({ prompt: '海边灯塔', clientRequestId: 'ui-test-request-1', maxCredits: 4 }, exec)
  assert.equal(submitted.submitted, true)
  assert.equal(submitted.task.batchId, 'generation_batch_test-0001')
  assert.equal(names.filter((name) => name.endsWith('aiyting_generate')).length, 1)

  const listed = await ledger.execute({}, exec)
  assert.equal(listed.batches.length, 1)
  assert.match(listed.text, /generation_batch_test-0001/)

  // Finishing the batch locally is what makes a later retry resolve from the ledger.
  const finished = await ledger.execute({ batchId: 'generation_batch_test-0001' }, exec)
  assert.equal(finished.terminal, true)

  const before = names.length
  const replay = await generate.execute({ prompt: '海边灯塔', clientRequestId: 'ui-test-request-1', maxCredits: 4 }, exec)
  assert.equal(replay.reused, true)
  assert.equal(replay.task.batchId, 'generation_batch_test-0001')
  assert.equal(names.length, before, 'a known finished request must not reach the network again')
})

test('a finished batch keeps its images so an interrupted turn can recover them', async () => {
  const done = task({ status: 'succeeded', terminal: true, chargedCredits: 3.75,
    children: [{ taskId: 't1', status: 'succeeded', routeName: 'C线路', media: [{ index: 0, status: 'success', url: 'https://example.test/a.png' }] }] })
  const { ledger } = await scenario(() => done)
  const value = await ledger.execute({ batchId: 'generation_batch_test-0001', waitSeconds: 0 }, exec)
  assert.equal(value.status, 'succeeded')
  assert.equal(value.media[0].url, 'https://example.test/a.png')
  assert.match(value.text, /!\[图 1\]\(https:\/\/example\.test\/a\.png\)/)

  const listed = await ledger.execute({}, exec)
  assert.equal(listed.pending, 0)
  assert.equal(listed.batches[0].media[0], 'https://example.test/a.png')
})

test('an unusable task number is rejected before any MCP call', async () => {
  const { names, ledger } = await scenario(() => task())
  await assert.rejects(() => ledger.execute({ batchId: 'x' }, exec), /任务号无效/)
  assert.equal(names.length, 0)
})

test('a refunded batch says the charge came back and how to retry', async () => {
  const refunded = task({ status: 'failed', terminal: true, refundedCredits: 3.75,
    children: [{ taskId: 't1', status: 'failed', routeName: 'C线路', media: [] }] })
  const { ledger } = await scenario(() => refunded)
  const value = await ledger.execute({ batchId: 'generation_batch_test-0001' }, exec)
  assert.match(value.text, /退回 3\.75 点/)
  assert.match(value.text, /重新提交/)
})

test('a running batch promises no second charge, a finished one adds no advice', async () => {
  const { ledger } = await scenario(() => task())
  const running = await ledger.execute({ batchId: 'generation_batch_test-0001' }, exec)
  assert.match(running.text, /不会重复扣/)
})
