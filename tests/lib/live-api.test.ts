import assert from 'node:assert/strict'
import { test } from 'node:test'
import { z } from 'zod'
import { callStructured } from '../../src/lib/llm/client.ts'
import { searchCriteria } from '../../src/lib/tools/search_criteria.ts'
import type { SearchCriteriaInput } from '../../src/lib/contracts.ts'
import { loadDotEnv, requireEnv } from './env.ts'

loadDotEnv()

test('live LLM API returns schema-valid JSON', async () => {
  requireEnv('LLM_API_KEY')

  const schema = z.object({
    label: z.literal('sopilot-live-test'),
    ok: z.boolean(),
  })

  const result = await callStructured(schema, {
    prompt:
      'Return JSON only with exactly {"label":"sopilot-live-test","ok":true}.',
    temperature: 0,
    maxTokens: 80,
  })

  assert.equal(result.ok, true, result.ok ? undefined : result.error)
  assert.deepEqual(result.ok ? result.data : null, {
    label: 'sopilot-live-test',
    ok: true,
  })
})

test('live OpenAI web search returns sourced admission criteria', async () => {
  requireEnv('LLM_API_KEY')

  const input: SearchCriteriaInput = {
    school: 'University of Toronto',
    program: 'Computer Science',
    scholarship: null,
    level: 'undergraduate',
    country: 'Canada',
  }

  const result = await searchCriteria(input, { maxResults: 5 })

  assert.equal(result.found, true, JSON.stringify(result, null, 2))
  assert.ok(result.criteria.length > 0)
  assert.ok(result.sources.length > 0)
  assert.match(result.criteria[0]?.sourceUrl ?? '', /^https?:\/\//)
})
