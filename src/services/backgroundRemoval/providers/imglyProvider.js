/**
 * Background-removal provider backed by @imgly/background-removal.
 * Inference runs locally (ONNX Runtime / WebAssembly). Model weights are
 * fetched once from IMG.LY's CDN and cached by the browser — the image itself
 * never leaves the device.
 *
 * License note: @imgly/background-removal is AGPL-3.0. Swap this provider
 * (see ../index.js) if that license doesn't fit your distribution.
 */
export const imglyProvider = {
  id: 'imgly',
  processing: 'local',
  async removeBackground(file, { onProgress } = {}) {
    const { removeBackground } = await import('@imgly/background-removal')
    return removeBackground(file, {
      model: 'isnet_quint8', // ~40 MB, cached after first use
      output: { format: 'image/png' },
      progress: (key, current, total) => {
        if (!total) return
        const isDownload = key.startsWith('fetch')
        // Downloads fill the first 60%, inference the rest.
        onProgress?.(isDownload ? (current / total) * 0.6 : 0.6 + (current / total) * 0.35, isDownload ? 'downloadingModel' : 'removingBackground')
      },
    })
  },
}
