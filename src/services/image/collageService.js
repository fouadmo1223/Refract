import { createCanvas, decodeImage, getContext } from './canvas'
import { encodeCanvas } from './encoders'

export const DEFAULT_COLLAGE = { columns: 'auto', width: 2048, cellAspect: '1:1', gap: 2, radius: 2, background: '#FFFFFF', format: 'jpeg' }

const CELL_ASPECTS = { '1:1': 1, '4:5': 4 / 5, '3:2': 3 / 2, '16:9': 16 / 9, '9:16': 9 / 16 }

export function resolveColumns(columns, count) {
  if (columns !== 'auto') return Math.min(columns, count)
  if (count <= 1) return 1
  if (count <= 4) return 2
  return 3
}

/**
 * Lay images out in a uniform grid; each image is cover-cropped into its cell.
 * gap / radius are % of output width.
 * @param {(ImageBitmap|HTMLCanvasElement)[]} sources
 */
export function drawCollage(sources, settings, outputWidth = settings.width) {
  const count = sources.length
  const columns = resolveColumns(settings.columns, count)
  const rows = Math.ceil(count / columns)
  const gap = Math.round((settings.gap / 100) * outputWidth)
  const cellWidth = (outputWidth - gap * (columns + 1)) / columns
  const cellHeight = cellWidth / (CELL_ASPECTS[settings.cellAspect] ?? 1)
  const height = Math.round(rows * cellHeight + gap * (rows + 1))
  const radius = (settings.radius / 100) * outputWidth
  const canvas = createCanvas(outputWidth, height)
  const context = getContext(canvas)
  context.fillStyle = settings.background
  context.fillRect(0, 0, outputWidth, height)

  sources.forEach((source, index) => {
    const row = Math.floor(index / columns)
    // Center an incomplete last row.
    const itemsInRow = row === rows - 1 ? count - row * columns : columns
    const offset = ((columns - itemsInRow) * (cellWidth + gap)) / 2
    const column = index % columns
    const x = gap + offset + column * (cellWidth + gap)
    const y = gap + row * (cellHeight + gap)
    const scale = Math.max(cellWidth / source.width, cellHeight / source.height)
    const drawWidth = source.width * scale
    const drawHeight = source.height * scale
    context.save()
    context.beginPath()
    context.roundRect(x, y, cellWidth, cellHeight, radius)
    context.clip()
    context.drawImage(source, x + (cellWidth - drawWidth) / 2, y + (cellHeight - drawHeight) / 2, drawWidth, drawHeight)
    context.restore()
  })
  return canvas
}

export async function createCollage(files, settings, { onProgress } = {}) {
  onProgress?.(0.05, 'decoding')
  const bitmaps = []
  for (const [index, file] of files.entries()) {
    bitmaps.push(await decodeImage(file))
    onProgress?.(0.05 + (0.5 * (index + 1)) / files.length, 'decoding')
  }
  const canvas = drawCollage(bitmaps, settings)
  bitmaps.forEach((bitmap) => bitmap.close?.())
  onProgress?.(0.7, 'encoding')
  const blob = await encodeCanvas(canvas, { format: settings.format, quality: 90, background: settings.background })
  return { blob, width: canvas.width, height: canvas.height, format: settings.format }
}
