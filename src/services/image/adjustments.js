import { createCanvas, getContext } from './canvas'

/**
 * Pixel adjustments shared by the live editor preview (main thread, downscaled)
 * and the full-resolution export (Web Worker). Keeping one implementation
 * guarantees the preview matches the exported file.
 *
 * All sliders are -100…100 except blur/sharpen (0…100) and opacity (0…100).
 */
export const DEFAULT_ADJUSTMENTS = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  temperature: 0,
  tint: 0,
  blur: 0,
  sharpen: 0,
  opacity: 100,
  vignette: 0,
}

export const ADJUSTMENT_RANGES = {
  brightness: [-100, 100],
  contrast: [-100, 100],
  saturation: [-100, 100],
  exposure: [-100, 100],
  highlights: [-100, 100],
  shadows: [-100, 100],
  temperature: [-100, 100],
  tint: [-100, 100],
  blur: [0, 100],
  sharpen: [0, 100],
  opacity: [0, 100],
  vignette: [0, 100],
}

export function isDefaultAdjustments(adjustments) {
  return Object.entries(DEFAULT_ADJUSTMENTS).every(([key, value]) => (adjustments[key] ?? value) === value)
}

/** Blur radius is relative to image size so preview and export look identical. */
export function getBlurRadius(amount, width, height) {
  return (amount / 100) * Math.min(width, height) * 0.03
}

// --------------------------------------------------------------- Box blur
function boxBlurHorizontal(source, target, width, height, radius) {
  const r = Math.max(1, Math.round(radius))
  const scale = 1 / (r + r + 1)
  for (let y = 0; y < height; y += 1) {
    const row = y * width * 4
    for (let channel = 0; channel < 4; channel += 1) {
      const first = source[row + channel]
      const last = source[row + (width - 1) * 4 + channel]
      let sum = r * first
      for (let x = 0; x < r; x += 1) sum += source[row + Math.min(x, width - 1) * 4 + channel]
      for (let x = 0; x < width; x += 1) {
        const addIndex = x + r
        sum += addIndex < width ? source[row + addIndex * 4 + channel] : last
        target[row + x * 4 + channel] = sum * scale
        const removeIndex = x - r
        sum -= removeIndex >= 0 ? source[row + removeIndex * 4 + channel] : first
      }
    }
  }
}

function boxBlurVertical(source, target, width, height, radius) {
  const r = Math.max(1, Math.round(radius))
  const scale = 1 / (r + r + 1)
  const stride = width * 4
  for (let x = 0; x < width; x += 1) {
    for (let channel = 0; channel < 4; channel += 1) {
      const column = x * 4 + channel
      const first = source[column]
      const last = source[(height - 1) * stride + column]
      let sum = r * first
      for (let y = 0; y < r; y += 1) sum += source[Math.min(y, height - 1) * stride + column]
      for (let y = 0; y < height; y += 1) {
        const addIndex = y + r
        sum += addIndex < height ? source[addIndex * stride + column] : last
        target[y * stride + column] = sum * scale
        const removeIndex = y - r
        sum -= removeIndex >= 0 ? source[removeIndex * stride + column] : first
      }
    }
  }
}

/** Three box passes approximate a gaussian blur in O(n) regardless of radius. */
export function blurPixels(data, width, height, radius) {
  if (radius < 0.5) return data
  const passRadius = radius / Math.sqrt(3)
  const buffer = new Float32Array(data.length)
  const work = Float32Array.from(data)
  for (let pass = 0; pass < 3; pass += 1) {
    boxBlurHorizontal(work, buffer, width, height, passRadius)
    boxBlurVertical(buffer, work, width, height, passRadius)
  }
  const output = new Uint8ClampedArray(data.length)
  output.set(work)
  return output
}

// --------------------------------------------------------------- Tone
function buildChannelLut(adjustments, channel) {
  const lut = new Float32Array(256)
  const exposure = 2 ** ((adjustments.exposure / 100) * 2)
  const brightness = (adjustments.brightness / 100) * 0.3
  const contrast = adjustments.contrast / 100
  const contrastFactor = contrast >= 0 ? 1 + contrast * 1.5 : 1 + contrast
  const temperature = (adjustments.temperature / 100) * 0.12
  const tint = (adjustments.tint / 100) * 0.1
  const shift = channel === 0 ? temperature + tint * 0.5 : channel === 2 ? -temperature + tint * 0.5 : -tint

  for (let value = 0; value < 256; value += 1) {
    let v = (value / 255) * exposure
    v += shift
    v += brightness
    v = (v - 0.5) * contrastFactor + 0.5
    lut[value] = v
  }
  return lut
}

function clamp255(value) {
  return value < 0 ? 0 : value > 1 ? 255 : value * 255
}

/**
 * Apply adjustments to a canvas and return a new canvas.
 */
