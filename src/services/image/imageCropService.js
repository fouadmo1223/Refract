import { runImageJob } from './imageWorkerClient'

/**
 * Crop (and optionally rotate / flip) an image.
 * `rect` is expressed in pixels of the rotated/flipped image.
 * @param {{ rect: {x,y,width,height}, rotation: number, flipH: boolean, flipV: boolean, format?: string, quality?: number }} settings
 */
export function cropImage(file, settings, { signal, onProgress } = {}) {
  return runImageJob('crop', file, { format: 'original', quality: 92, ...settings }, { signal, onProgress })
}
