/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Avatar TTS (non-secret; safe to expose). The key (LLM_API_KEY) stays server-side
  // in the Vite proxy and is intentionally NOT declared here.
  readonly VITE_TTS_PROVIDER?: 'openai' | 'elevenlabs' // default: openai
  readonly VITE_TTS_OPENAI_MODEL?: string // default: gpt-4o-mini-tts
  readonly VITE_TTS_OPENAI_VOICE?: string // default: nova
  readonly VITE_TTS_VOICE_ID?: string // ElevenLabs voice (if provider=elevenlabs)
  readonly VITE_TTS_MODEL_ID?: string // ElevenLabs model
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
