import { AppError, ERROR_CODES, createCanceledError, throwIfAborted } from '@/lib/errors'

/**
 * Tracing presets (ImageTracer.js options).
 * - logo: few flat colors, crisp edges — best for logos and icons
 * - illustration: more colors, smooth curves
 * - photo: many colors, posterized look
 * - lineart: black & white outlines
 */
export const TRACE_PRESETS = {
  logo: { numberofcolors: 8, ltres: 0.5, qtres: 0.5, pathomit: 8, blurradius: 0, colorquantcycles: 3, roundcoords: 1 },
  illustration: { numberofcolors: 16, ltres: 1, qtres: 1, pathomit: 8, blurradius: 1, blurdelta: 20, roundcoords: 1 },
  photo: { numberofcolors: 32, ltres: 1, qtres: 1, pathomit: 16, blurradius: 2, blurdelta: 30, colorsampling: 2, roundcoords: 1 },
  lineart: { numberofcolors: 2, ltres: 0.5, qtres: 0.5, pathomit: 4, blurradius: 0, colorsampling: 0, pal: [{ r: 0, g: 0, b: 0, a: 255 }, { r: 255, g: 255, b: 255, a: 255 }], roundcoords: 1 },
}

/**
 * Convert a raster image (PNG, JPG, WebP…) to SVG vector paths.
 * @param {{ preset: keyof TRACE_PRESETS, colors: number, detail: 'low'|'medium'|'high', removeBackground: boolean }} settings
 */
export function traceImageToSvg(file, settings, { signal, onProgress } = {}) {
  throwIfAborted(signal)
  const preset = TRACE_PRESETS[settings.preset] ?? TRACE_PRESETS.logo
  const options = { ...preset, strokewidth: 0, viewbox: true, desc: false }
  if (settings.preset !== 'lineart' && settings.colors) options.numberofcolors = settings.colors
  const maxDimension = { low: 400, medium: 800, high: 1400 }[settings.detail] ?? 800

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../../workers/traceWorker.js', import.meta.url), { type: 'module' })
    const cleanup = () => {
      worker.terminate()
      signal?.removeEventListener('abort', handleAbort)
    }
    const handleAbort = () => {
      cleanup()
      reject(createCanceledError())
    }
    signal?.addEventListener('abort', handleAbort, { once: true })
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') return onProgress?.(data.value, data.stage)
      cleanup()
      if (data.type === 'error') return reject(new AppError(data.error?.code ?? ERROR_CODES.PROCESSING_FAILED, data.error?.details))
      let svg = data.svg
      // Optionally drop the (usually white) background layer ImageTracer emits first.
      if (settings.removeBackground) svg = svg.replace(/<path[^>]*fill="rgb\(2[3-5]\d,2[3-5]\d,2[3-5]\d\)"[^>]*\/>/g, '')
      onProgress?.(1, 'finalizing')
      resolve({ blob: new Blob([svg], { type: 'image/svg+xml' }), width: data.width, height: data.height, format: 'svg' })
    }
    worker.onerror = (event) => {
      event.preventDefault?.()
      cleanup()
      reject(new AppError(ERROR_CODES.PROCESSING_FAILED))
    }
    worker.postMessage({ file, options, maxDimension })
  })
}
