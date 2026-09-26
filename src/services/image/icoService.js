import { canvasToBlob, createCanvas, decodeImage, getContext, resampleCanvas, toCanvas } from './canvas'
import { encodeIco } from './encoders/icoEncoder'

export const DEFAULT_ICO_STYLE = { fit: 'contain', padding: 0, background: 'transparent', backgroundColor: '#FFFFFF', radius: 0 }

/**
 * Draw one icon size: the image is fitted (contain) or cropped (cover) inside
 * the square, with optional padding (% of size), background colour and rounded corners.
 */
export function renderIconSquare(source, size, style = DEFAULT_ICO_STYLE) {
  const s = { ...DEFAULT_ICO_STYLE, ...style }
  const square = createCanvas(size, size)
  const context = getContext(square)
  const radius = (Math.min(50, s.radius) / 100) * size
  if (radius > 0) {
    context.beginPath()
    context.roundRect(0, 0, size, size, radius)
    context.clip()
  }
  if (s.background === 'color') {
    context.fillStyle = s.backgroundColor
    context.fillRect(0, 0, size, size)
  }
  const inner = Math.max(1, Math.round(size * (1 - (2 * s.padding) / 100)))
  const scale = s.fit === 'cover' ? Math.max(inner / source.width, inner / source.height) : Math.min(inner / source.width, inner / source.height)
  const width = Math.max(1, Math.round(source.width * scale))
  const height = Math.max(1, Math.round(source.height * scale))
  const resampled = resampleCanvas(source, width, height)
  const offset = (size - inner) / 2
  context.save()
  context.beginPath()
  context.rect(offset, offset, inner, inner)
  context.clip()
  context.drawImage(resampled, Math.round((size - width) / 2), Math.round((size - height) / 2))
  context.restore()
  return square
}

/**
 * Build a multi-size .ico.
 * @param {number[]} sizes e.g. [16, 32, 48]
 * @param {typeof DEFAULT_ICO_STYLE} style
 */
export async function createIco(file, sizes, style, { onProgress } = {}) {
  onProgress?.(0.1, 'decoding')
  const bitmap = await decodeImage(file)
  const source = toCanvas(bitmap)
  bitmap.close?.()
  const entries = []
  const sorted = [...sizes].sort((a, b) => a - b)
  for (const [index, size] of sorted.entries()) {
    entries.push({ size, blob: await canvasToBlob(renderIconSquare(source, size, style), 'image/png') })
    onProgress?.(0.2 + (0.7 * (index + 1)) / sorted.length, 'encoding')
  }
  const blob = await encodeIco(entries)
  const largest = sorted[sorted.length - 1]
  return { blob, width: largest, height: largest, format: 'ico' }
}
