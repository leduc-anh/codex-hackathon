// TTS entrypoint for the interrogation avatar. Picks a provider via VITE_TTS_PROVIDER.
// Default = openai (uses LLM_API_KEY; ElevenLabs requires its own paid account).

import type { Synthesize } from './types'
import { synthesizeOpenAI } from './openai'
import { synthesizeElevenLabs } from './elevenlabs'

const PROVIDER = import.meta.env.VITE_TTS_PROVIDER ?? 'openai'

export const synthesize: Synthesize =
  PROVIDER === 'elevenlabs' ? synthesizeElevenLabs : synthesizeOpenAI

export { estimateWordTimings } from './types'
export type { SynthResult, WordTimings } from './types'
