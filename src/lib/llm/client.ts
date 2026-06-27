import type { z } from 'zod'
import {
  canCallOpenAi,
  openAiPostJson,
  readEnv,
} from '../openai/config.ts'
import { fail, type ActionResult } from '../result.ts'

export type StructuredLlmRequest = {
  system?: string
  prompt: string
  model?: string
  temperature?: number
  maxTokens?: number
  /** Data URLs (e.g. data:image/png;base64,...) for vision intake. */
  images?: string[]
}

export type LlmTransportRequest = StructuredLlmRequest & {
  repairOf?: {
    raw: string
    error: string
  }
}

export type LlmTransport = (request: LlmTransportRequest) => Promise<unknown>

type OpenAiMessage = {
  role: 'system' | 'user'
  content: string | OpenAiContentPart[]
}

type OpenAiContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } }

const DEFAULT_MODEL = 'gpt-4o-mini'
const CHAT_COMPLETIONS_PATH = '/v1/chat/completions'

export async function callStructured<T>(
  schema: z.ZodType<T>,
  request: StructuredLlmRequest,
  options: { transport?: LlmTransport } = {},
): Promise<ActionResult<T>> {
  const transport = options.transport ?? defaultOpenAiChatTransport

  try {
    const first = await transport(request)
    const firstResult = parseAndValidate(schema, first)

    if (firstResult.ok) {
      return firstResult
    }

    const repair = await transport({
      ...request,
      prompt: buildRepairPrompt(request.prompt, firstResult.raw, firstResult.error),
      repairOf: {
        raw: firstResult.raw,
        error: firstResult.error,
      },
    })

    const repairResult = parseAndValidate(schema, repair)

    if (repairResult.ok) {
      return repairResult
    }

    return fail(
      'DEGRADED',
      `LLM output failed schema validation after one repair: ${repairResult.error}`,
    )
  } catch (error) {
    return fail('LLM_FAILED', error instanceof Error ? error.message : 'LLM call failed')
  }
}

export async function defaultOpenAiChatTransport(
  request: LlmTransportRequest,
): Promise<unknown> {
  if (!canCallOpenAi()) {
    throw new Error('Missing LLM_API_KEY')
  }

  const model = request.model ?? readEnv('LLM_MODEL') ?? DEFAULT_MODEL
  const messages = buildMessages(request)
  const response = await openAiPostJson(
    CHAT_COMPLETIONS_PATH,
    {
      model,
      messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 1200,
      response_format: { type: 'json_object' },
    },
    { baseUrl: readEnv('LLM_API_BASE') },
  )

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`LLM request failed with ${response.status}${detail ? `: ${detail}` : ''}`)
  }

  const payload: unknown = await response.json()
  return payload
}

function buildMessages(request: LlmTransportRequest): OpenAiMessage[] {
  const system =
    request.system ??
    'Return only valid JSON. Do not include markdown, prose, or code fences.'

  const userContent: string | OpenAiContentPart[] =
    request.images && request.images.length > 0
      ? [
          { type: 'text', text: request.prompt },
          ...request.images.map(
            (url): OpenAiContentPart => ({
              type: 'image_url',
              image_url: { url, detail: 'auto' },
            }),
          ),
        ]
      : request.prompt

  return [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ]
}

function buildRepairPrompt(prompt: string, raw: string, error: string): string {
  return [
    prompt,
    '',
    'The previous response did not match the required JSON schema.',
    `Validation error: ${error}`,
    'Previous response:',
    raw,
    '',
    'Return corrected JSON only.',
  ].join('\n')
}

function parseAndValidate<T>(
  schema: z.ZodType<T>,
  response: unknown,
): { ok: true; data: T } | { ok: false; raw: string; error: string } {
  const raw = extractText(response)
  const jsonText = extractJsonText(raw)

  try {
    const parsed: unknown = JSON.parse(jsonText)
    const result = schema.safeParse(parsed)

    if (result.success) {
      return { ok: true, data: result.data }
    }

    return { ok: false, raw, error: result.error.message }
  } catch (error) {
    return {
      ok: false,
      raw,
      error: error instanceof Error ? error.message : 'Invalid JSON',
    }
  }
}

function extractText(response: unknown): string {
  if (typeof response === 'string') {
    return response
  }

  if (!isRecord(response)) {
    return ''
  }

  const outputText = response.output_text
  if (typeof outputText === 'string') {
    return outputText
  }

  const choices = response.choices
  if (Array.isArray(choices)) {
    const first = choices[0]
    if (isRecord(first) && isRecord(first.message) && typeof first.message.content === 'string') {
      return first.message.content
    }
  }

  const content = response.content
  if (typeof content === 'string') {
    return content
  }

  return JSON.stringify(response)
}

function extractJsonText(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    return fenced[1].trim()
  }

  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')

  if (start >= 0 && end > start) {
    return raw.slice(start, end + 1)
  }

  return raw.trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
