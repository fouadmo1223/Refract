import { resultFileName } from '@/lib/files'

/** "photo.png" + result(webp) + "compressed" → "photo-compressed.webp" */
export function imageOutputName(file, result, suffix = '') {
  return resultFileName(file.name, suffix, result?.format)
}
