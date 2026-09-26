import { runImageJob } from './imageWorkerClient'

/**
 * Resize an image.
 * @param {{ width: number, height: number, mode: 'fit'|'fill'|'stretch', noUpscale: boolean, format?: string, quality?: number }} settings
 */
export function resizeImage(file, settings, { signal, onProgress } = {}) {
  return runImageJob('resize', file, { format: 'original', quality: 92, ...settings }, { signal, onProgress })
}
