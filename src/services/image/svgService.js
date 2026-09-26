import { AppError, ERROR_CODES } from '@/lib/errors'
import { createCanvas, getContext } from './canvas'
import { encodeCanvas } from './encoders'

/** Read intrinsic SVG dimensions from width/height or the viewBox. */
export async function readSvgSize(file) {
  const text = await file.text()
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const svg = doc.documentElement
  if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) {
    throw new AppError(ERROR_CODES.CORRUPTED_FILE)
  }
  const parseLength = (value) => {
    const number = parseFloat(value)
    return value && !String(value).includes('%') && Number.isFinite(number) ? number : null
  }
  const viewBox = svg.getAttribute('viewBox')?.split(/[\s,]+/).map(Number)
  const width = parseLength(svg.getAttribute('width')) ?? viewBox?.[2] ?? 512
  const height = parseLength(svg.getAttribute('height')) ?? viewBox?.[3] ?? 512
  return { width, height, svg }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new AppError(ERROR_CODES.CORRUPTED_FILE))
    image.src = url
  })
}

/**
 * Rasterize an SVG on the main thread (workers can't decode SVG).
 * @param {{ width: number, format: string, background: string|null, quality: number }} settings
 */
export async function rasterizeSvg(file, settings, { onProgress } = {}) {
  onProgress?.(0.1, 'decoding')
  const { width: baseWidth, height: baseHeight, svg } = await readSvgSize(file)
  const width = Math.round(settings.width)
  const height = Math.max(1, Math.round((baseHeight / baseWidth) * width))
  // Force an explicit size so the browser rasterizes crisply at the target resolution.
  if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${baseWidth} ${baseHeight}`)
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  const serialized = new XMLSerializer().serializeToString(svg)
  const url = URL.createObjectURL(new Blob([serialized], { type: 'image/svg+xml' }))
  try {
    const image = await loadImage(url)
    onProgress?.(0.5, 'processing')
    const canvas = createCanvas(width, height)
    const context = getContext(canvas)
    if (settings.background) {
      context.fillStyle = settings.background
      context.fillRect(0, 0, width, height)
    }
    context.drawImage(image, 0, 0, width, height)
    onProgress?.(0.75, 'encoding')
    const blob = await encodeCanvas(canvas, { format: settings.format, quality: settings.quality ?? 92 })
    return { blob, width, height, format: settings.format }
  } finally {
    URL.revokeObjectURL(url)
  }
}
