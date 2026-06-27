import { z } from 'zod'
import {
  zAgentState,
  zRewriteResult,
  zScoreFitResult,
  zSearchCriteriaResult,
} from '../contracts.ts'
import { createInitialAgentState } from './state.ts'

const STORAGE_KEY = 'sopilot.appSession'

const zPersistedMessage = z.object({
  role: z.enum(['agent', 'user']),
  label: z.string().optional(),
  text: z.string(),
  sources: z.array(z.string()).optional(),
  tone: z.enum(['warning', 'success']).optional(),
})

export type PersistedMessage = z.infer<typeof zPersistedMessage>

const zAppSession = z.object({
  agentState: zAgentState,
  search: zSearchCriteriaResult.nullable(),
  fit: zScoreFitResult.nullable(),
  rewrite: zRewriteResult.nullable(),
  screen: z.number().int().min(0).max(4),
  messages: z.array(zPersistedMessage).min(1),
  lang: z.enum(['vi', 'en']),
})

export type AppSession = z.infer<typeof zAppSession>

export function createEmptySession(seedMessages: PersistedMessage[]): AppSession {
  return {
    agentState: createInitialAgentState(),
    search: null,
    fit: null,
    rewrite: null,
    screen: 0,
    messages: seedMessages,
    lang: 'vi',
  }
}

export function loadAppSession(
  seedMessages: PersistedMessage[],
  storage: Storage = window.sessionStorage,
): AppSession {
  const raw = storage.getItem(STORAGE_KEY)

  if (!raw) {
    return createEmptySession(seedMessages)
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    const result = zAppSession.safeParse(parsed)
    return result.success ? result.data : createEmptySession(seedMessages)
  } catch {
    return createEmptySession(seedMessages)
  }
}

export function saveAppSession(
  session: AppSession,
  storage: Storage = window.sessionStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(zAppSession.parse(session)))
}
