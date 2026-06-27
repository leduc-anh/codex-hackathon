import { z } from 'zod'
import {
  MAX_AGENT_STEPS,
  zDraft,
  zInterrogationSession,
  zProfile,
  zRewriteResult,
  zScoreFitInput,
  type AgentState,
  type Draft,
  type InterrogationSession,
  type InterrogationTurn,
  type Profile,
  type RewriteResult,
  type ScoreFitResult,
} from './contracts.ts'
export { runIntakeStep, finalizeIntakeFromProfile, type IntakeResult } from './agent/loop.ts'
export {
  runFileIntakeStep,
  readIntakeFile,
  type FileIntakeResult,
  type IntakeFilePayload,
} from './agent/file-intake.ts'
export {
  runMockDemoIntake,
  runMockDemoIntake as runMinhSeedIntake,
} from './demo/mock-intake.ts'
export { minhSeedUserMessage } from './demo/minh-profile.ts'
import { callStructured, type LlmTransport } from './llm/client.ts'
import { scoreFit } from './tools/score_fit.ts'
export { fail, ok, validateInput, type ActionResult, type ErrorCode } from './result.ts'
import { fail, ok, validateInput, type ActionResult } from './result.ts'

const zInterrogationPlan = z.object({
  targetSentence: z.string().min(1),
  framingTag: z.enum([
    'generic',
    'over_humble',
    'listed_no_reflection',
    'translated_formality',
    'vague_passion',
    'unsupported_claim',
  ]),
  question: z.string().min(1),
})

const zExtractedSpecific = z.object({
  extractedSpecific: z.string().min(1),
})

const MAX_INTERROGATION_TURNS = 4

export function scoreFitAction(input: unknown): ActionResult<ScoreFitResult> {
  try {
    return ok(scoreFit(zScoreFitInput.parse(input)))
  } catch (error) {
    return fail('VALIDATION', error instanceof Error ? error.message : 'Invalid score input')
  }
}

export async function scaffoldDraft(
  input: { profile: Profile },
  options: { transport?: LlmTransport } = {},
): Promise<ActionResult<Draft>> {
  const validated = validateInput(z.object({ profile: zProfile }), input)

  if (!validated.ok) {
    return validated
  }

  const generated = await callStructured(
    zDraft,
    {
      system: [
        'You draft plain first-pass Statements of Purpose.',
        'Use only the supplied profile facts. Do not invent achievements, schools, dates, or scores.',
        'Return JSON matching the Draft schema.',
      ].join('\n'),
      prompt: JSON.stringify({
        task:
          'Create a deliberately plain 120-180 word draft. It can be imperfect because the next screen will interrogate weak claims.',
        profile: validated.data.profile,
      }),
      temperature: 0.2,
      maxTokens: 900,
    },
    { transport: options.transport },
  )

  if (generated.ok) {
    return generated
  }

  return ok(
    zDraft.parse({
      id: makeId('draft'),
      body: fallbackDraft(validated.data.profile),
      version: 0,
      source: 'ai_scaffolded',
    }),
  )
}

