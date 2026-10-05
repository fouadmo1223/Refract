import { AppError, ERROR_CODES } from '@/lib/errors'
import { chatComplete } from '@/services/ai/textAi'
import { canvasToBlob, decodeImage } from '@/services/image/canvas'
import { fileToDataUrl } from '@/services/image/imageBase64Service'

async function downscaledDataUrl(file, maxSide, type = 'image/jpeg', quality = 0.85) {
  const bitmap = await decodeImage(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return fileToDataUrl(await canvasToBlob(canvas, type, quality))
}

/** Pull ```html / ```css fenced blocks out of a model reply. */
function splitCode(reply) {
  const block = (lang) => reply.match(new RegExp('```' + lang + '\\s*\\n([\\s\\S]*?)```', 'i'))?.[1]?.trim() ?? ''
  let html = block('html')
  let css = block('css')
  // A full document with an inline <style> is split back into HTML + CSS.
  if (!css) {
    const style = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
    if (style) {
      css = style[1].trim()
      html = html.replace(style[0], '')
    }
  }
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (body) html = body[1].trim()
  if (!html) throw new AppError(ERROR_CODES.AI_GENERATION_FAILED, { hint: 'no code in reply' })
  return { html, css }
}

/**
 * Screenshot / design → HTML + CSS with a vision model.
 * @param {{ apiKey: string, model?: string, framework: 'css'|'tailwind', responsive: boolean, notes?: string }} settings
 */
export async function imageToHtmlWithAi(file, { apiKey, model, framework, responsive, notes }, { signal, onProgress } = {}) {
  onProgress?.(null, 'uploading')
  const image = await downscaledDataUrl(file, 1400)
  const rules = [
    'Recreate the screenshot as a web page that looks as close as possible to it: layout, spacing, colors, typography, borders, shadows and all visible text.',
    framework === 'tailwind' ? 'Use Tailwind CSS utility classes in the HTML (assume the Tailwind CDN is loaded) and put only extra custom rules in the CSS block.' : 'Use semantic HTML and plain modern CSS (flexbox/grid, CSS variables for colors). No frameworks.',
    responsive ? 'Make it responsive so it also works on phones.' : 'Match the screenshot size; it does not need to be responsive.',
    'For photos and illustrations use https://placehold.co placeholders with the right size; draw simple icons with inline SVG.',
    'Reply with exactly two fenced code blocks: ```html (body content only, no <html>/<head>) and ```css. No explanations.',
  ]
  const reply = await chatComplete({
    apiKey,
    model,
    signal,
    temperature: 0.2,
    messages: [
      { role: 'system', content: `You are an expert frontend developer. ${rules.join(' ')}` },
      {
        role: 'user',
        content: [
          { type: 'text', text: notes?.trim() ? `Extra instructions: ${notes}` : 'Convert this design to code.' },
          { type: 'image_url', image_url: { url: image } },
        ],
      },
    ],
  })
  const code = splitCode(reply)
  return { ...code, mode: 'ai', tailwind: framework === 'tailwind' }
}

/** The image itself as a ready-to-paste snippet (data URI, optional rounded corners / shadow). */
export async function imageToEmbedHtml(file, { maxWidth, radius, shadow, alt }) {
  const bitmap = await decodeImage(file)
  const { width, height } = bitmap
  bitmap.close?.()
  const src = await downscaledDataUrl(file, Math.max(width, height) > 2400 ? 2400 : Math.max(width, height), file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9)
  const html = `<figure class="embed">\n  <img src="${src}" alt="${(alt || '').replace(/"/g, '&quot;')}" width="${width}" height="${height}" loading="lazy" />\n</figure>`
  const css = `.embed {\n  margin: 0 auto;\n  max-width: ${maxWidth ? `${maxWidth}px` : '100%'};\n}\n.embed img {\n  display: block;\n  width: 100%;\n  height: auto;\n  border-radius: ${radius}px;${shadow ? '\n  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);' : ''}\n}`
  return { html, css, mode: 'embed' }
}

/** Pure-CSS pixel art: one element whose box-shadows paint every pixel. */
export async function imageToPixelCss(file, { columns, pixel }) {
  const bitmap = await decodeImage(file)
  const scale = Math.min(1, columns / bitmap.width)
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()
  const { data } = context.getImageData(0, 0, width, height)
  const shadows = []
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      const alpha = data[index + 3]
      if (alpha < 16) continue
      const hex = `#${[data[index], data[index + 1], data[index + 2]].map((value) => value.toString(16).padStart(2, '0')).join('')}`
      const color = alpha < 250 ? `${hex}${alpha.toString(16).padStart(2, '0')}` : hex
      shadows.push(`${(x + 1) * pixel}px ${(y + 1) * pixel}px 0 ${color}`)
    }
  }
  const html = `<div class="pixel-art" role="img" aria-label="Pixel art"></div>`
  const css = `.pixel-art {\n  width: ${pixel}px;\n  height: ${pixel}px;\n  margin: 0 ${width * pixel}px ${height * pixel}px 0;\n  box-shadow:\n    ${shadows.join(',\n    ')};\n}`
  return { html, css, mode: 'pixel', size: { width: width * pixel, height: height * pixel } }
}
