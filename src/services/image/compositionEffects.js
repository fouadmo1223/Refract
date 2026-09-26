import { applyAdjustments, blurPixels, pixelateCanvas } from './adjustments'
import { createCanvas, cropCanvas, getContext } from './canvas'
import { presetToAdjustments } from './filterPresets'

/**
 * Worker-safe canvas effects that compose or mask an image:
 * borders/frames, photo filters and region censoring.
 */

export const DEFAULT_BORDER = { padding: 6, color: '#FFFFFF', radius: 4, shadow: false, transparentBackground: false }

function roundedRectPath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.arcTo(x + width, y, x + width, y + height, r)
  context.arcTo(x + width, y + height, x, y + height, r)
  context.arcTo(x, y + height, x, y, r)
  context.arcTo(x, y, x + width, y, r)
  context.closePath()
}

/**
 * Add padding, rounded corners and an optional drop shadow.
 * padding / radius are percentages of the image's shorter side.
 */
export function addBorder(source, settings) {
  const { padding, color, radius, shadow, transparentBackground } = { ...DEFAULT_BORDER, ...settings }
  const base = Math.min(source.width, source.height)
  const pad = Math.round((padding / 100) * base)
  const cornerRadius = (radius / 100) * base
  const canvas = createCanvas(source.width + pad * 2, source.height + pad * 2)
  const context = getContext(canvas)

  if (!transparentBackground) {
    context.fillStyle = color
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  if (shadow && pad > 0) {
    context.save()
    context.shadowColor = 'rgba(0, 0, 0, 0.28)'
    context.shadowBlur = Math.max(4, pad * 0.6)
    context.shadowOffsetY = Math.max(2, pad * 0.15)
    context.fillStyle = '#000'
    roundedRectPath(context, pad, pad, source.width, source.height, cornerRadius)
    context.fill()
    context.restore()
  }
  context.save()
  roundedRectPath(context, pad, pad, source.width, source.height, cornerRadius)
  context.clip()
  context.clearRect(pad, pad, source.width, source.height)
  context.drawImage(source, pad, pad)
  context.restore()
  return canvas
}

export function applyFilterPreset(source, { preset, intensity }) {
  return applyAdjustments(source, presetToAdjustments(preset, intensity))
}

function strongBlur(piece, radius) {
  const context = getContext(piece, { willReadFrequently: true })
  const imageData = context.getImageData(0, 0, piece.width, piece.height)
  imageData.data.set(blurPixels(imageData.data, piece.width, piece.height, radius))
  context.putImageData(imageData, 0, 0)
  return piece
}

/**
 * Blur, pixelate or black-out rectangular regions (x/y/width/height in pixels).
 * strength 1–100 scales relative to each region's size.
 */
export function censorRegions(source, { regions = [], mode = 'blur', strength = 60 }) {
  const canvas = createCanvas(source.width, source.height)
  const context = getContext(canvas)
  context.drawImage(source, 0, 0)
  for (const region of regions) {
    const x = Math.max(0, Math.round(region.x))
    const y = Math.max(0, Math.round(region.y))
    const width = Math.min(Math.round(region.width), source.width - x)
    const height = Math.min(Math.round(region.height), source.height - y)
    if (width < 2 || height < 2) continue
    if (mode === 'solid') {
      context.fillStyle = '#000'
      context.fillRect(x, y, width, height)
      continue
    }
    const piece = cropCanvas(canvas, { x, y, width, height })
    const size = Math.min(width, height)
    const processed =
      mode === 'pixelate'
        ? pixelateCanvas(piece, Math.max(3, (strength / 100) * size * 0.25))
        : strongBlur(piece, Math.max(2, (strength / 100) * size * 0.18))
    context.drawImage(processed, x, y)
  }
  return canvas
}
