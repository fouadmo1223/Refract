import { GIFEncoder, quantize, applyPalette } from 'gifenc'

/** Encode a single RGBA frame into a GIF, preserving binary transparency. */
export function encodeGif(imageData) {
  const { width, height, data } = imageData
  let hasAlpha = false
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 128) {
      hasAlpha = true
      break
    }
  }
  const palette = quantize(data, 256, hasAlpha ? { format: 'rgba4444', oneBitAlpha: true } : { format: 'rgb565' })
  const indexed = applyPalette(data, palette, hasAlpha ? 'rgba4444' : 'rgb565')
  const transparentIndex = hasAlpha ? palette.findIndex((color) => color[3] === 0) : -1

  const encoder = GIFEncoder()
  encoder.writeFrame(indexed, width, height, {
    palette,
    transparent: transparentIndex >= 0,
    transparentIndex: Math.max(0, transparentIndex),
  })
  encoder.finish()
  return new Blob([encoder.bytes()], { type: 'image/gif' })
}
