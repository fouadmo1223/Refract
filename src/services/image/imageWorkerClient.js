import { AppError, ERROR_CODES, createCanceledError, throwIfAborted } from '@/lib/errors'
import { hasOffscreenCanvas } from './canvas'

const supportsWorker = typeof Worker !== 'undefined' && hasOffscreenCanvas

/**
 * Run an image operation in a dedicated worker. One worker per job keeps
 * cancellation trivial (terminate) and frees memory as soon as the job ends.
 * Falls back to the main thread when OffscreenCanvas isn't available.
 */
export async function runImageJob(operation, file, params, { signal, onProgress } = {}) {
  throwIfAborted(signal)

  if (!supportsWorker) {
    const { processImage } = await import('./imagePipeline')
    const result = await processImage(operation, file, params, onProgress)
    throwIfAborted(signal)
    return result
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../../workers/imageWorker.js', import.meta.url), { type: 'module' })

    const cleanup = () => {
      worker.terminate()
      signal?.removeEventListener('abort', handleAbort)
    }
    const handleAbort = () => {
      cleanup()
      reject(createCanceledError())
    }
    signal?.addEventListener('abort', handleAbort, { once: true })

    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        onProgress?.(data.value, data.stage)
        return
      }
      cleanup()
      if (data.type === 'done') resolve(data.result)
      else reject(new AppError(data.error?.code ?? ERROR_CODES.PROCESSING_FAILED, data.error?.details))
    }
    worker.onerror = (event) => {
      event.preventDefault?.()
      cleanup()
      reject(new AppError(ERROR_CODES.PROCESSING_FAILED, {}, event.error))
    }
    worker.postMessage({ operation, file, params })
  })
}