export function applyAdjustments(sourceCanvas, adjustments) {
  const settings = { ...DEFAULT_ADJUSTMENTS, ...adjustments }
  const { width, height } = sourceCanvas
  const canvas = createCanvas(width, height)
  const context = getContext(canvas, { willReadFrequently: true })
  context.drawImage(sourceCanvas, 0, 0)
  if (isDefaultAdjustments(settings)) return canvas

  const imageData = context.getImageData(0, 0, width, height)
  let data = imageData.data

  if (settings.blur > 0) {
    data = blurPixels(data, width, height, getBlurRadius(settings.blur, width, height))
  }

  let sharpenBase = null
  if (settings.sharpen > 0) {
    sharpenBase = blurPixels(data, width, height, Math.max(1, Math.min(width, height) * 0.002))
  }
  const sharpenAmount = (settings.sharpen / 100) * 1.5

  const lutR = buildChannelLut(settings, 0)
  const lutG = buildChannelLut(settings, 1)
  const lutB = buildChannelLut(settings, 2)
  const saturation = 1 + settings.saturation / 100
  const highlights = (settings.highlights / 100) * 0.35
  const shadows = (settings.shadows / 100) * 0.35
  const opacity = settings.opacity / 100
  const vignette = settings.vignette / 100
  const centerX = width / 2
  const centerY = height / 2
  const maxDistance = Math.hypot(centerX, centerY)
  const output = imageData.data

  for (let index = 0; index < data.length; index += 4) {
    let r = data[index]
    let g = data[index + 1]
    let b = data[index + 2]
    if (sharpenBase) {
      r += (r - sharpenBase[index]) * sharpenAmount
      g += (g - sharpenBase[index + 1]) * sharpenAmount
      b += (b - sharpenBase[index + 2]) * sharpenAmount
      r = r < 0 ? 0 : r > 255 ? 255 : r
      g = g < 0 ? 0 : g > 255 ? 255 : g
      b = b < 0 ? 0 : b > 255 ? 255 : b
    }
    let rf = lutR[r | 0]
    let gf = lutG[g | 0]
    let bf = lutB[b | 0]

    if (highlights !== 0 || shadows !== 0) {
      const luminance = Math.min(1, Math.max(0, 0.2126 * rf + 0.7152 * gf + 0.0722 * bf))
      const delta = shadows * (1 - luminance) * (1 - luminance) + highlights * luminance * luminance
      rf += delta
      gf += delta
      bf += delta
    }
    if (saturation !== 1) {
      const luminance = 0.2126 * rf + 0.7152 * gf + 0.0722 * bf
      rf = luminance + (rf - luminance) * saturation
      gf = luminance + (gf - luminance) * saturation
      bf = luminance + (bf - luminance) * saturation
    }
    if (vignette > 0) {
      const pixel = index / 4
      const distance = Math.hypot((pixel % width) - centerX, Math.floor(pixel / width) - centerY) / maxDistance
      const falloff = Math.max(0, 1 - vignette * 0.85 * Math.max(0, distance - 0.35) ** 1.6 * 2.2)
      rf *= falloff
      gf *= falloff
      bf *= falloff
    }
    output[index] = clamp255(rf)
    output[index + 1] = clamp255(gf)
    output[index + 2] = clamp255(bf)
    output[index + 3] = data[index + 3] * opacity
  }

  context.putImageData(imageData, 0, 0)
  return canvas
}

// --------------------------------------------------------------- Effects
export function pixelateCanvas(sourceCanvas, blockSize) {
  const { width, height } = sourceCanvas
  const size = Math.max(2, Math.round(blockSize))
  const small = createCanvas(Math.max(1, Math.ceil(width / size)), Math.max(1, Math.ceil(height / size)))
  const smallContext = getContext(small)
  smallContext.imageSmoothingEnabled = true
  smallContext.drawImage(sourceCanvas, 0, 0, small.width, small.height)
  const canvas = createCanvas(width, height)
  const context = getContext(canvas)
  context.imageSmoothingEnabled = false
  context.drawImage(small, 0, 0, width, height)
  return canvas
}

export function grayscaleCanvas(sourceCanvas, amount = 100) {
  const { width, height } = sourceCanvas
  const canvas = createCanvas(width, height)
  const context = getContext(canvas, { willReadFrequently: true })
  context.drawImage(sourceCanvas, 0, 0)
  const imageData = context.getImageData(0, 0, width, height)
  const { data } = imageData
  const mix = amount / 100
  for (let index = 0; index < data.length; index += 4) {
    const luminance = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]
    data[index] += (luminance - data[index]) * mix
    data[index + 1] += (luminance - data[index + 1]) * mix
    data[index + 2] += (luminance - data[index + 2]) * mix
  }
  context.putImageData(imageData, 0, 0)
  return canvas
}

export function blurCanvas(sourceCanvas, amount) {
  return applyAdjustments(sourceCanvas, { blur: amount })
}
