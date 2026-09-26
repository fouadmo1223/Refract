import ImageTracer from 'imagetracerjs'
import { normalizeError } from '@/lib/errors'
import { decodeImage, getContext, resampleCanvas, toCanvas } from '@/services/image/canvas'

/**
 * Vector tracing worker (ImageTracer.js, public domain). Tracing is CPU-heavy,
 * so the image is downscaled to `maxDimension` first and runs off the UI thread.
 * in:  { file, options, maxDimension }   out: { type: 'done', svg, width, height } | { type: 'error', error }
 */
self.onmessage = async ({ data }) => {
  try {
    self.postMessage({ type: 'progress', value: 0.1, stage: 'decoding' })
    const bitmap = await decodeImage(data.file)
    const scale = Math.min(1, data.maxDimension / Math.max(bitmap.width, bitmap.height))
    const source = toCanvas(bitmap)
    const canvas = scale < 1 ? resampleCanvas(source, Math.round(bitmap.width * scale), Math.round(bitmap.height * scale)) : source
    bitmap.close?.()
    const imageData = getContext(canvas, { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height)
    self.postMessage({ type: 'progress', value: 0.3, stage: 'tracing' })
    const svg = ImageTracer.imagedataToSVG(imageData, data.options)
    self.postMessage({ type: 'done', svg, width: canvas.width, height: canvas.height })
  } catch (error) {
    self.postMessage({ type: 'error', error: normalizeError(error) })
  }
}
