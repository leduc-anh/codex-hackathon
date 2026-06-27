import { z } from 'zod'
import {
  zAgentState,
  zProfile,
  type AgentState,
  type Profile,
} from '../contracts.ts'
import { callStructured } from '../llm/client.ts'
import { fail, ok, validateInput, type ActionResult } from '../result.ts'
import {
  finalizeIntakeFromProfile,
  type IntakeResult,
  type RunIntakeOptions,
} from './loop.ts'

export type IntakeFilePayload = {
  fileName: string
  mimeType: string
  text?: string
  imageDataUrl?: string
}

export type FileIntakeResult = IntakeResult & {
  status: 'valid' | 'out_of_scope'
  fileName: string
  documentType: string
}

const TEXT_EXTENSIONS = /\.(txt|md|csv|json|log|rtf)$/i
const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif)$/i
const MAX_TEXT_CHARS = 24_000

const zFileIntakeAnalysis = z.object({
  status: z.enum(['valid', 'out_of_scope']),
  documentType: z.string(),
  reason: z.string(),
  profile: zProfile.optional(),
  assistantMessage: z.string().min(1),
  shortlistSummary: z.string().optional(),
})

const zRunFileIntakeInput = z.object({
  state: zAgentState,
  file: z.object({
    fileName: z.string().min(1),
    mimeType: z.string(),
    text: z.string().optional(),
    imageDataUrl: z.string().optional(),
  }),
})

export async function readIntakeFile(file: File): Promise<ActionResult<IntakeFilePayload>> {
  const fileName = file.name
  const mimeType = file.type || guessMimeType(fileName)

  if (isTextFile(mimeType, fileName)) {
    const text = (await file.text()).slice(0, MAX_TEXT_CHARS)

    if (!text.trim()) {
      return fail('VALIDATION', 'File is empty. Upload a CV, transcript, or activity list with content.')
    }

    return ok({ fileName, mimeType, text })
  }

  if (isImageFile(mimeType, fileName)) {
    const imageDataUrl = await readDataUrl(file)
    return ok({ fileName, mimeType, imageDataUrl })
  }

  return fail(
    'VALIDATION',
    'Unsupported file type. Use .txt, .md, .csv, .json, or an image (PNG/JPG/WebP) of your CV or transcript.',
  )
}

export async function runFileIntakeStep(
  input: { state: AgentState; file: IntakeFilePayload },
  options: RunIntakeOptions = {},
): Promise<ActionResult<FileIntakeResult>> {
  const validated = validateInput(zRunFileIntakeInput, input)

  if (!validated.ok) {
    return validated
  }

  const { state, file } = validated.data

  if (!file.text?.trim() && !file.imageDataUrl) {
    return fail('VALIDATION', 'Could not read any content from the uploaded file.')
  }

  const analysis = await callStructured(
    zFileIntakeAnalysis,
    {
      system: [
        'You are SoPilot document intake for Vietnamese study-abroad applicants.',
        'Return JSON only.',
        'IN SCOPE: CV/resume, transcript, activity list, personal statement draft, award certificate, recommendation letter draft, portfolio summary.',
        'OUT OF SCOPE: invoices, receipts, unrelated contracts, job offers for non-study roles, medical records, random photos, blank files, marketing flyers.',
        'If valid, extract profile fields from the document. Do not invent facts not present in the file.',
        'If out_of_scope, explain why in reason and assistantMessage. Do not include profile.',
      ].join('\n'),
      prompt: JSON.stringify({
        task: 'Classify this uploaded intake document and extract profile facts if valid.',
        fileName: file.fileName,
        mimeType: file.mimeType,
        existingProfile: state.profile,
        documentText: file.text ?? null,
        hasImage: Boolean(file.imageDataUrl),
      }),
      images: file.imageDataUrl ? [file.imageDataUrl] : undefined,
      temperature: 0.1,
      maxTokens: 1400,
    },
    { transport: options.transport },
  )

  if (!analysis.ok) {
    const fallback = fallbackFileAnalysis(state.profile, file)
    return finalizeFileIntake(state, file.fileName, fallback, options)
  }

  const parsed = zFileIntakeAnalysis.parse({
    ...analysis.data,
    profile: analysis.data.status === 'valid' ? analysis.data.profile : undefined,
  })

  if (parsed.status === 'out_of_scope') {
    return ok({
      status: 'out_of_scope',
      fileName: file.fileName,
      documentType: parsed.documentType,
      state,
      step: {
        thought: 'Uploaded document is outside SoPilot intake scope.',
        action: {
          type: 'finish',
          shortlistSummary: parsed.reason,
        },
      },
      userFacing: parsed.assistantMessage,
      search: { found: false, criteria: [], sources: [] },
      fit: {
        band: 'insufficient_data',
        criteriaMet: 0,
        criteriaTotal: 0,
        checks: [],
        gaps: [],
      },
    })
  }

  if (!parsed.profile) {
    return fail('VALIDATION', 'Valid document did not return extractable profile data.')
  }

  const merged = mergeProfiles(state.profile, parsed.profile)
  return finalizeFileIntake(state, file.fileName, { ...parsed, profile: merged }, options)
}

