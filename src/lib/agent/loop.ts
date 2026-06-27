import { z } from 'zod'
import {
  MAX_AGENT_STEPS,
  zAgentState,
  zProfile,
  zReActStep,
  zSearchCriteriaInput,
  zScoreFitInput,
  type AgentState,
  type Profile,
  type ReActStep,
  type SearchCriteriaInput,
  type SearchCriteriaResult,
  type ScoreFitResult,
} from '../contracts.ts'
import { callStructured, type LlmTransport } from '../llm/client.ts'
import { detectUserLanguage, type UserLanguage } from '../language.ts'
import { appendRollingSummary, updateAgentState } from '../memory/state.ts'
import { fail, ok, validateInput, type ActionResult } from '../result.ts'
import { searchCriteria, type SearchCriteriaOptions } from '../tools/search_criteria.ts'
import { scoreFit } from '../tools/score_fit.ts'

export type IntakeResult = {
  state: AgentState
  step: ReActStep
  userFacing: string | null
  search: SearchCriteriaResult
  fit: ScoreFitResult
}

export type RunIntakeInput = {
  state: AgentState
  userMessage: string | null
  preferredLanguage?: UserLanguage
}

export type RunIntakeOptions = {
  transport?: LlmTransport
  search?: SearchCriteriaOptions
}

const zRunIntakeInput = z.object({
  state: zAgentState,
  userMessage: z.string().nullable(),
  preferredLanguage: z.enum(['vi', 'en']).optional(),
})

const zIntakeExtraction = z.object({
  profile: zProfile,
  assistantMessage: z.string().min(1),
  shortlistSummary: z.string().min(1),
})

export async function runIntakeStep(
  input: RunIntakeInput,
  options: RunIntakeOptions = {},
): Promise<ActionResult<IntakeResult>> {
  const validated = validateInput(zRunIntakeInput, input)

  if (!validated.ok) {
    return validated
  }

  const userMessage = validated.data.userMessage?.trim() ?? ''

  if (!userMessage) {
    return fail('VALIDATION', 'A user message is required before running intake.')
  }

  const responseLanguage = detectUserLanguage(
    userMessage,
    validated.data.preferredLanguage ?? 'en',
  )

  const extracted = await callStructured(
    zIntakeExtraction,
    {
      system: [
        'You are SoPilot intake.',
        'Return JSON only.',
        'Extract only facts stated by the student or already present in state.',
        'Do not invent scores, admissions facts, schools, awards, or personal details.',
        `The latest message is ${responseLanguage === 'vi' ? 'Vietnamese or Vinglish' : 'English'}. Write assistantMessage and shortlistSummary only in ${responseLanguage === 'vi' ? 'Vietnamese' : 'English'}.`,
        'Match the user language naturally; do not add a translation unless asked.',
      ].join('\n'),
      prompt: JSON.stringify({
        task:
          'Merge the user message into the AgentState profile. Add gapFlags for missing role, contribution, impact, target school/program, English score, education, or motivation details. In assistantMessage, briefly acknowledge the new concrete detail, then ask exactly one useful follow-up question. Choose the most relevant scenario: target missing; education/GPA missing; no activity; role missing; personal contribution missing; measurable impact missing; English-test evidence missing; motivation vague; message unclear/off-topic; or profile complete. Do not repeat a question already answered in previousState. Keep it conversational and specific.',
        responseLanguage,
        previousState: validated.data.state,
        userMessage,
      }),
      temperature: 0.1,
      maxTokens: 1200,
    },
    { transport: options.transport },
  )

  const profile = extracted.ok
    ? extracted.data.profile
    : mergeProfileFromText(validated.data.state.profile, userMessage)

  return finalizeIntakeFromProfile(
    validated.data.state,
    profile,
    `Student said: ${userMessage}`,
    extracted.ok
      ? extracted.data.assistantMessage
      : buildFallbackAssistantMessage(profile, responseLanguage),
    extracted.ok ? extracted.data.shortlistSummary : undefined,
    options,
  )
}

