import { quantize } from 'gifenc'

export function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

export function rgbToHsl(r, g, b) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const lightness = (max + min) / 2
  let hue = 0
  let saturation = 0
  if (max !== min) {
    const delta = max - min
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
    if (max === rn) hue = (gn - bn) / delta + (gn < bn ? 6 : 0)
    else if (max === gn) hue = (bn - rn) / delta + 2
    else hue = (rn - gn) / delta + 4
    hue *= 60
  }
  return { h: Math.round(hue), s: Math.round(saturation * 100), l: Math.round(lightness * 100) }
}

export function describeColor(r, g, b) {
  const { h, s, l } = rgbToHsl(r, g, b)
  return { hex: rgbToHex(r, g, b), rgb: `rgb(${r}, ${g}, ${b})`, hsl: `hsl(${h}, ${s}%, ${l}%)` }
}

/** Extract a dominant-color palette from (downsampled) ImageData, most dominant first. */
export function extractPalette(imageData, count = 8) {
  const palette = quantize(imageData.data, count, { format: 'rgb565' })
  const counts = new Array(palette.length).fill(0)
  const { data } = imageData
  for (let index = 0; index < data.length; index += 16) {
    let best = 0
    let bestDistance = Infinity
    for (let color = 0; color < palette.length; color += 1) {
      const [r, g, b] = palette[color]
      const distance = (r - data[index]) ** 2 + (g - data[index + 1]) ** 2 + (b - data[index + 2]) ** 2
      if (distance < bestDistance) {
        bestDistance = distance
        best = color
      }
    }
    counts[best] += 1
  }
  return palette
    .map((color, index) => ({ color, count: counts[index] }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .map(({ color: [r, g, b] }) => describeColor(r, g, b))
}