async function finalizeFileIntake(
  state: AgentState,
  fileName: string,
  analysis: z.infer<typeof zFileIntakeAnalysis> & { profile?: Profile },
  options: RunIntakeOptions,
): Promise<ActionResult<FileIntakeResult>> {
  if (analysis.status === 'out_of_scope') {
    return ok({
      status: 'out_of_scope',
      fileName,
      documentType: analysis.documentType,
      state,
      step: {
        thought: 'Uploaded document is outside SoPilot intake scope.',
        action: {
          type: 'finish',
          shortlistSummary: analysis.reason,
        },
      },
      userFacing: analysis.assistantMessage,
      search: { found: false, criteria: [], sources: [] },
      fit: {
        band: 'insufficient_data',
        criteriaMet: 0,
        criteriaTotal: 0,
        checks: [],
        gaps: [],
      },
    })
  }

  const profile = analysis.profile ?? state.profile
  const finalized = await finalizeIntakeFromProfile(
    state,
    profile,
    `Uploaded file: ${fileName}`,
    analysis.assistantMessage,
    analysis.shortlistSummary ?? 'Profile updated from uploaded document.',
    options,
  )

  if (!finalized.ok) {
    return finalized
  }

  return ok({
    ...finalized.data,
    status: 'valid',
    fileName,
    documentType: analysis.documentType,
  })
}

function mergeProfiles(existing: Profile, incoming: Profile): Profile {
  return zProfile.parse({
    targetCountry: incoming.targetCountry || existing.targetCountry,
    targetProgram: incoming.targetProgram ?? existing.targetProgram,
    level: incoming.level !== 'other' ? incoming.level : existing.level,
    education: incoming.education ?? existing.education,
    activities: [...existing.activities, ...incoming.activities],
    awards: mergeUnique(existing.awards, incoming.awards),
    workExperience: mergeUnique(existing.workExperience, incoming.workExperience),
    motivations: incoming.motivations ?? existing.motivations,
    gapFlags: mergeUnique(existing.gapFlags, incoming.gapFlags),
  })
}

function mergeUnique(existing: string[], next: string[]): string[] {
  return [...new Set([...existing, ...next].map((item) => item.trim()).filter(Boolean))]
}

function isTextFile(mimeType: string, fileName: string): boolean {
  return mimeType.startsWith('text/') || TEXT_EXTENSIONS.test(fileName)
}

function isImageFile(mimeType: string, fileName: string): boolean {
  return mimeType.startsWith('image/') || IMAGE_EXTENSIONS.test(fileName)
}

