import { AppError, ERROR_CODES, throwIfAborted } from '@/lib/errors'
import { huggingFaceProvider } from './providers/huggingFaceProvider'
import { pollinationsProvider } from './providers/pollinationsProvider'

/**
 * Cloud AI generation. Providers implement:
 *   { id, name, kinds: ('image'|'video')[], keyUrl, keyPlaceholder, defaultModels,
 *     listModels(kind), generateImage(params)?, generateVideo(params)? }
 * Add a provider here (e.g. your own backend) without touching the UI.
 */
export const AI_PROVIDERS = [pollinationsProvider, huggingFaceProvider]

export function getAiProvider(id) {
  return AI_PROVIDERS.find((provider) => provider.id === id) ?? AI_PROVIDERS[0]
}

export function getProvidersFor(kind) {
  return AI_PROVIDERS.filter((provider) => provider.kinds.includes(kind))
}

export const ASPECT_SIZES = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1344, height: 768 },
  '9:16': { width: 768, height: 1344 },
  '4:3': { width: 1152, height: 864 },
  '3:4': { width: 864, height: 1152 },
}

export function randomSeed() {
  return Math.floor(Math.random() * 2_147_483_647)
}

function requireKey(apiKey) {
  if (!apiKey?.trim()) throw new AppError(ERROR_CODES.AI_KEY_REQUIRED)
}

/**
 * Generate `count` images sequentially (providers rate-limit parallel requests).
 * @returns {Promise<{ blob: Blob, seed: number, width: number, height: number, prompt: string, model: string }[]>}
 */
export async function generateImages({ providerId, apiKey, prompt, negativePrompt, model, aspect, count, seed }, { signal, onProgress } = {}) {
  requireKey(apiKey)
  const provider = getAiProvider(providerId)
  const { width, height } = ASPECT_SIZES[aspect] ?? ASPECT_SIZES['1:1']
  const results = []
  for (let index = 0; index < count; index += 1) {
    throwIfAborted(signal)
    onProgress?.(index / count, 'generatingImage')
    const imageSeed = seed == null ? randomSeed() : seed + index
    const blob = await provider.generateImage({ prompt, negativePrompt, model, width, height, seed: imageSeed, apiKey, signal })
    results.push({ blob, seed: imageSeed, width, height, prompt, model })
  }
  onProgress?.(1, 'finalizing')
  return results
}

export async function generateVideo({ providerId, apiKey, prompt, model, duration, aspect, seed }, { signal, onProgress } = {}) {
  requireKey(apiKey)
  const provider = getAiProvider(providerId)
  if (!provider.generateVideo) throw new AppError(ERROR_CODES.AI_MODEL_UNAVAILABLE)
  onProgress?.(null, 'generatingVideo')
  const blob = await provider.generateVideo({ prompt, model, duration, aspectRatio: aspect, seed: seed ?? randomSeed(), apiKey, signal })
  return { blob, format: 'mp4', duration }
}
