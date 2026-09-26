import { canvasToBlob, createCanvas, decodeImage, getContext } from './canvas'
import { encodeCanvas } from './encoders'

export const DEFAULT_COLLAGE = { columns: 'auto', canvasAspect: 'auto', width: 2048, gap: 2, radius: 2, background: '#FFFFFF', format: 'jpeg' }

export const CANVAS_ASPECTS = { '1:1': 1, '4:5': 4 / 5, '3:4': 3 / 4, '9:16': 9 / 16, '16:9': 16 / 9, '3:2': 3 / 2 }

/** Minimum size of a photo while resizing, as a share of the row/column space it splits. */
export const MIN_SHARE = 0.12

export const DEFAULT_PHOTO_TRANSFORM = { zoom: 1, focusX: 0.5, focusY: 0.5 }

export function resolveColumns(columns, count) {
  if (columns !== 'auto') return Math.max(1, Math.min(columns, count))
  if (count <= 1) return 1
  if (count <= 4) return 2
  return 3
}

/** Number of photos in each row; the last row may hold fewer and stretches to full width. */
export function getRowCounts(count, columns) {
  const perRow = resolveColumns(columns, count)
  const rows = []
  for (let remaining = count; remaining > 0; remaining -= perRow) rows.push(Math.min(perRow, remaining))
  return rows
}

/** Width / height of the whole collage. "auto" keeps cells roughly square. */
export function resolveCanvasAspect(settings, count) {
  const fixed = CANVAS_ASPECTS[settings.canvasAspect]
  if (fixed) return fixed
  const rowCounts = getRowCounts(count, settings.columns)
  return rowCounts.length ? Math.max(...rowCounts) / rowCounts.length : 1
}

/** Signature of the grid structure — custom sizes are only valid for the same structure. */
export const getLayoutKey = (rowCounts) => rowCounts.join('-')

export function equalWeights(rowCounts) {
  return { key: getLayoutKey(rowCounts), rows: rowCounts.map(() => 1), cols: rowCounts.map((count) => Array(count).fill(1)) }
}

/**
 * Pixel rectangles for every photo. Rows split the height by `weights.rows`,
 * photos in a row split its width by `weights.cols[row]`. Gap is % of width.
 */
export function computeCollageLayout({ count, settings, weights, width, height }) {
  const rowCounts = getRowCounts(count, settings.columns)
  const safe = weights?.key === getLayoutKey(rowCounts) ? weights : equalWeights(rowCounts)
  const gap = (settings.gap / 100) * width
  const usableHeight = Math.max(1, height - gap * (rowCounts.length + 1))
  const rowTotal = safe.rows.reduce((sum, value) => sum + value, 0)
  const rects = []
  const rows = []
  let y = gap
  rowCounts.forEach((cellsInRow, row) => {
    const rowHeight = (usableHeight * safe.rows[row]) / rowTotal
    const usableWidth = Math.max(1, width - gap * (cellsInRow + 1))
    const colTotal = safe.cols[row].reduce((sum, value) => sum + value, 0)
    let x = gap
    const cells = []
    for (let col = 0; col < cellsInRow; col += 1) {
      const cellWidth = (usableWidth * safe.cols[row][col]) / colTotal
      const rect = { index: rects.length, row, col, x, y, width: cellWidth, height: rowHeight }
      rects.push(rect)
      cells.push(rect)
      x += cellWidth + gap
    }
    rows.push({ y, height: rowHeight, cells, usableWidth })
    y += rowHeight + gap
  })
  return { rects, rows, gap, usableHeight, weights: safe, width, height }
}

/** Where a photo lands inside its cell: cover-fit, then zoom and focus point (0–1) decide the crop. */
export function placePhoto(imageWidth, imageHeight, rect, transform = DEFAULT_PHOTO_TRANSFORM) {
  const scale = Math.max(rect.width / imageWidth, rect.height / imageHeight) * (transform.zoom ?? 1)
  const drawWidth = imageWidth * scale
  const drawHeight = imageHeight * scale
  return {
    x: rect.x - (drawWidth - rect.width) * (transform.focusX ?? 0.5),
    y: rect.y - (drawHeight - rect.height) * (transform.focusY ?? 0.5),
    width: drawWidth,
    height: drawHeight,
  }
}

/**
 * Render the collage.
 * @param {{ source: ImageBitmap|HTMLCanvasElement, transform?: object }[]} photos
 */
export function drawCollage(photos, settings, weights, outputWidth = settings.width) {
  const height = Math.round(outputWidth / resolveCanvasAspect(settings, photos.length))
  const layout = computeCollageLayout({ count: photos.length, settings, weights, width: outputWidth, height })
  const radius = (settings.radius / 100) * outputWidth
  const canvas = createCanvas(outputWidth, height)
  const context = getContext(canvas)
  context.fillStyle = settings.background
  context.fillRect(0, 0, outputWidth, height)
  context.imageSmoothingQuality = 'high'

  layout.rects.forEach((rect) => {
    const { source, transform } = photos[rect.index]
    const placed = placePhoto(source.width, source.height, rect, transform)
    context.save()
    context.beginPath()
    context.roundRect(rect.x, rect.y, rect.width, rect.height, Math.min(radius, rect.width / 2, rect.height / 2))
    context.clip()
    context.drawImage(source, placed.x, placed.y, placed.width, placed.height)
    context.restore()
  })
  return canvas
}

/** Small preview copy of a photo (object URL + original dimensions) for the interactive editor. */
export async function createPhotoPreview(file, maxSide = 1400) {
  const bitmap = await decodeImage(file)
  const { width, height } = bitmap
  const scale = Math.min(1, maxSide / Math.max(width, height))
  const canvas = createCanvas(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)))
  getContext(canvas).drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  const blob = await canvasToBlob(canvas, 'image/webp', 0.86)
  return { url: URL.createObjectURL(blob), width, height }
}

/**
 * @param {{ file: File, zoom: number, focusX: number, focusY: number }[]} items
 */
export async function createCollage(items, settings, weights, { onProgress } = {}) {
  onProgress?.(0.05, 'decoding')
  const photos = []
  try {
    for (const [index, item] of items.entries()) {
      photos.push({ source: await decodeImage(item.file), transform: item })
      onProgress?.(0.05 + (0.5 * (index + 1)) / items.length, 'decoding')
    }
    const canvas = drawCollage(photos, settings, weights)
    onProgress?.(0.7, 'encoding')
    const blob = await encodeCanvas(canvas, { format: settings.format, quality: 90, background: settings.background })
    return { blob, width: canvas.width, height: canvas.height, format: settings.format }
  } finally {
    photos.forEach(({ source }) => source.close?.())
  }
}
