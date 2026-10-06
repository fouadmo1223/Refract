import { decodeImage, getContext, transformCanvas } from './canvas'

/**
 * Find the part of an image that holds real content, ignoring empty margins:
 * transparent pixels (also the blank corners left by straightening) and a
 * solid border color sampled from the corners (white / black / any flat
 * background).
 *
 * Works on the transformed image so the result can be used directly as the
 * crop rect (pixels of the rotated / flipped image).
 *
 * @param {File|Blob} file
 * @param {{ rotation?: number, flipH?: boolean, flipV?: boolean }} transform
 * @param {{ tolerance?: number, mode?: 'auto'|'transparent'|'color', color?: string, padding?: number }} options
 *   tolerance 0–100 (how different a pixel may be from the border color and still count as empty)
 * @returns {Promise<{ x: number, y: number, width: number, height: number, background: string|null } | null>}
 *   null when the whole image is empty.
 */
export async function detectContentBounds(file, transform = {}, { tolerance = 10, mode = 'auto', color, padding = 0 } = {}) {
  const bitmap = await decodeImage(file)
  const canvas = transformCanvas(bitmap, transform)
  bitmap.close?.()
  const { width, height } = canvas
  const { data } = getContext(canvas, { willReadFrequently: true }).getImageData(0, 0, width, height)

  const background = mode === 'transparent' ? null : mode === 'color' ? parseHex(color) : cornerColor(data, width, height)
  const limit = ((tolerance / 100) * 441) ** 2
  const isEmpty = (offset) => {
    if (data[offset + 3] < 16) return true
    if (!background) return false
    const dr = data[offset] - background[0]
    const dg = data[offset + 1] - background[1]
    const db = data[offset + 2] - background[2]
    return dr * dr + dg * dg + db * db <= limit
  }
  // A row/column counts as content once a few pixels differ, so a stray speck of JPEG noise doesn't stop the trim.
  const rowHasContent = (y) => {
    let hits = 0
    for (let x = 0, offset = y * width * 4; x < width; x += 1, offset += 4) if (!isEmpty(offset) && ++hits > 1) return true
    return false
  }
  const columnHasContent = (x, top, bottom) => {
    let hits = 0
    for (let y = top; y <= bottom; y += 1) if (!isEmpty((y * width + x) * 4) && ++hits > 1) return true
    return false
  }

  let top = 0
  while (top < height && !rowHasContent(top)) top += 1
  if (top === height) return null
  let bottom = height - 1
  while (bottom > top && !rowHasContent(bottom)) bottom -= 1
  let left = 0
  while (left < width && !columnHasContent(left, top, bottom)) left += 1
  let right = width - 1
  while (right > left && !columnHasContent(right, top, bottom)) right -= 1

  const x = Math.max(0, left - padding)
  const y = Math.max(0, top - padding)
  return {
    x,
    y,
    width: Math.min(width, right + 1 + padding) - x,
    height: Math.min(height, bottom + 1 + padding) - y,
    background: background ? `#${background.map((value) => value.toString(16).padStart(2, '0')).join('')}` : null,
  }
}

function parseHex(hex = '#ffffff') {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16))
}

/** The border color, when at least three opaque corners agree on it; otherwise only transparency is trimmed. */
function cornerColor(data, width, height) {
  const corners = [0, width - 1, (height - 1) * width, height * width - 1]
    .map((pixel) => data.subarray(pixel * 4, pixel * 4 + 4))
    .filter((pixel) => pixel[3] >= 16)
  for (const candidate of corners) {
    const similar = corners.filter((other) => Math.abs(other[0] - candidate[0]) + Math.abs(other[1] - candidate[1]) + Math.abs(other[2] - candidate[2]) <= 30)
    if (similar.length >= 3) return [candidate[0], candidate[1], candidate[2]]
  }
  return null
}
