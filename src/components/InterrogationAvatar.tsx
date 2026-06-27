// InterrogationAvatar — SCR-04 talking-head (T-013/T-019 · REQ-401..403).
//
// Speaks each interrogation question with ElevenLabs audio + TalkingHead lip-sync.
// Degradation ladder (REQ-403 / REQ-701 — the avatar is NEVER a single point of failure):
//   1. avatar ready + TTS ok   → 3D lip-sync (best)
//   2. avatar failed + TTS ok   → audio plays, static face + caption
//   3. TTS failed (any state)   → caption text only, no audio
// The question caption is ALWAYS rendered, so the interrogation content is identical
// whether or not voice/avatar work.
//
// Non-streaming on purpose: uses speakAudio(), not streamStart(). AGENTS.md §6 forbids a
// real-time streaming talking-head on the demo critical path.

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { LipsyncEn } from '@met4citizen/talkinghead/modules/lipsync-en.mjs'
import type { InterrogationTurn, FramingTag } from '../lib/contracts'
import { synthesize, estimateWordTimings, type SynthResult } from '../lib/tts'

export type AvatarStatus = 'loading' | 'ready' | 'text'

export interface InterrogationAvatarHandle {
  /** Speak a turn's question. Resolves when audio has been queued (or after fallback). */
  speak: (turn: InterrogationTurn) => Promise<void>
  /** Synthesize a turn's audio ahead of time (cached) so speak() is instant. */
  prefetch: (turn: InterrogationTurn) => void
  /** Stop any current speech/animation. */
  stop: () => void
  status: AvatarStatus
}

interface Props {
  /** Local GLB (default) or any TalkingHead-compatible avatar URL. */
  avatarUrl?: string
  /** The question text currently on screen — shown as a caption / fallback. */
  caption?: string | null
  onStatusChange?: (status: AvatarStatus) => void
  className?: string
}

const DEFAULT_AVATAR = '/avatars/brunette.glb'

/** A sharp-but-fair interviewer: stay neutral, lean firmer on unsupported claims. */
function moodForTag(tag: FramingTag): string {
  switch (tag) {
    case 'unsupported_claim':
      return 'sad' // a touch of skepticism, not aggression
    default:
      return 'neutral'
  }
}

