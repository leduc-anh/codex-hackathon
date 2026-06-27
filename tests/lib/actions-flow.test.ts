import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  generateRewrite,
  nextInterrogationTurn,
  runIntakeStep,
  scaffoldDraft,
} from '../../src/lib/actions.ts'
import { createInitialAgentState } from '../../src/lib/memory/state.ts'
import type { LlmTransport } from '../../src/lib/llm/client.ts'
import type { SearchProvider } from '../../src/lib/tools/search_criteria.ts'

const provider: SearchProvider = async () => [
  {
    title: 'Official admissions requirements',
    url: 'https://example.edu/admissions',
    snippet: 'Admission requirements include academic strength, English proficiency, and essay criteria.',
  },
]

const transport: LlmTransport = async (request) => {
  if (request.prompt.includes('Merge the user message')) {
    return {
      profile: {
        targetCountry: 'United States',
        targetProgram: 'Engineering',
        level: 'undergraduate',
        education: 'Grade 12 physics specialist',
        activities: [
          {
            title: 'Soil moisture sensor',
            role: 'Builder',
            contribution: 'Built a sensor for a family garden',
            impact: 'Helped monitor dry soil',
          },
        ],
        awards: ['Provincial physics prize'],
        workExperience: [],
        motivations: 'Use engineering to help local agriculture',
        gapFlags: ['Missing verified English score.'],
      },
      assistantMessage: 'I captured your engineering evidence and marked the English-score gap.',
      shortlistSummary: 'Engineering fit computed from sourced criteria.',
    }
  }

  if (request.prompt.includes('Create a deliberately plain')) {
    return {
      id: 'draft-test',
      body: 'I have always liked engineering. I built a sensor for my family garden. I want to help farmers.',
      version: 0,
      source: 'ai_scaffolded',
    }
  }

  if (request.prompt.includes('Extract the most concrete')) {
    return { extractedSpecific: 'the garden soil dried out during a hot week' }
  }

  if (request.prompt.includes('Choose the next weakest')) {
    return {
      targetSentence: 'I want to help farmers.',
      framingTag: 'vague_passion',
      question: 'Which farmer or family member did this matter to, and what changed for them?',
    }
  }

  if (request.prompt.includes('Rewrite the draft')) {
    return {
      rewrittenText:
        'When the garden soil dried out during a hot week, engineering became a way to protect something my family cared about.',
      changes: [
        {
          before: 'I have always liked engineering.',
          after: 'engineering became a way to protect something my family cared about',
          framingReason: 'Turns a generic passion claim into a concrete motivation.',
          groundedIn: 'student_answer',
        },
        {
          before: 'I built a sensor for my family garden.',
          after: 'the garden soil dried out during a hot week',
          framingReason: 'Adds stakes from the student answer.',
          groundedIn: 'student_answer',
        },
      ],
      framingScoreBefore: 40,
      framingScoreAfter: 82,
    }
  }

  throw new Error(`Unexpected prompt: ${request.prompt}`)
}

test('action flow uses typed actions end to end', async () => {
  const intake = await runIntakeStep(
    {
      state: createInitialAgentState(),
      userMessage:
        'Grade 12 physics, built a soil moisture sensor for my family garden, applying engineering.',
    },
    { transport, search: { provider } },
  )

  assert.equal(intake.ok, true, intake.ok ? undefined : intake.error)
  assert.equal(intake.ok ? intake.data.search.found : false, true)
  assert.equal(intake.ok ? intake.data.fit.band : null, 'competitive')

  const draft = await scaffoldDraft(
    { profile: intake.ok ? intake.data.state.profile : createInitialAgentState().profile },
    { transport },
  )

  assert.equal(draft.ok, true, draft.ok ? undefined : draft.error)

  const firstTurn = await nextInterrogationTurn(
    {
      draft: draft.ok ? draft.data : { id: 'x', body: 'x', version: 0, source: 'pasted' },
      profile: intake.ok ? intake.data.state.profile : createInitialAgentState().profile,
      session: null,
      lastAnswer: null,
    },
    { transport },
  )

  assert.equal(firstTurn.ok, true, firstTurn.ok ? undefined : firstTurn.error)
  assert.equal(firstTurn.ok ? firstTurn.data.done : true, false)

  const secondTurn = await nextInterrogationTurn(
    {
      draft: draft.ok ? draft.data : { id: 'x', body: 'x', version: 0, source: 'pasted' },
      profile: intake.ok ? intake.data.state.profile : createInitialAgentState().profile,
      session: firstTurn.ok ? firstTurn.data.session : null,
      lastAnswer: 'The garden soil dried out during a hot week, so I built the sensor for my grandmother.',
    },
    { transport },
  )

  assert.equal(secondTurn.ok, true, secondTurn.ok ? undefined : secondTurn.error)
  assert.equal(secondTurn.ok ? secondTurn.data.session.turns.length : 0, 2)

  const rewrite = await generateRewrite(
    {
      draft: draft.ok ? draft.data : { id: 'x', body: 'x', version: 0, source: 'pasted' },
      profile: intake.ok ? intake.data.state.profile : createInitialAgentState().profile,
      session: secondTurn.ok ? secondTurn.data.session : firstTurn.ok ? firstTurn.data.session : {
        id: 's',
        draftId: 'x',
        turns: [
          {
            index: 0,
            targetSentence: 'x',
            framingTag: 'generic',
            question: 'x',
            answer: 'x',
            extractedSpecific: 'x',
          },
        ],
      },
    },
    { transport },
  )

  assert.equal(rewrite.ok, true, rewrite.ok ? undefined : rewrite.error)
  assert.ok(rewrite.ok ? rewrite.data.changes.length >= 2 : false)
})
