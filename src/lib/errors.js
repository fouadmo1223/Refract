/**
 * Centralized application error model.
 *
 * Every failure that reaches the UI is normalized to `{ code, message, details }`.
 * `code` maps to a translation key under `errors.<code>`; `details` carries
 * interpolation values (e.g. max size) and is never shown raw to users.
 */
export const ERROR_CODES = {
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  CORRUPTED_FILE: 'CORRUPTED_FILE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  BROWSER_UNSUPPORTED: 'BROWSER_UNSUPPORTED',
  OUT_OF_MEMORY: 'OUT_OF_MEMORY',
  FFMPEG_INIT_FAILED: 'FFMPEG_INIT_FAILED',
  CONVERSION_FAILED: 'CONVERSION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  BACKGROUND_REMOVAL_FAILED: 'BACKGROUND_REMOVAL_FAILED',
  INVALID_DIMENSIONS: 'INVALID_DIMENSIONS',
  INVALID_CROP: 'INVALID_CROP',
  INVALID_TIME_RANGE: 'INVALID_TIME_RANGE',
  TOO_MANY_FILES: 'TOO_MANY_FILES',
  INVALID_BASE64: 'INVALID_BASE64',
  NO_AUDIO_STREAM: 'NO_AUDIO_STREAM',
  AI_KEY_REQUIRED: 'AI_KEY_REQUIRED',
  AI_UNAUTHORIZED: 'AI_UNAUTHORIZED',
  AI_INSUFFICIENT_CREDITS: 'AI_INSUFFICIENT_CREDITS',
  AI_RATE_LIMITED: 'AI_RATE_LIMITED',
  AI_MODEL_UNAVAILABLE: 'AI_MODEL_UNAVAILABLE',
  AI_GENERATION_FAILED: 'AI_GENERATION_FAILED',
  CANCELED: 'CANCELED',
  UNKNOWN: 'UNKNOWN',
}

export class AppError extends Error {
  constructor(code, details = {}, cause) {
    super(code)
    this.name = 'AppError'
    this.code = ERROR_CODES[code] ? code : ERROR_CODES.UNKNOWN
    this.details = details
    if (cause) this.cause = cause
  }
}

export function isAppError(error) {
  return error instanceof AppError || (error && typeof error === 'object' && error.name === 'AppError' && 'code' in error)
}

export function isCanceled(error) {
  return (
    error?.code === ERROR_CODES.CANCELED ||
    error?.name === 'AbortError' ||
    (error instanceof DOMException && error.name === 'AbortError')
  )
}

export function createCanceledError() {
  return new AppError(ERROR_CODES.CANCELED)
}

export function throwIfAborted(signal) {
  if (signal?.aborted) throw createCanceledError()
}

/** Heuristically classify raw browser / library errors into app error codes. */
function classifyRawError(error, fallbackCode) {
  const text = `${error?.name ?? ''} ${error?.message ?? error ?? ''}`.toLowerCase()
  if (/out of memory|memory access out of bounds|cannot enlarge memory|allocation failed|rangeerror: array buffer/.test(text)) {
    return ERROR_CODES.OUT_OF_MEMORY
  }
  if (/failed to fetch|networkerror|network error|load failed/.test(text)) return ERROR_CODES.NETWORK_ERROR
  if (/encodingerror|decode|source image cannot be decoded|invalid image|could not be decoded|invalid data found/.test(text)) {
    return ERROR_CODES.CORRUPTED_FILE
  }
  if (/not supported|unsupported|is not a function|is not defined/.test(text)) return ERROR_CODES.BROWSER_UNSUPPORTED
  return fallbackCode
}

/**
 * Normalize anything thrown into the app-wide error shape.
 * @returns {{ code: string, message: string, details: object }}
 */
export function normalizeError(error, fallbackCode = ERROR_CODES.PROCESSING_FAILED) {
  if (isCanceled(error)) return { code: ERROR_CODES.CANCELED, message: ERROR_CODES.CANCELED, details: {} }
  // AppErrors and already-normalized `{ code, details }` objects keep their code.
  if (isAppError(error) || (error && typeof error === 'object' && ERROR_CODES[error.code])) {
    return { code: error.code, message: error.code, details: error.details ?? {} }
  }
  const code = classifyRawError(error, fallbackCode)
  if (import.meta.env.DEV) console.warn('[normalizeError]', error)
  return { code, message: code, details: {} }
}

/** Translate a normalized error into a user-facing message. */
export function getErrorMessage(t, error, fallbackCode) {
  const normalized = normalizeError(error, fallbackCode)
  return {
    ...normalized,
    title: t(`errors.${normalized.code}.title`, normalized.details),
    description: t(`errors.${normalized.code}.description`, normalized.details),
  }
}
