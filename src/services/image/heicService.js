import { AppError, ERROR_CODES, throwIfAborted } from '@/lib/errors'
import { decodeImage } from './canvas'

/**
 * Convert iPhone HEIC/HEIF photos. Most browsers can't decode HEIC natively,
 * so heic2any (libheif compiled to JS) is lazy-loaded only for this tool.
 * @param {{ format: 'jpeg'|'png', quality: number }} settings
 */
export async function convertHeic(file, { format, quality }, { signal, onProgress } = {}) {
  onProgress?.(null, 'decoding')
  const { default: heic2any } = await import('heic2any')
  throwIfAborted(signal)
  let output
  try {
    output = await heic2any({ blob: file, toType: format === 'png' ? 'image/png' : 'image/jpeg', quality: quality / 100 })
  } catch (error) {
    throw new AppError(ERROR_CODES.CORRUPTED_FILE, {}, error)
  }
  throwIfAborted(signal)
  // Multi-image HEIC (bursts / live photos) returns an array; keep the primary image.
  const blob = Array.isArray(output) ? output[0] : output
  const bitmap = await decodeImage(blob)
  const result = { blob, width: bitmap.width, height: bitmap.height, format }
  bitmap.close?.()
  return result
}

/** HEIC can't be previewed by most browsers; read size after a quick conversion is too slow, so only report the file. */
export async function readHeicInfo(file) {
  return { format: 'heic', width: null, height: null, name: file.name }
}
