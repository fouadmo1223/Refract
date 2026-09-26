import { AppError, ERROR_CODES, createCanceledError, isAppError, throwIfAborted } from '@/lib/errors'
import { blurCanvas } from '@/services/image/adjustments'
import { createCanvas, decodeImage, getContext, resampleCanvas } from '@/services/image/canvas'
import { encodeCanvas } from '@/services/image/encoders'
import { imglyProvider } from './providers/imglyProvider'

/**
 * Background removal is provider-based. A provider implements:
 *   { id, processing: 'local' | 'server', removeBackground(file, { onProgress, signal }) => Promise<Blob> }
 * To connect a remote API later, add a provider (e.g. providers/remoteApiProvider.js)
 * and register it here — no UI changes are needed.
 */
const PROVIDERS = { imgly: imglyProvider }
let activeProviderId = 'imgly'

export function setBackgroundRemovalProvider(id) {
  if (!PROVIDERS[id]) throw new Error(`Unknown background removal provider: ${id}`)
  activeProviderId = id
}

export function getBackgroundRemovalProvider() {
  return PROVIDERS[activeProviderId]
}

/** Remove the background and return a transparent PNG cut-out. */
export async function removeBackgroundService(file, { onProgress, signal } = {}) {
  throwIfAborted(signal)
  const provider = getBackgroundRemovalProvider()
  try {
    const cutout = await Promise.race([
      provider.removeBackground(file, { onProgress, signal }),
      new Promise((_, reject) => signal?.addEventListener('abort', () => reject(createCanceledError()), { once: true })),
    ])
    throwIfAborted(signal)
    return cutout
  } catch (error) {
    if (isAppError(error)) throw error
    const text = String(error?.message ?? error).toLowerCase()
    if (/fetch|network/.test(text)) throw new AppError(ERROR_CODES.NETWORK_ERROR, {}, error)
    throw new AppError(ERROR_CODES.BACKGROUND_REMOVAL_FAILED, {}, error)
  }
}

/** Bounding box of pixels with alpha above a small threshold, or null when empty. */
function alphaBounds(canvas) {
  const { width, height } = canvas
  const { data } = getContext(canvas, { willReadFrequently: true }).getImageData(0, 0, width, height)
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

/** The cut-out's silhouette filled with one colour. */
function silhouette(foreground, color) {
  const canvas = createCanvas(foreground.width, foreground.height)
  const context = getContext(canvas)
  context.drawImage(foreground, 0, 0)
  context.globalCompositeOperation = 'source-in'
  context.fillStyle = color
  context.fillRect(0, 0, canvas.width, canvas.height)
  return canvas
}

export const DEFAULT_COMPOSE = {
  mode: 'transparent',
  color: '#FFFFFF',
  blur: 50,
  shadow: false,
  shadowStrength: 50,
  outline: false,
  outlineWidth: 1.5,
  outlineColor: '#FFFFFF',
  cropToSubject: false,
  cropPadding: 5,
  format: 'png',
}

/**
 * Compose the cut-out over a background, with an optional sticker outline,
 * soft shadow and cropping to the subject.
 * @param {Blob} cutout transparent PNG
 * @param {Partial<typeof DEFAULT_COMPOSE> & { imageFile?: File, originalFile?: File }} options
 *   mode: transparent | color | image | blur (blurred original photo)
 */
export async function composeBackground(cutout, options) {
  const s = { ...DEFAULT_COMPOSE, ...options }
  const bitmap = await decodeImage(cutout)
  const { width, height } = bitmap
  const foreground = createCanvas(width, height)
  getContext(foreground).drawImage(bitmap, 0, 0)
  bitmap.close?.()
  const shortSide = Math.min(width, height)
  const canvas = createCanvas(width, height)
  const context = getContext(canvas)

  if (s.mode === 'color') {
    context.fillStyle = s.color
    context.fillRect(0, 0, width, height)
  } else if (s.mode === 'image' && s.imageFile) {
    const background = await decodeImage(s.imageFile)
    const scale = Math.max(width / background.width, height / background.height)
    const w = background.width * scale
    const h = background.height * scale
    context.drawImage(background, (width - w) / 2, (height - h) / 2, w, h)
    background.close?.()
  } else if (s.mode === 'blur' && s.originalFile) {
    // Blur a small copy of the original photo (fast), then scale it back up.
    const original = await decodeImage(s.originalFile)
    const scale = Math.min(1, 480 / Math.max(original.width, original.height))
    const small = resampleCanvas(original, Math.max(1, Math.round(original.width * scale)), Math.max(1, Math.round(original.height * scale)))
    original.close?.()
    const blurred = blurCanvas(small, Math.max(1, s.blur))
    context.imageSmoothingQuality = 'high'
    context.drawImage(blurred, 0, 0, width, height)
  }

  if (s.shadow) {
    const strength = s.shadowStrength / 100
    context.save()
    context.shadowColor = `rgba(0,0,0,${0.25 + strength * 0.5})`
    context.shadowBlur = shortSide * (0.01 + strength * 0.04)
    context.shadowOffsetY = shortSide * (0.005 + strength * 0.02)
    // The black silhouette is hidden under the subject; only its shadow shows around it.
    context.drawImage(silhouette(foreground, '#000000'), 0, 0)
    context.restore()
  }

  const outlinePx = s.outline && s.outlineWidth > 0 ? Math.max(1, (s.outlineWidth / 100) * shortSide) : 0
  if (outlinePx) {
    const stroke = silhouette(foreground, s.outlineColor)
    const steps = Math.max(16, Math.round(outlinePx * 2))
    for (let step = 0; step < steps; step += 1) {
      const angle = (step / steps) * Math.PI * 2
      context.drawImage(stroke, Math.cos(angle) * outlinePx, Math.sin(angle) * outlinePx)
    }
  }

  context.drawImage(foreground, 0, 0)

  let output = canvas
  const bounds = s.cropToSubject ? alphaBounds(foreground) : null
  if (bounds) {
    const pad = Math.round((s.cropPadding / 100) * Math.max(bounds.width, bounds.height) + outlinePx)
    const x = Math.max(0, bounds.x - pad)
    const y = Math.max(0, bounds.y - pad)
    const w = Math.min(width - x, bounds.width + pad * 2)
    const h = Math.min(height - y, bounds.height + pad * 2)
    output = createCanvas(w, h)
    getContext(output).drawImage(canvas, x, y, w, h, 0, 0, w, h)
  }

  const outputFormat = s.mode === 'transparent' && s.format === 'jpeg' ? 'png' : s.format
  const blob = await encodeCanvas(output, { format: outputFormat, quality: 92 })
  return { blob, width: output.width, height: output.height, format: outputFormat }
}
