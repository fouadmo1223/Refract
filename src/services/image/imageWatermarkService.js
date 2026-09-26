import { createCanvas, decodeImage, getContext } from './canvas'
import { encodeCanvas } from './encoders'
import { resolveOutputFormat } from './imagePipeline'

export const DEFAULT_WATERMARK = {
  type: 'text',
  text: '© Your Name',
  color: '#ffffff',
  fontWeight: 600,
  size: 25,
  opacity: 70,
  rotation: 0,
  margin: 4,
  position: 'bottom-right',
  box: false,
  boxColor: '#000000',
}

const ARABIC_PATTERN = /[؀-ۿ]/

function getAnchor(position, canvasWidth, canvasHeight, boxWidth, boxHeight, margin) {
  const [vertical, horizontal] = position === 'center' ? ['center', 'center'] : position.split('-')
  const x = horizontal === 'left' ? margin : horizontal === 'right' ? canvasWidth - margin - boxWidth : (canvasWidth - boxWidth) / 2
  const y = vertical === 'top' ? margin : vertical === 'bottom' ? canvasHeight - margin - boxHeight : (canvasHeight - boxHeight) / 2
  return { x, y }
}

/**
 * Draw a watermark onto a 2D context sized `width × height`.
 * Shared by the live preview (scaled) and the export (full size), so both match.
 * `size` is the share of the image width the watermark spans (%).
 */
export function drawWatermark(context, width, height, settings, logo) {
  const target = (settings.size / 100) * width
  const margin = (settings.margin / 100) * Math.min(width, height)
  let boxWidth = 0
  let boxHeight = 0
  let fontSize = 0

  if (settings.type === 'image') {
    if (!logo) return
    boxWidth = target
    boxHeight = (logo.height / logo.width) * target
  } else {
    if (!settings.text?.trim()) return
    const font = (size) => `${settings.fontWeight} ${size}px "Inter Variable", "IBM Plex Sans Arabic", system-ui, sans-serif`
    context.font = font(100)
    const measured = context.measureText(settings.text).width || 1
    fontSize = Math.max(6, (target / measured) * 100)
    context.font = font(fontSize)
    boxWidth = context.measureText(settings.text).width
    boxHeight = fontSize * 1.2
  }

  const { x, y } = getAnchor(settings.position, width, height, boxWidth, boxHeight, margin)
  context.save()
  context.globalAlpha = settings.opacity / 100
  context.translate(x + boxWidth / 2, y + boxHeight / 2)
  context.rotate((settings.rotation * Math.PI) / 180)
  if (settings.type === 'image') {
    context.drawImage(logo, -boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight)
  } else {
    context.fillStyle = settings.color
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.direction = ARABIC_PATTERN.test(settings.text) ? 'rtl' : 'ltr'
    if (settings.box) {
      const padX = fontSize * 0.45
      const padY = fontSize * 0.2
      context.fillStyle = settings.boxColor ?? '#000000'
      context.beginPath()
      context.roundRect(-boxWidth / 2 - padX, -boxHeight / 2 - padY, boxWidth + padX * 2, boxHeight + padY * 2, fontSize * 0.2)
      context.fill()
      context.fillStyle = settings.color
    }
    context.shadowColor = settings.box ? 'transparent' : 'rgba(0,0,0,0.25)'
    context.shadowBlur = fontSize * 0.08
    context.fillText(settings.text, 0, 0)
  }
  context.restore()
}

/** Render the watermarked image at full resolution and encode it (main thread: needs document fonts). */
export async function applyWatermark(file, settings, logoFile, { onProgress } = {}) {
  onProgress?.(0.1, 'decoding')
  const bitmap = await decodeImage(file)
  const logo = settings.type === 'image' && logoFile ? await decodeImage(logoFile) : null
  const canvas = createCanvas(bitmap.width, bitmap.height)
  const context = getContext(canvas)
  context.drawImage(bitmap, 0, 0)
  onProgress?.(0.4, 'processing')
  drawWatermark(context, canvas.width, canvas.height, settings, logo)
  onProgress?.(0.7, 'encoding')
  const format = resolveOutputFormat('original', file)
  const blob = await encodeCanvas(canvas, { format, quality: 92 })
  const result = { blob, width: canvas.width, height: canvas.height, format, original: { width: bitmap.width, height: bitmap.height } }
  bitmap.close?.()
  logo?.close?.()
  return result
}
