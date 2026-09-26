import { aiFetch, assertOk, readMediaBlob } from '../httpErrors'

const BASE_URL = 'https://gen.pollinations.ai'
const NAME = 'Pollinations'

/**
 * Pollinations.ai — image and video generation. Requires a (free) account key
 * from enter.pollinations.ai; free accounts receive a daily "pollen" grant that
 * covers many cheap image generations. Most video models are paid-only.
 */
export const pollinationsProvider = {
  id: 'pollinations',
  name: NAME,
  kinds: ['image', 'video'],
  keyUrl: 'https://enter.pollinations.ai',
  keyPlaceholder: 'sk_…',
  defaultModels: { image: 'tongyi-mai/z-image-turbo', video: 'amazon/nova-reel-v1' },

  /** Live model list with pricing flags. */
  async listModels(kind) {
    const response = await assertOk(await aiFetch(`${BASE_URL}/${kind}/models`, {}, { providerName: NAME }), { providerName: NAME })
    const json = await response.json()
    const list = Array.isArray(json) ? json : (json.data ?? [])
    return list
      .filter((model) => (model.output_modalities ?? [kind]).includes(kind))
      .map((model) => ({
        id: model.name ?? model.id,
        label: model.name ?? model.id,
        description: model.description,
        paidOnly: Boolean(model.paid_only),
        price: Number(model.pricing?.completionImageTokens ?? model.pricing?.completionVideoSeconds ?? NaN),
      }))
      .sort((a, b) => Number(a.paidOnly) - Number(b.paidOnly) || (a.price || 0) - (b.price || 0))
  },

  async generateImage({ prompt, model, width, height, seed, apiKey, signal }) {
    const params = new URLSearchParams({ model, width: String(width), height: String(height), seed: String(seed) })
    const response = await aiFetch(
      `${BASE_URL}/image/${encodeURIComponent(prompt)}?${params}`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal },
      { providerName: NAME },
    )
    await assertOk(response, { providerName: NAME })
    return readMediaBlob(response, 'image/', { providerName: NAME })
  },

  async generateVideo({ prompt, model, duration, aspectRatio, seed, apiKey, signal }) {
    const params = new URLSearchParams({ model, duration: String(duration), aspectRatio, seed: String(seed) })
    const response = await aiFetch(
      `${BASE_URL}/video/${encodeURIComponent(prompt)}?${params}`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal },
      { providerName: NAME },
    )
    await assertOk(response, { providerName: NAME })
    return readMediaBlob(response, 'video/', { providerName: NAME })
  },
}
