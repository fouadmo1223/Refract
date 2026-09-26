/**
 * Build a multi-resolution .ico from PNG blobs (PNG-in-ICO is supported
 * by every modern OS and browser).
 * @param {{ size: number, blob: Blob }[]} entries
 */
export async function encodeIco(entries) {
  const images = await Promise.all(entries.map(async ({ size, blob }) => ({ size, bytes: new Uint8Array(await blob.arrayBuffer()) })))
  const headerSize = 6 + images.length * 16
  const total = headerSize + images.reduce((sum, image) => sum + image.bytes.length, 0)
  const buffer = new ArrayBuffer(total)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, images.length, true)

  let offset = headerSize
  images.forEach((image, index) => {
    const entry = 6 + index * 16
    view.setUint8(entry, image.size >= 256 ? 0 : image.size)
    view.setUint8(entry + 1, image.size >= 256 ? 0 : image.size)
    view.setUint8(entry + 2, 0)
    view.setUint8(entry + 3, 0)
    view.setUint16(entry + 4, 1, true)
    view.setUint16(entry + 6, 32, true)
    view.setUint32(entry + 8, image.bytes.length, true)
    view.setUint32(entry + 12, offset, true)
    bytes.set(image.bytes, offset)
    offset += image.bytes.length
  })
  return new Blob([buffer], { type: 'image/x-icon' })
}
