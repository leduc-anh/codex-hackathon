import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  parseOpenAiWebSearchSources,
  searchCriteria,
  type SearchProvider,
} from '../../src/lib/tools/search_criteria.ts'
import type { SearchCriteriaInput } from '../../src/lib/contracts.ts'

const input: SearchCriteriaInput = {
  school: 'Demo University',
  program: 'Computer Science',
  scholarship: null,
  level: 'undergraduate',
  country: 'United States',
}

test('searchCriteria returns sourced criteria from provider snippets', async () => {
  const provider: SearchProvider = async () => [
    {
      title: 'Demo University admissions',
      url: 'https://example.edu/admissions',
      snippet: 'Admission requirements include minimum GPA 3.0 and IELTS 6.5 for applicants.',
    },
  ]

  const result = await searchCriteria(input, { provider })

  assert.equal(result.found, true)
  assert.equal(result.criteria.length, 1)
  assert.equal(result.criteria[0]?.sourceUrl, 'https://example.edu/admissions')
  assert.equal(result.sources.length, 1)
})

test('searchCriteria abstains when provider returns no usable criteria', async () => {
  const provider: SearchProvider = async () => [
    {
      title: 'Demo University campus life',
      url: 'https://example.edu/campus',
      snippet: 'Students enjoy clubs, events, and a beautiful campus.',
    },
  ]

  const result = await searchCriteria(input, { provider })

  assert.deepEqual(result, {
    found: false,
    criteria: [],
    sources: [
      {
        title: 'Demo University campus life',
        url: 'https://example.edu/campus',
        snippet: 'Students enjoy clubs, events, and a beautiful campus.',
      },
    ],
  })
})

test('searchCriteria degrades to found=false when provider throws', async () => {
  const provider: SearchProvider = async () => {
    throw new Error('search failed')
  }

  const result = await searchCriteria(input, { provider })

  assert.deepEqual(result, { found: false, criteria: [], sources: [] })
})

test('parseOpenAiWebSearchSources extracts citation sources from Responses payload', () => {
  const sources = parseOpenAiWebSearchSources(
    {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'Admission requirements include IELTS and academic criteria.',
              annotations: [
                {
                  type: 'url_citation',
                  title: 'Admissions requirements',
                  url: 'https://example.edu/admissions/requirements',
                },
              ],
            },
          ],
        },
      ],
    },
    3,
  )

  assert.deepEqual(sources, [
    {
      title: 'Admissions requirements',
      url: 'https://example.edu/admissions/requirements',
      snippet: 'Admission requirements include IELTS and academic criteria.',
    },
  ])
})
