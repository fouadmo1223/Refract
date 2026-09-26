import { AppError, ERROR_CODES } from '@/lib/errors'
import { MAX_CANVAS_DIMENSION, MAX_CANVAS_PIXELS } from '@/constants/fileConstraints'

/**
 * Canvas helpers that work both on the main thread and inside Web Workers
 * (OffscreenCanvas). Every image service builds on these primitives.
 */
export const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined'

export function assertCanvasSize(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new AppError(ERROR_CODES.INVALID_DIMENSIONS, { width, height })
  }
  if (width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION || width * height > MAX_CANVAS_PIXELS) {
    throw new AppError(ERROR_CODES.INVALID_DIMENSIONS, { width, height, max: MAX_CANVAS_DIMENSION })
  }
}

export function createCanvas(width, height) {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  assertCanvasSize(w, h)
  if (hasOffscreenCanvas) return new OffscreenCanvas(w, h)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return canvas
}

export function getContext(canvas, options) {
  const context = canvas.getContext('2d', options)
  if (!context) throw new AppError(ERROR_CODES.OUT_OF_MEMORY)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  return context
}

/** Decode any browser-supported image Blob into an ImageBitmap (EXIF orientation applied). */
export async function decodeImage(blob) {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch (error) {
    try {
      return await createImageBitmap(blob)
    } catch {
      throw new AppError(ERROR_CODES.CORRUPTED_FILE, {}, error)
    }
  }
}

export function sourceSize(source) {
  return {
    width: source.width ?? source.naturalWidth ?? source.videoWidth,
    height: source.height ?? source.naturalHeight ?? source.videoHeight,
  }
}

/** Copy any drawable source onto a fresh canvas. */
export function toCanvas(source, width, height) {
  const size = sourceSize(source)
  const canvas = createCanvas(width ?? size.width, height ?? size.height)
  getContext(canvas).drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

export function canvasToBlob(canvas, type, quality) {
  if (typeof canvas.convertToBlob === 'function') {
    return canvas.convertToBlob({ type, quality })
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new AppError(ERROR_CODES.OUT_OF_MEMORY))), type, quality)
  })
}

export function getImageData(canvas) {
  return getContext(canvas).getImageData(0, 0, canvas.width, canvas.height)
}

/** Draw the canvas over a solid color — used for formats without alpha. */
export function flattenCanvas(canvas, color = '#ffffff') {
  const flat = createCanvas(canvas.width, canvas.height)
  const context = getContext(flat)
  context.fillStyle = color
  context.fillRect(0, 0, flat.width, flat.height)
  context.drawImage(canvas, 0, 0)
  return flat
}

/**
 * High-quality downscale: halve repeatedly before the final draw so large
 * reductions don't alias (single-step bilinear looks jagged past ~2×).
 */
export function resampleCanvas(source, width, height) {
  let current = source
  let { width: currentWidth, height: currentHeight } = sourceSize(source)
  while (currentWidth / 2 >= width && currentHeight / 2 >= height) {
    currentWidth = Math.round(currentWidth / 2)
    currentHeight = Math.round(currentHeight / 2)
    const step = createCanvas(currentWidth, currentHeight)
    getContext(step).drawImage(current, 0, 0, currentWidth, currentHeight)
    current = step
  }
  const output = createCanvas(width, height)
  getContext(output).drawImage(current, 0, 0, width, height)
  return output
}

/**
 * Apply 90° rotations, a fine rotation angle and flips.
 * Returns a new canvas sized to the rotated bounding box.
 */
export function transformCanvas(source, { rotation = 0, flipH = false, flipV = false } = {}) {
  const { width, height } = sourceSize(source)
  const radians = (rotation * Math.PI) / 180
  const sin = Math.abs(Math.sin(radians))
  const cos = Math.abs(Math.cos(radians))
  const outWidth = Math.round(width * cos + height * sin)
  const outHeight = Math.round(width * sin + height * cos)
  const canvas = createCanvas(outWidth, outHeight)
  const context = getContext(canvas)
  context.translate(outWidth / 2, outHeight / 2)
  context.rotate(radians)
  context.scale(flipH ? -1 : 1, flipV ? -1 : 1)
  context.drawImage(source, -width / 2, -height / 2)
  return canvas
}

export function cropCanvas(source, { x, y, width, height }) {
  const size = sourceSize(source)
  const left = Math.max(0, Math.round(x))
  const top = Math.max(0, Math.round(y))
  const w = Math.min(Math.round(width), size.width - left)
  const h = Math.min(Math.round(height), size.height - top)
  if (w < 1 || h < 1) throw new AppError(ERROR_CODES.INVALID_CROP)
  const canvas = createCanvas(w, h)
  getContext(canvas).drawImage(source, left, top, w, h, 0, 0, w, h)
  return canvas
}

export function hasTransparency(imageData) {
  const { data } = imageData
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) return true
  }
  return false
}
