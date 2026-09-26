import { getImageFormatFromFile } from '@/constants/imageFormats'
import { runImageJob } from './imageWorkerClient'

/**
 * Compress an image. If the re-encoded file would be larger than the original
 * in the same format, the original is kept and flagged as already optimized.
 * @param {File} file
 * @param {{ quality: number, format: string, maxDimension?: number }} settings
 */
export async function compressImage(file, settings, { signal, onProgress } = {}) {
  const result = await runImageJob(
    'compress',
    file,
    { format: settings.format, quality: settings.quality, maxDimension: settings.maxDimension || null },
    { signal, onProgress },
  )
  const sameFormat = result.format === getImageFormatFromFile(file)
  if (sameFormat && !settings.maxDimension && result.blob.size >= file.size) {
    return { ...result, blob: file, unchanged: true }
  }
  return { ...result, unchanged: false }
}
