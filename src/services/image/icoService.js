import { canvasToBlob, createCanvas, decodeImage, getContext, resampleCanvas, toCanvas } from './canvas'
import { encodeIco } from './encoders/icoEncoder'

/**
 * Build a multi-size .ico. Non-square images are centered on a transparent square.
 * @param {number[]} sizes e.g. [16, 32, 48]
 */
export async function createIco(file, sizes, { onProgress } = {}) {
  onProgress?.(0.1, 'decoding')
  const bitmap = await decodeImage(file)
  const source = toCanvas(bitmap)
  bitmap.close?.()
  const entries = []
  const sorted = [...sizes].sort((a, b) => a - b)
  for (const [index, size] of sorted.entries()) {
    const scale = Math.min(size / source.width, size / source.height)
    const width = Math.max(1, Math.round(source.width * scale))
    const height = Math.max(1, Math.round(source.height * scale))
    const resampled = resampleCanvas(source, width, height)
    const square = createCanvas(size, size)
    getContext(square).drawImage(resampled, Math.round((size - width) / 2), Math.round((size - height) / 2))
    entries.push({ size, blob: await canvasToBlob(square, 'image/png') })
    onProgress?.(0.2 + (0.7 * (index + 1)) / sorted.length, 'encoding')
  }
  const blob = await encodeIco(entries)
  const largest = sorted[sorted.length - 1]
  return { blob, width: largest, height: largest, format: 'ico' }
}
