import { CONVERTIBLE_FORMATS, getImageFormatFromFile } from '@/constants/imageFormats'
import { AppError, ERROR_CODES } from '@/lib/errors'
import { applyAdjustments, pixelateCanvas } from './adjustments'
import { cropCanvas, decodeImage, getContext, createCanvas, resampleCanvas, toCanvas, transformCanvas } from './canvas'
import { encodeCanvas } from './encoders'
import { addBorder, applyFilterPreset, censorRegions } from './compositionEffects'
import { blurWithFocus, monoCanvas } from './effectExtras'

/**
 * Pure image-processing pipeline. Runs inside the image Web Worker, or on the
 * main thread as a fallback when OffscreenCanvas is unavailable.
 * Every operation: decode → transform → encode, reporting stage progress.
 */

export function resolveOutputFormat(requested, file) {
  if (requested && requested !== 'original') return requested
  const source = getImageFormatFromFile(file)
  return CONVERTIBLE_FORMATS.includes(source) ? source : 'png'
}

/** Compute target dimensions for fit / fill / stretch resizing. */
export function computeResizeGeometry(sourceWidth, sourceHeight, { width, height, mode = 'fit', noUpscale = false }) {
  const targetWidth = Math.round(width || (height ? (sourceWidth * height) / sourceHeight : sourceWidth))
  const targetHeight = Math.round(height || (width ? (sourceHeight * width) / sourceWidth : sourceHeight))
  if (targetWidth < 1 || targetHeight < 1) throw new AppError(ERROR_CODES.INVALID_DIMENSIONS)

  if (mode === 'stretch') {
    const scaleX = noUpscale ? Math.min(1, targetWidth / sourceWidth) : targetWidth / sourceWidth
    const scaleY = noUpscale ? Math.min(1, targetHeight / sourceHeight) : targetHeight / sourceHeight
    const w = Math.round(sourceWidth * scaleX)
    const h = Math.round(sourceHeight * scaleY)
    return { canvasWidth: w, canvasHeight: h, drawWidth: w, drawHeight: h, offsetX: 0, offsetY: 0 }
  }

  const fitScale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
  const fillScale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight)
  let scale = mode === 'fill' ? fillScale : fitScale
  if (noUpscale) scale = Math.min(scale, 1)
  const drawWidth = Math.max(1, Math.round(sourceWidth * scale))
  const drawHeight = Math.max(1, Math.round(sourceHeight * scale))

  if (mode === 'fill') {
    const canvasWidth = Math.min(targetWidth, drawWidth)
    const canvasHeight = Math.min(targetHeight, drawHeight)
    return {
      canvasWidth,
      canvasHeight,
      drawWidth,
      drawHeight,
      offsetX: Math.round((canvasWidth - drawWidth) / 2),
      offsetY: Math.round((canvasHeight - drawHeight) / 2),
    }
  }
  return { canvasWidth: drawWidth, canvasHeight: drawHeight, drawWidth, drawHeight, offsetX: 0, offsetY: 0 }
}

export function resizeCanvas(source, options) {
  const geometry = computeResizeGeometry(source.width, source.height, options)
  const resampled = resampleCanvas(source, geometry.drawWidth, geometry.drawHeight)
  if (geometry.canvasWidth === geometry.drawWidth && geometry.canvasHeight === geometry.drawHeight) return resampled
  const canvas = createCanvas(geometry.canvasWidth, geometry.canvasHeight)
  getContext(canvas).drawImage(resampled, geometry.offsetX, geometry.offsetY)
  return canvas
}

function limitDimension(canvas, maxDimension) {
  if (!maxDimension || (canvas.width <= maxDimension && canvas.height <= maxDimension)) return canvas
  return resizeCanvas(canvas, { width: maxDimension, height: maxDimension, mode: 'fit', noUpscale: true })
}

// Each operation receives a canvas of the decoded image and returns a canvas.
const OPERATIONS = {
  compress: (canvas, params) => limitDimension(canvas, params.maxDimension),
  convert: (canvas) => canvas,
  resize: (canvas, params) => resizeCanvas(canvas, params),
  crop: (canvas, params) => {
    const transformed = transformCanvas(canvas, params)
    return params.rect ? cropCanvas(transformed, params.rect) : transformed
  },
  edit: (canvas, params) => {
    let result = transformCanvas(canvas, params.transform)
    if (params.crop) result = cropCanvas(result, params.crop)
    result = applyAdjustments(result, params.adjustments)
    if (params.resize) result = resizeCanvas(result, { ...params.resize, mode: 'stretch' })
    return result
  },
  effect: (canvas, params) => {
    switch (params.effect) {
      case 'blur':
        return blurWithFocus(canvas, params)
      case 'pixelate':
        return pixelateCanvas(canvas, Math.max(2, (params.amount / 100) * Math.min(canvas.width, canvas.height) * 0.1))
      case 'grayscale':
        return monoCanvas(canvas, params)
      case 'rotate':
      case 'flip':
        return transformCanvas(canvas, params)
      default:
        return canvas
    }
  },
  'strip-metadata': (canvas) => canvas,
  border: (canvas, params) => addBorder(canvas, params),
  filter: (canvas, params) => applyFilterPreset(canvas, params),
  censor: (canvas, params) => censorRegions(canvas, params),
}

/**
 * @param {string} operation key of OPERATIONS
 * @param {Blob} file
 * @param {object} params operation params + { format, quality, background }
 * @param {(value: number, stage: string) => void} onProgress
 */
export async function processImage(operation, file, params = {}, onProgress = () => {}) {
  const handler = OPERATIONS[operation]
  if (!handler) throw new AppError(ERROR_CODES.PROCESSING_FAILED)

  onProgress(0.05, 'decoding')
  const bitmap = await decodeImage(file)
  const source = toCanvas(bitmap)
  const original = { width: bitmap.width, height: bitmap.height }
  bitmap.close?.()

  onProgress(0.35, 'processing')
  const canvas = await handler(source, params)

  onProgress(0.65, 'encoding')
  const format = resolveOutputFormat(params.format, file)
  const blob = await encodeCanvas(canvas, { format, quality: params.quality ?? 92, background: params.background })
  onProgress(1, 'encoding')

  return { blob, width: canvas.width, height: canvas.height, format, original }
}
