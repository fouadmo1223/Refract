import { withFrameFallback } from '@/lib/animationFrame'
import { canvasToBlob } from '@/services/image/canvas'

/** Full HTML document from separate HTML and CSS (body margin reset, so the capture is exact). */
export function buildDocument(html, css, { background = 'transparent', width } = {}) {
  const trimmed = html.trim()
  // A complete document is used as-is (with the extra CSS appended to its head).
  if (/^<!doctype|^<html/i.test(trimmed)) {
    return css.trim() ? trimmed.replace(/<\/head>/i, `<style>${css}</style></head>`) : trimmed
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:${background};${width ? `width:${width}px;` : ''}}</style><style>${css}</style></head><body>${trimmed}</body></html>`
}

const MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }

/**
 * Render the iframe's page to an image with html-to-image.
 * @param {HTMLIFrameElement} frame same-origin sandboxed preview frame
 * @param {{ width: number, height: number|null, scale: number, format: 'png'|'jpeg'|'webp'|'svg', background: string|null, quality: number }} settings
 *   height null = full content height.
 */
export async function renderFrameToImage(frame, settings) {
  const { toCanvas, toSvg } = await import('html-to-image')
  const doc = frame.contentDocument
  if (!doc?.body) throw new Error('Preview not ready')
  await doc.fonts?.ready
  const body = doc.body
  const width = settings.width
  const height = settings.height || Math.max(body.scrollHeight, doc.documentElement.scrollHeight)
  const options = {
    width,
    height,
    pixelRatio: settings.scale,
    backgroundColor: settings.background ?? undefined,
    style: { margin: '0', width: `${width}px`, height: `${height}px` },
    cacheBust: true,
  }
  return withFrameFallback(async () => {
    if (settings.format === 'svg') {
      const dataUrl = await toSvg(body, options)
      const svg = decodeURIComponent(dataUrl.slice(dataUrl.indexOf(',') + 1))
      return { blob: new Blob([svg], { type: 'image/svg+xml' }), width, height, format: 'svg' }
    }
    const canvas = await toCanvas(body, options)
    const blob = await canvasToBlob(canvas, MIME[settings.format] ?? 'image/png', (settings.quality ?? 92) / 100)
    return { blob, width: canvas.width, height: canvas.height, format: settings.format }
  })
}
