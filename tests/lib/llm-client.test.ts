import assert from 'node:assert/strict'
import { test } from 'node:test'
import { z } from 'zod'
import { callStructured, type LlmTransport } from '../../src/lib/llm/client.ts'

const zAnswer = z.object({ answer: z.string() })

test('callStructured returns validated JSON from the first response', async () => {
  const transport: LlmTransport = async () => ({
    choices: [{ message: { content: '{"answer":"ok"}' } }],
  })

  const result = await callStructured(zAnswer, { prompt: 'Return JSON' }, { transport })

  assert.equal(result.ok, true)
  assert.deepEqual(result.ok ? result.data : null, { answer: 'ok' })
})

test('callStructured repairs once when the first response fails schema validation', async () => {
  let calls = 0
  const transport: LlmTransport = async () => {
    calls += 1
    return calls === 1
      ? { choices: [{ message: { content: '{"wrong":"shape"}' } }] }
      : { choices: [{ message: { content: '{"answer":"repaired"}' } }] }
  }

  const result = await callStructured(zAnswer, { prompt: 'Return JSON' }, { transport })

  assert.equal(calls, 2)
  assert.equal(result.ok, true)
  assert.deepEqual(result.ok ? result.data : null, { answer: 'repaired' })
})

test('callStructured degrades after one failed repair', async () => {
  const transport: LlmTransport = async () => ({
    choices: [{ message: { content: '{"wrong":"shape"}' } }],
  })

  const result = await callStructured(zAnswer, { prompt: 'Return JSON' }, { transport })

  assert.equal(result.ok, false)
  assert.equal(result.ok ? null : result.code, 'DEGRADED')
})
