import { aiFetch, assertOk, readMediaBlob } from '../httpErrors'

const BASE_URL = 'https://router.huggingface.co/hf-inference/models'
const NAME = 'Hugging Face'

/**
 * Hugging Face Inference — text-to-image with a free access token
 * (huggingface.co/settings/tokens). Free accounts get monthly inference credits.
 */
export const huggingFaceProvider = {
  id: 'huggingface',
  name: NAME,
  kinds: ['image'],
  keyUrl: 'https://huggingface.co/settings/tokens',
  keyPlaceholder: 'hf_…',
  defaultModels: { image: 'black-forest-labs/FLUX.1-schnell' },

  async listModels() {
    return [
      { id: 'black-forest-labs/FLUX.1-schnell', label: 'FLUX.1 [schnell]', description: 'Fast, high quality (Apache 2.0)', paidOnly: false },
      { id: 'stabilityai/stable-diffusion-xl-base-1.0', label: 'Stable Diffusion XL', description: 'Classic SDXL base model', paidOnly: false },
    ]
  },

  async generateImage({ prompt, negativePrompt, model, width, height, seed, apiKey, signal }) {
    // FLUX/SDXL require dimensions divisible by 16.
    const snap = (value) => Math.max(256, Math.round(value / 16) * 16)
    const response = await aiFetch(
      `${BASE_URL}/${model}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'image/png' },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { width: snap(width), height: snap(height), seed, ...(negativePrompt ? { negative_prompt: negativePrompt } : {}) },
        }),
        signal,
      },
      { providerName: NAME },
    )
    await assertOk(response, { providerName: NAME })
    return readMediaBlob(response, 'image/', { providerName: NAME })
  },
}
