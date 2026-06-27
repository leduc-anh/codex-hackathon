import { defaultOpenAiChatTransport } from './client.ts'
import { openAiWebSearchProvider } from '../tools/search_criteria.ts'

let warmed = false

/** Fire lightweight first LLM + web-search calls so the live demo is not cold. */
export function prewarmDemoApis(): void {
  if (warmed) {
    return
  }

  warmed = true

  void defaultOpenAiChatTransport({
    prompt: '{"status":"prewarm"}',
    maxTokens: 8,
    temperature: 0,
  }).catch(() => undefined)

  void openAiWebSearchProvider(
    'UC Berkeley mechanical engineering undergraduate admission requirements',
    { maxResults: 1 },
  ).catch(() => undefined)
}