function buildFallbackAssistantMessage(profile: Profile, language: UserLanguage): string {
  const incompleteActivity = profile.activities.find(
    (activity) => !activity.role || !activity.contribution || !activity.impact,
  )

  if (!profile.targetProgram) {
    return language === 'vi'
      ? 'Mình đã ghi nhận thông tin bạn vừa chia sẻ. Bạn đang nhắm tới trường hoặc ngành học cụ thể nào?'
      : 'I captured what you shared. Which specific school or program are you targeting?'
  }
  if (!profile.education) {
    return language === 'vi'
      ? 'Mình đã ghi nhận mục tiêu của bạn. Bạn có thể chia sẻ bậc học hiện tại, GPA hoặc các môn nổi bật không?'
      : 'I captured your target. What is your current education level, GPA, or strongest coursework?'
  }
  if (profile.activities.length === 0) {
    return language === 'vi'
      ? 'Phần học tập đã rõ hơn rồi. Hoạt động hoặc dự án nào thể hiện rõ nhất năng lực của riêng bạn?'
      : 'Your academic context is clearer now. Which activity or project best shows your own ability?'
  }
  if (incompleteActivity && !incompleteActivity.role) {
    return language === 'vi'
      ? 'Mình đã ghi nhận hoạt động này. Vai trò cụ thể của bạn trong đó là gì?'
      : 'I captured that activity. What was your specific role in it?'
  }
  if (incompleteActivity && !incompleteActivity.contribution) {
    return language === 'vi'
      ? 'Vai trò đã rõ hơn. Phần việc nào là do chính bạn trực tiếp thực hiện?'
      : 'Your role is clearer. What did you personally build, decide, or carry out?'
  }
  if (incompleteActivity && !incompleteActivity.impact) {
    return language === 'vi'
      ? 'Mình đã hiểu phần đóng góp của bạn. Kết quả cụ thể hoặc ai đã được hưởng lợi từ việc đó?'
      : 'I understand your contribution. What concrete result followed, or who benefited from it?'
  }
  if (!profile.motivations) {
    return language === 'vi'
      ? 'Các bằng chứng chính đã khá rõ. Trải nghiệm nào khiến bạn thật sự muốn theo đuổi ngành này?'
      : 'The main evidence is taking shape. What experience made you genuinely want to pursue this field?'
  }
  return language === 'vi'
    ? 'Mình đã cập nhật hồ sơ. Bạn có thể bổ sung điểm tiếng Anh hoặc một kết quả đo lường được gần đây không?'
    : 'I updated your profile. Can you add an English-test score or one recent measurable result?'
}

export async function finalizeIntakeFromProfile(
  state: AgentState,
  profile: Profile,
  summarySlice: string,
  userFacing: string,
  shortlistSummary?: string,
  options: RunIntakeOptions = {},
): Promise<ActionResult<IntakeResult>> {
  const searchInput = buildSearchInput(profile)
  const steps: ReActStep[] = []

  const searchStep = appendStep(steps, {
    thought: 'Need sourced criteria before judging fit.',
    action: {
      type: 'call_tool',
      tool: 'search_criteria',
      args: searchInput,
    },
  })
  const searchArgs =
    searchStep.action.type === 'call_tool'
      ? zSearchCriteriaInput.parse(searchStep.action.args)
      : searchInput
  const search = await searchCriteria(searchArgs, options.search)

  const scoreStep = appendStep(steps, {
    thought: search.found
      ? 'Sourced criteria found, compute deterministic fit.'
      : 'No sourced criteria found, score_fit must abstain.',
    action: {
      type: 'call_tool',
      tool: 'score_fit',
      args: { profile, criteria: search.criteria },
    },
  })
  const scoreArgs =
    scoreStep.action.type === 'call_tool'
      ? zScoreFitInput.parse(scoreStep.action.args)
      : { profile, criteria: search.criteria }
  const fit = scoreFit(scoreArgs)

  const step = appendStep(steps, {
    thought: search.found
      ? 'Profile updated, sourced criteria found, deterministic fit computed.'
      : 'Profile updated, no sourced criteria found, deterministic scorer abstained.',
    action: {
      type: 'finish',
      shortlistSummary: shortlistSummary ?? summarizeFit(search, fit),
    },
  })
  const nextState = appendRollingSummary(updateAgentState(state, { profile }), summarySlice)

  return ok({
    state: nextState,
    step,
    userFacing,
    search,
    fit,
  })
}

function appendStep(steps: ReActStep[], candidate: unknown): ReActStep {
  if (steps.length >= MAX_AGENT_STEPS) {
    return zReActStep.parse({
      thought: 'Step budget reached.',
      action: {
        type: 'finish',
        shortlistSummary: 'I reached the step limit and am continuing with what is verified.',
      },
    })
  }

  const step = zReActStep.parse(candidate)
  steps.push(step)
  return step
}

