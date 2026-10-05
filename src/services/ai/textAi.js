import { AppError, ERROR_CODES } from '@/lib/errors'
import { aiFetch, assertOk } from './httpErrors'

/**
 * Text (and vision) generation through Pollinations' OpenAI-compatible chat
 * API. Uses the same free key as AI image generation (enter.pollinations.ai).
 */
const BASE_URL = 'https://gen.pollinations.ai'
const NAME = 'Pollinations'
export const DEFAULT_TEXT_MODEL = 'openai/gpt-5.4-nano'

/** Free text models; `vision` marks the ones that accept images. */
export async function listTextModels() {
  const response = await assertOk(await aiFetch(`${BASE_URL}/text/models`, {}, { providerName: NAME }), { providerName: NAME })
  const json = await response.json()
  const list = Array.isArray(json) ? json : (json.data ?? [])
  return list
    .filter((model) => !model.paid_only)
    .map((model) => ({ id: model.name ?? model.id, label: model.name ?? model.id, vision: (model.input_modalities ?? []).includes('image') }))
}

/**
 * One chat completion.
 * @param {{ apiKey: string, model?: string, messages: object[], json?: boolean, temperature?: number, signal?: AbortSignal }} options
 */
export async function chatComplete({ apiKey, model = DEFAULT_TEXT_MODEL, messages, json = false, temperature = 0.6, signal }) {
  if (!apiKey) throw new AppError(ERROR_CODES.AI_KEY_REQUIRED, { provider: NAME })
  const response = await aiFetch(
    `${BASE_URL}/v1/chat/completions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature, ...(json ? { response_format: { type: 'json_object' } } : {}) }),
      signal,
    },
    { providerName: NAME },
  )
  await assertOk(response, { providerName: NAME })
  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) throw new AppError(ERROR_CODES.AI_GENERATION_FAILED, { provider: NAME })
  return content
}

/** Parse a JSON reply, tolerating ```json fences or text around the object. */
export function parseJsonReply(text) {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1))
      } catch {
        /* fall through */
      }
    }
    throw new AppError(ERROR_CODES.AI_GENERATION_FAILED, { provider: NAME, hint: 'invalid JSON' })
  }
}
