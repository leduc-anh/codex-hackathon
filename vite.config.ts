import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env (incl. non-VITE_ secrets) for server-side proxy use only.
  const env = loadEnv(mode, '.', '')
  const llmKey = env.LLM_API_KEY || env.OPENAI_API_KEY || ''

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // OpenAI — used by the avatar TTS (`/v1/audio/speech`). The key is injected here
        // (server-side) and NEVER reaches the browser. Client calls relative /api/openai/*.
        '/api/openai': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/api\/openai/, ''),
          configure: (proxy) => {
            ;(
              proxy as unknown as {
                on(
                  ev: 'proxyReq',
                  cb: (preq: { setHeader(n: string, v: string): void }) => void,
                ): void
              }
            ).on('proxyReq', (preq) => {
              if (llmKey) preq.setHeader('Authorization', `Bearer ${llmKey}`)
            })
          },
        },
      },
    },
  }
})