function guessMimeType(fileName: string): string {
  if (TEXT_EXTENSIONS.test(fileName)) {
    return 'text/plain'
  }

  if (/\.md$/i.test(fileName)) {
    return 'text/markdown'
  }

  if (/\.json$/i.test(fileName)) {
    return 'application/json'
  }

  if (IMAGE_EXTENSIONS.test(fileName)) {
    return 'image/jpeg'
  }

  return 'application/octet-stream'
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Could not read image file.'))
    reader.readAsDataURL(file)
  })
}

function fallbackFileAnalysis(
  existing: Profile,
  file: IntakeFilePayload,
): z.infer<typeof zFileIntakeAnalysis> {
  const text = file.text ?? ''

  if (/\b(invoice|receipt|hóa đơn|hoa don|contract|medical|prescription)\b/i.test(text)) {
    return {
      status: 'out_of_scope',
      documentType: 'unrelated document',
      reason: 'This looks like a billing or medical document, not a student profile artifact.',
      assistantMessage:
        'File này nằm ngoài phạm vi intake (hóa đơn/hợp đồng y tế). Hãy upload CV, bảng điểm, hoạt động ngoại khóa, hoặc bản nháp SoP.',
    }
  }

  const profile = mergeProfiles(existing, extractProfileLocally(text))

  return {
    status: 'valid',
    documentType: 'student profile document',
    reason: 'Local extraction used because the live LLM was unavailable.',
    profile,
    assistantMessage:
      'Mình đã đọc file và trích xuất thông tin hồ sơ (chế độ offline). Kiểm tra thẻ bên phải và bổ sung phần còn thiếu.',
    shortlistSummary: 'Profile updated from uploaded document with local extraction.',
  }
}

function extractProfileLocally(text: string): Profile {
  const lower = text.toLowerCase()

  return zProfile.parse({
    targetCountry: /\b(canada|toronto)\b/i.test(text)
      ? 'Canada'
      : /\b(uk|england)\b/i.test(text)
        ? 'United Kingdom'
        : 'United States',
    targetProgram:
      text.match(/\b(UC Berkeley|MIT|Stanford|Computer Science|Mechanical Engineering|EECS)\b/i)?.[0] ??
      null,
    level: lower.includes('phd')
      ? 'phd'
      : lower.includes('master') || lower.includes('graduate')
        ? 'graduate'
        : lower.includes('grade 12') || lower.includes('lớp 12') || lower.includes('high school')
          ? 'undergraduate'
          : 'other',
    education:
      text
        .split(/[\n;]/)
        .find((line) => /\b(gpa|grade|school|lớp|physics|math|ielts|toefl|chuyên)\b/i.test(line))
        ?.trim() ?? null,
    activities: /\b(robot|project|club|clb|sensor|mạch|cảm biến)\b/i.test(text)
      ? [
          {
            title: 'Activity from uploaded document',
            role: /\b(lead|trưởng|captain)\b/i.test(text) ? 'Leader' : null,
            contribution: text.slice(0, 220),
            impact: null,
          },
        ]
      : [],
    awards: text
      .split(/[\n;.]/)
      .map((part) => part.trim())
      .filter((part) => /\b(award|prize|giải|hsg|olympiad)\b/i.test(part)),
    workExperience: [],
    motivations:
      text
        .split(/[\n;.]/)
        .find((part) => /\b(want|hope|because|muốn|dream|giúp)\b/i.test(part))
        ?.trim() ?? null,
    gapFlags: inferLocalGaps(text),
  })
}

function inferLocalGaps(text: string): string[] {
  const gaps: string[] = []

  if (!/\b(ielts|toefl|sat|act|duolingo)\b/i.test(text)) {
    gaps.push('Missing verified English or standardized testing evidence.')
  }

  if (!/\b(university|college|program|berkeley|mit|ngành|truong|trường)\b/i.test(text)) {
    gaps.push('Need target school or target program.')
  }

  return gaps
}
