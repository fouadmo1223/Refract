import UPNG from 'upng-js'
import { getImageFormat } from '@/constants/imageFormats'
import { AppError, ERROR_CODES } from '@/lib/errors'
import { canvasToBlob, flattenCanvas, getImageData } from '../canvas'
import { encodeBmp } from './bmpEncoder'
import { encodeGif } from './gifEncoder'

/**
 * Encoders prefer native canvas encoding and fall back to WebAssembly codecs
 * (jSquash) when the browser can't produce the requested type — e.g. AVIF
 * in most browsers or WebP in Safari. WASM codecs are lazy-loaded.
 */

async function encodeNative(canvas, mime, quality) {
  const blob = await canvasToBlob(canvas, mime, quality)
  return blob?.type === mime ? blob : null
}

async function encodeWebp(canvas, quality) {
  const native = await encodeNative(canvas, 'image/webp', quality / 100)
  if (native) return native
  const { default: encode } = await import('@jsquash/webp/encode.js')
  const buffer = await encode(getImageData(canvas), { quality })
  return new Blob([buffer], { type: 'image/webp' })
}

async function encodeAvif(canvas, quality) {
  const native = await encodeNative(canvas, 'image/avif', quality / 100)
  if (native) return native
  const { default: encode } = await import('@jsquash/avif/encode.js')
  // AVIF quality scale is harsher than JPEG's; nudge so presets feel comparable.
  const avifQuality = Math.round(Math.min(100, quality * 0.85 + 5))
  const buffer = await encode(getImageData(canvas), { quality: avifQuality, speed: 7 })
  return new Blob([buffer], { type: 'image/avif' })
}

/** Map a 1–100 quality to a PNG palette size (0 = lossless). */
function qualityToPngColors(quality) {
  if (quality >= 100) return 0
  if (quality >= 90) return 256
  return Math.max(16, Math.round(2 ** (4 + (4 * quality) / 90)))
}

/**
 * PNG: lossless native encode, plus (when quality < 100) a quantized palette
 * encode via UPNG. The smaller of the two wins so output never gets worse.
 */
async function encodePng(canvas, quality) {
  const lossless = await canvasToBlob(canvas, 'image/png')
  const colors = qualityToPngColors(quality)
  if (colors === 0) return lossless
  const imageData = getImageData(canvas)
  const buffer = UPNG.encode([imageData.data.buffer], imageData.width, imageData.height, colors)
  const quantized = new Blob([buffer], { type: 'image/png' })
  return quantized.size < lossless.size ? quantized : lossless
}

/**
 * Encode a canvas into the requested format.
 * @param {HTMLCanvasElement|OffscreenCanvas} canvas
 * @param {{ format: string, quality?: number, background?: string }} options quality: 1–100
 */
export async function encodeCanvas(canvas, { format, quality = 92, background = '#ffffff' }) {
  const definition = getImageFormat(format)
  const q = Math.min(100, Math.max(1, Math.round(quality)))
  const source = definition.alpha ? canvas : flattenCanvas(canvas, background)

  switch (definition.id) {
    case 'jpeg':
      return canvasToBlob(source, 'image/jpeg', q / 100)
    case 'webp':
      return encodeWebp(source, q)
    case 'avif':
      return encodeAvif(source, q)
    case 'png':
      return encodePng(source, q)
    case 'bmp':
      return encodeBmp(getImageData(source))
    case 'gif':
      return encodeGif(getImageData(source))
    default:
      throw new AppError(ERROR_CODES.UNSUPPORTED_FORMAT, { formats: definition.label })
  }
}
