import { getImageFormat } from '@/constants/imageFormats'
import { buildOutputName } from '@/lib/files'

/** "photo.png" + result(webp) + "compressed" → "photo-compressed.webp" */
export function imageOutputName(file, result, suffix = '') {
  const ext = result?.format ? getImageFormat(result.format)?.ext ?? result.format : undefined
  return buildOutputName(file.name, suffix, ext)
}