export const InterrogationAvatar = forwardRef<InterrogationAvatarHandle, Props>(
  function InterrogationAvatar(
    { avatarUrl = DEFAULT_AVATAR, caption, onStatusChange, className },
    ref,
  ) {
    const mountRef = useRef<HTMLDivElement>(null)
    // Loose type: the ambient TalkingHead class, kept untyped here to avoid a hard
    // import that would crash module eval if WebGL/three fail to load.
    const headRef = useRef<{
      audioCtx: AudioContext
      speakAudio: (a: unknown) => void
      setMood: (m: string) => void
      playGesture: (n: string, d?: number) => void
      start: () => void
      stop: () => void
    } | null>(null)
    const fallbackAudioRef = useRef<HTMLAudioElement | null>(null)
    const [status, setStatus] = useState<AvatarStatus>('loading')

    const setAndReport = (s: AvatarStatus) => {
      setStatus(s)
      onStatusChange?.(s)
    }

    // ── Boot the avatar once. Any failure degrades to text-only, never throws. ──
    useEffect(() => {
      let cancelled = false
      let head: { stop: () => void } | null = null
      ;(async () => {
        try {
          const { TalkingHead } = await import('@met4citizen/talkinghead')
          if (cancelled || !mountRef.current) return
          const h = new TalkingHead(mountRef.current, {
            // [] not ['en']: TalkingHead loads lipsync modules via a runtime dynamic
            // import() that Vite can't bundle (→ 404 → no visemes → mouth frozen).
            // We inject the processor statically below instead.
            lipsyncModules: [],
            lipsyncLang: 'en',
            cameraView: 'upper',
            modelFPS: 30,
            avatarMood: 'neutral',
          })
          await h.showAvatar({
            url: avatarUrl,
            body: 'F',
            avatarMood: 'neutral',
            lipsyncLang: 'en',
          })
          if (cancelled) {
            h.stop()
            return
          }
          // Inject the EN lip-sync processor directly so speakAudio can turn words → visemes.
          h.lipsync.en = new LipsyncEn()
          head = h
          headRef.current = h as unknown as typeof headRef.current
          setAndReport('ready')
        } catch (err) {
          console.error('[avatar] init failed → text-only fallback:', err)
          if (!cancelled) setAndReport('text')
        }
      })()
      return () => {
        cancelled = true
        try {
          head?.stop()
        } catch {
          /* ignore */
        }
        headRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [avatarUrl])

    // ── Pause the render loop when the tab is hidden (perf). ──
    useEffect(() => {
      const onVis = () => {
        const h = headRef.current
        if (!h) return
        if (document.visibilityState === 'visible') h.start()
        else h.stop()
      }
      document.addEventListener('visibilitychange', onVis)
      return () => document.removeEventListener('visibilitychange', onVis)
    }, [])

    // TTS cache keyed by question text. Pre-fetching fills this so speak() skips the
    // ~3s OpenAI synthesis wait. A rejected entry is evicted so it can be retried.
    const synthCacheRef = useRef<Map<string, Promise<SynthResult>>>(new Map())
    const getSynth = (text: string): Promise<SynthResult> => {
      let p = synthCacheRef.current.get(text)
      if (!p) {
        p = synthesize(text).catch((e) => {
          synthCacheRef.current.delete(text)
          throw e
        })
        synthCacheRef.current.set(text, p)
      }
      return p
    }

    async function playAudioOnly(audio: ArrayBuffer) {
      const blob = new Blob([audio], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      fallbackAudioRef.current?.pause()
      const el = new Audio(url)
      fallbackAudioRef.current = el
      el.onended = () => URL.revokeObjectURL(url)
      await el.play().catch((e) => {
        console.error('[avatar] fallback audio play failed:', e)
        URL.revokeObjectURL(url)
      })
    }

    useImperativeHandle(
      ref,
      () => ({
        status,
        prefetch: (turn: InterrogationTurn) => {
          void getSynth(turn.question).catch(() => {
            /* swallow — speak() will surface/retry */
          })
        },
        stop: () => {
          try {
            headRef.current?.stop()
            headRef.current?.start()
          } catch {
            /* ignore */
          }
          fallbackAudioRef.current?.pause()
        },
        speak: async (turn: InterrogationTurn) => {
          // The caption is already on screen, so even a total TTS failure is graceful.
          let result: SynthResult
          try {
            result = await getSynth(turn.question) // instant if pre-fetched
          } catch (err) {
            console.error('[avatar] TTS failed → caption only:', err)
            return
          }
          const head = headRef.current
          if (head) {
            try {
              // Autoplay policy: the AudioContext is created on mount (no gesture) and
              // starts suspended. Resume it — works once the page has user activation
              // (the Start button). Without this the avatar is silent (see README §FAQ).
              if (head.audioCtx.state !== 'running') await head.audioCtx.resume()
              const buf = await head.audioCtx.decodeAudioData(result.audio.slice(0))
              // Real timings if the provider gave them; otherwise estimate from duration.
              const timings =
                result.timings ?? estimateWordTimings(result.text, buf.duration)
              head.setMood(moodForTag(turn.framingTag))
              head.playGesture('index', 2)
              head.speakAudio({
                audio: buf,
                words: timings.words,
                wtimes: timings.wtimes,
                wdurations: timings.wdurations,
              })
              return
            } catch (err) {
              console.error('[avatar] speakAudio failed → audio-only:', err)
            }
          }
          // Avatar unavailable or lip-sync failed → at least play the voice.
          await playAudioOnly(result.audio)
        },
      }),
      [status],
    )

    return (
      <div
        className={`relative overflow-hidden rounded-2xl border ${className ?? ''}`}
        style={{
          borderColor: 'var(--border)',
          background:
            'radial-gradient(120% 120% at 50% 0%, var(--accent-bg), transparent 60%), var(--code-bg)',
        }}
      >
        {/* Status pill */}
        <div className="absolute right-3 top-3 z-10">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background:
                  status === 'ready'
                    ? '#22c55e'
                    : status === 'loading'
                      ? '#f59e0b'
                      : '#9ca3af',
              }}
            />
            {status === 'ready'
              ? 'Avatar trực tiếp'
              : status === 'loading'
                ? 'Đang tải avatar…'
                : 'Chế độ văn bản'}
          </span>
        </div>

        {/* 3D mount */}
        <div ref={mountRef} className="h-[420px] w-full" />

        {/* Placeholder shown when no 3D canvas is present */}
        {status !== 'ready' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="flex h-28 w-28 items-center justify-center rounded-full text-5xl"
              style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
            >
              {status === 'loading' ? '…' : '🎙️'}
            </div>
          </div>
        )}

        {/* Caption / subtitle — ALWAYS visible (REQ-403 fallback) */}
        {caption && (
          <div
            className="absolute inset-x-0 bottom-0 px-5 py-4 text-left text-[15px] leading-snug"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0))',
              color: '#fff',
            }}
          >
            {caption}
          </div>
        )}
      </div>
    )
  },
)