export async function nextInterrogationTurn(
  input: {
    draft: Draft
    profile: Profile
    session: InterrogationSession | null
    lastAnswer: string | null
  },
  options: { transport?: LlmTransport } = {},
): Promise<ActionResult<{ session: InterrogationSession; done: boolean }>> {
  const validated = validateInput(
    z.object({
      draft: zDraft,
      profile: zProfile,
      session: zInterrogationSession.nullable(),
      lastAnswer: z.string().nullable(),
    }),
    input,
  )

  if (!validated.ok) {
    return validated
  }

  const { draft, profile, lastAnswer } = validated.data
  let session =
    validated.data.session ??
    zInterrogationSession.parse({
      id: makeId('interrogation'),
      draftId: draft.id,
      turns: [
        makeTurn(
          0,
          firstWeakSentence(draft.body, []),
          'vague_passion',
          'Which exact moment proves this sentence is true? Tell me what happened, who was there, and what changed.',
        ),
      ],
    })

  if (lastAnswer?.trim()) {
    session = await attachAnswer(session, lastAnswer, options.transport)
  }

  const done =
    session.turns.length >= MAX_INTERROGATION_TURNS ||
    session.turns.every((turn) => Boolean(turn.answer)) &&
      weakSentences(draft.body, session.turns.map((turn) => turn.targetSentence)).length === 0

  if (done) {
    return ok({ session, done: true })
  }

  if (session.turns.at(-1)?.answer) {
    const plan = await planInterrogationTurn(draft, profile, session, options.transport)
    session = zInterrogationSession.parse({
      ...session,
      turns: [...session.turns, makeTurn(session.turns.length, plan.targetSentence, plan.framingTag, plan.question)],
    })
  }

  return ok({ session, done: false })
}

export async function generateRewrite(
  input: { draft: Draft; session: InterrogationSession; profile: Profile },
  options: { transport?: LlmTransport } = {},
): Promise<ActionResult<RewriteResult>> {
  const validated = validateInput(
    z.object({ draft: zDraft, session: zInterrogationSession, profile: zProfile }),
    input,
  )

  if (!validated.ok) {
    return validated
  }

  const generated = await callStructured(
    zRewriteResult,
    {
      system: [
        'You rewrite SoP drafts using only student answers and sourced profile/tool facts.',
        'Every ChangeItem.groundedIn must be student_answer or tool_source.',
        'If a claim is not grounded, omit it.',
        'Return JSON only.',
      ].join('\n'),
      prompt: JSON.stringify({
        task:
          'Rewrite the draft into a stronger reflective version. Explain at least two grounded changes.',
        draft: validated.data.draft,
        profile: validated.data.profile,
        interrogationSession: validated.data.session,
      }),
      temperature: 0.2,
      maxTokens: 1600,
    },
    { transport: options.transport },
  )

  if (generated.ok) {
    return generated
  }

  return ok(fallbackRewrite(validated.data.draft, validated.data.session))
}

function fallbackDraft(profile: Profile): string {
  const activities = profile.activities
    .map((activity) => activity.contribution ?? activity.title)
    .filter(Boolean)
    .join(' ')
  const awards = profile.awards.join(' ')

  return [
    `I am applying to study ${profile.targetProgram ?? 'my chosen program'} because I want to turn my interests into useful work.`,
    profile.education ? `My academic background includes ${profile.education}.` : '',
    awards ? `I have also earned recognition such as ${awards}.` : '',
    activities
      ? `Outside class, I worked on ${activities}.`
      : 'Outside class, I have tried to learn through hands-on projects.',
    profile.motivations
      ? `What motivates me is ${profile.motivations}.`
      : 'I still need to explain the personal reason behind this path more clearly.',
  ]
    .filter(Boolean)
    .join(' ')
}

async function attachAnswer(
  session: InterrogationSession,
  answer: string,
  transport?: LlmTransport,
): Promise<InterrogationSession> {
  const index = session.turns.findIndex((turn) => !turn.answer)
  const targetIndex = index >= 0 ? index : session.turns.length - 1
  const extraction = await callStructured(
    zExtractedSpecific,
    {
      prompt: JSON.stringify({
        task: 'Extract the most concrete, reusable essay detail from this student answer.',
        answer,
      }),
      temperature: 0,
      maxTokens: 180,
    },
    { transport },
  )
  const extractedSpecific = extraction.ok ? extraction.data.extractedSpecific : answer.trim()
  const turns = session.turns.map((turn, turnIndex) =>
    turnIndex === targetIndex
      ? {
          ...turn,
          answer: answer.trim(),
          extractedSpecific,
        }
      : turn,
  )

  return zInterrogationSession.parse({ ...session, turns })
}

