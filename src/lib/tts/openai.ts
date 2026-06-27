// OpenAI TTS for the interrogation avatar (`/v1/audio/speech`).
//
// Uses the SAME server-side proxy as the LLM (`/api/openai/*`), so the key
// (`LLM_API_KEY`) is injected by Vite and never reaches the browser (AGENTS.md §7/§11).
//
// NOTE: OpenAI TTS returns audio bytes only — NO word timestamps. The avatar estimates
// per-word timings from the audio duration (see estimateWordTimings). Lip-sync is
// therefore approximate; for exact lip-sync use a provider that returns timestamps.

import type { SynthResult } from './types'

const PROXY_BASE = '/api/openai'
const TTS_MODEL = import.meta.env.VITE_TTS_OPENAI_MODEL ?? 'gpt-4o-mini-tts'
const TTS_VOICE = import.meta.env.VITE_TTS_OPENAI_VOICE ?? 'nova'

export async function synthesizeOpenAI(
  text: string,
  signal?: AbortSignal,
): Promise<SynthResult> {
  const res = await fetch(`${PROXY_BASE}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: text,
      response_format: 'mp3',
    }),
    signal,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`OpenAI TTS failed: ${res.status} ${detail}`.trim())
  }
  const audio = await res.arrayBuffer()
  // No timings from OpenAI → the caller estimates them from the decoded duration.
  return { audio, text }
}
