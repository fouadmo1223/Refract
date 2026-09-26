import { CONVERTIBLE_FORMATS, getImageFormatFromFile } from '@/constants/imageFormats'
import { throwIfAborted } from '@/lib/errors'
import { runImageJob } from './imageWorkerClient'

/** Formats whose size can be steered with the quality setting. */
export const TARGET_SIZE_FORMATS = ['jpeg', 'webp', 'avif']

/**
 * Compress an image. If the re-encoded file would be larger than the original
 * in the same format, the original is kept and flagged as already optimized.
 * With `targetKB`, quality is searched (binary search, ≤7 encodes) for the
 * best quality that fits the size.
 * @param {File} file
 * @param {{ quality: number, format: string, maxDimension?: number, scale?: number, targetKB?: number }} settings
 */
export async function compressImage(file, settings, { signal, onProgress } = {}) {
  const base = { format: settings.format, maxDimension: settings.maxDimension || null, scale: settings.scale || 100 }
  const source = getImageFormatFromFile(file)
  const format = settings.format && settings.format !== 'original' ? settings.format : CONVERTIBLE_FORMATS.includes(source) ? source : 'png'

  if (settings.targetKB && TARGET_SIZE_FORMATS.includes(format)) {
    const target = settings.targetKB * 1024
    let low = 5
    let high = 95
    let best = null
    let smallest = null
    for (let step = 0; step < 7 && low <= high; step += 1) {
      throwIfAborted(signal)
      const quality = Math.round((low + high) / 2)
      const result = await runImageJob('compress', file, { ...base, quality }, { signal })
      onProgress?.((step + 1) / 7, 'encoding')
      if (!smallest || result.blob.size < smallest.blob.size) smallest = { ...result, quality }
      if (result.blob.size <= target) {
        best = { ...result, quality }
        low = quality + 1
      } else high = quality - 1
    }
    const chosen = best ?? smallest
    return { ...chosen, unchanged: false, targetMissed: !best, usedQuality: chosen.quality }
  }

  const result = await runImageJob('compress', file, { ...base, quality: settings.quality }, { signal, onProgress })
  const sameFormat = result.format === getImageFormatFromFile(file)
  if (sameFormat && !settings.maxDimension && base.scale === 100 && result.blob.size >= file.size) {
    return { ...result, blob: file, unchanged: true }
  }
  return { ...result, unchanged: false }
}
