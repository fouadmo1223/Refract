import { AppError, ERROR_CODES, createCanceledError } from '@/lib/errors'

/** Map provider HTTP responses to app error codes (with the provider's message as a hint). */
export async function assertOk(response, { providerName }) {
  if (response.ok) return response
  let message = ''
  try {
    const text = await response.text()
    try {
      const json = JSON.parse(text)
      message = json?.error?.message ?? json?.error ?? json?.message ?? ''
    } catch {
      message = text
    }
  } catch {
    /* body unreadable */
  }
  const details = { provider: providerName, status: response.status, hint: String(message).slice(0, 200) }
  const lower = String(message).toLowerCase()
  if (response.status === 401 || response.status === 403) throw new AppError(ERROR_CODES.AI_UNAUTHORIZED, details)
  if (response.status === 402 || /insufficient|balance|credit|quota|pollen|paid/.test(lower)) throw new AppError(ERROR_CODES.AI_INSUFFICIENT_CREDITS, details)
  if (response.status === 429) throw new AppError(ERROR_CODES.AI_RATE_LIMITED, details)
  if (response.status === 404 || (response.status === 400 && /model/.test(lower))) throw new AppError(ERROR_CODES.AI_MODEL_UNAVAILABLE, details)
  throw new AppError(ERROR_CODES.AI_GENERATION_FAILED, details)
}

/** fetch() wrapper that turns aborts and network failures into app errors. */
export async function aiFetch(url, init, { providerName }) {
  try {
    return await fetch(url, init)
  } catch (error) {
    if (init?.signal?.aborted) throw createCanceledError()
    throw new AppError(ERROR_CODES.NETWORK_ERROR, { provider: providerName }, error)
  }
}

export async function readMediaBlob(response, expectedPrefix, { providerName }) {
  const blob = await response.blob()
  if (!blob.type.startsWith(expectedPrefix) || blob.size === 0) {
    throw new AppError(ERROR_CODES.AI_GENERATION_FAILED, { provider: providerName })
  }
  return blob
}
