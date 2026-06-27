// Shared TTS types + provider-agnostic helpers for the interrogation avatar.

/** Word-level timings consumed by TalkingHead.speakAudio (all times in ms). */
export interface WordTimings {
  words: string[]
  wtimes: number[]
  wdurations: number[]
}

export interface SynthResult {
  /** Raw audio bytes (mp3). Decode against the avatar's AudioContext. */
  audio: ArrayBuffer
  /** The spoken text — used to estimate timings when the provider gives none. */
  text: string
  /** Real word timings if the provider supplies them (ElevenLabs). Absent for OpenAI. */
  timings?: WordTimings
}

export type Synthesize = (
  text: string,
  signal?: AbortSignal,
) => Promise<SynthResult>

/**
 * Estimate per-word timings by spreading the known audio duration across words,
 * weighted by word length. Used when the TTS provider returns no timestamps
 * (e.g. OpenAI TTS). Approximate — the mouth moves with the speech, not phoneme-exact.
 */
export function estimateWordTimings(
  text: string,
  durationSec: number,
): WordTimings {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const totalMs = Math.max(0, durationSec * 1000)
  if (words.length === 0 || totalMs === 0) {
    return { words, wtimes: [], wdurations: [] }
  }
  const weights = words.map((w) => w.length + 1) // +1 so 1-char words still get time
  const totalWeight = weights.reduce((a, b) => a + b, 0)

  const wtimes: number[] = []
  const wdurations: number[] = []
  let cursor = 0
  for (let i = 0; i < words.length; i++) {
    const dur = (weights[i] / totalWeight) * totalMs
    wtimes.push(Math.round(cursor))
    wdurations.push(Math.max(1, Math.round(dur)))
    cursor += dur
  }
  return { words, wtimes, wdurations }
}
