import { getImageFormatFromFile } from '@/constants/imageFormats'
import { decodeImage } from './canvas'

/** Basic image info (dimensions + format) — decodes once, then frees the bitmap. */
export async function readImageInfo(file) {
  const bitmap = await decodeImage(file)
  const info = { width: bitmap.width, height: bitmap.height, format: getImageFormatFromFile(file) }
  bitmap.close?.()
  return info
}
