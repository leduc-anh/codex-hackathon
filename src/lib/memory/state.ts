import {
  zAgentState,
  type AgentState,
  type Draft,
  type InterrogationSession,
  type Profile,
} from '../contracts'

const STORAGE_KEY = 'sopilot.agentState'

export function createEmptyProfile(): Profile {
  return {
    targetCountry: '',
    targetProgram: null,
    level: 'other',
    education: null,
    activities: [],
    awards: [],
    workExperience: [],
    motivations: null,
    gapFlags: [],
  }
}

export function createInitialAgentState(
  profile: Profile = createEmptyProfile(),
): AgentState {
  return {
    profile,
    draft: null,
    session: null,
    activeGuidelines: [],
    rollingSummary: '',
  }
}

export function parseAgentState(input: unknown): AgentState | null {
  const result = zAgentState.safeParse(input)
  return result.success ? result.data : null
}

export function loadAgentState(storage: Storage = window.sessionStorage): AgentState {
  const stored = storage.getItem(STORAGE_KEY)

  if (!stored) {
    return createInitialAgentState()
  }

  try {
    const parsed: unknown = JSON.parse(stored)
    return parseAgentState(parsed) ?? createInitialAgentState()
  } catch {
    return createInitialAgentState()
  }
}

export function saveAgentState(
  state: AgentState,
  storage: Storage = window.sessionStorage,
): void {
  const parsed = zAgentState.parse(state)
  storage.setItem(STORAGE_KEY, JSON.stringify(parsed))
}

export function updateAgentState(
  current: AgentState,
  patch: Partial<Pick<AgentState, 'profile' | 'activeGuidelines' | 'rollingSummary'>> & {
    draft?: Draft | null
    session?: InterrogationSession | null
  },
): AgentState {
  return zAgentState.parse({
    ...current,
    ...patch,
  })
}

export function appendRollingSummary(
  state: AgentState,
  summarySlice: string,
): AgentState {
  const nextSummary = [state.rollingSummary, summarySlice]
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n')

  return updateAgentState(state, { rollingSummary: nextSummary })
}
