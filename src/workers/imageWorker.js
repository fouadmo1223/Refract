import { processImage } from '@/services/image/imagePipeline'
import { normalizeError } from '@/lib/errors'

/**
 * Image Web Worker — keeps decode/encode work off the UI thread.
 * Protocol:
 *   in:  { operation, file, params }
 *   out: { type: 'progress', value, stage } | { type: 'done', result } | { type: 'error', error }
 */
self.onmessage = async (event) => {
  const { operation, file, params } = event.data
  try {
    const result = await processImage(operation, file, params, (value, stage) => {
      self.postMessage({ type: 'progress', value, stage })
    })
    self.postMessage({ type: 'done', result })
  } catch (error) {
    self.postMessage({ type: 'error', error: normalizeError(error) })
  }
}
