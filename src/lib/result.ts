import type { z } from 'zod'

export type ErrorCode =
  | 'VALIDATION'
  | 'LLM_FAILED'
  | 'SEARCH_FAILED'
  | 'NOT_FOUND'
  | 'DEGRADED'

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ErrorCode }

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data }
}

export function fail<T = never>(code: ErrorCode, error: string): ActionResult<T> {
  return { ok: false, code, error }
}

export function validateInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
): ActionResult<T> {
  const result = schema.safeParse(input)

  if (!result.success) {
    return fail('VALIDATION', result.error.message)
  }

  return ok(result.data)
}
