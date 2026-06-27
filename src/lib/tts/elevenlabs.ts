// ElevenLabs TTS provider (kept selectable via VITE_TTS_PROVIDER=elevenlabs).
//
// SECURITY (AGENTS.md §7/§11): the key (`TTS_API_KEY`) is injected by the Vite proxy
// (`/api/elevenlabs/*`) server-side and never reaches the browser.
//
// Non-streaming `with-timestamps` endpoint → audio + per-character alignment → word timings.
// (ElevenLabs DOES return timestamps, so lip-sync is exact, unlike the OpenAI provider.)

import type { SynthResult, WordTimings } from './types'

const PROXY_BASE = '/api/elevenlabs'
const VOICE_ID = import.meta.env.VITE_TTS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM'
const MODEL_ID = import.meta.env.VITE_TTS_MODEL_ID ?? 'eleven_turbo_v2_5'

/** Character-level alignment shape returned by ElevenLabs `with-timestamps`. */
export interface ElevenAlignment {
  characters: string[]
  character_start_times_seconds: number[]
  character_end_times_seconds: number[]
}

/** Pure: collapse per-character alignment into per-word timings (ms). Unit-testable. */
export function alignmentToWords(a: ElevenAlignment): WordTimings {
  const words: string[] = []
  const wtimes: number[] = []
  const wdurations: number[] = []

  let cur = ''
  let startS = 0
  let endS = 0

  const flush = () => {
    if (cur.length === 0) return
    words.push(cur)
    wtimes.push(Math.round(startS * 1000))
    wdurations.push(Math.max(1, Math.round((endS - startS) * 1000)))
    cur = ''
  }

  const chars = a.characters ?? []
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const s = a.character_start_times_seconds[i] ?? endS
    const e = a.character_end_times_seconds[i] ?? s
    if (/\s/.test(ch)) {
      flush()
      continue
    }
    if (cur.length === 0) startS = s
    endS = e
    cur += ch
  }
  flush()

  return { words, wtimes, wdurations }
}

/** Decode a base64 string (ElevenLabs `audio_base64`) into raw bytes. */
export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

interface ElevenTimestampResponse {
  audio_base64: string
  alignment?: ElevenAlignment
  normalized_alignment?: ElevenAlignment
}

/** Synthesize via ElevenLabs. Throws on failure — caller degrades to text-only. */
export async function synthesizeElevenLabs(
  text: string,
  signal?: AbortSignal,
): Promise<SynthResult> {
  const url = `${PROXY_BASE}/v1/text-to-speech/${VOICE_ID}/with-timestamps`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: MODEL_ID }),
    signal,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${detail}`.trim())
  }
  const data = (await res.json()) as ElevenTimestampResponse
  if (!data.audio_base64) throw new Error('ElevenLabs TTS returned no audio')
  const alignment = data.alignment ?? data.normalized_alignment
  return {
    audio: base64ToArrayBuffer(data.audio_base64),
    text,
    timings: alignment ? alignmentToWords(alignment) : undefined,
  }
}
