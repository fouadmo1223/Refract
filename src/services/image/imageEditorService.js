import { runImageJob } from './imageWorkerClient'

/**
 * Export an edited image at full resolution.
 * @param {{ transform: object, crop: object|null, adjustments: object, resize: object|null, format?: string, quality?: number }} state
 */
export function exportEditedImage(file, state, { signal, onProgress } = {}) {
  return runImageJob('edit', file, { format: 'original', quality: 92, ...state }, { signal, onProgress })
}
