import {
  zScoreFitInput,
  zScoreFitResult,
  type Criterion,
  type CriterionCheck,
  type FitBand,
  type Profile,
  type ScoreFitInput,
  type ScoreFitResult,
} from '../contracts.ts'

export function scoreFit(input: ScoreFitInput): ScoreFitResult {
  const safeInput = zScoreFitInput.parse(input)

  if (safeInput.criteria.length === 0) {
    return zScoreFitResult.parse({
      band: 'insufficient_data',
      criteriaMet: 0,
      criteriaTotal: 0,
      checks: [],
      gaps: ['No sourced criteria were found, so SoPilot abstained from scoring fit.'],
    })
  }

  const checks = safeInput.criteria.map((criterion) =>
    checkCriterion(safeInput.profile, criterion),
  )
  const criteriaMet = checks.filter((check) => check.met).length
  const criteriaTotal = checks.length
  const gaps = checks
    .filter((check) => !check.met)
    .map((check) => check.detail)
    .concat(safeInput.profile.gapFlags)
    .slice(0, 6)

  return zScoreFitResult.parse({
    band: deriveBand(criteriaMet, criteriaTotal, gaps),
    criteriaMet,
    criteriaTotal,
    checks,
    gaps,
  })
}

function checkCriterion(profile: Profile, criterion: Criterion): CriterionCheck {
  const text = `${criterion.name} ${criterion.requirement}`.toLowerCase()
  const evidence = profileEvidence(profile)
  const requirement = criterion.requirement

  if (/\b(ielts|toefl|english|language)\b/.test(text)) {
    const met = /\b(ielts|toefl|duolingo|sat|act|english)\b/i.test(evidence)
    return {
      criterion: criterion.name,
      met,
      detail: met
        ? `Evidence found for English/testing: ${requirement}`
        : `Missing verified English/testing evidence for: ${requirement}`,
    }
  }

  if (/\b(gpa|grade|academic|transcript|school)\b/.test(text)) {
    const met = /\b(gpa|grade|physics|math|award|prize|honou?r|excellent|specialized)\b/i.test(
      evidence,
    )
    return {
      criterion: criterion.name,
      met,
      detail: met
        ? `Academic evidence matches: ${requirement}`
        : `Need clearer academic evidence for: ${requirement}`,
    }
  }

  if (/\b(leadership|activity|extracurricular|community|impact|project)\b/.test(text)) {
    const met = profile.activities.some(
      (activity) => Boolean(activity.role) || Boolean(activity.impact),
    )
    return {
      criterion: criterion.name,
      met,
      detail: met
        ? `Activity evidence matches: ${requirement}`
        : `Need role, contribution, or impact evidence for: ${requirement}`,
    }
  }

  if (/\b(essay|statement|sop|motivation|personal)\b/.test(text)) {
    const met = Boolean(profile.motivations?.trim())
    return {
      criterion: criterion.name,
      met,
      detail: met
        ? `Motivation evidence exists for: ${requirement}`
        : `Need a specific motivation/story for: ${requirement}`,
    }
  }

  const met = overlapsRequirement(evidence, text)
  return {
    criterion: criterion.name,
    met,
    detail: met
      ? `Profile evidence overlaps with: ${requirement}`
      : `Need stronger evidence for: ${requirement}`,
  }
}

function deriveBand(criteriaMet: number, criteriaTotal: number, gaps: string[]): FitBand {
  if (criteriaTotal === 0) {
    return 'insufficient_data'
  }

  const ratio = criteriaMet / criteriaTotal
  const hasHardGap = gaps.some((gap) =>
    /\b(missing|need|english|testing|gpa|deadline|recommendation)\b/i.test(gap),
  )

  if (ratio >= 0.8 && !hasHardGap) {
    return 'strong_match'
  }

  if (ratio >= 0.5) {
    return 'competitive'
  }

  return 'reach'
}

function profileEvidence(profile: Profile): string {
  return [
    profile.targetCountry,
    profile.targetProgram,
    profile.level,
    profile.education,
    profile.motivations,
    ...profile.awards,
    ...profile.workExperience,
    ...profile.gapFlags,
    ...profile.activities.flatMap((activity) => [
      activity.title,
      activity.role,
      activity.contribution,
      activity.impact,
    ]),
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
}

function overlapsRequirement(evidence: string, requirement: string): boolean {
  const words = requirement
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 4)

  if (words.length === 0) {
    return false
  }

  const evidenceLower = evidence.toLowerCase()
  return words.some((word) => evidenceLower.includes(word))
}
