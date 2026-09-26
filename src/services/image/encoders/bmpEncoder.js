/** Encode RGBA ImageData into a 24-bit uncompressed BMP. */
export function encodeBmp(imageData) {
  const { width, height, data } = imageData
  const rowSize = Math.ceil((width * 3) / 4) * 4
  const pixelBytes = rowSize * height
  const fileSize = 54 + pixelBytes
  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)

  view.setUint8(0, 0x42)
  view.setUint8(1, 0x4d)
  view.setUint32(2, fileSize, true)
  view.setUint32(10, 54, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(34, pixelBytes, true)
  view.setInt32(38, 2835, true)
  view.setInt32(42, 2835, true)

  const bytes = new Uint8Array(buffer)
  for (let y = 0; y < height; y += 1) {
    const rowOffset = 54 + (height - 1 - y) * rowSize
    for (let x = 0; x < width; x += 1) {
      const source = (y * width + x) * 4
      const target = rowOffset + x * 3
      bytes[target] = data[source + 2]
      bytes[target + 1] = data[source + 1]
      bytes[target + 2] = data[source]
    }
  }
  return new Blob([buffer], { type: 'image/bmp' })
}
