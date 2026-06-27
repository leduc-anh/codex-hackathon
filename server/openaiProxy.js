const OPENAI_ORIGIN = 'https://api.openai.com'

export async function proxyOpenAi(request, response, path) {
  setCorsHeaders(response)

  if (request.method === 'OPTIONS') {
    response.statusCode = 204
    response.end()
    return
  }

  if (request.method !== 'POST') {
    response.statusCode = 405
    response.setHeader('Allow', 'POST, OPTIONS')
    response.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const apiKey = readOpenAiKey()

  if (!apiKey) {
    response.statusCode = 500
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ error: 'Missing LLM_API_KEY' }))
    return
  }

  try {
    const upstream = await fetch(`${OPENAI_ORIGIN}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': request.headers['content-type'] ?? 'application/json',
      },
      body: await readBody(request),
    })

    response.statusCode = upstream.status
    response.setHeader('Cache-Control', 'no-store')

    const contentType = upstream.headers.get('content-type')
    if (contentType) {
      response.setHeader('Content-Type', contentType)
    }

    const bytes = new Uint8Array(await upstream.arrayBuffer())
    response.end(bytes)
  } catch (error) {
    response.statusCode = 502
    response.setHeader('Content-Type', 'application/json')
    response.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'OpenAI proxy failed',
      }),
    )
  }
}

function readOpenAiKey() {
  const env = globalThis.process?.env ?? {}
  return env.LLM_API_KEY || env.OPENAI_API_KEY
}

async function readBody(request) {
  if (typeof request.body === 'string' || request.body instanceof Uint8Array) {
    return request.body
  }

  if (request.body && typeof request.body === 'object') {
    return JSON.stringify(request.body)
  }

  const chunks = []

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk)
  }

  return new Blob(chunks).arrayBuffer()
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}
