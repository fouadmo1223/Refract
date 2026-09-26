import { createCanvas, decodeImage, getContext } from './canvas'
import { encodeCanvas } from './encoders'
import { resolveOutputFormat } from './imagePipeline'

export const TEXT_FONTS = {
  impact: 'Impact, "Anton", "Arial Black", "IBM Plex Sans Arabic", sans-serif',
  sans: '"Inter Variable", "IBM Plex Sans Arabic", system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", "IBM Plex Sans Arabic", serif',
  mono: 'ui-monospace, "Cascadia Mono", Menlo, monospace',
}

export const DEFAULT_TEXT_OVERLAY = {
  topText: '',
  bottomText: '',
  font: 'impact',
  size: 10,
  fill: '#FFFFFF',
  stroke: '#000000',
  strokeWidth: 12,
  uppercase: true,
  background: false,
  backgroundColor: '#000000',
}

const ARABIC = /[؀-ۿ]/

/** Split text into lines that fit `maxWidth` (respects explicit newlines). */
function wrapLines(context, text, maxWidth) {
  const lines = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word
      if (context.measureText(candidate).width > maxWidth && line) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    lines.push(line)
  }
  return lines.filter((item, index, list) => item || list.length === 1)
}

/**
 * Draw one caption block anchored at the top or bottom.
 * `size` is font size as % of image width; strokeWidth is % of font size.
 */
function drawBlock(context, width, height, text, anchor, settings) {
  if (!text?.trim()) return
  const content = settings.uppercase ? text.toLocaleUpperCase() : text
  const fontSize = Math.max(8, (settings.size / 100) * width)
  const margin = Math.round(width * 0.04)
  context.font = `800 ${fontSize}px ${TEXT_FONTS[settings.font] ?? TEXT_FONTS.sans}`
  context.textAlign = 'center'
  context.textBaseline = 'top'
  context.direction = ARABIC.test(content) ? 'rtl' : 'ltr'
  context.lineJoin = 'round'
  const lines = wrapLines(context, content, width - margin * 2)
  const lineHeight = fontSize * 1.15
  const blockHeight = lines.length * lineHeight
  const top = anchor === 'top' ? margin : height - margin - blockHeight

  if (settings.background) {
    const blockWidth = Math.max(...lines.map((line) => context.measureText(line).width))
    const padding = fontSize * 0.3
    context.fillStyle = settings.backgroundColor
    context.globalAlpha = 0.75
    context.fillRect(width / 2 - blockWidth / 2 - padding, top - padding * 0.6, blockWidth + padding * 2, blockHeight + padding * 1.2)
    context.globalAlpha = 1
  }
  lines.forEach((line, index) => {
    const y = top + index * lineHeight
    if (settings.strokeWidth > 0) {
      context.strokeStyle = settings.stroke
      context.lineWidth = (settings.strokeWidth / 100) * fontSize
      context.strokeText(line, width / 2, y)
    }
    context.fillStyle = settings.fill
    context.fillText(line, width / 2, y)
  })
}

/** Draw top and bottom captions onto a context of size width × height (preview and export share this). */
export function drawTextOverlay(context, width, height, settings) {
  drawBlock(context, width, height, settings.topText, 'top', settings)
  drawBlock(context, width, height, settings.bottomText, 'bottom', settings)
}

/** Export at full resolution on the main thread (needs document fonts). */
export async function applyTextOverlay(file, settings, { onProgress } = {}) {
  onProgress?.(0.1, 'decoding')
  const bitmap = await decodeImage(file)
  const canvas = createCanvas(bitmap.width, bitmap.height)
  const context = getContext(canvas)
  context.drawImage(bitmap, 0, 0)
  bitmap.close?.()
  onProgress?.(0.4, 'processing')
  drawTextOverlay(context, canvas.width, canvas.height, settings)
  onProgress?.(0.7, 'encoding')
  const format = resolveOutputFormat('original', file)
  const blob = await encodeCanvas(canvas, { format, quality: 92 })
  return { blob, width: canvas.width, height: canvas.height, format }
}
