import { createCanvas, getContext } from './canvas'
import { blurCanvas } from './adjustments'

export const DEFAULT_BLUR = { amount: 30, focus: 'none', focusX: 0.5, focusY: 0.5, focusSize: 35, feather: 50 }

/**
 * Blur the whole image, or everything except a sharp focus area:
 * `radial` keeps a circle around (focusX, focusY) sharp, `band` keeps a
 * horizontal strip (tilt-shift). Size and feather are % of the image.
 */
export function blurWithFocus(source, settings) {
  const s = { ...DEFAULT_BLUR, ...settings }
  const blurred = blurCanvas(source, s.amount)
  if (s.focus === 'none') return blurred
  const { width, height } = source
  const sharp = createCanvas(width, height)
  const sharpContext = getContext(sharp)
  sharpContext.drawImage(source, 0, 0)
  sharpContext.globalCompositeOperation = 'destination-in'
  const feather = Math.min(0.95, s.feather / 100)

  let gradient
  if (s.focus === 'radial') {
    const cx = s.focusX * width
    const cy = s.focusY * height
    const outer = Math.max(4, (s.focusSize / 100) * Math.max(width, height) * 0.75)
    gradient = sharpContext.createRadialGradient(cx, cy, outer * (1 - feather), cx, cy, outer)
    gradient.addColorStop(0, 'rgba(0,0,0,1)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
  } else {
    const center = s.focusY * height
    const half = Math.max(2, (s.focusSize / 100) * height * 0.5)
    const fade = Math.max(1, half * feather * 1.5)
    const top = center - half - fade
    const bottom = center + half + fade
    const span = bottom - top
    const clamp = (value) => Math.min(1, Math.max(0, value))
    gradient = sharpContext.createLinearGradient(0, top, 0, bottom)
    gradient.addColorStop(0, 'rgba(0,0,0,0)')
    gradient.addColorStop(clamp(fade / span), 'rgba(0,0,0,1)')
    gradient.addColorStop(clamp((span - fade) / span), 'rgba(0,0,0,1)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
  }
  sharpContext.fillStyle = gradient
  sharpContext.fillRect(0, 0, width, height)

  const result = createCanvas(width, height)
  const context = getContext(result)
  context.drawImage(blurred, 0, 0)
  context.drawImage(sharp, 0, 0)
  return result
}

/** Shadow → highlight colours used to tone a black & white image. */
export const MONO_TONES = {
  neutral: null,
  sepia: [
    [44, 28, 14],
    [255, 241, 214],
  ],
  cool: [
    [16, 24, 44],
    [232, 242, 255],
  ],
  green: [
    [18, 34, 22],
    [236, 250, 230],
  ],
  rose: [
    [46, 18, 30],
    [255, 234, 240],
  ],
}

export const DEFAULT_MONO = { amount: 100, tone: 'neutral', toneStrength: 70, contrast: 0, brightness: 0 }

/** Black & white with contrast / brightness and an optional colour tone (sepia, cool, …). */
export function monoCanvas(source, settings) {
  const s = { ...DEFAULT_MONO, ...settings }
  const { width, height } = source
  const canvas = createCanvas(width, height)
  const context = getContext(canvas, { willReadFrequently: true })
  context.drawImage(source, 0, 0)
  const imageData = context.getImageData(0, 0, width, height)
  const { data } = imageData
  const mix = s.amount / 100
  const contrast = 1 + s.contrast / 100
  const brightness = s.brightness * 1.28
  const tone = MONO_TONES[s.tone]
  const toneMix = tone ? s.toneStrength / 100 : 0
  for (let index = 0; index < data.length; index += 4) {
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]
    let luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
    luminance = Math.min(255, Math.max(0, (luminance - 128) * contrast + 128 + brightness))
    let outR = luminance
    let outG = luminance
    let outB = luminance
    if (tone) {
      const t = luminance / 255
      outR += (tone[0][0] + (tone[1][0] - tone[0][0]) * t - luminance) * toneMix
      outG += (tone[0][1] + (tone[1][1] - tone[0][1]) * t - luminance) * toneMix
      outB += (tone[0][2] + (tone[1][2] - tone[0][2]) * t - luminance) * toneMix
    }
    data[index] = r + (outR - r) * mix
    data[index + 1] = g + (outG - g) * mix
    data[index + 2] = b + (outB - b) * mix
  }
  context.putImageData(imageData, 0, 0)
  return canvas
}
