import { AppError, ERROR_CODES, createCanceledError, isAppError, throwIfAborted } from '@/lib/errors'
import { createCanvas, decodeImage, getContext } from '@/services/image/canvas'
import { encodeCanvas } from '@/services/image/encoders'
import { imglyProvider } from './providers/imglyProvider'

/**
 * Background removal is provider-based. A provider implements:
 *   { id, processing: 'local' | 'server', removeBackground(file, { onProgress, signal }) => Promise<Blob> }
 * To connect a remote API later, add a provider (e.g. providers/remoteApiProvider.js)
 * and register it here — no UI changes are needed.
 */
const PROVIDERS = { imgly: imglyProvider }
let activeProviderId = 'imgly'

export function setBackgroundRemovalProvider(id) {
  if (!PROVIDERS[id]) throw new Error(`Unknown background removal provider: ${id}`)
  activeProviderId = id
}

export function getBackgroundRemovalProvider() {
  return PROVIDERS[activeProviderId]
}

/** Remove the background and return a transparent PNG cut-out. */
export async function removeBackgroundService(file, { onProgress, signal } = {}) {
  throwIfAborted(signal)
  const provider = getBackgroundRemovalProvider()
  try {
    const cutout = await Promise.race([
      provider.removeBackground(file, { onProgress, signal }),
      new Promise((_, reject) => signal?.addEventListener('abort', () => reject(createCanceledError()), { once: true })),
    ])
    throwIfAborted(signal)
    return cutout
  } catch (error) {
    if (isAppError(error)) throw error
    const text = String(error?.message ?? error).toLowerCase()
    if (/fetch|network/.test(text)) throw new AppError(ERROR_CODES.NETWORK_ERROR, {}, error)
    throw new AppError(ERROR_CODES.BACKGROUND_REMOVAL_FAILED, {}, error)
  }
}

/**
 * Compose the cut-out over a background.
 * @param {Blob} cutout transparent PNG
 * @param {{ mode: 'transparent'|'color'|'image', color: string, imageFile: File|null, format: string }} options
 */
export async function composeBackground(cutout, { mode, color, imageFile, format }) {
  const foreground = await decodeImage(cutout)
  const canvas = createCanvas(foreground.width, foreground.height)
  const context = getContext(canvas)

  if (mode === 'color') {
    context.fillStyle = color
    context.fillRect(0, 0, canvas.width, canvas.height)
  } else if (mode === 'image' && imageFile) {
    const background = await decodeImage(imageFile)
    // Cover-fit the background image.
    const scale = Math.max(canvas.width / background.width, canvas.height / background.height)
    const width = background.width * scale
    const height = background.height * scale
    context.drawImage(background, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
    background.close?.()
  }
  context.drawImage(foreground, 0, 0)
  foreground.close?.()

  const outputFormat = mode === 'transparent' && format === 'jpeg' ? 'png' : format
  const blob = await encodeCanvas(canvas, { format: outputFormat, quality: 92 })
  return { blob, width: canvas.width, height: canvas.height, format: outputFormat }
}
