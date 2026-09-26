import { runImageJob } from './imageWorkerClient'

/**
 * One-step effects: blur, pixelate, grayscale, rotate, flip.
 * @param {{ effect: string, amount?: number, rotation?: number, flipH?: boolean, flipV?: boolean, background?: string }} settings
 */
export function applyImageEffect(file, settings, { signal, onProgress } = {}) {
  return runImageJob('effect', file, { format: 'original', quality: 92, ...settings }, { signal, onProgress })
}
