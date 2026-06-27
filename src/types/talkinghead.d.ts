// Ambient type declaration for @met4citizen/talkinghead (ships as plain .mjs, no types).
// Only the surface SoPilot's interrogation avatar uses is declared. See:
// D:\workspace\TalkingHead\README.md for the full API.
declare module '@met4citizen/talkinghead' {
  /** Audio + word-timing payload accepted by speakAudio (lip-sync via lipsyncLang). */
  export interface SpeakAudioObject {
    audio: AudioBuffer | ArrayBuffer[]
    words?: string[]
    wtimes?: number[] // ms, start time of each word
    wdurations?: number[] // ms, duration of each word
    visemes?: string[]
    vtimes?: number[]
    vdurations?: number[]
  }

  export class TalkingHead {
    constructor(node: HTMLElement, opts?: Record<string, unknown>)
    /** Web Audio context the instance plays through; decode audio against THIS context. */
    audioCtx: AudioContext
    /** Per-language lip-sync processors (e.g. lipsync.en). We inject these directly
     *  because TalkingHead's runtime dynamic import() of lipsync modules breaks bundling. */
    lipsync: Record<string, unknown>
    showAvatar(
      avatar: Record<string, unknown>,
      onprogress?: (ev: ProgressEvent) => void,
    ): Promise<void>
    speakAudio(
      audio: SpeakAudioObject,
      opt?: Record<string, unknown>,
      onsubtitles?: (s: string) => void,
    ): void
    speakText(
      text: string,
      opt?: Record<string, unknown>,
      onsubtitles?: (s: string) => void,
    ): void
    setMood(mood: string): void
    playGesture(name: string, dur?: number, mirror?: boolean, ms?: number): void
    stopGesture(ms?: number): void
    lookAtCamera(t: number): void
    start(): void
    stop(): void
  }
}

// English lip-sync processor — imported statically so Vite bundles it (TalkingHead's own
// dynamic import of this module fails after bundling). Injected into head.lipsync.en.
declare module '@met4citizen/talkinghead/modules/lipsync-en.mjs' {
  export class LipsyncEn {
    preProcessText(s: string): string
    wordsToVisemes(w: string): {
      visemes: string[]
      times: number[]
      durations: number[]
    }
  }
}
