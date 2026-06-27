import { proxyOpenAi } from '../../../server/openaiProxy.js'

export default async function handler(request, response) {
  await proxyOpenAi(request, response, '/v1/responses')
}
