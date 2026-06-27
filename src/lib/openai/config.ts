/** Browser calls go through Vite dev proxy; key stays in `.env` server-side. */
export const OPENAI_PROXY_PREFIX = '/api/openai'
export const OPENAI_ORIGIN = 'https://api.openai.com'

export function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

export function readEnv(name: string): string | undefined {
  const importMetaEnv = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>
  }).env
  const globalProcess = (globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> }
  }).process

  return importMetaEnv?.[name] ?? globalProcess?.env?.[name]
}

export function openAiApiKey(): string | undefined {
  return readEnv('LLM_API_KEY') ?? readEnv('OPENAI_API_KEY')
}

/** Node/tests need a key; browser uses the dev proxy which injects Authorization. */
export function canCallOpenAi(): boolean {
  if (isBrowserRuntime()) {
    return true
  }

  return Boolean(openAiApiKey())
}

export function resolveOpenAiUrl(path: string, explicitBase?: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`

  if (isBrowserRuntime()) {
    return `${OPENAI_PROXY_PREFIX}${normalized}`
  }

  if (explicitBase) {
    return explicitBase
  }

  return `${OPENAI_ORIGIN}${normalized}`
}

export function openAiAuthHeaders(): Record<string, string> {
  if (isBrowserRuntime()) {
    return {}
  }

  const apiKey = openAiApiKey()

  if (!apiKey) {
    throw new Error('Missing LLM_API_KEY')
  }

  return { Authorization: `Bearer ${apiKey}` }
}

export async function openAiPostJson(
  path: string,
  body: unknown,
  options: { baseUrl?: string } = {},
): Promise<Response> {
  const response = await fetch(resolveOpenAiUrl(path, options.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...openAiAuthHeaders(),
    },
    body: JSON.stringify(body),
  })

  return response
}
