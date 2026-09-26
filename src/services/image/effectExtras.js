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

// ---------------------------------------------------------------- Rotate
/** Largest axis-aligned rectangle inside a w×h image rotated by `radians` (no empty corners). */
function inscribedSize(width, height, radians) {
  const sin = Math.abs(Math.sin(radians))
  const cos = Math.abs(Math.cos(radians))
  if (sin < 1e-6) return { width, height }
  if (cos < 1e-6) return { width: height, height: width }
  const longSide = Math.max(width, height)
  const shortSide = Math.min(width, height)
  let w
  let h
  if (shortSide <= 2 * sin * cos * longSide || Math.abs(sin - cos) < 1e-10) {
    const half = 0.5 * shortSide
    if (width >= height) {
      w = half / sin
      h = half / cos
    } else {
      w = half / cos
      h = half / sin
    }
  } else {
    const cos2 = cos * cos - sin * sin
    w = (width * cos - height * sin) / cos2
    h = (height * cos - width * sin) / cos2
  }
  return { width: Math.max(1, Math.floor(w)), height: Math.max(1, Math.floor(h)) }
}

export const DEFAULT_ROTATE = { rotation: 90, fill: 'transparent', fillColor: '#FFFFFF', autoCrop: false }

/** Rotate by any angle; empty corners stay transparent, get a colour, or are cropped away. */
export function rotateImage(source, settings) {
  const s = { ...DEFAULT_ROTATE, ...settings }
  const { width, height } = source
  const radians = (s.rotation * Math.PI) / 180
  const sin = Math.abs(Math.sin(radians))
  const cos = Math.abs(Math.cos(radians))
  let outWidth = Math.round(width * cos + height * sin)
  let outHeight = Math.round(width * sin + height * cos)
  if (s.autoCrop) {
    const inner = inscribedSize(width, height, radians)
    outWidth = inner.width
    outHeight = inner.height
  }
  const canvas = createCanvas(outWidth, outHeight)
  const context = getContext(canvas)
  if (s.fill === 'color' && !s.autoCrop) {
    context.fillStyle = s.fillColor
    context.fillRect(0, 0, outWidth, outHeight)
  }
  context.translate(outWidth / 2, outHeight / 2)
  context.rotate(radians)
  context.drawImage(source, -width / 2, -height / 2)
  return canvas
}

// ---------------------------------------------------------------- Flip / mirror
export const DEFAULT_FLIP = { mode: 'flip', flipH: true, flipV: false }

/**
 * `flip` mirrors the whole image; `mirror-left|right|top|bottom` keeps one half
 * and reflects it onto the other for a symmetric image.
 */
export function flipImage(source, settings) {
  const s = { ...DEFAULT_FLIP, ...settings }
  const { width, height } = source
  const canvas = createCanvas(width, height)
  const context = getContext(canvas)
  if (s.mode === 'flip') {
    context.translate(s.flipH ? width : 0, s.flipV ? height : 0)
    context.scale(s.flipH ? -1 : 1, s.flipV ? -1 : 1)
    context.drawImage(source, 0, 0)
    return canvas
  }
  const side = s.mode.replace('mirror-', '')
  const halfW = Math.floor(width / 2)
  const halfH = Math.floor(height / 2)
  context.drawImage(source, 0, 0)
  context.save()
  if (side === 'left' || side === 'right') {
    // Copy the kept half, flipped, over the other half.
    const keepX = side === 'left' ? 0 : width - halfW
    const targetX = side === 'left' ? width - halfW : 0
    context.translate(targetX + halfW, 0)
    context.scale(-1, 1)
    context.drawImage(source, keepX, 0, halfW, height, 0, 0, halfW, height)
  } else {
    const keepY = side === 'top' ? 0 : height - halfH
    const targetY = side === 'top' ? height - halfH : 0
    context.translate(0, targetY + halfH)
    context.scale(1, -1)
    context.drawImage(source, 0, keepY, width, halfH, 0, 0, width, halfH)
  }
  context.restore()
  return canvas
}

// ---------------------------------------------------------------- Pixelate
export const DEFAULT_PIXELATE = { amount: 25, style: 'square', gap: 12, background: '#111111' }

/**
 * Pixel styles: plain `square` blocks, round `dots` on a background, or
 * `tiles` (squares separated by grout lines). Gap is % of the block size.
 */
export function pixelateStyled(source, settings) {
  const s = { ...DEFAULT_PIXELATE, ...settings }
  const { width, height } = source
  const block = Math.max(s.style === 'square' ? 2 : 4, Math.round((s.amount / 100) * Math.min(width, height) * 0.1))
  const columns = Math.max(1, Math.ceil(width / block))
  const rows = Math.max(1, Math.ceil(height / block))
  const small = createCanvas(columns, rows)
  const smallContext = getContext(small, { willReadFrequently: true })
  smallContext.imageSmoothingEnabled = true
  smallContext.drawImage(source, 0, 0, columns, rows)

  const canvas = createCanvas(width, height)
  const context = getContext(canvas)
  if (s.style === 'square') {
    context.imageSmoothingEnabled = false
    context.drawImage(small, 0, 0, columns * block, rows * block)
    return canvas
  }
  context.fillStyle = s.background
  context.fillRect(0, 0, width, height)
  const { data } = smallContext.getImageData(0, 0, columns, rows)
  const gap = Math.max(1, (block * s.gap) / 100)
  const size = Math.max(1, block - gap)
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = (row * columns + column) * 4
      if (data[index + 3] === 0) continue
      context.fillStyle = `rgba(${data[index]},${data[index + 1]},${data[index + 2]},${data[index + 3] / 255})`
      const x = column * block + gap / 2
      const y = row * block + gap / 2
      if (s.style === 'dots') {
        context.beginPath()
        context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
        context.fill()
      } else context.fillRect(x, y, size, size)
    }
  }
  return canvas
}