async function planInterrogationTurn(
  draft: Draft,
  profile: Profile,
  session: InterrogationSession,
  transport?: LlmTransport,
): Promise<z.infer<typeof zInterrogationPlan>> {
  const fallbackTarget = firstWeakSentence(
    draft.body,
    session.turns.map((turn) => turn.targetSentence),
  )
  const generated = await callStructured(
    zInterrogationPlan,
    {
      system:
        'You are a tough but kind admissions essay mentor. Ask one pointed question. Return JSON only.',
      prompt: JSON.stringify({
        task:
          'Choose the next weakest exact sentence from the draft not already targeted, tag why it is weak, and ask one escalating question that mines a concrete detail.',
        draft,
        profile,
        previousTurns: session.turns,
      }),
      temperature: 0.2,
      maxTokens: 450,
    },
    { transport },
  )

  if (generated.ok) {
    return generated.data
  }

  return {
    targetSentence: fallbackTarget,
    framingTag: classifyWeakSentence(fallbackTarget),
    question: `This line is still too broad: "${fallbackTarget}" What is the scene, decision, or consequence behind it?`,
  }
}

function makeTurn(
  index: number,
  targetSentence: string,
  framingTag: InterrogationTurn['framingTag'],
  question: string,
): InterrogationTurn {
  return {
    index,
    targetSentence,
    framingTag,
    question,
    answer: null,
    extractedSpecific: null,
  }
}

function weakSentences(body: string, used: string[]): string[] {
  const usedSet = new Set(used)
  const sentences = body
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  const weak = sentences.filter(
    (sentence) =>
      !usedSet.has(sentence) &&
      /\b(always|passion|hardworking|dedicated|dream|interesting|help people|your university|learn more)\b/i.test(
        sentence,
      ),
  )

  return weak.length > 0 ? weak : sentences.filter((sentence) => !usedSet.has(sentence))
}

function firstWeakSentence(body: string, used: string[]): string {
  return weakSentences(body, used).at(0) ?? body.slice(0, 160)
}

function classifyWeakSentence(sentence: string): InterrogationTurn['framingTag'] {
  if (/\b(passion|dream|always)\b/i.test(sentence)) {
    return 'vague_passion'
  }

  if (/\b(hardworking|dedicated|excellent)\b/i.test(sentence)) {
    return 'unsupported_claim'
  }

  return 'generic'
}

function fallbackRewrite(draft: Draft, session: InterrogationSession): RewriteResult {
  const specifics = session.turns
    .map((turn) => turn.extractedSpecific)
    .filter((item): item is string => Boolean(item?.trim()))
  const first = specifics[0] ?? 'a concrete moment from my own experience'
  const second = specifics[1] ?? specifics[0] ?? 'what I learned from that work'
  const rewrittenText = `${draft.body}\n\nWhat makes this story mine is ${first}. That detail matters because ${second}.`

  return zRewriteResult.parse({
    rewrittenText,
    changes: [
      {
        before: draft.body.split(/(?<=[.!?])\s+/).at(0) ?? draft.body,
        after: first,
        framingReason: 'Replaces a broad claim with a concrete student-owned detail.',
        groundedIn: 'student_answer',
      },
      {
        before: 'I want to study this subject.',
        after: second,
        framingReason: 'Adds reflection from the interrogation instead of inventing a motivation.',
        groundedIn: 'student_answer',
      },
    ],
    framingScoreBefore: 42,
    framingScoreAfter: 72,
  })
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function canJumpToScreen(
  screen: number,
  state: AgentState,
  _fit?: ScoreFitResult | null,
): boolean {
  if (screen <= 1) {
    return true
  }

  if (screen === 2) {
    return state.profile.activities.length > 0 || state.profile.education !== null
  }

  if (screen === 3) {
    return state.draft !== null
  }

  if (screen === 4) {
    return state.draft !== null && state.session !== null
  }

  return screen <= MAX_AGENT_STEPS
}
