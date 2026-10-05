import { canvasToBlob } from '@/services/image/canvas'
import { loadPdfLib } from '@/services/pdf/pdfService'

const POINTS_PER_PX = 72 / 96

async function capture(node, pixelRatio) {
  const { toCanvas } = await import('html-to-image')
  await document.fonts?.ready
  // html-to-image waits on requestAnimationFrame, which browsers pause in
  // background tabs; fall back to timers while hidden so exports still finish.
  const original = window.requestAnimationFrame
  if (document.visibilityState === 'hidden') window.requestAnimationFrame = (callback) => setTimeout(() => callback(performance.now()), 0)
  try {
    return await toCanvas(node, { pixelRatio, cacheBust: true, backgroundColor: '#FFFFFF' })
  } finally {
    window.requestAnimationFrame = original
  }
}

/** Link rectangles (px, relative to the document node) for clickable PDF links. */
function collectLinks(node) {
  const origin = node.getBoundingClientRect()
  return [...node.querySelectorAll('a[href]')].map((anchor) => {
    const box = anchor.getBoundingClientRect()
    return { href: anchor.href, x: box.left - origin.left, y: box.top - origin.top, width: box.width, height: box.height }
  })
}

/**
 * One-click PDF: render the resume at 2× and slice it into pages of the
 * chosen paper size. Links stay clickable via link annotations.
 * @param {HTMLElement} node full-size resume element
 */
export async function exportResumePdf(node, { pageHeight, title }) {
  const { PDFDocument, PDFName, PDFString } = await loadPdfLib()
  const ratio = 2
  const canvas = await capture(node, ratio)
  const widthPx = node.offsetWidth
  const totalPx = node.offsetHeight
  const pages = Math.max(1, Math.ceil((totalPx - 2) / pageHeight))
  const doc = await PDFDocument.create()
  doc.setTitle(title || 'Resume')
  doc.setCreator('Refract')
  const links = collectLinks(node)

  for (let index = 0; index < pages; index += 1) {
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = Math.round(pageHeight * ratio)
    const context = slice.getContext('2d')
    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, slice.width, slice.height)
    context.drawImage(canvas, 0, -index * pageHeight * ratio)
    const jpeg = await canvasToBlob(slice, 'image/jpeg', 0.92)
    const image = await doc.embedJpg(new Uint8Array(await jpeg.arrayBuffer()))
    const page = doc.addPage([widthPx * POINTS_PER_PX, pageHeight * POINTS_PER_PX])
    page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() })

    const top = index * pageHeight
    const annotations = links
      .filter((link) => link.y >= top && link.y + link.height <= top + pageHeight)
      .map((link) => {
        const x1 = link.x * POINTS_PER_PX
        const y1 = (pageHeight - (link.y - top) - link.height) * POINTS_PER_PX
        return doc.context.register(
          doc.context.obj({
            Type: 'Annot',
            Subtype: 'Link',
            Rect: [x1, y1, x1 + link.width * POINTS_PER_PX, y1 + link.height * POINTS_PER_PX],
            Border: [0, 0, 0],
            A: { Type: 'Action', S: 'URI', URI: PDFString.of(link.href) },
          }),
        )
      })
    if (annotations.length) page.node.set(PDFName.of('Annots'), doc.context.obj(annotations))
  }
  const bytes = await doc.save()
  return new Blob([bytes], { type: 'application/pdf' })
}

/** PNG of the whole resume (all pages stacked). */
export async function exportResumePng(node) {
  const canvas = await capture(node, 2)
  return canvasToBlob(canvas, 'image/png')
}

/**
 * Vector PDF through the browser's print dialog ("Save as PDF"): text stays
 * selectable and fonts stay sharp. Prints only the resume element.
 */
export function printResume(node, { paper }) {
  const style = document.createElement('style')
  style.textContent = `
    @page { size: ${paper === 'letter' ? 'letter' : 'A4'}; margin: 0; }
    @media print {
      body * { visibility: hidden !important; }
      #resume-print, #resume-print * { visibility: visible !important; }
      #resume-print { position: absolute !important; left: 0 !important; top: 0 !important; transform: none !important; }
      html, body { background: #fff !important; }
    }`
  document.head.append(style)
  node.id = 'resume-print'
  const cleanup = () => {
    style.remove()
    node.removeAttribute('id')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
}