function buildSearchInput(profile: Profile): SearchCriteriaInput {
  return {
    school: inferSchool(profile.targetProgram),
    program: profile.targetProgram,
    scholarship: null,
    level: profile.level,
    country: profile.targetCountry || 'United States',
  }
}

function inferSchool(targetProgram: string | null): string | null {
  if (!targetProgram) {
    return null
  }

  const [school] = targetProgram.split(/[|,]/)
  return school?.trim() || null
}

function mergeProfileFromText(profile: Profile, text: string): Profile {
  const lower = text.toLowerCase()
  const activities = [...profile.activities]

  if (/\b(robot|robotics|sensor|project|club|clb|mach|cam bien)\b/i.test(text)) {
    activities.push({
      title: text.match(/robotics/i) ? 'Robotics or engineering activity' : 'Student project',
      role: /\b(lead|leader|truong|captain)\b/i.test(text) ? 'Leader' : null,
      contribution: text.slice(0, 220),
      impact: /\b(impact|help|giup|community|garden|vuon|family)\b/i.test(text)
        ? text.slice(0, 220)
        : null,
    })
  }

  return zProfile.parse({
    ...profile,
    targetCountry: profile.targetCountry || inferCountry(text),
    targetProgram: profile.targetProgram ?? inferProgram(text),
    level: lower.includes('phd')
      ? 'phd'
      : lower.includes('master') || lower.includes('graduate')
        ? 'graduate'
        : lower.includes('grade 12') || lower.includes('lop 12') || lower.includes('high school')
          ? 'undergraduate'
          : profile.level,
    education: profile.education ?? inferEducation(text),
    activities,
    awards: mergeUnique(profile.awards, extractAwards(text)),
    workExperience: profile.workExperience,
    motivations: profile.motivations ?? inferMotivation(text),
    gapFlags: mergeUnique(profile.gapFlags, inferGaps(text)),
  })
}

function inferCountry(text: string): string {
  if (/\b(canada|toronto|ubc)\b/i.test(text)) {
    return 'Canada'
  }

  if (/\b(uk|england|cambridge|oxford)\b/i.test(text)) {
    return 'United Kingdom'
  }

  return 'United States'
}

function inferProgram(text: string): string | null {
  if (/\b(computer science|cs|eecs|robotics|software)\b/i.test(text)) {
    return 'Computer Science'
  }

  if (/\b(engineering|mechanical|ky thuat|robot)\b/i.test(text)) {
    return 'Engineering'
  }

  return null
}

function inferEducation(text: string): string | null {
  const fragments = text
    .split(/[.;\n]/)
    .map((part) => part.trim())
    .filter((part) => /\b(gpa|grade|school|lop|physics|math|ly|ielts|toefl)\b/i.test(part))

  return fragments.at(0) ?? null
}

function inferMotivation(text: string): string | null {
  const fragments = text
    .split(/[.;\n]/)
    .map((part) => part.trim())
    .filter((part) => /\b(want|hope|because|vi|muon|dream|help|giup)\b/i.test(part))

  return fragments.at(0) ?? null
}

function extractAwards(text: string): string[] {
  return text
    .split(/[.;\n]/)
    .map((part) => part.trim())
    .filter((part) => /\b(award|prize|winner|giai|hsg|olympiad|honou?r)\b/i.test(part))
}

function inferGaps(text: string): string[] {
  const gaps: string[] = []

  if (!/\b(ielts|toefl|duolingo|sat|act)\b/i.test(text)) {
    gaps.push('Missing verified English or standardized testing evidence.')
  }

  if (!/\b(impact|result|helped|giup|changed|measured|users?|community)\b/i.test(text)) {
    gaps.push('Need measurable impact or a concrete person/community affected.')
  }

  if (!/\b(university|college|program|major|school|nganh|truong)\b/i.test(text)) {
    gaps.push('Need target school or target program.')
  }

  return gaps
}

function mergeUnique(existing: string[], next: string[]): string[] {
  return [...new Set([...existing, ...next].map((item) => item.trim()).filter(Boolean))]
}

function summarizeFit(search: SearchCriteriaResult, fit: ScoreFitResult): string {
  if (!search.found) {
    return 'I could not verify live admissions criteria, so I am showing insufficient data instead of inventing a fit.'
  }

  return `Live criteria found. Fit band: ${fit.band}. Met ${fit.criteriaMet}/${fit.criteriaTotal} sourced checks.`
}
