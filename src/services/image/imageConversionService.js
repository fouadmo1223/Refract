import { runImageJob } from './imageWorkerClient'

/**
 * Convert an image to another format.
 * @param {{ format: string, quality: number, background: string }} settings
 */
export function convertImage(file, settings, { signal, onProgress } = {}) {
  return runImageJob('convert', file, settings, { signal, onProgress })
}
