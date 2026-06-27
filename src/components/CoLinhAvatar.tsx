// CoLinhAvatar — the 3D talking-head mentor ("Cô Linh") for SCR-04 Interrogation.
// Renders the 3D avatar (TalkingHead) inside the design's avatar circle and speaks the
// current question via OpenAI TTS with approximate lip-sync. Degrades gracefully:
//   3D + voice → (3D fails) audio only → (TTS fails) silent, text stays on screen.
// Prop-driven so it slots into App.tsx's reducer-based screen.

import { useEffect, useRef, useState } from 'react'
import { LipsyncEn } from '@met4citizen/talkinghead/modules/lipsync-en.mjs'
import { synthesize, estimateWordTimings, type SynthResult } from '../lib/tts'

const AVATAR_URL = '/avatars/brunette.glb'

type Head = {
  audioCtx: AudioContext
  lipsync: Record<string, unknown>
  speakAudio: (a: unknown) => void
  setMood: (m: string) => void
  start: () => void
  stop: () => void
}

export default function CoLinhAvatar({
  speakingText,
  active,
  nextText,
  onReady,
}: {
  /** The current question (VI) the avatar should speak. */
  speakingText: string | null
  /** Speak when true (TTS on + on an active turn). */
  active: boolean
  /** Next question, pre-warmed so the next turn plays instantly. */
  nextText?: string | null
  onReady?: (ready: boolean) => void
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<Head | null>(null)
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null)
  const cacheRef = useRef<Map<string, Promise<SynthResult>>>(new Map())
  const lastSpokenRef = useRef<string | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  // Boot the 3D avatar once.
  useEffect(() => {
    let cancelled = false
    let head: { stop: () => void } | null = null
    ;(async () => {
      try {
        const { TalkingHead } = await import('@met4citizen/talkinghead')
        if (cancelled || !mountRef.current) return
        const h = new TalkingHead(mountRef.current, {
          // [] on purpose: TalkingHead loads lipsync modules via a runtime dynamic import()
          // that Vite can't bundle; we inject the EN processor directly below.
          lipsyncModules: [],
          lipsyncLang: 'en',
          cameraView: 'head',
          modelFPS: 30,
          avatarMood: 'neutral',
          lightAmbientIntensity: 2.4,
        })
        await h.showAvatar({
          url: AVATAR_URL,
          body: 'F',
          avatarMood: 'neutral',
          lipsyncLang: 'en',
        })
        if (cancelled) {
          h.stop()
          return
        }
        h.lipsync.en = new LipsyncEn()
        head = h
        headRef.current = h as unknown as Head
        setReady(true)
      } catch (err) {
        console.error('[CoLinhAvatar] init failed → audio/text only:', err)
        if (!cancelled) setFailed(true)
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
  }, [])

  useEffect(() => {
    onReady?.(ready)
  }, [ready, onReady])

  // Pause the render loop when the tab is hidden (perf).
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

  const getSynth = (text: string): Promise<SynthResult> => {
    let p = cacheRef.current.get(text)
    if (!p) {
      p = synthesize(text).catch((e) => {
        cacheRef.current.delete(text)
        throw e
      })
      cacheRef.current.set(text, p)
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
      console.error('[CoLinhAvatar] fallback audio play failed:', e)
      URL.revokeObjectURL(url)
    })
  }

  async function speak(text: string) {
    let result: SynthResult
    try {
      result = await getSynth(text)
    } catch (err) {
      console.error('[CoLinhAvatar] TTS failed:', err)
      return
    }
    const head = headRef.current
    if (head) {
      try {
        if (head.audioCtx.state !== 'running') await head.audioCtx.resume()
        const buf = await head.audioCtx.decodeAudioData(result.audio.slice(0))
        const t = result.timings ?? estimateWordTimings(result.text, buf.duration)
        head.setMood('neutral')
        head.speakAudio({
          audio: buf,
          words: t.words,
          wtimes: t.wtimes,
          wdurations: t.wdurations,
        })
        return
      } catch (err) {
        console.error('[CoLinhAvatar] speakAudio failed → audio only:', err)
      }
    }
    await playAudioOnly(result.audio)
  }

  // Speak the current question when active. Wait until the avatar is ready (or has failed,
  // in which case we still play audio). De-dupe by text so re-renders don't repeat it.
  useEffect(() => {
    if (!active || !speakingText) return
    if (!ready && !failed) return
    if (lastSpokenRef.current === speakingText) return
    lastSpokenRef.current = speakingText
    void speak(speakingText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakingText, active, ready, failed])

  // Let the same question be re-spoken if the user toggles voice off then on.
  useEffect(() => {
    if (!active) lastSpokenRef.current = null
  }, [active])

  // Pre-warm the next question's audio.
  useEffect(() => {
    if (nextText) void getSynth(nextText).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextText])

  return (
    <div ref={mountRef} className="avatar-3d-mount">
      {!ready && <span className="avatar-3d-fallback">{failed ? '🎙️' : '…'}</span>}
    </div>
  )
}
