import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { test } from 'node:test'
import { runIntakeStep } from '../../src/lib/actions.ts'
import { createInitialAgentState } from '../../src/lib/memory/state.ts'
import type { LlmTransport } from '../../src/lib/llm/client.ts'
import type { SearchProvider } from '../../src/lib/tools/search_criteria.ts'

const failingTransport: LlmTransport = async () => {
  throw new Error('offline load test transport')
}

const provider: SearchProvider = async () => [
  {
    title: 'Admissions criteria',
    url: 'https://example.edu/criteria',
    snippet: 'Admission requirements include academic performance, activities, and English proficiency.',
  },
]

test('local intake action load stays responsive under concurrent requests', async () => {
  const iterations = 40
  const start = performance.now()
  const results = await Promise.all(
    Array.from({ length: iterations }).map((_, index) =>
      runIntakeStep(
        {
          state: createInitialAgentState(),
          userMessage: `Applicant ${index} has grade 12 physics, robotics club, and a sensor project for a garden.`,
        },
        { transport: failingTransport, search: { provider } },
      ),
    ),
  )
  const elapsedMs = performance.now() - start

  assert.equal(results.length, iterations)
  assert.equal(results.every((result) => result.ok), true)
  assert.ok(elapsedMs < 2500, `expected load path under 2500ms, got ${elapsedMs.toFixed(1)}ms`)
})
